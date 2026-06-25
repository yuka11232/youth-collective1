require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { body, validationResult } = require('express-validator');

const { openDatabase } = require('./backend/database');
const {
  randomToken,
  hashToken,
  normalizeEmail,
  isEmail,
  cleanName,
  cleanText,
  cleanPage,
  passwordProblems,
  publicUser,
  isCommentSafe
} = require('./backend/security');
const { sendPasswordResetEmail, hasSmtpConfig } = require('./backend/email');

const app = express();
const db = openDatabase();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const isProduction = process.env.NODE_ENV === 'production';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const sessionCookieName = 'yc_session';
const csrfCookieName = 'yc_csrf';

function toSqlDate(value) {
  return new Date(value).toISOString().slice(0, 19).replace('T', ' ');
}

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '24kb' }));
app.use(express.urlencoded({ extended: false, limit: '24kb' }));
app.use(cookieParser(process.env.SESSION_SECRET || 'dev-only-change-me'));

const allowedOrigin = process.env.ALLOWED_ORIGIN || PUBLIC_BASE_URL;
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === allowedOrigin) return callback(null, true);
    return callback(new Error('Blocked by CORS'));
  },
  credentials: true
}));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 14, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const commentLimiter = rateLimit({ windowMs: 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Commenting too quickly. Slow down a little.' } });
const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many messages. Try again later.' } });

app.use('/api', apiLimiter);
app.use(passport.initialize());

function cookieOptions(extra = {}) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    ...extra
  };
}

function validationErrors(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return res.status(400).json({ error: result.array()[0].msg });
}

function getSessionUser(req) {
  const token = req.cookies[sessionCookieName];
  if (!token) return null;

  const sessionHash = hashToken(token);
  const row = db.prepare(`
    SELECT users.id, users.email, users.name, users.role, users.avatar_url, users.provider,
           sessions.id AS session_id, sessions.expires_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.session_hash = ? AND sessions.expires_at > datetime('now')
  `).get(sessionHash);

  return row || null;
}

function attachUser(req, res, next) {
  req.user = getSessionUser(req);
  next();
}

function requireAuth(req, res, next) {
  req.user = getSessionUser(req);
  if (!req.user) return res.status(401).json({ error: 'Please log in first.' });
  next();
}

function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookieToken = req.cookies[csrfCookieName];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Security check failed. Refresh the page and try again.' });
  }
  next();
}

function createSession(res, req, userId) {
  const token = randomToken(48);
  const sessionHash = hashToken(token);
  const expires = toSqlDate(Date.now() + 1000 * 60 * 60 * 24 * 14);

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= datetime('now')").run(userId);
    db.prepare(`
      INSERT INTO sessions (user_id, session_hash, ip, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, sessionHash, req.ip, String(req.get('user-agent') || '').slice(0, 240), expires);
    db.prepare(`
      DELETE FROM sessions
      WHERE user_id = ?
        AND id NOT IN (
          SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
        )
    `).run(userId, userId);
  });
  tx();

  res.cookie(sessionCookieName, token, cookieOptions({ maxAge: 1000 * 60 * 60 * 24 * 14 }));
}

function clearSession(res) {
  res.clearCookie(sessionCookieName, cookieOptions({ maxAge: 0 }));
}

function upsertGoogleUser(profile) {
  const email = normalizeEmail(profile.emails && profile.emails[0] && profile.emails[0].value);
  if (!email) throw new Error('Google account has no email address.');

  const existingByGoogleId = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id);
  if (existingByGoogleId) return existingByGoogleId;

  const existingByEmail = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const displayName = cleanName(profile.displayName || email.split('@')[0]);
  const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

  if (existingByEmail) {
    db.prepare(`
      UPDATE users SET google_id = ?, provider = CASE WHEN provider = 'local' THEN 'local+google' ELSE provider END,
             avatar_url = COALESCE(avatar_url, ?), email_verified = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(profile.id, avatarUrl, existingByEmail.id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existingByEmail.id);
  }

  const inserted = db.prepare(`
    INSERT INTO users (email, name, avatar_url, provider, google_id, email_verified)
    VALUES (?, ?, ?, 'google', ?, 1)
  `).run(email, displayName, avatarUrl, profile.id);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(inserted.lastInsertRowid);
}

if (googleConfigured) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${PUBLIC_BASE_URL}/api/auth/google/callback`
  }, (accessToken, refreshToken, profile, done) => {
    try {
      const user = upsertGoogleUser(profile);
      done(null, user);
    } catch (error) {
      done(error);
    }
  }));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Youth Collective backend', googleLogin: googleConfigured, emailRecovery: hasSmtpConfig() });
});

app.get('/api/csrf', (req, res) => {
  let token = req.cookies[csrfCookieName];
  if (!token) {
    token = randomToken(32);
    res.cookie(csrfCookieName, token, cookieOptions({ httpOnly: true, maxAge: 1000 * 60 * 60 * 4 }));
  }
  res.json({ csrfToken: token });
});

app.post('/api/auth/register', requireCsrf, authLimiter, [
  body('name').custom((value) => { const name = cleanName(value); if (name.length < 2 || name.length > 70) throw new Error('Name should be 2–70 characters after spaces are cleaned.'); return true; }),
  body('email').trim().isEmail().withMessage('Enter a valid email.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password should be at least 8 characters.'),
  body('confirmPassword').optional().isString().isLength({ max: 128 }).withMessage('Confirm password is too long.')
], validationErrors, async (req, res) => {
  const name = cleanName(req.body.name);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  if (req.body.confirmPassword !== undefined && String(req.body.confirmPassword) !== password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  const problems = passwordProblems(password, { email, name });
  if (problems.length) return res.status(400).json({ error: problems[0] });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const result = db.prepare(`
    INSERT INTO users (email, name, password_hash, provider)
    VALUES (?, ?, ?, 'local')
  `).run(email, name, passwordHash);

  createSession(res, req, result.lastInsertRowid);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/login', requireCsrf, authLimiter, [
  body('email').trim().isEmail().withMessage('Enter a valid email.'),
  body('password').isString().isLength({ min: 1 }).withMessage('Enter your password.')
], validationErrors, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });

  db.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at <= datetime(\'now\')').run(user.id);
  createSession(res, req, user.id);
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', requireCsrf, requireAuth, (req, res) => {
  const token = req.cookies[sessionCookieName];
  if (token) db.prepare('DELETE FROM sessions WHERE session_hash = ?').run(hashToken(token));
  clearSession(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', attachUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get('/api/auth/sessions', requireAuth, (req, res) => {
  const sessions = db.prepare(`
    SELECT id, ip, user_agent, created_at, expires_at
    FROM sessions
    WHERE user_id = ? AND expires_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 5
  `).all(req.user.id);
  res.json({ sessions: sessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    userAgent: session.user_agent,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
    current: session.id === req.user.session_id
  })) });
});

app.post('/api/auth/password/request', requireCsrf, authLimiter, [
  body('email').trim().isEmail().withMessage('Enter a valid email.')
], validationErrors, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  let devResetUrl = null;
  if (user && user.password_hash) {
    const token = randomToken(40);
    const tokenHash = hashToken(token);
    const expires = toSqlDate(Date.now() + 1000 * 60 * 30);
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? AND (used_at IS NOT NULL OR expires_at <= datetime(\'now\'))').run(user.id);
    db.prepare('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expires);
    devResetUrl = `${PUBLIC_BASE_URL}/?reset=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl: devResetUrl }).catch((error) => {
      console.warn('Password reset email failed:', error.message);
    });
  }

  const response = { message: 'If an account exists, a reset link has been prepared.' };
  if (!isProduction && devResetUrl) response.devResetUrl = devResetUrl;
  res.json(response);
});

app.post('/api/auth/password/reset', requireCsrf, authLimiter, [
  body('token').isString().isLength({ min: 20 }).withMessage('Reset token is missing.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password should be at least 8 characters.'),
  body('confirmPassword').optional().isString().isLength({ max: 128 }).withMessage('Confirm password is too long.')
], validationErrors, async (req, res) => {
  const tokenHash = hashToken(req.body.token);
  const password = String(req.body.password || '');
  if (req.body.confirmPassword !== undefined && String(req.body.confirmPassword) !== password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  const reset = db.prepare(`
    SELECT password_reset_tokens.*, users.id AS user_id, users.email AS user_email, users.name AS user_name
    FROM password_reset_tokens
    JOIN users ON users.id = password_reset_tokens.user_id
    WHERE password_reset_tokens.token_hash = ?
      AND password_reset_tokens.used_at IS NULL
      AND password_reset_tokens.expires_at > datetime('now')
  `).get(tokenHash);

  if (!reset) return res.status(400).json({ error: 'This reset link is invalid or expired.' });

  const problems = passwordProblems(password, { email: reset.user_email, name: reset.user_name });
  if (problems.length) return res.status(400).json({ error: problems[0] });

  const passwordHash = await bcrypt.hash(password, 12);
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(passwordHash, reset.user_id);
    db.prepare('UPDATE password_reset_tokens SET used_at = datetime(\'now\') WHERE id = ?').run(reset.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(reset.user_id);
  });
  tx();

  clearSession(res);
  res.json({ message: 'Password updated. You can log in now.' });
});

app.get('/api/auth/google', authLimiter, (req, res, next) => {
  if (!googleConfigured) {
    return res.status(501).send(`
      <main style="font-family: Inter, Arial, sans-serif; max-width: 720px; margin: 80px auto; line-height: 1.6; padding: 24px;">
        <h1>Google login is ready, but not configured yet.</h1>
        <p>Add <strong>GOOGLE_CLIENT_ID</strong>, <strong>GOOGLE_CLIENT_SECRET</strong>, and <strong>GOOGLE_CALLBACK_URL</strong> to your <code>.env</code> file, then restart the server.</p>
        <p>Callback URL: <code>${PUBLIC_BASE_URL}/api/auth/google/callback</code></p>
        <p><a href="/">Back to the website</a></p>
      </main>
    `);
  }
  return passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

app.get('/api/auth/google/callback', authLimiter, (req, res, next) => {
  if (!googleConfigured) return res.redirect('/?auth=google-not-configured');
  return passport.authenticate('google', { session: false, failureRedirect: '/?auth=google-failed' }, (err, user) => {
    if (err || !user) return res.redirect('/?auth=google-failed');
    createSession(res, req, user.id);
    return res.redirect('/?auth=google-success');
  })(req, res, next);
});

app.get('/api/comments', attachUser, (req, res) => {
  const page = cleanPage(req.query.page);
  const comments = db.prepare(`
    SELECT comments.id, comments.page, comments.content, comments.created_at, comments.updated_at,
           users.id AS user_id, users.name AS user_name, users.avatar_url AS avatar_url
    FROM comments
    JOIN users ON users.id = comments.user_id
    WHERE comments.page = ? AND comments.is_deleted = 0 AND comments.is_approved = 1
    ORDER BY comments.created_at DESC
    LIMIT 80
  `).all(page);

  res.json({
    page,
    comments: comments.map((comment) => ({
      id: comment.id,
      page: comment.page,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      canDelete: req.user ? (req.user.id === comment.user_id || req.user.role === 'admin') : false,
      user: { id: comment.user_id, name: comment.user_name, avatarUrl: comment.avatar_url }
    }))
  });
});

app.post('/api/comments', requireCsrf, requireAuth, commentLimiter, [
  body('page').optional().isLength({ min: 1, max: 180 }).withMessage('Page is invalid.'),
  body('content').isLength({ min: 2, max: 1200 }).withMessage('Comment should be 2–1200 characters.')
], validationErrors, (req, res) => {
  const page = cleanPage(req.body.page);
  const content = cleanText(req.body.content, 1200);
  if (content.length < 2) return res.status(400).json({ error: 'Comment is too short.' });

  const approved = isCommentSafe(content) ? 1 : 0;
  const result = db.prepare(`
    INSERT INTO comments (user_id, page, content, is_approved)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, page, content, approved);

  if (!approved) {
    return res.status(202).json({ message: 'Your comment was saved for review before public display.' });
  }

  const comment = db.prepare(`
    SELECT comments.id, comments.page, comments.content, comments.created_at, comments.updated_at,
           users.id AS user_id, users.name AS user_name, users.avatar_url AS avatar_url
    FROM comments JOIN users ON users.id = comments.user_id WHERE comments.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({
    comment: {
      id: comment.id,
      page: comment.page,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      canDelete: true,
      user: { id: comment.user_id, name: comment.user_name, avatarUrl: comment.avatar_url }
    }
  });
});

app.delete('/api/comments/:id', requireCsrf, requireAuth, commentLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid comment.' });

  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND is_deleted = 0').get(id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });
  if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only delete your own comments.' });
  }

  db.prepare('UPDATE comments SET is_deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.post('/api/contact-messages', requireCsrf, contactLimiter, [
  body('name').custom((value) => { const name = cleanName(value); if (name.length < 2 || name.length > 70) throw new Error('Name should be 2–70 characters after spaces are cleaned.'); return true; }),
  body('email').trim().isEmail().withMessage('Enter a valid email.'),
  body('interest').optional().isLength({ max: 80 }).withMessage('Interest is too long.'),
  body('message').optional().isLength({ max: 1200 }).withMessage('Message is too long.')
], validationErrors, (req, res) => {
  const name = cleanName(req.body.name);
  const email = normalizeEmail(req.body.email);
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email.' });

  db.prepare(`
    INSERT INTO contact_messages (name, email, interest, message, ip)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email, cleanText(req.body.interest, 80), cleanText(req.body.message, 1200), req.ip);

  res.status(201).json({ message: 'Thanks — your interest was saved.' });
});

// ─── Admin helpers ───────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  req.user = getSessionUser(req);
  if (!req.user) return res.status(401).json({ error: 'Please log in first.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  next();
}

function publicEvent(event) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    year: event.year,
    location: event.location,
    type: event.event_type,
    focus: event.focus,
    status: event.status,
    imageUrl: event.image_url,
    galleryKey: event.gallery_key,
    isActive: Boolean(event.is_active),
    createdAt: event.created_at
  };
}

const adminMutLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
const adminSetupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many setup attempts. Try again in an hour.' }
});

// ─── Admin setup (creates first admin account) ────────────────────────────────

app.post('/api/admin/setup', requireCsrf, adminSetupLimiter, [
  body('setupKey').isString().isLength({ min: 1 }).withMessage('Setup key is required.'),
  body('name').custom((v) => { const n = cleanName(v); if (n.length < 2) throw new Error('Name is required.'); return true; }),
  body('email').trim().isEmail().withMessage('Enter a valid email.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters.')
], validationErrors, async (req, res) => {
  const configuredKey = process.env.ADMIN_SETUP_KEY;
  if (!configuredKey) {
    return res.status(503).json({ error: 'Admin setup is not configured. Add ADMIN_SETUP_KEY to your .env file, then restart.' });
  }
  if (req.body.setupKey !== configuredKey) {
    return res.status(403).json({ error: 'Invalid setup key.' });
  }

  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (adminExists) {
    return res.status(409).json({ error: 'An admin account already exists. Log in with that account instead.' });
  }

  const name = cleanName(req.body.name);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const problems = passwordProblems(password, { email, name });
  if (problems.length) return res.status(400).json({ error: problems[0] });

  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ?").run(existing.id);
    createSession(res, req, existing.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
    return res.json({ user: publicUser(user), message: 'Existing account promoted to admin.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = db.prepare(
    "INSERT INTO users (email, name, password_hash, provider, role) VALUES (?, ?, ?, 'local', 'admin')"
  ).run(email, name, passwordHash);

  createSession(res, req, result.lastInsertRowid);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ user: publicUser(user), message: 'Admin account created.' });
});

// ─── Public events ────────────────────────────────────────────────────────────

app.get('/api/events', (req, res) => {
  const events = db.prepare(
    'SELECT * FROM events WHERE is_active = 1 ORDER BY year DESC, created_at DESC'
  ).all();
  res.json({ events: events.map(publicEvent) });
});

// ─── Admin: overview ──────────────────────────────────────────────────────────

app.get('/api/admin/overview', requireAdmin, (req, res) => {
  res.json({
    users:           db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
    events:          db.prepare('SELECT COUNT(*) AS n FROM events WHERE is_active = 1').get().n,
    pendingComments: db.prepare('SELECT COUNT(*) AS n FROM comments WHERE is_approved = 0 AND is_deleted = 0').get().n,
    totalComments:   db.prepare('SELECT COUNT(*) AS n FROM comments WHERE is_deleted = 0').get().n,
    messages:        db.prepare('SELECT COUNT(*) AS n FROM contact_messages').get().n,
    unreadMessages:  db.prepare('SELECT COUNT(*) AS n FROM contact_messages WHERE is_read = 0').get().n
  });
});

// ─── Admin: events ────────────────────────────────────────────────────────────

app.get('/api/admin/events', requireAdmin, (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY year DESC, created_at DESC').all();
  res.json({ events: events.map(publicEvent) });
});

app.post('/api/admin/events', requireCsrf, requireAdmin, adminMutLimiter, [
  body('title').isLength({ min: 2, max: 120 }).withMessage('Title should be 2–120 characters.'),
  body('description').isLength({ min: 10, max: 1200 }).withMessage('Description should be 10–1200 characters.'),
  body('category').isIn(['energy', 'forums', 'eco', 'sport', 'health', 'community']).withMessage('Invalid category.'),
  body('year').isInt({ min: 2020, max: 2100 }).withMessage('Enter a valid year (2020–2100).'),
  body('location').optional().isLength({ max: 120 }).withMessage('Location is too long.'),
  body('eventType').optional().isLength({ max: 120 }).withMessage('Event type is too long.'),
  body('focus').optional().isLength({ max: 240 }).withMessage('Focus is too long.'),
  body('status').optional().isLength({ max: 120 }).withMessage('Status is too long.'),
  body('imageUrl').optional().isLength({ max: 300 }).withMessage('Image URL is too long.'),
  body('galleryKey').optional().isLength({ max: 60 }).matches(/^[a-z0-9-]*$/).withMessage('Gallery key: lowercase letters, numbers, hyphens only.')
], validationErrors, (req, res) => {
  const result = db.prepare(`
    INSERT INTO events (title, description, category, year, location, event_type, focus, status, image_url, gallery_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cleanText(req.body.title, 120),
    cleanText(req.body.description, 1200),
    req.body.category,
    Number(req.body.year),
    cleanText(req.body.location || '', 120),
    cleanText(req.body.eventType || '', 120),
    cleanText(req.body.focus || '', 240),
    cleanText(req.body.status || 'Upcoming', 120),
    cleanText(req.body.imageUrl || '', 300),
    String(req.body.galleryKey || '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  );
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ event: publicEvent(event) });
});

app.patch('/api/admin/events/:id', requireCsrf, requireAdmin, adminMutLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid event.' });
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  if (req.body.isActive !== undefined) {
    db.prepare("UPDATE events SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
      .run(req.body.isActive ? 1 : 0, id);
  }
  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  res.json({ event: publicEvent(updated) });
});

app.delete('/api/admin/events/:id', requireCsrf, requireAdmin, adminMutLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid event.' });
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ─── Admin: comments ──────────────────────────────────────────────────────────

app.get('/api/admin/comments', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT comments.id, comments.page, comments.content, comments.is_approved, comments.is_deleted, comments.created_at,
           users.id AS user_id, users.name AS user_name, users.email AS user_email
    FROM comments
    JOIN users ON users.id = comments.user_id
    ORDER BY comments.is_approved ASC, comments.created_at DESC
    LIMIT 300
  `).all();
  res.json({
    comments: rows.map((c) => ({
      id: c.id, page: c.page, content: c.content,
      isApproved: Boolean(c.is_approved), isDeleted: Boolean(c.is_deleted),
      createdAt: c.created_at,
      user: { id: c.user_id, name: c.user_name, email: c.user_email }
    }))
  });
});

app.patch('/api/admin/comments/:id/approve', requireCsrf, requireAdmin, adminMutLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid comment.' });
  const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });
  db.prepare("UPDATE comments SET is_approved = 1, updated_at = datetime('now') WHERE id = ?").run(id);
  res.json({ ok: true });
});

// ─── Admin: contact messages ──────────────────────────────────────────────────

app.get('/api/admin/messages', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 300').all();
  res.json({ messages: rows.map((m) => ({ ...m, isRead: Boolean(m.is_read) })) });
});

app.patch('/api/admin/messages/:id/read', requireCsrf, requireAdmin, adminMutLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid message.' });
  db.prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.delete('/api/admin/messages/:id', requireCsrf, requireAdmin, adminMutLimiter, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid message.' });
  const msg = db.prepare('SELECT id FROM contact_messages WHERE id = ?').get(id);
  if (!msg) return res.status(404).json({ error: 'Message not found.' });
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ─── Admin: users ─────────────────────────────────────────────────────────────

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const rows = db.prepare(
    'SELECT id, email, name, role, provider, created_at FROM users ORDER BY created_at DESC LIMIT 300'
  ).all();
  res.json({ users: rows });
});

app.patch('/api/admin/users/:id/role', requireCsrf, requireAdmin, adminMutLimiter, [
  body('role').isIn(['member', 'admin']).withMessage("Role must be 'member' or 'admin'.")
], validationErrors, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid user.' });
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role.' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(req.body.role, id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json({ user: publicUser(updated) });
});

// ─────────────────────────────────────────────────────────────────────────────

app.use(express.static(ROOT, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found.' });
  res.status(404).sendFile(path.join(ROOT, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path && req.path.startsWith('/api/')) {
    return res.status(500).json({ error: isProduction ? 'Server error.' : err.message });
  }
  return res.status(500).send(isProduction ? 'Server error.' : err.message);
});

app.listen(PORT, () => {
  console.log(`Youth Collective backend running on ${PUBLIC_BASE_URL}`);
  console.log(`Google login: ${googleConfigured ? 'configured' : 'not configured yet'}`);
  console.log(`Password reset email: ${hasSmtpConfig() ? 'SMTP configured' : 'dev/link mode'}`);
  if (!isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change-this-to-a-long-random-string')) {
    console.warn('Security note: set a unique SESSION_SECRET in .env before sharing/deploying.');
  }
});

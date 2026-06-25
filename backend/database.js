const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'youth_collective.sqlite');

function openDatabase() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT,
      avatar_url TEXT,
      provider TEXT NOT NULL DEFAULT 'local',
      google_id TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'member',
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_hash TEXT NOT NULL UNIQUE,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      page TEXT NOT NULL,
      content TEXT NOT NULL,
      parent_id INTEGER,
      is_approved INTEGER NOT NULL DEFAULT 1,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(parent_id) REFERENCES comments(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_comments_page_created ON comments(page, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      interest TEXT,
      message TEXT,
      ip TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'community',
      year INTEGER NOT NULL DEFAULT 2026,
      location TEXT,
      event_type TEXT,
      focus TEXT,
      status TEXT NOT NULL DEFAULT 'Upcoming',
      image_url TEXT,
      gallery_key TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add is_read to contact_messages if it was created without it
  try {
    db.exec('ALTER TABLE contact_messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0');
  } catch (_) { /* column already exists */ }

  // Migration: fix events seeded with year=2025 before the year was corrected to 2026
  db.prepare(
    "UPDATE events SET year = 2026 WHERE gallery_key IN ('energy-week', 'wuf13') AND year = 2025"
  ).run();

  // Migration: update Energy Week preview to the last photo
  db.prepare(
    "UPDATE events SET image_url = 'assets/images/gallery/Energy%20Week/motion_photo_4258545104581702818.jpg' WHERE gallery_key = 'energy-week' AND image_url LIKE '%WA0029%'"
  ).run();

  // Seed confirmed events on first run
  const eventCount = db.prepare('SELECT COUNT(*) AS n FROM events').get();
  if (eventCount.n === 0) {
    const ins = db.prepare(`
      INSERT INTO events (title, description, category, year, location, event_type, focus, status, image_url, gallery_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    ins.run(
      'Azerbaijan Energy Week',
      'Youth Collective explored Azerbaijan Energy Week as a space to understand how energy, sustainability, infrastructure, and innovation connect to the future of the region.',
      'energy', 2026, 'Baku, Azerbaijan',
      'Field visit / learning event',
      'Energy, sustainability, innovation, infrastructure',
      'Attended — photos available',
      'assets/images/gallery/Energy%20Week/motion_photo_4258545104581702818.jpg',
      'energy-week'
    );
    ins.run(
      'WUF13 — World Urban Forum',
      'Youth Collective connected with WUF13 around youth participation, urban futures, public spaces, and the role of young people in shaping more livable cities.',
      'forums', 2026, 'Baku, Azerbaijan',
      'Forum / volunteer participation / civic engagement',
      'Urban futures, youth participation, public space, sustainability',
      'Attended — photos available',
      'assets/images/gallery/WUF13/20260521_111932.jpg',
      'wuf13'
    );
  }

  return db;
}

module.exports = { openDatabase, dbPath };

const crypto = require('crypto');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_PAGE_REGEX = /^[a-zA-Z0-9_./?#=&%-]{1,180}$/;

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isEmail(email) {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

function cleanName(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70);
}

function cleanPage(page) {
  const value = String(page || '/').trim().slice(0, 180) || '/';
  if (!SAFE_PAGE_REGEX.test(value)) return '/';
  return value;
}

function cleanText(value, maxLength = 1200) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function passwordProblems(password, context = {}) {
  const value = String(password || '');
  const lower = value.toLowerCase();
  const emailLocal = normalizeEmail(context.email || '').split('@')[0];
  const nameParts = cleanName(context.name || '').toLowerCase().split(' ').filter((part) => part.length >= 3);
  const problems = [];

  if (value.length < 8) problems.push('Use at least 8 characters.');
  if (value.length > 128) problems.push('Password is too long.');
  if (!/[A-Za-z]/.test(value)) problems.push('Add at least one letter.');
  if (!/[0-9]/.test(value)) problems.push('Add at least one number.');
  if (/^(password|qwerty|12345678|11111111)$/i.test(value)) problems.push('Choose a less common password.');
  if (emailLocal && emailLocal.length >= 3 && lower.includes(emailLocal)) problems.push('Do not include your email in the password.');
  if (nameParts.some((part) => lower.includes(part))) problems.push('Do not include your name in the password.');

  return problems;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'member',
    avatarUrl: user.avatar_url || null,
    provider: user.provider || 'local'
  };
}

function isCommentSafe(text) {
  const value = String(text || '').toLowerCase();
  const blocked = [
    'kill yourself',
    'kys',
    'porn',
    'nude',
    'terrorist',
    'bomb',
    'address:',
    'phone:'
  ];
  return !blocked.some((term) => value.includes(term));
}

module.exports = {
  randomToken,
  hashToken,
  normalizeEmail,
  isEmail,
  cleanName,
  cleanPage,
  cleanText,
  passwordProblems,
  publicUser,
  isCommentSafe
};

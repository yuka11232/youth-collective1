const nodemailer = require('nodemailer');

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  if (!hasSmtpConfig()) return { sent: false, reason: 'SMTP is not configured.' };

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Youth Collective <no-reply@youthcollective.local>',
    to,
    subject: 'Reset your Youth Collective password',
    text: `Hi ${name || 'there'},\n\nUse this link to reset your password:\n${resetUrl}\n\nThis link expires in 30 minutes.\n\nYouth Collective`,
    html: `
      <p>Hi ${escapeHtml(name || 'there')},</p>
      <p>Use this link to reset your Youth Collective password:</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>This link expires in 30 minutes.</p>
      <p>Youth Collective</p>
    `
  });

  return { sent: true };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[char]));
}

module.exports = { sendPasswordResetEmail, hasSmtpConfig };

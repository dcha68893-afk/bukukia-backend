/**
 * Notification service - creates in-app notification records AND sends email.
 * Call sendNotification() anywhere in the app to notify a user across both channels.
 */
const nodemailer = require('nodemailer');
const { Notification, User } = require('../models');

// ---- Email transport ----
function getTransport() {
  if (!process.env.SMTP_HOST) return null; // not configured
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Create an in-app notification for a user and optionally send an email too.
 * @param {object} opts
 * @param {string} opts.userId       UUID of the recipient User
 * @param {string} opts.title        Short title shown in the notification bell
 * @param {string} opts.message      Full message body (plain text)
 * @param {string} [opts.type]       One of: event_reminder | announcement | prayer_update | donation_receipt | general
 * @param {string} [opts.link]       Optional relative URL to link to (e.g. /events.html)
 * @param {boolean}[opts.sendEmail]  Defaults true if SMTP is configured
 */
async function sendNotification({ userId, title, message, type = 'general', link, sendEmail = true }) {
  // 1. In-app notification record
  const notification = await Notification.create({ userId, title, message, type, link });

  // 2. Email
  if (sendEmail) {
    const transport = getTransport();
    if (transport) {
      try {
        const user = await User.findByPk(userId);
        if (user && user.email) {
          await transport.sendMail({
            from: `${process.env.SITE_NAME || 'Gwikonge PEFA Church'} <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: user.email,
            subject: title,
            text: message,
            html: emailTemplate(title, message, link),
          });
        }
      } catch (emailErr) {
        // Email failure should never break the main request flow
        console.error('Email send failed:', emailErr.message);
      }
    }
  }

  return notification;
}

/**
 * Broadcast a notification to a list of userIds (e.g. for event reminders).
 */
async function broadcastNotification(userIds, opts) {
  const results = await Promise.allSettled(userIds.map((uid) => sendNotification({ ...opts, userId: uid })));
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) console.warn(`${failed} notifications failed to send.`);
  return results;
}

/**
 * Send email to a subscriber who hasn't registered yet (newsletter, event reminders to non-members).
 */
async function sendDirectEmail({ to, subject, message, html }) {
  const transport = getTransport();
  if (!transport) return;
  await transport.sendMail({
    from: `${process.env.SITE_NAME || 'Gwikonge PEFA Church'} <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to, subject,
    text: message,
    html: html || emailTemplate(subject, message),
  });
}

function emailTemplate(title, body, link) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#1a5c36;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:1.3rem;">${process.env.SITE_NAME || 'Gwikonge PEFA Church'}</h1>
    </div>
    <div style="padding:24px;">
      <h2 style="color:#1a5c36;">${title}</h2>
      <p style="color:#333;line-height:1.6;">${body.replace(/\n/g, '<br>')}</p>
      ${link ? `<a href="${process.env.CLIENT_URL || ''}${link}" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#1a5c36;color:#fff;border-radius:6px;text-decoration:none;">View Details</a>` : ''}
    </div>
    <div style="background:#f4f4f4;padding:16px;text-align:center;font-size:0.8rem;color:#666;">
      &copy; ${new Date().getFullYear()} ${process.env.SITE_NAME || 'Gwikonge PEFA Church'}. All rights reserved.
    </div>
  </div>
</body></html>`;
}

module.exports = { sendNotification, broadcastNotification, sendDirectEmail };

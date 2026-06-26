const cron = require('node-cron');
const Message = require('../models/Message');
const User = require('../models/User');
const Settings = require('../models/Settings');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = process.env.EMAIL_FROM || 'Sameer.karki63@gmail.com';

const getAdminEmail = async () => {
  const admin = await User.findOne({ role: 'admin' }).select('email');
  return admin?.email || process.env.ADMIN_EMAIL;
};

const sendDigest = async () => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Find unread tenant messages sent today
    const messages = await Message.find({
      senderRole: 'tenant',
      isRead: false,
      createdAt: { $gte: startOfDay },
    })
      .populate('senderId', 'name unit building')
      .populate('issueId', 'title _id')
      .sort({ createdAt: -1 });

    if (messages.length === 0) return; // nothing to report

    // Group by issue
    const byIssue = new Map();
    for (const m of messages) {
      const key = m.issueId?._id?.toString() || 'unknown';
      if (!byIssue.has(key)) {
        byIssue.set(key, { issue: m.issueId, messages: [] });
      }
      byIssue.get(key).messages.push(m);
    }

    const issueRows = [...byIssue.values()].map(({ issue, messages: msgs }) => {
      const preview = msgs.map(m =>
        `<tr>
          <td style="padding:6px 0;color:#6B7280;font-size:13px;width:35%;">${m.senderId?.name || 'Tenant'} · ${m.senderId?.unit || ''}</td>
          <td style="padding:6px 0;color:#1F2937;font-size:13px;">${m.message}</td>
        </tr>`
      ).join('');
      const issueUrl = `${process.env.FRONTEND_URL}/admin/issues/${issue?._id}`;
      return `
        <div style="background:#F9FAFB;border-left:4px solid #10B981;border-radius:4px;padding:14px 16px;margin-bottom:16px;">
          <a href="${issueUrl}" style="color:#1F2937;font-weight:bold;text-decoration:none;font-size:14px;">📋 ${issue?.title || 'Unknown Issue'}</a>
          <table style="width:100%;border-collapse:collapse;margin-top:8px;">${preview}</table>
        </div>`;
    }).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#10B981;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;">📬 Daily Message Digest</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 8px 8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <p style="color:#4B5563;margin-top:0;">You have <strong>${messages.length} unread message(s)</strong> from tenants today across ${byIssue.size} issue(s).</p>
          ${issueRows}
          <div style="text-align:center;margin-top:24px;">
            <a href="${process.env.FRONTEND_URL}/admin/issues" style="background:#10B981;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">View All Issues</a>
          </div>
        </div>
        <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:20px;">Service Portal</p>
      </div>
    `;

    await sgMail.send({
      from: FROM,
      to: await getAdminEmail(),
      subject: `[Digest] ${messages.length} unread tenant message(s) today`,
      html,
    });

    console.log(`Digest sent: ${messages.length} unread messages`);
  } catch (err) {
    console.error('Digest reminder error:', err.message);
  }
};

let currentTask = null;

const scheduleDigest = (time) => {
  if (currentTask) { currentTask.stop(); currentTask = null; }
  if (!time) return;

  const [hour, minute] = time.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) return;

  const expression = `${minute} ${hour} * * *`;
  currentTask = cron.schedule(expression, sendDigest, { timezone: 'Europe/Oslo' });
  console.log(`Digest reminder scheduled at ${time} Oslo time`);
};

const initDigestReminder = async () => {
  try {
    const settings = await Settings.getGlobal();
    scheduleDigest(settings.digestReminderTime);
  } catch (err) {
    console.error('Failed to init digest reminder:', err.message);
  }
};

module.exports = { initDigestReminder, scheduleDigest };

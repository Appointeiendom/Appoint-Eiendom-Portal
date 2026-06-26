const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const sendSMS = async (to, message) => {
  if (!accountSid || !authToken || !fromNumber) {
    console.log('SMS skipped: Twilio not configured');
    return;
  }
  if (!to) return;
  // Normalize phone number — ensure it starts with +
  const normalized = to.startsWith('+') ? to : `+47${to.replace(/\s/g, '')}`;
  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({ body: message, from: fromNumber, to: normalized });
    console.log(`SMS sent to ${normalized}`);
  } catch (err) {
    console.error('SMS error:', err.message);
  }
};

const sendIssueStatusSMS = async (tenant, issue) => {
  if (!tenant?.phone) return;
  const statusText = issue.status === 'in-progress' ? 'In Progress' : issue.status === 'resolved' ? 'Resolved' : 'Open';
  await sendSMS(tenant.phone, `Service Portal: Your issue "${issue.title}" status has been updated to ${statusText}. Log in to the portal for details.`);
};

const sendAnnouncementSMS = async (tenants, title) => {
  for (const tenant of tenants) {
    if (tenant.phone) {
      await sendSMS(tenant.phone, `Service Portal: New announcement — "${title}". Log in to the portal to read more.`);
    }
  }
};

const sendDocumentSMS = async (tenant, title) => {
  if (!tenant?.phone) return;
  await sendSMS(tenant.phone, `Service Portal: A new document "${title}" has been shared with you. Log in to the portal to view it.`);
};

module.exports = { sendSMS, sendIssueStatusSMS, sendAnnouncementSMS, sendDocumentSMS };

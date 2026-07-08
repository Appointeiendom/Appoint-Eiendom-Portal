const sgMail = require('@sendgrid/mail');
const User = require('../models/User');
const Settings = require('../models/Settings');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const FROM = process.env.EMAIL_FROM || 'no-reply@rentservice.no';

const getAdminEmail = async () => {
  const admin = await User.findOne({ role: 'admin' }).select('email');
  return admin?.email || process.env.ADMIN_EMAIL;
};

const statusColor = (status) => {
  const colors = { open: '#3B82F6', 'in-progress': '#F59E0B', resolved: '#10B981' };
  return colors[status] || '#6B7280';
};

// Email sent to admin when a new issue is created
const sendNewIssueEmail = async (issue, tenant) => {
  try {

    const issueUrl = `${process.env.FRONTEND_URL}/admin/issues/${issue._id}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
        <div style="background: #10B981; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New maintenance issue reported</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1F2937; margin-top: 0;">${issue.title}</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280; width: 40%;">Tenant Name</td>
              <td style="padding: 10px 0; color: #1F2937; font-weight: bold;">${tenant.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280;">Address</td>
              <td style="padding: 10px 0; color: #1F2937;">${issue.unit}</td>
            </tr>
            ${(issue.building || issue.tenantId?.building) ? `<tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280;">Rental Unit</td>
              <td style="padding: 10px 0; color: #1F2937;">${issue.building || issue.tenantId?.building}</td>
            </tr>` : ''}
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280;">Category</td>
              <td style="padding: 10px 0; color: #1F2937;">${issue.category}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280;">Reported On</td>
              <td style="padding: 10px 0; color: #1F2937;">${new Date(issue.createdAt).toLocaleString()}</td>
            </tr>
          </table>

          <div style="background: #F9FAFB; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #6B7280; margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Description</p>
            <p style="color: #1F2937; margin: 0;">${issue.description}</p>
          </div>

          <div style="text-align: center;">
            <a href="${issueUrl}" style="background: #10B981; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View Issue in Dashboard</a>
          </div>
        </div>
        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">Service Portal</p>
      </div>
    `;

    await sgMail.send({
      from: FROM,
      to: await getAdminEmail(),
      subject: `New Issue: ${issue.title} — ${tenant.name} (${issue.unit})`,
      html,
    });

    console.log('New issue email sent to admin');
  } catch (error) {
    console.error('Email error (new issue):', error.message);
    console.error('SendGrid error details:', JSON.stringify(error.response?.body || error, null, 2));
  }
};

// Email sent when issue status changes
const sendStatusChangeEmail = async (issue, tenant, updatedBy) => {
  try {

    const issueUrl = `${process.env.FRONTEND_URL}/admin/issues/${issue._id}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
        <div style="background: #3B82F6; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Issue Status Updated</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1F2937; margin-top: 0;">${issue.title}</h2>
          
          <p style="color: #4B5563;">The status has been updated to:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="background: ${statusColor(issue.status)}; color: white; padding: 8px 20px; border-radius: 20px; font-size: 16px; font-weight: bold; text-transform: capitalize;">${issue.status.replace('-', ' ')}</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280; width: 40%;">Tenant</td>
              <td style="padding: 10px 0; color: #1F2937;">${tenant.name} (${issue.unit})</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280;">Updated By</td>
              <td style="padding: 10px 0; color: #1F2937;">${updatedBy.name}</td>
            </tr>
            ${issue.internalNotes ? `
            <tr>
              <td style="padding: 10px 0; color: #6B7280;">Notes</td>
              <td style="padding: 10px 0; color: #1F2937;">${issue.internalNotes}</td>
            </tr>` : ''}
          </table>

          <div style="text-align: center;">
            <a href="${issueUrl}" style="background: #3B82F6; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View Issue</a>
          </div>
        </div>
        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">Service Portal</p>
      </div>
    `;

    await sgMail.send({
      from: FROM,
      to: await getAdminEmail(),
      subject: `Issue Status Update: "${issue.title}" → ${issue.status.replace('-', ' ').toUpperCase()}`,
      html,
    });

    console.log('Status change email sent');
  } catch (error) {
    console.error('Email error (status change):', error.message);
  }
};

// Confirmation email sent to the tenant when they report an issue
const sendTenantConfirmationEmail = async (issue, tenant) => {
  try {

    const issueUrl = `${process.env.FRONTEND_URL}/tenant/issues/${issue._id}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
        <div style="background: #10B981; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">We've received your issue ✅</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="color: #4B5563; margin-top: 0;">Hi <strong>${tenant.name}</strong>,</p>
          <p style="color: #4B5563;">Your maintenance issue has been received and our team will look into it shortly.</p>

          <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <h2 style="color: #1F2937; margin: 0 0 12px 0; font-size: 16px;">${issue.title}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6B7280; width: 40%; font-size: 14px;">Address</td>
                <td style="padding: 6px 0; color: #1F2937; font-size: 14px;">${issue.unit}</td>
              </tr>
              ${issue.building ? `<tr>
                <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Rental Unit</td>
                <td style="padding: 6px 0; color: #1F2937; font-size: 14px;">${issue.building}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Category</td>
                <td style="padding: 6px 0; color: #1F2937; font-size: 14px;">${issue.category}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Submitted</td>
                <td style="padding: 6px 0; color: #1F2937; font-size: 14px;">${new Date(issue.createdAt).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="color: #4B5563; font-size: 14px;">You'll receive an update when the status of your issue changes. You can also track progress and chat with our team directly in the portal.</p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${issueUrl}" style="background: #10B981; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View My Issue</a>
          </div>
        </div>
        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">Service Portal</p>
      </div>
    `;

    await sgMail.send({
      from: FROM,
      to: tenant.email,
      subject: `Issue received: ${issue.title}`,
      html,
    });

    console.log(`Confirmation email sent to tenant: ${tenant.email}`);
  } catch (error) {
    console.error('Email error (tenant confirmation):', error.message);
  }
};

// Email sent to the TENANT when their issue status changes
const sendTenantStatusEmail = async (issue, tenant) => {
  try {

    const issueUrl = `${process.env.FRONTEND_URL}/tenant/issues/${issue._id}`;

    const statusMessages = {
      'in-progress': { headline: 'Your issue is being worked on 🔧', body: 'Our maintenance team has picked up your issue and is actively working on it.' },
      resolved: { headline: 'Your issue has been resolved ✅', body: 'Great news! Your maintenance issue has been marked as resolved. If the problem persists, please submit a new report.' },
      open: { headline: 'Your issue status was updated', body: 'Your issue has been updated.' },
    };

    const msg = statusMessages[issue.status] || statusMessages.open;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
        <div style="background: ${statusColor(issue.status)}; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">${msg.headline}</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="color: #4B5563; margin-top: 0;">Hi <strong>${tenant.name}</strong>,</p>
          <p style="color: #4B5563;">${msg.body}</p>

          <div style="background: #F9FAFB; border-left: 4px solid ${statusColor(issue.status)}; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 13px; margin: 0 0 4px 0;">Issue</p>
            <p style="color: #1F2937; font-weight: bold; margin: 0;">${issue.title}</p>
          </div>

          ${issue.internalNotes ? `
          <div style="background: #F9FAFB; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #6B7280; font-size: 13px; margin: 0 0 4px 0;">Note from the team</p>
            <p style="color: #1F2937; margin: 0; font-size: 14px;">${issue.internalNotes}</p>
          </div>` : ''}

          <div style="text-align: center; margin-top: 24px;">
            <a href="${issueUrl}" style="background: ${statusColor(issue.status)}; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View Issue</a>
          </div>
        </div>
        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">Service Portal</p>
      </div>
    `;

    await sgMail.send({
      from: FROM,
      to: tenant.email,
      subject: `Issue update: "${issue.title}" is now ${issue.status.replace('-', ' ')}`,
      html,
    });

    console.log(`Status update email sent to tenant: ${tenant.email}`);
  } catch (error) {
    console.error('Email error (tenant status):', error.message);
  }
};

// Email sent to tenant when admin flags issue as their responsibility
const sendResponsibilityEmail = async (issue, tenant) => {
  try {
    const portalUrl = `${process.env.FRONTEND_URL}/tenant/issues/${issue._id}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
        <div style="background: #F59E0B; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">⚠️ Action required: maintenance responsibility</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="color: #4B5563; margin-top: 0;">Hi <strong>${tenant.name}</strong>,</p>
          <p style="color: #4B5563;">After reviewing your issue, we have determined that this maintenance request falls under <strong>your responsibility as the tenant</strong>.</p>

          <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 13px; margin: 0 0 4px 0;">Issue</p>
            <p style="color: #1F2937; font-weight: bold; margin: 0;">${issue.title}</p>
          </div>

          <p style="color: #4B5563;">You can view a list of recommended maintenance professionals in the portal. You are free to contact them, compare quotes, and arrange the work directly.</p>
          <p style="color: #4B5563; font-size: 14px;">If you have questions about this decision, please use the chat on your issue page.</p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${portalUrl}" style="background: #F59E0B; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View Issue &amp; Find Maintenance</a>
          </div>
        </div>
        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">Service Portal</p>
      </div>
    `;

    await sgMail.send({
      from: FROM,
      to: tenant.email,
      subject: `Action required: "${issue.title}" is your responsibility`,
      html,
    });

    console.log(`Responsibility email sent to tenant: ${tenant.email}`);
  } catch (error) {
    console.error('Email error (responsibility):', error.message);
  }
};

// Email notification when a new chat message is received
const sendChatNotificationEmail = async ({ toEmail, toName, fromName, fromRole, issueTitle, issueId, messageText }) => {
  try {
    const portalPath = fromRole === 'tenant' ? 'admin' : 'tenant';
    const issueUrl = `${process.env.FRONTEND_URL}/${portalPath}/issues/${issueId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
        <div style="background: #10B981; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">💬 New Message</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="color: #4B5563; margin-top: 0;">Hi <strong>${toName}</strong>,</p>
          <p style="color: #4B5563;"><strong>${fromName}</strong> sent you a message regarding:</p>

          <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
            <p style="color: #6B7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Issue</p>
            <p style="color: #1F2937; font-weight: bold; margin: 0;">${issueTitle}</p>
          </div>

          <div style="background: #F9FAFB; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #6B7280; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
            <p style="color: #1F2937; margin: 0; font-size: 15px; line-height: 1.6;">${messageText}</p>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${issueUrl}" style="background: #10B981; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reply in Portal</a>
          </div>
        </div>
        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">Service Portal</p>
      </div>
    `;

    await sgMail.send({
      from: FROM,
      to: toEmail,
      subject: `New message from ${fromName}: "${issueTitle}"`,
      html,
    });

    console.log(`Chat notification email sent to ${toEmail}`);
  } catch (error) {
    console.error('Email error (chat notification):', error.message);
  }
};

const sendOtpEmail = async (toEmail, otp) => {
  await sgMail.send({
    from: FROM,
    to: toEmail,
    subject: 'Bekreft ny e-postadresse — Service Portal',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <div style="background:#10B981;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;">Bekreft e-postendring</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 8px 8px;border:1px solid #E5E7EB;">
          <p style="color:#4B5563;">Din bekreftelseskode er:</p>
          <div style="text-align:center;margin:24px 0;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1F2937;">${otp}</span>
          </div>
          <p style="color:#6B7280;font-size:13px;">Koden er gyldig i 10 minutter. Del den ikke med andre.</p>
        </div>
      </div>
    `,
  });
  console.log('OTP email sent to', toEmail);
};

const sendAnnouncementEmail = async (tenants, title, body) => {
  const valid = tenants.filter(t => t.email);
  if (!valid.length) { console.warn('[ANNOUNCEMENT EMAIL] no valid recipients'); return; }

  // Send ONE API call with personalizations — avoids rate-limit/credit errors from looping
  const msg = {
    from: FROM,
    subject: `Announcement: ${title} — Service Portal`,
    personalizations: valid.map(t => ({
      to: [{ email: t.email }],
      substitutions: { '{{name}}': t.name || 'Tenant' },
    })),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;"><div style="background:#10B981;padding:20px;border-radius:8px 8px 0 0;text-align:center;"><h1 style="color:white;margin:0;font-size:22px;">${title}</h1></div><div style="background:white;padding:30px;border-radius:0 0 8px 8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);"><p style="color:#4B5563;margin-top:0;">Hi <strong>{{name}}</strong>,</p><div style="background:#F9FAFB;border-left:4px solid #10B981;padding:16px;border-radius:4px;white-space:pre-wrap;color:#1F2937;line-height:1.6;">${body}</div><p style="color:#9CA3AF;font-size:12px;margin-top:24px;">Service Portal</p></div></div>`,
  };

  try {
    await sgMail.send(msg);
    console.log('[ANNOUNCEMENT EMAIL] sent to', valid.length, 'recipients in one call');
  } catch (e) {
    console.error('[ANNOUNCEMENT EMAIL] failed:', e.response?.body?.errors?.[0]?.message || e.message);
    throw e;
  }
};

const sendInspectionRedoEmail = async (tenant, inspection, reason) => {
  try {
    const due = new Date(inspection.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#F59E0B;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;">⚠️ Please Redo Your Safety Inspection</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 8px 8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <p style="color:#4B5563;margin-top:0;">Hi <strong>${tenant.name}</strong>,</p>
          <p style="color:#4B5563;">Your previous inspection submission has been reviewed and we need you to <strong>redo it</strong>.</p>
          ${reason ? `
          <div style="background:#FFFBEB;border-left:4px solid #F59E0B;padding:16px;border-radius:4px;margin:20px 0;">
            <p style="color:#92400E;font-weight:bold;margin:0 0 6px 0;">Reason from the admin:</p>
            <p style="color:#78350F;margin:0;">${reason}</p>
          </div>` : ''}
          <p style="color:#4B5563;font-size:14px;">Please log in and complete the inspection again by <strong>${due}</strong>. Make sure photos are clear and well-lit.</p>
          <div style="text-align:center;margin-top:24px;">
            <a href="${loginUrl}" style="background:#F59E0B;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Redo Inspection Now</a>
          </div>
        </div>
        <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:20px;">Service Portal</p>
      </div>
    `;
    await sgMail.send({ from: FROM, to: tenant.email, subject: `Action Required: Please redo your safety inspection`, html });
    console.log(`Redo inspection email sent to ${tenant.email}`);
  } catch (err) {
    console.error('Email error (inspection redo):', err.message);
    throw err;
  }
};

const sendInspectionReminderEmail = async (tenant, inspection) => {
  try {
    const due = new Date(inspection.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#EF4444;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;">🔥 Safety Inspection Reminder</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 8px 8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <p style="color:#4B5563;margin-top:0;">Hi <strong>${tenant.name}</strong>,</p>
          <p style="color:#4B5563;">This is a reminder that you have not yet completed your <strong>safety inspection</strong>.</p>
          <div style="background:#FEF2F2;border-left:4px solid #EF4444;padding:16px;border-radius:4px;margin:20px 0;">
            <p style="color:#991B1B;font-weight:bold;margin:0 0 6px 0;">⏳ Due date: ${due}</p>
            <p style="color:#7F1D1D;margin:0;font-size:14px;">Please log in and complete the safety check for your unit as soon as possible.</p>
          </div>
          <p style="color:#4B5563;font-size:14px;">The inspection covers:</p>
          <ul style="color:#4B5563;font-size:14px;line-height:1.8;">
            <li>🧯 Fire extinguisher</li>
            <li>🔔 Smoke detector</li>
            <li>🍳 Stove heat sensor</li>
          </ul>
          <div style="text-align:center;margin-top:24px;">
            <a href="${loginUrl}" style="background:#EF4444;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Complete Inspection Now</a>
          </div>
        </div>
        <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:20px;">Service Portal</p>
      </div>
    `;
    await sgMail.send({ from: FROM, to: tenant.email, subject: `⚠️ Reminder: Complete your safety inspection by ${due}`, html });
    console.log(`Inspection reminder sent to ${tenant.email}`);
  } catch (err) {
    console.error('Email error (inspection reminder):', err.message);
    throw err;
  }
};

const sendDocumentEmail = async (tenant, title, fileUrl) => {
  try {
    const portalUrl = `${process.env.FRONTEND_URL}/tenant/notices`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
        <div style="background:#10B981;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;">📄 New Document Available</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 8px 8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <p style="color:#4B5563;margin-top:0;">Hi <strong>${tenant.name}</strong>,</p>
          <p style="color:#4B5563;">A new document has been uploaded for you in your tenant portal:</p>
          <div style="background:#F0FDF4;border-left:4px solid #10B981;padding:16px;border-radius:4px;margin:20px 0;">
            <p style="color:#065F46;font-weight:bold;margin:0;font-size:16px;">📄 ${title}</p>
          </div>
          <p style="color:#4B5563;font-size:14px;">You can view and download the document by clicking the button below or logging in to your portal under <strong>Messages &amp; Documents → Documents</strong>.</p>
          <div style="text-align:center;margin-top:24px;">
            <a href="${portalUrl}" style="background:#10B981;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">View Document</a>
          </div>
        </div>
        <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:20px;">Service Portal</p>
      </div>
    `;
    await sgMail.send({ from: FROM, to: tenant.email, subject: `New document: ${title}`, html });
    console.log(`Document email sent to ${tenant.email}`);
  } catch (err) {
    console.error('Email error (document):', err.message);
  }
};

module.exports = { sendNewIssueEmail, sendStatusChangeEmail, sendTenantConfirmationEmail, sendTenantStatusEmail, sendWelcomeEmail, sendChatNotificationEmail, sendResponsibilityEmail, sendOtpEmail, sendAnnouncementEmail, sendInspectionReminderEmail, sendInspectionRedoEmail, sendDocumentEmail };

// Welcome email sent to tenant when admin creates their account
async function sendWelcomeEmail(tenant, rawPassword) {
  try {
    const settings = await Settings.getGlobal();
    const customBody = settings.welcomeEmailBody.replace(/\n/g, '<br>');
    const loginUrl = `${process.env.FRONTEND_URL}/login`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
        <div style="background: #10B981; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to the Service Portal 🏠</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="color: #4B5563; margin-top: 0;">Hi <strong>${tenant.name}</strong>,</p>
          <p style="color: #4B5563;">${customBody}</p>

          <div style="background: #F0FDF4; border: 2px solid #10B981; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #065F46; font-weight: bold; margin: 0 0 12px 0; font-size: 15px;">Your Login Credentials</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6B7280; font-size: 14px; white-space: nowrap; padding-right: 20px; width: 1%;">Email</td>
                <td style="padding: 6px 0; color: #1F2937; font-weight: bold; font-size: 14px; word-break: break-all;">${tenant.email}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280; font-size: 14px; white-space: nowrap; padding-right: 20px; width: 1%;">Pass</td>
                <td style="padding: 6px 0; color: #1F2937; font-weight: bold; font-size: 14px; letter-spacing: 1px; word-break: break-all;">${rawPassword}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280; font-size: 14px; white-space: nowrap; padding-right: 20px; width: 1%;">Address</td>
                <td style="padding: 6px 0; color: #1F2937; font-size: 14px;">${tenant.unit}</td>
              </tr>
              ${tenant.building ? `<tr>
                <td style="padding: 6px 0; color: #6B7280; font-size: 14px; white-space: nowrap; padding-right: 20px; width: 1%;">Unit</td>
                <td style="padding: 6px 0; color: #1F2937; font-size: 14px;">${tenant.building}</td>
              </tr>` : ''}
            </table>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${loginUrl}" style="background: #10B981; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Login to Portal</a>
          </div>
        </div>
        <div style="margin-top: 32px; border-top: 1px solid #F3F4F6; padding-top: 20px; text-align: center;">
          <a href="${loginUrl}#privacy" style="display: inline-block; color: #9CA3AF; font-size: 12px; text-decoration: none;">🔒 Privacy Policy</a>
        </div>
      </div>
    `;

    await sgMail.send({
      from: FROM,
      to: tenant.email,
      subject: `Welcome to the Service Portal — Your Login Details`,
      html,
    });

    console.log(`Welcome email sent to: ${tenant.email}`);
  } catch (error) {
    console.error('Email error (welcome):', error.message);
    console.error('SendGrid error details:', JSON.stringify(error.response?.body || error, null, 2));
  }
}





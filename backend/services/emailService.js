const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const priorityColor = (priority) => {
  const colors = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
  return colors[priority] || '#6B7280';
};

const statusColor = (status) => {
  const colors = { open: '#3B82F6', 'in-progress': '#F59E0B', resolved: '#10B981' };
  return colors[status] || '#6B7280';
};

// Email sent to admin when a new issue is created
const sendNewIssueEmail = async (issue, tenant) => {
  try {
    const transporter = createTransporter();
    const issueUrl = `${process.env.FRONTEND_URL}/admin/issues/${issue._id}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
        <div style="background: #10B981; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Maintenance Issue Reported</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1F2937; margin-top: 0;">${issue.title}</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280; width: 40%;">Tenant Name</td>
              <td style="padding: 10px 0; color: #1F2937; font-weight: bold;">${tenant.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280;">Unit</td>
              <td style="padding: 10px 0; color: #1F2937;">${issue.unit}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280;">Category</td>
              <td style="padding: 10px 0; color: #1F2937;">${issue.category}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 0; color: #6B7280;">Priority</td>
              <td style="padding: 10px 0;">
                <span style="background: ${priorityColor(issue.priority)}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 13px; text-transform: uppercase;">${issue.priority}</span>
              </td>
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
        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">Tenant Issue Reporting Portal — SuperStay</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"SuperStay Portal" <${process.env.EMAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `[${issue.priority.toUpperCase()}] New Issue: ${issue.title} — ${tenant.name} (${issue.unit})`,
      html,
    });

    console.log('New issue email sent to admin');
  } catch (error) {
    console.error('Email error (new issue):', error.message);
  }
};

// Email sent when issue status changes
const sendStatusChangeEmail = async (issue, tenant, updatedBy) => {
  try {
    const transporter = createTransporter();
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
        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">Tenant Issue Reporting Portal — SuperStay</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"SuperStay Portal" <${process.env.EMAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL,
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
    const transporter = createTransporter();
    const issueUrl = `${process.env.FRONTEND_URL}/tenant/issues/${issue._id}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
        <div style="background: #10B981; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">We've Received Your Issue ✅</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="color: #4B5563; margin-top: 0;">Hi <strong>${tenant.name}</strong>,</p>
          <p style="color: #4B5563;">Your maintenance issue has been received and our team will look into it shortly.</p>

          <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <h2 style="color: #1F2937; margin: 0 0 12px 0; font-size: 16px;">${issue.title}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6B7280; width: 40%; font-size: 14px;">Unit</td>
                <td style="padding: 6px 0; color: #1F2937; font-size: 14px;">${issue.unit}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Category</td>
                <td style="padding: 6px 0; color: #1F2937; font-size: 14px;">${issue.category}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Priority</td>
                <td style="padding: 6px 0; font-size: 14px;">
                  <span style="background: ${priorityColor(issue.priority)}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; text-transform: uppercase;">${issue.priority}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Submitted</td>
                <td style="padding: 6px 0; color: #1F2937; font-size: 14px;">${new Date(issue.createdAt).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="color: #4B5563; font-size: 14px;">You'll receive another email when the status of your issue is updated. You can also track progress and chat with the team directly in the portal.</p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${issueUrl}" style="background: #10B981; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View My Issue</a>
          </div>
        </div>
        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">Tenant Issue Reporting Portal — SuperStay</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"SuperStay Portal" <${process.env.EMAIL_FROM}>`,
      to: tenant.email,
      subject: `Issue Received: ${issue.title}`,
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
    const transporter = createTransporter();
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
        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">Tenant Issue Reporting Portal — SuperStay</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"SuperStay Portal" <${process.env.EMAIL_FROM}>`,
      to: tenant.email,
      subject: `Issue Update: "${issue.title}" is now ${issue.status.replace('-', ' ')}`,
      html,
    });

    console.log(`Status update email sent to tenant: ${tenant.email}`);
  } catch (error) {
    console.error('Email error (tenant status):', error.message);
  }
};

module.exports = { sendNewIssueEmail, sendStatusChangeEmail, sendTenantConfirmationEmail, sendTenantStatusEmail };

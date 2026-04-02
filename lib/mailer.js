const nodemailer = require('nodemailer');

const RECIPIENT_EMAIL = 'sharmaji6430@gmail.com';
const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];

function hasMailConfig() {
  return requiredEnvVars.every((key) => process.env[key]);
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMailHtml(title, data) {
  const rows = Object.entries(data)
    .map(([key, value]) => {
      const label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
      return `
        <tr>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-weight:700;background:#f8fafc;">${escapeHtml(label)}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(value) || '-'}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;">
      <h2 style="margin-bottom:16px;">${escapeHtml(title)}</h2>
      <table style="border-collapse:collapse;width:100%;max-width:720px;">
        ${rows}
      </table>
    </div>
  `;
}

function normalizePayload(formType, parsed) {
  if (formType === 'quote') {
    return {
      form_type: 'Hero Quote Form',
      full_name: parsed.name || '',
      phone_number: parsed.phone || '',
      moving_from: parsed.from || '',
      moving_to: parsed.to || '',
      submitted_at: new Date().toISOString()
    };
  }

  return {
    form_type: 'Detailed Contact Form',
    full_name: parsed.full_name || '',
    phone_number: parsed.phone_number || '',
    moving_from: parsed.moving_from || '',
    moving_to: parsed.moving_to || '',
    move_type: parsed.move_type || '',
    move_date: parsed.move_date || '',
    details: parsed.details || '',
    submitted_at: new Date().toISOString()
  };
}

async function sendLeadEmail(formType, payload) {
  if (!hasMailConfig()) {
    throw new Error('Mail server is not configured yet. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM.');
  }

  const normalized = normalizePayload(formType, payload);
  const transporter = getTransporter();

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: RECIPIENT_EMAIL,
    replyTo: process.env.MAIL_FROM,
    subject: `EOS Website Lead: ${normalized.form_type}`,
    text: Object.entries(normalized)
      .map(([key, value]) => `${key}: ${value || '-'}`)
      .join('\n'),
    html: buildMailHtml('New EOS Website Lead', normalized)
  });

  return {
    ok: true,
    message: 'Thanks! Your request has been sent to EOS Packers and Movers.'
  };
}

module.exports = {
  hasMailConfig,
  sendLeadEmail
};

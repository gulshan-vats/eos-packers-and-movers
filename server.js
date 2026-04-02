const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const RECIPIENT_EMAIL = 'sharmaji6430@gmail.com';
const indexPath = path.join(__dirname, 'index.html');

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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
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

async function handleFormSubmission(req, res, formType) {
  try {
    if (!hasMailConfig()) {
      sendJson(res, 500, {
        ok: false,
        error: 'Mail server is not configured yet. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM.'
      });
      return;
    }

    const rawBody = await readRequestBody(req);
    const parsed = rawBody ? JSON.parse(rawBody) : {};
    const transporter = getTransporter();

    const normalized = formType === 'quote'
      ? {
          form_type: 'Hero Quote Form',
          full_name: parsed.name || '',
          phone_number: parsed.phone || '',
          moving_from: parsed.from || '',
          moving_to: parsed.to || '',
          submitted_at: new Date().toISOString()
        }
      : {
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

    sendJson(res, 200, {
      ok: true,
      message: 'Thanks! Your request has been sent to EOS Packers and Movers.'
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message || 'Unable to send the email right now.'
    });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    try {
      const html = fs.readFileSync(indexPath, 'utf8');
      sendHtml(res, html);
    } catch (error) {
      sendJson(res, 500, { ok: false, error: 'Unable to load index.html.' });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/quote') {
    await handleFormSubmission(req, res, 'quote');
    return;
  }

  if (req.method === 'POST' && req.url === '/api/contact') {
    await handleFormSubmission(req, res, 'contact');
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, {
      ok: true,
      mailConfigured: hasMailConfig()
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not found.' });
});

server.listen(PORT, HOST, () => {
  console.log(`EOS site running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});

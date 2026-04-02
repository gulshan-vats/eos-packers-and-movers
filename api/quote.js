const { sendLeadEmail } = require('../lib/mailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed.' });
    return;
  }

  try {
    const result = await sendLeadEmail('quote', req.body || {});
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || 'Unable to send the email right now.'
    });
  }
};

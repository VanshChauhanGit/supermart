const express = require('express');
const router = express.Router();

// GET Generate WhatsApp Click-to-Chat URL
router.post('/generate-link', (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Phone and message text are required' });
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/91${cleanPhone}?text=${encoded}`;

    res.json({
      success: true,
      data: {
        phone: cleanPhone,
        rawMessage: message,
        waUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Send Automated WhatsApp Webhook Notification (Mock Gateway API)
router.post('/send-webhook', (req, res) => {
  const { phone, message, type = 'UDHAR_NOTICE' } = req.body;

  console.log(`[WhatsApp Gateway Dispatch] Sending ${type} to +91-${phone}...`);
  res.json({
    success: true,
    messageId: 'wa_msg_' + Date.now(),
    status: 'DISPATCHED_TO_WHATSAPP',
    recipient: phone,
    timestamp: new Date()
  });
});

module.exports = router;

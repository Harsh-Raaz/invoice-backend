// src/controllers/twilio.controller.js
import { sendWhatsAppText as sendTwilioWhatsAppText, sendWhatsAppMedia as sendTwilioWhatsAppMedia } from '../utils/send-twilio-whatsapp.js';

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

if (!ACCOUNT_SID || !AUTH_TOKEN) {
  console.warn(
    "⚠️ TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set in env"
  );
}

// Send WhatsApp Text Message
export const sendWhatsAppText = async (req, res) => {
  try {
    const { to, text } = req.body;
    if (!to || !text) {
      return res
        .status(400)
        .json({ success: false, message: "to and text are required" });
    }

    const message = await sendTwilioWhatsAppText(to, text);

    console.log("✅ WhatsApp message sent via Twilio to:", to);
    return res.status(200).json({ success: true, data: message });
  } catch (err) {
    console.error("sendWhatsAppText error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message });
  }
};

// Send WhatsApp Media Message (PDF, image, etc.)
export const sendWhatsAppMedia = async (req, res) => {
  try {
    const { to, mediaUrl, body } = req.body;
    
    if (!to || !mediaUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "to and mediaUrl are required" 
      });
    }

    const message = await sendTwilioWhatsAppMedia(to, mediaUrl, body);

    console.log("✅ WhatsApp media sent via Twilio to:", to);
    return res.status(200).json({ success: true, data: message });
    
  } catch (err) {
    console.error("sendWhatsAppMedia error:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Webhook Receiver (for incoming WhatsApp messages)
export const webhookReceiver = async (req, res) => {
  try {
    const { From, Body, MediaUrl0, NumMedia } = req.body;
    
    console.log(`📩 WhatsApp message from ${From}:`, Body);
    
    if (NumMedia > 0) {
      console.log(`📎 Media received: ${MediaUrl0}`);
    }

    res.status(200).set('Content-Type', 'text/xml').end();
  } catch (err) {
    console.error("webhookReceiver error:", err);
    res.status(500).end();
  }
};
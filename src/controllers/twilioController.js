// controllers/twilioController.js
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendWhatsAppMedia = async (req, res) => {
  try {
    const { to, body, mediaUrl } = req.body;

    if (!to || !body || !mediaUrl) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${to.startsWith('+') ? to : '+' + to}`,
      body,
      mediaUrl: [mediaUrl],
    });

    res.json({
      success: true,
      sid: result.sid,
      message: "WhatsApp message sent successfully",
    });
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

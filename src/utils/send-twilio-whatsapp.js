// src/utils/send-twilio-whatsapp.js
import twilio from "twilio";

/** Format phone number for WhatsApp */
function formatWhatsAppNumber(phone) {
  if (!phone) return phone;
  let p = String(phone).trim().replace(/[()\s-]+/g, "");
  if (p.startsWith("whatsapp:")) p = p.replace("whatsapp:", "");
  if (!p.startsWith("+")) p = `+${p}`;
  return `whatsapp:${p}`;
}

/** Send WhatsApp text message */
export async function sendWhatsAppText(to, text) {
  const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_WHATSAPP =
    process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

  if (!ACCOUNT_SID || !AUTH_TOKEN)
    throw new Error("Twilio config missing (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)");
  if (!to || !text) throw new Error("sendWhatsAppText requires to and text");

  const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  const toFormatted = formatWhatsAppNumber(to);

  try {
    return await client.messages.create({
      body: text,
      from: TWILIO_WHATSAPP,
      to: toFormatted,
    });
  } catch (err) {
    console.error("Twilio WhatsApp text error:", err);
    throw err;
  }
}
/** Send WhatsApp message with media (PDF, image, etc.) */
export async function sendWhatsAppMedia(to, mediaUrl, body = "") {
  const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_WHATSAPP =
    process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

  if (!ACCOUNT_SID || !AUTH_TOKEN)
    throw new Error("Twilio config missing (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)");
  if (!to || !mediaUrl)
    throw new Error("sendWhatsAppMedia requires to and mediaUrl");

  const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  const toFormatted = formatWhatsAppNumber(to);

  // ✅ Fix localhost URL so Twilio can access the file
  let fixedUrl = mediaUrl;
  const ngrokBase = "https://nonparticipating-melia-laconical.ngrok-free.dev"; // replace if you restart ngrok later

  if (fixedUrl.startsWith("http://localhost:3500")) {
    fixedUrl = fixedUrl.replace("http://localhost:3500", ngrokBase);
  }

  console.log("📎 Final media URL for Twilio:", fixedUrl);

  try {
    return await client.messages.create({
      body,
      from: TWILIO_WHATSAPP,
      to: toFormatted,
      mediaUrl: [fixedUrl],
    });
  } catch (err) {
    console.error("Twilio WhatsApp media error:", err);
    throw err;
  }
}

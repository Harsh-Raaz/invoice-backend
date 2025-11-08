// src/routes/twilio.routes.js
import { Router } from "express";
import {
  sendWhatsAppText,
  sendWhatsAppMedia,
  webhookReceiver,
} from "../controllers/twilio.controller.js";

const router = Router();

// WhatsApp endpoints
router.post("/send-whatsapp-text", sendWhatsAppText);
router.post("/send-whatsapp-media", sendWhatsAppMedia);

// Webhooks (for receiving messages)
router.post("/webhook", webhookReceiver);

export default router;
// routes/twilioRoutes.js
import express from "express";
import { sendWhatsAppMedia } from "../controllers/twilioController.js";

const router = express.Router();

router.post("/send-whatsapp-media", sendWhatsAppMedia);

export default router;

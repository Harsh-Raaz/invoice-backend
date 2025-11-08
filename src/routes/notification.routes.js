import express from "express";
import {
  sendWhatsappMessage,
  sendInvoiceEmail,
} from "../controllers/notifications.controller.js";

const router = express.Router();

console.log("🔧 Loading notification routes...");

// Debug middleware for notification routes
router.use((req, res, next) => {
  console.log("📱 Notification route hit:", {
    path: req.path,
    method: req.method,
    body: req.body,
  });
  next();
});

// WhatsApp route
router.post(
  "/send",
  (req, res, next) => {
    console.log("💬 WhatsApp send endpoint hit");
    next();
  },
  sendWhatsappMessage
);

// Invoice email route
router.post(
  "/send-invoice-email",
  (req, res, next) => {
    console.log("📧 Email send endpoint hit");
    next();
  },
  sendInvoiceEmail
);

console.log("✅ Notification routes loaded:");
console.log("   POST /api/notifications/send");
console.log("   POST /api/notifications/send-invoice-email");

export default router;
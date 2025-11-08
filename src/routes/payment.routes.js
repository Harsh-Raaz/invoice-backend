// src/routes/payment.routes.js
import express from "express";
import {
  createCheckoutSession,
  stripeWebhook,
} from "../controllers/payment.controller.js";

const router = express.Router();

// Create Stripe Checkout Session
router.post("/create-checkout-session", createCheckoutSession);

// Stripe Webhook
router.post("/webhook/stripe", stripeWebhook);

export default router;
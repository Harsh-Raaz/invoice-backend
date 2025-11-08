import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import invoiceRoutes from "./routes/invoice.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import twilioRoutes from "./routes/twilio.routes.js"; // ✅ Changed from whatsappRoutes
import notificationRoutes from "./routes/notification.routes.js";
import authRoutes from "./routes/auth.routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import { stripeWebhooks } from "./controllers/webhooks.js";

const app = express();

// --------------------
// ✅ CORS Configuration (Fixes frontend request issue)
// --------------------
// Trigger Render redeploy

app.use(
  cors({
    origin: "http://localhost:5173", // your React frontend
    credentials: true, // allow cookies if needed
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// --------------------
// Stripe webhooks (before parsers)
// --------------------
app.post(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhooks
);

app.post(
  "/api/payments/webhook/stripe",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.isStripeWebhook = true;
    next();
  }
);

// --------------------
// Parsers
// --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------
// Static files
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/public", express.static(path.join(__dirname, "../public")));

// --------------------
// Routes
// --------------------
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/twilio", twilioRoutes); // ✅ Changed from /api/whatsapp
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);

// --------------------
// Health check
// --------------------
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "API is running" });
});

// --------------------
// Catch-all 404
// --------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// --------------------
// Global Error Handler
// --------------------
app.use(errorMiddleware);

export default app;
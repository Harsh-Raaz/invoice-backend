// src/routes/invoice.routes.js
import express from "express";
import path from "path";
import Invoice from "../models/invoice.model.js";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  generateInvoicePDF,
} from "../controllers/invoice.controller.js";
// FIX: Change from notification.controller.js to notifications.controller.js
import {
  sendInvoiceWhatsapp,
  sendInvoiceEmail,
} from "../controllers/notifications.controller.js"; // ✅ Added 's'
import { verifyJWT } from "../middlewares/auth.middleware.js";

console.log("Invoice routes loaded");

const router = express.Router();

// --------------------
// CREATE invoice
// --------------------
router.post("/", verifyJWT, createInvoice);

// --------------------
// GET all invoices
// Supports query params: invoiceNumber, clientName, customerEmail
// --------------------
router.get("/", verifyJWT, getInvoices);

// --------------------
// GET invoice by ID
// --------------------
router.get("/:id", verifyJWT, getInvoiceById);

// --------------------
// GENERATE invoice PDF
// --------------------
router.post("/:id/pdf", verifyJWT, generateInvoicePDF);

// --------------------
// DOWNLOAD invoice PDF
// --------------------
router.get("/:id/download", verifyJWT, async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (!invoice.pdfUrl)
      return res.status(404).json({ message: "PDF not generated yet" });

    // Restrict download to invoice owner if applicable
    if (
      invoice.createdBy &&
      req.user &&
      String(invoice.createdBy) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to download this invoice" });
    }

    // Extract filename from URL and serve from public/invoices
    const fileName = path.basename(invoice.pdfUrl);
    const filePath = path.join(process.cwd(), "public", "invoices", fileName);

    res.download(filePath, `${invoice.invoiceNumber}.pdf`, (err) => {
      if (err) {
        console.error("Error sending PDF:", err);
        res
          .status(500)
          .json({ message: "Error sending PDF", error: err.message });
      }
    });
  } catch (err) {
    console.error("Error downloading PDF:", err);
    res
      .status(500)
      .json({ message: "Error downloading PDF", error: err.message });
  }
});

// --------------------
// SEND invoice via WhatsApp
// --------------------
router.post("/:id/whatsapp", verifyJWT, sendInvoiceWhatsapp);

// --------------------
// SEND invoice via Email
// --------------------
router.post("/:id/email", verifyJWT, sendInvoiceEmail);

export default router;
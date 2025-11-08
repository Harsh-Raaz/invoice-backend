// src/controllers/notifications.controller.js
import asyncHandler from "../utils/async-handler.js";
import Invoice from "../models/invoice.model.js";
import ApiError from "../utils/api-error.js";
import { 
  sendWhatsAppText, 
  sendWhatsAppMedia 
} from "../utils/send-twilio-whatsapp.js";

/**
 * Send invoice via WhatsApp (PDF)
 */
export const sendInvoiceWhatsapp = asyncHandler(async (req, res) => {
  console.log("📎 sendInvoiceWhatsapp controller called");
  console.log("📋 Request params:", req.params);
  console.log("📋 Request body:", req.body);

  const invoiceId = req.params.id;
  const { to, message } = req.body;

  if (!invoiceId) {
    throw new ApiError(400, "Invoice ID is required");
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new ApiError(404, "Invoice not found");

  const recipient = to || invoice.customerPhone;
  
  if (!recipient) {
    throw new ApiError(400, "Recipient phone number is required");
  }

  if (!invoice.pdfUrl) {
    throw new ApiError(400, "Invoice PDF not generated yet");
  }

  console.log("✅ Validation passed");
  console.log("📞 Recipient:", recipient);
  console.log("📄 Invoice PDF:", invoice.pdfUrl);
  console.log("📋 Invoice Number:", invoice.invoiceNumber);

  try {
    const whatsappMessage = message || `Invoice ${invoice.invoiceNumber} for ${invoice.amount} is ready. Due: ${invoice.dueDate}.`;

    const result = await sendWhatsAppMedia(recipient, invoice.pdfUrl, whatsappMessage);
    
    console.log("✅ WhatsApp PDF sent via Twilio:", result.sid);

    await Invoice.findByIdAndUpdate(invoiceId, { 
      whatsappStatus: "sent",
      lastNotification: new Date(),
      notificationMethod: "whatsapp"
    });

    res.status(200).json({
      success: true,
      message: "Invoice sent via WhatsApp successfully",
      data: { 
        to: recipient, 
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        messageId: result.sid,
        status: result.status
      },
    });

  } catch (error) {
    console.error("❌ Twilio WhatsApp error:", error);
    
    await Invoice.findByIdAndUpdate(invoiceId, { 
      whatsappStatus: "failed",
      lastNotification: new Date()
    });

    throw new ApiError(500, `Failed to send WhatsApp message: ${error.message}`);
  }
});

/**
 * Send invoice email
 */
export const sendInvoiceEmail = asyncHandler(async (req, res) => {
  console.log("📧 sendInvoiceEmail controller called");
  console.log("📋 Request params:", req.params);
  console.log("📋 Request body:", req.body);

  const invoiceId = req.params.id;
  const { to, subject, html } = req.body;

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new ApiError(404, "Invoice not found");

  const recipient = to || invoice.customerEmail;

  if (!recipient || !subject || !html) {
    console.log("❌ Validation failed: Missing required email fields");
    return res.status(400).json({
      success: false,
      message: "Recipient email, subject, and HTML content are required",
    });
  }

  console.log("✅ Email validation passed");
  console.log("📩 To:", recipient);
  console.log("📋 Subject:", subject);
  console.log("📄 Invoice ID:", invoiceId);

  console.log("🤖 Simulating email sending...");

  res.status(200).json({
    success: true,
    message: "Invoice email sent (stub)",
    data: { to: recipient, subject, invoiceId },
  });

  console.log("✅ Email response sent");
});

/**
 * Send generic WhatsApp message
 */
export const sendWhatsappMessage = asyncHandler(async (req, res) => {
  console.log("📲 sendWhatsappMessage controller called");
  console.log("📋 Request body:", req.body);

  const { to, message, invoiceId } = req.body;

  if (!to || !message) {
    console.log("❌ Validation failed: Missing to or message");
    return res.status(400).json({
      success: false,
      message: "Recipient number and message required",
    });
  }

  try {
    const result = await sendWhatsAppText(to, message);
    
    console.log("✅ WhatsApp message sent via Twilio:", result.sid);

    if (invoiceId) {
      await Invoice.findByIdAndUpdate(invoiceId, { 
        whatsappStatus: "sent",
        lastNotification: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: "WhatsApp message sent successfully",
      data: { 
        to, 
        message, 
        invoiceId,
        messageId: result.sid,
        status: result.status
      },
    });

  } catch (error) {
    console.error("❌ Twilio WhatsApp error:", error);
    
    if (invoiceId) {
      await Invoice.findByIdAndUpdate(invoiceId, { 
        whatsappStatus: "failed",
        lastNotification: new Date()
      });
    }

    throw new ApiError(500, `Failed to send WhatsApp message: ${error.message}`);
  }
});

/**
 * Send complete invoice notification (WhatsApp text + PDF if available)
 */
export const sendCompleteInvoiceNotification = asyncHandler(async (req, res) => {
  console.log("🚀 sendCompleteInvoiceNotification controller called");
  console.log("📋 Request body:", req.body);

  const { invoiceId, message } = req.body;

  if (!invoiceId) {
    throw new ApiError(400, "Invoice ID is required");
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new ApiError(404, "Invoice not found");

  if (!invoice.customerPhone) {
    throw new ApiError(400, "Customer phone number is required for notifications");
  }

  console.log("✅ Starting complete notification for invoice:", invoice.invoiceNumber);

  const results = {
    text: null,
    media: null
  };

  try {
    const whatsappMessage = message || `Your invoice ${invoice.invoiceNumber} for ${invoice.amount} is ready. Due: ${invoice.dueDate}.`;
    results.text = await sendWhatsAppText(invoice.customerPhone, whatsappMessage);
    console.log("✅ WhatsApp text sent:", results.text.sid);

    if (invoice.pdfUrl) {
      results.media = await sendWhatsAppMedia(
        invoice.customerPhone,
        invoice.pdfUrl,
        `Invoice ${invoice.invoiceNumber}`
      );
      console.log("✅ WhatsApp PDF sent:", results.media.sid);
    }

    await Invoice.findByIdAndUpdate(invoiceId, { 
      whatsappStatus: "sent",
      lastNotification: new Date(),
      notificationMethod: "complete"
    });

    res.status(200).json({
      success: true,
      message: "Invoice notifications sent successfully via WhatsApp",
      data: { 
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        textSent: true,
        pdfSent: !!invoice.pdfUrl,
        results
      },
    });

  } catch (error) {
    console.error("❌ Complete notification error:", error);
    
    const updateData = {
      lastNotification: new Date(),
      notificationMethod: "complete"
    };
    
    if (!results.text) {
      updateData.whatsappStatus = "failed";
    } else if (!results.media && invoice.pdfUrl) {
      updateData.whatsappStatus = "partial";
    }
    
    await Invoice.findByIdAndUpdate(invoiceId, updateData);

    throw new ApiError(500, `Failed to send complete notification: ${error.message}`);
  }
});

console.log('✅ notifications.controller.js loaded with exports:', {
  sendInvoiceWhatsapp: typeof sendInvoiceWhatsapp,
  sendInvoiceEmail: typeof sendInvoiceEmail,
  sendWhatsappMessage: typeof sendWhatsappMessage,
  sendCompleteInvoiceNotification: typeof sendCompleteInvoiceNotification
});
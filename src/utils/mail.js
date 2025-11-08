// src/utils/mail.js
import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const MAIL_PRODUCT = {
  name: process.env.MAIL_PRODUCT_NAME || "InvoiceFlow",
  link: process.env.MAIL_PRODUCT_LINK || "https://invoiceflow.example.com",
};

/**
 * createTransporter()
 * - If MAIL_PROVIDER=ethereal or NODE_ENV=development and MAIL_PROVIDER not set,
 *   creates an Ethereal test account (useful for local dev).
 * - Otherwise uses generic SMTP config (Mailtrap, Mailgun SMTP, SendGrid SMTP, etc.)
 *
 * Required SMTP env vars (when not using ethereal):
 *   MAIL_HOST
 *   MAIL_PORT
 *   MAIL_USER
 *   MAIL_PASS
 *   MAIL_SECURE (optional, "true" -> true)
 */
async function createTransporter() {
  // cache transporter across calls
  if (createTransporter._transporter) return createTransporter._transporter;

  const provider =
    process.env.MAIL_PROVIDER ||
    (process.env.NODE_ENV === "development" ? "ethereal" : "smtp");

  if (provider === "ethereal") {
    const testAccount = await nodemailer.createTestAccount();
    const tr = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    tr._isEthereal = true;
    createTransporter._transporter = tr;
    createTransporter._previewAccount = testAccount;
    return tr;
  }

  const host = process.env.MAIL_HOST;
  const port = parseInt(process.env.MAIL_PORT || "587", 10);
  const secure = process.env.MAIL_SECURE === "true" || port === 465;

  if (!host || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error(
      "SMTP config missing. Set MAIL_HOST, MAIL_PORT (optional), MAIL_USER, MAIL_PASS (or use MAIL_PROVIDER=ethereal for dev)."
    );
  }

  const tr = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });

  tr._isEthereal = false;
  createTransporter._transporter = tr;
  return tr;
}

/**
 * helper: create a Mailgen instance
 */
function getMailgen() {
  return new Mailgen({
    theme: "default",
    product: MAIL_PRODUCT,
  });
}

/**
 * sendEmail({ to, subject, mailGenContent, text })
 * - mailGenContent is the Mailgen "body" object (see Mailgen docs / examples below)
 * - returns { success, info, previewUrl? }
 */
export async function sendEmail({ to, subject, mailGenContent, text, from }) {
  if (!to || !subject || (!mailGenContent && !text)) {
    throw new Error(
      "sendEmail requires to, subject and mailGenContent or text"
    );
  }

  const transporter = await createTransporter();
  const mailgen = getMailgen();

  let html;
  let textBody = text;

  if (mailGenContent) {
    html = mailgen.generate(mailGenContent);
    // generate plaintext if not provided
    textBody = textBody || mailgen.generatePlaintext(mailGenContent);
  }

  const mailOptions = {
    from:
      from ||
      process.env.MAIL_FROM ||
      `${MAIL_PRODUCT.name} <no-reply@${process.env.MAIL_FROM_DOMAIN || "example.com"}>`,
    to,
    subject,
    text: textBody,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    let previewUrl;
    try {
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    } catch (e) {
      previewUrl = undefined;
    }
    return { success: true, info, previewUrl };
  } catch (err) {
    console.error("sendEmail failed:", err);
    return { success: false, error: err.message || err };
  }
}

/* -------------------------
   Mailgen templates (InvoiceFlow)
   ------------------------- */

/**
 * invoiceMailGenContent({ customerName, invoiceNumber, dueDate, amount, items, invoiceUrl })
 * items: array of { name, description, quantity, price }
 */
export function invoiceMailGenContent({
  customerName,
  invoiceNumber,
  dueDate,
  amount,
  items = [],
  invoiceUrl,
}) {
  const tableData = items.map((it) => ({
    item: it.name,
    description: it.description || "",
    quantity: it.quantity != null ? String(it.quantity) : "",
    price: it.price != null ? String(it.price) : "",
  }));

  return {
    body: {
      name: customerName,
      intro: `Your invoice ${invoiceNumber} is ready.`,
      table: {
        data: tableData,
        columns: {
          // customize column widths / alignment if desired
          // customWidth: { description: "20%" },
          // customAlignment: { price: "right" }
        },
      },
      action: {
        instructions: `Total due: ${amount}. Due by ${dueDate}. You can view and download the invoice using the button below:`,
        button: {
          color: "#22BC66",
          text: "View Invoice",
          link: invoiceUrl,
        },
      },
      outro:
        "If you have any questions about this invoice, reply to this email or contact support.",
    },
  };
}

/**
 * paymentReceiptMailGenContent({ customerName, invoiceNumber, amount, paymentId, paymentDate, receiptUrl })
 */
export function paymentReceiptMailGenContent({
  customerName,
  invoiceNumber,
  amount,
  paymentId,
  paymentDate,
  receiptUrl,
}) {
  return {
    body: {
      name: customerName,
      intro: `We have received your payment for invoice ${invoiceNumber}. Thank you!`,
      table: {
        data: [
          { item: "Invoice", description: invoiceNumber, price: "" },
          { item: "Amount", description: "", price: amount },
          { item: "Payment ID", description: paymentId, price: "" },
          { item: "Paid on", description: paymentDate, price: "" },
        ],
      },
      action: {
        instructions: "You can download your receipt using the button below:",
        button: {
          color: "#3869D4",
          text: "Download Receipt",
          link: receiptUrl,
        },
      },
      outro:
        "If something looks incorrect, please reply to this email and we'll help.",
    },
  };
}

/**
 * paymentReminderMailGenContent({ customerName, invoiceNumber, amount, dueDate, payUrl })
 */
export function paymentReminderMailGenContent({
  customerName,
  invoiceNumber,
  amount,
  dueDate,
  payUrl,
}) {
  return {
    body: {
      name: customerName,
      intro: `This is a friendly reminder that invoice ${invoiceNumber} is due on ${dueDate}.`,
      action: {
        instructions: `Total outstanding: ${amount}. Click below to pay now:`,
        button: {
          color: "#FF6B6B",
          text: "Pay Invoice",
          link: payUrl,
        },
      },
      outro:
        "If you already paid, please ignore this message or reply with the payment reference.",
    },
  };
}
export function emailVerificationMailgenConst(username, verificationUrl) {
  return {
    body: {
      name: username,
      intro: "Please verify your email to continue using InvoiceFlow.",
      action: {
        instructions: "Click the button below to verify your email:",
        button: {
          color: "#22BC66",
          text: "Verify Email",
          link: verificationUrl,
        },
      },
      outro: "If you did not sign up, please ignore this email.",
    },
  };
}

export function forgotPasswordMailgenConst(username, resetUrl) {
  return {
    body: {
      name: username,
      intro: "You requested to reset your password.",
      action: {
        instructions: "Click the button below to reset your password:",
        button: {
          color: "#FF6B6B",
          text: "Reset Password",
          link: resetUrl,
        },
      },
      outro:
        "If you did not request a password reset, please ignore this email.",
    },
  };
}

/* -------------------------
   Convenience wrappers
   ------------------------- */

/**
 * sendInvoiceEmail(to, subjectOptions, invoiceData)
 * invoiceData: { customerName, invoiceNumber, dueDate, amount, items, invoiceUrl }
 */
export async function sendInvoiceEmail(to, invoiceData) {
  const subject = `Invoice ${invoiceData.invoiceNumber} from ${MAIL_PRODUCT.name}`;
  const mailGenContent = invoiceMailGenContent(invoiceData);
  return sendEmail({ to, subject, mailGenContent });
}

/**
 * sendPaymentReceiptEmail(to, receiptData)
 * receiptData: { customerName, invoiceNumber, amount, paymentId, paymentDate, receiptUrl }
 */
export async function sendPaymentReceiptEmail(to, receiptData) {
  const subject = `Payment received — Invoice ${receiptData.invoiceNumber}`;
  const mailGenContent = paymentReceiptMailGenContent(receiptData);
  return sendEmail({ to, subject, mailGenContent });
}

/**
 * sendPaymentReminderEmail(to, reminderData)
 * reminderData: { customerName, invoiceNumber, amount, dueDate, payUrl }
 */
export async function sendPaymentReminderEmail(to, reminderData) {
  const subject = `Reminder: Invoice ${reminderData.invoiceNumber} due ${reminderData.dueDate}`;
  const mailGenContent = paymentReminderMailGenContent(reminderData);
  return sendEmail({ to, subject, mailGenContent });
}

export default {
  createTransporter,
  sendEmail,
  sendInvoiceEmail,
  sendPaymentReceiptEmail,
  sendPaymentReminderEmail,
  invoiceMailGenContent,
  paymentReceiptMailGenContent,
  paymentReminderMailGenContent,
};
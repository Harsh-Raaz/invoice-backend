// src/controllers/invoice.controller.js
import ApiResponse from "../utils/api-response.js";
import ApiError from "../utils/api-error.js";
import asyncHandler from "../utils/async-handler.js";
import generatePDF from "../utils/generate-pdf.js";
import Invoice from "../models/invoice.model.js";

/**
 * Create a new invoice (supports frontend payload: { customer, metadata, items })
 */
const createInvoice = asyncHandler(async (req, res) => {
  const { customer, metadata, items = [] } = req.body;

  // --------------------
  // Mandatory fields check
  // --------------------
  if (
    !customer?.name ||
    !customer?.phone ||
    !Array.isArray(items) ||
    items.length === 0 ||
    !metadata?.dueDate ||
    !metadata?.paymentTerms
  ) {
    throw new ApiError(
      400,
      "Customer name, phone, due date, payment terms, and at least one item are required"
    );
  }

  // --------------------
  // Invoice number (auto-generate if not provided)
  // --------------------
  let invoiceNumber = metadata?.invoiceNo || `INV-${Date.now()}`;

  // --------------------
  // Check uniqueness
  // --------------------
  const existingInvoice = await Invoice.findOne({ invoiceNumber });
  if (existingInvoice) {
  invoiceNumber = `INV-${Date.now()}`; // fallback unique number
}



  // --------------------
  // Calculate totals
  // --------------------
  const subTotal = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );

  const totalTax = items.reduce(
    (acc, it) =>
      acc +
      ((Number(it.tax) || 0) / 100) *
        ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)),
    0
  );

  const totalDiscount = items.reduce(
    (acc, it) =>
      acc +
      ((Number(it.discount) || 0) / 100) *
        ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)),
    0
  );

  const totalAmount = subTotal + totalTax - totalDiscount;

  // --------------------
  // Create invoice document
  // --------------------
  const invoiceDoc = {
    clientName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email || "",
    clientAddress: customer.address || "",
    items: items.map((it) => ({
  name: it.description,
  quantity: it.quantity,
  price: it.unitPrice,
  tax: it.tax || 0,
  discount: it.discount || 0,
})),

    subTotal,
    tax: totalTax,
    totalAmount,
    language: metadata.language || "en",
    paymentStatus: "pending",
    status: "pending",
    dueDate: new Date(metadata.dueDate),
    paymentTerms: metadata.paymentTerms,
    notes: metadata.notes || "",
    invoiceNumber,
    invoiceDate: metadata.issueDate ? new Date(metadata.issueDate) : new Date(),
    createdBy: req.user?._id ?? null,
  };

  // --------------------
  // Save invoice
  // --------------------
  const invoice = await Invoice.create(invoiceDoc);

  // --------------------
  // Generate PDF
  // --------------------
  try {
    const pdfUrl = await generatePDF(invoice);
    invoice.pdfUrl = pdfUrl;
    await invoice.save();
  } catch (err) {
    console.error("PDF generation failed:", err);
invoice.pdfUrl = null; // save invoice even if PDF fails
await invoice.save();

  }

  // --------------------
  // Return response
  // --------------------
  return res
  .status(201)
  .json(new ApiResponse(201, invoice, "Invoice created successfully"));

});


/**
 * Get all invoices with optional filters (invoiceNumber, clientName, customerEmail)
 */
const getInvoices = asyncHandler(async (req, res) => {
  const { invoiceNumber, clientName, customerEmail } = req.query;

  let filter = req.user?._id ? { createdBy: req.user._id } : {};

  if (invoiceNumber) filter.invoiceNumber = invoiceNumber;
  if (clientName) filter.clientName = { $regex: clientName, $options: "i" };
  if (customerEmail)
    filter.customerEmail = { $regex: customerEmail, $options: "i" };

  const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

  return res
  .status(200)
  .json(new ApiResponse(200, { count: invoices.length, invoices }, "Invoices fetched successfully"));

});

/**
 * Get a single invoice by ID
 */
const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findById(id);

  if (!invoice) throw new ApiError(404, "Invoice not found");

  if (
    invoice.createdBy &&
    req.user &&
    String(invoice.createdBy) !== String(req.user._id)
  ) {
    throw new ApiError(403, "Not authorized to view this invoice");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, invoice, "Invoice fetched successfully"));
});

/**
 * Generate a PDF for an existing invoice
 */
const generateInvoicePDF = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findById(id);

  if (!invoice) throw new ApiError(404, "Invoice not found");

  if (
    invoice.createdBy &&
    req.user &&
    String(invoice.createdBy) !== String(req.user._id)
  ) {
    throw new ApiError(403, "Not authorized to generate this invoice PDF");
  }

  const pdfUrl = await generatePDF(invoice);
  invoice.pdfUrl = pdfUrl;
  await invoice.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { pdfUrl }, "Invoice PDF generated successfully")
    );
});

export { createInvoice, getInvoices, getInvoiceById, generateInvoicePDF };
// src/models/invoice.model.js
import mongoose from "mongoose";

// Item sub-schema
const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Item quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    price: {
      type: Number,
      required: [true, "Item price is required"],
      min: [0, "Price must be >= 0"],
    },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// Invoice schema
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      trim: true,
    },

    // Frontend-friendly fields
    clientName: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    clientEmail: {
      type: String,
      trim: true,
      default: "",
    },
    clientAddress: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    customerPhone: {
      type: String,
      required: [
        true,
        "Customer phone number is required for WhatsApp delivery",
      ],
      trim: true,
    },

    items: {
      type: [itemSchema],
      validate: [
        (arr) => arr.length > 0,
        "Invoice must contain at least one item",
      ],
    },

    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    pdfUrl: {
      type: String,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    whatsappStatus: {
      type: String,
      enum: ["not_sent", "sent", "delivered", "failed"],
      default: "not_sent",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    paymentProvider: {
      type: String,
      enum: ["razorpay", "stripe", null],
      default: null,
    },

    paymentProviderId: {
      type: String,
    },

    language: {
      type: String,
      default: "en",
    },

    status: {
      type: String,
      default: "pending",
      trim: true,
    },

    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },

    paymentTerms: {
      type: String,
      required: [true, "Payment terms are required"],
      trim: true,
    },
  },
  { timestamps: true }
);

// Auto-generate invoice number before validation
invoiceSchema.pre("validate", function (next) {
  if (!this.invoiceNumber) {
    this.invoiceNumber = "INV-" + Date.now();
  }
  next();
});

export default mongoose.model("Invoice", invoiceSchema);
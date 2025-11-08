// src/models/transaction.model.js
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    credits: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    amount: { type: Number, required: true }, // amount in cents
    currency: { type: String, default: "usd" },
    appId: { type: String, default: "quickgpt" },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
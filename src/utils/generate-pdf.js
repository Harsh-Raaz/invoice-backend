// src/utils/generate-pdf.js
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * generatePDF(invoice)
 * invoice = Mongoose doc or plain object with fields:
 *  invoiceNumber, createdAt, customerName, customerPhone, customerEmail,
 *  items: [{name, quantity, price, total}],
 *  subTotal, tax, totalAmount
 *
 * returns: public URL string to the generated PDF
 */
export const generatePDF = async (invoice) => {
  try {
    // Ensure public/invoices exists
    const invoicesDir = path.join(process.cwd(), "public", "invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const filename = `${invoice.invoiceNumber}.pdf`;
    const filepath = path.join(invoicesDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 40 });
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // === Header ===
        doc.fontSize(20).text("INVOICE", { align: "right" });
        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .text(`Invoice No: ${invoice.invoiceNumber}`, { align: "right" });
        doc.text(
          `Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}`,
          { align: "right" }
        );

        doc.moveDown(1);

        // === Vendor block (static for now, replace with your data) ===
        doc.fontSize(12).text("From:");
        doc.fontSize(10).text("Your Shop Name");
        doc.text("Shop Address Line 1");
        doc.text("Phone: 99xxxxxxx");
        doc.moveDown(1);

        // === Customer block ===
        doc.fontSize(12).text("Bill To:");
        doc.fontSize(10).text(invoice.customerName || "-", { width: 250 });
        if (invoice.customerPhone)
          doc.text(`Phone: ${invoice.customerPhone}`, { width: 250 });
        if (invoice.customerEmail)
          doc.text(`Email: ${invoice.customerEmail}`, { width: 250 });
        doc.moveDown(1);

        // === Table Header ===
        doc.fontSize(10);
        const tableTop = doc.y;
        doc.text("Item", 40, tableTop);
        doc.text("Qty", 300, tableTop, { width: 50, align: "right" });
        doc.text("Price", 360, tableTop, { width: 80, align: "right" });
        doc.text("Total", 450, tableTop, { width: 80, align: "right" });
        doc
          .moveTo(40, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        // === Table rows ===
        let y = tableTop + 20;
        (invoice.items || []).forEach((it) => {
          doc.text(it.name || "-", 40, y, { width: 240 });
          doc.text(String(it.quantity || 0), 300, y, {
            width: 50,
            align: "right",
          });
          doc.text((Number(it.price) || 0).toFixed(2), 360, y, {
            width: 80,
            align: "right",
          });
          doc.text(
            ((Number(it.quantity) || 0) * (Number(it.price) || 0)).toFixed(2),
            450,
            y,
            { width: 80, align: "right" }
          );
          y += 20;
        });

        // === Totals ===
        doc.moveDown(2);
        doc.text(`Subtotal: ₹${(Number(invoice.subTotal) || 0).toFixed(2)}`, {
          align: "right",
        });
        doc.moveDown(0.2);
        doc.text(`Tax: ₹${(Number(invoice.tax) || 0).toFixed(2)}`, {
          align: "right",
        });
        doc.moveDown(0.2);
        doc
          .fontSize(12)
          .text(`Total: ₹${(Number(invoice.totalAmount) || 0).toFixed(2)}`, {
            align: "right",
          });

        doc.moveDown(1);
        doc.fontSize(10).text("Thank you for your business!", {
          align: "center",
        });

        doc.end();

        // === Finish stream ===
        stream.on("finish", () => {
          const appUrl =
            process.env.APP_URL ||
            `http://localhost:${process.env.PORT || 3500}`;
          const publicUrl = `${appUrl}/public/invoices/${encodeURIComponent(
            filename
          )}`;
          resolve(publicUrl);
        });

        stream.on("error", (err) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  } catch (outerErr) {
    console.error("PDF generation failed:", outerErr);
    throw outerErr;
  }
};

export default generatePDF;
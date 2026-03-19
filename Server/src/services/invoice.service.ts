import PDFDocument from "pdfkit";
import { Response } from "express";
import { IOrderDocument } from "../models/Order.model";

const formatDate = (date?: Date) => {
  const parsedDate = date ? new Date(date) : new Date();
  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAmount = (value: number) => {
  return `${"\u20B9"}${value.toLocaleString("en-IN")}`;
};

/**
 * Stream invoice PDF to client response.
 */
export function streamInvoicePDF(order: IOrderDocument, buyerEmail: string, res: Response): void {
  const invoiceNumber = order.invoiceNumber || "NA";
  const pageWidth = 595.28;
  const left = 50;
  const right = pageWidth - 50;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${invoiceNumber}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fillColor("#9b2c2c").font("Helvetica-Bold").fontSize(28).text("BidKart", left, 50, {
    width: 220,
    align: "left",
  });

  doc.fillColor("#333333").font("Helvetica-Bold").fontSize(14).text("TAX INVOICE", right - 180, 52, {
    width: 180,
    align: "right",
  });
  doc.fillColor("#666666").font("Helvetica").fontSize(10).text(`Invoice #: ${invoiceNumber}`, right - 180, 74, {
    width: 180,
    align: "right",
  });
  doc.fillColor("#666666").font("Helvetica").fontSize(10).text(`Date: ${formatDate(order.createdAt)}`, right - 180, 90, {
    width: 180,
    align: "right",
  });

  doc.strokeColor("#e5e5e5").lineWidth(1).moveTo(left, 120).lineTo(right, 120).stroke();

  doc.fillColor("#9b2c2c").font("Helvetica-Bold").fontSize(9).text("BILL TO", left, 135, {
    width: 220,
    align: "left",
  });
  doc.fillColor("#222222").font("Helvetica").fontSize(10);
  doc.text(order.shippingAddress.fullName, left, 150, { width: 220 });
  doc.text(buyerEmail, left, 165, { width: 220 });
  doc.text(order.shippingAddress.phone, left, 180, { width: 220 });

  doc.fillColor("#9b2c2c").font("Helvetica-Bold").fontSize(9).text("SHIP TO", right - 220, 135, {
    width: 220,
    align: "left",
  });
  doc.fillColor("#222222").font("Helvetica").fontSize(10);
  let shipToY = 150;
  doc.text(order.shippingAddress.fullName, right - 220, shipToY, { width: 220 });
  shipToY += 15;
  doc.text(order.shippingAddress.addressLine1, right - 220, shipToY, { width: 220 });
  shipToY += 15;

  if (order.shippingAddress.addressLine2) {
    doc.text(order.shippingAddress.addressLine2, right - 220, shipToY, { width: 220 });
    shipToY += 15;
  }

  doc.text(
    `${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
    right - 220,
    shipToY,
    { width: 220 }
  );

  doc.strokeColor("#e5e5e5").lineWidth(1).moveTo(left, 220).lineTo(right, 220).stroke();

  const tableTop = 235;
  const colX = {
    index: left,
    product: left + 35,
    qty: left + 285,
    unitPrice: left + 340,
    total: left + 445,
  };

  doc.rect(left, tableTop, right - left, 24).fill("#f5f5f5");
  doc.fillColor("#333333").font("Helvetica-Bold").fontSize(10);
  doc.text("#", colX.index + 6, tableTop + 7, { width: 25 });
  doc.text("Product", colX.product + 4, tableTop + 7, { width: 240 });
  doc.text("Qty", colX.qty + 4, tableTop + 7, { width: 50 });
  doc.text("Unit Price", colX.unitPrice + 4, tableTop + 7, { width: 100 });
  doc.text("Total", colX.total + 4, tableTop + 7, { width: 90 });

  let rowY = tableTop + 32;
  doc.font("Helvetica").fontSize(10).fillColor("#222222");

  order.items.forEach((item, index) => {
    const variantText =
      item.variantKey && item.variantValue ? ` [${item.variantKey}: ${item.variantValue}]` : "";
    const productText = `${item.title}${variantText}`;

    doc.text(String(index + 1), colX.index + 6, rowY, { width: 25 });
    doc.text(productText, colX.product + 4, rowY, { width: 240 });
    doc.text(String(item.quantity), colX.qty + 4, rowY, { width: 50 });
    doc.text(formatAmount(item.price), colX.unitPrice + 4, rowY, { width: 100 });
    doc.text(formatAmount(item.itemTotal), colX.total + 4, rowY, { width: 90 });

    rowY += 20;
  });

  doc.strokeColor("#e5e5e5").lineWidth(1).moveTo(left, rowY + 4).lineTo(right, rowY + 4).stroke();

  const totalsTop = rowY + 18;
  doc.fillColor("#555555").font("Helvetica").fontSize(10);
  doc.text(`Subtotal: ${formatAmount(order.subtotal)}`, right - 210, totalsTop, {
    width: 210,
    align: "right",
  });
  doc.text("Delivery: FREE", right - 210, totalsTop + 16, {
    width: 210,
    align: "right",
  });
  doc.strokeColor("#d9d9d9").lineWidth(1).moveTo(right - 145, totalsTop + 36).lineTo(right, totalsTop + 36).stroke();

  doc.fillColor("#222222").font("Helvetica-Bold").fontSize(12).text(
    `TOTAL: ${formatAmount(order.totalAmount)}`,
    right - 210,
    totalsTop + 44,
    {
      width: 210,
      align: "right",
    }
  );

  const paymentTop = totalsTop + 86;
  doc.fillColor("#333333").font("Helvetica-Bold").fontSize(10).text("PAYMENT INFO", left, paymentTop);
  doc.fillColor("#555555").font("Helvetica").fontSize(10);
  doc.text(`Payment Method: ${order.paymentMethod}`, left, paymentTop + 16);
  doc.text(`Payment Status: ${order.paymentStatus}`, left, paymentTop + 32);

  if (order.razorpayPaymentId) {
    doc.text(`Transaction ID: ${order.razorpayPaymentId}`, left, paymentTop + 48);
  }

  doc.fillColor("#888888").font("Helvetica").fontSize(9).text(
    "This is a computer-generated invoice. No signature required.",
    left,
    780,
    {
      width: right - left,
      align: "center",
    }
  );
  doc.text("BidKart | bidkart.com", left, 794, {
    width: right - left,
    align: "center",
  });

  doc.end();
}

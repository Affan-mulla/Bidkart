import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { create } from "xmlbuilder2";
import { Types } from "mongoose";
import Order, { OrderStatus } from "../models/Order.model";
import Product from "../models/Product.model";
import AppError from "../utils/appError";

export type ExportFormat = "excel" | "xml" | "pdf";
type ExportDuration = "week" | "month" | "all";

const MAX_EXPORT_RECORDS = 10000;
const VALID_EXPORT_FORMATS: ExportFormat[] = ["excel", "xml", "pdf"];
const VALID_ORDER_STATUSES: OrderStatus[] = [
  "Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
];
const VALID_DURATIONS: ExportDuration[] = ["week", "month", "all"];

interface SellerOrderExportFilters {
  format?: unknown;
  status?: unknown;
  duration?: unknown;
  startDate?: unknown;
  endDate?: unknown;
}

interface SellerProductExportFilters {
  format?: unknown;
}

interface ExportMetadata {
  totalRecords: number;
  returnedRecords: number;
  maxRecords: number;
  truncated: boolean;
}

interface ExportResult {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  metadata: ExportMetadata;
}

interface ExportColumnDefinition {
  key: string;
  header: string;
  width?: number;
}

interface SellerOrderRow extends Record<string, unknown> {
  orderId: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  buyerId: string;
  productTitle: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  orderTotalAmount: number;
}

interface SellerProductRow extends Record<string, unknown> {
  productId: string;
  createdAt: string;
  title: string;
  category: string;
  basePrice: number;
  stock: number;
  ratings: number;
  reviewsCount: number;
  tags: string;
}

/**
 * Parse and validate export format.
 */
const parseExportFormat = (rawFormat: unknown): ExportFormat => {
  if (!rawFormat || Array.isArray(rawFormat)) {
    throw new AppError("format is required and must be one of: excel, xml, pdf", 400);
  }

  const normalizedFormat = String(rawFormat).toLowerCase() as ExportFormat;
  if (!VALID_EXPORT_FORMATS.includes(normalizedFormat)) {
    throw new AppError("format must be one of: excel, xml, pdf", 400);
  }

  return normalizedFormat;
};

/**
 * Parse and validate order status filter.
 */
const parseOrderStatus = (rawStatus: unknown): OrderStatus | undefined => {
  if (!rawStatus) {
    return undefined;
  }

  if (Array.isArray(rawStatus)) {
    throw new AppError(
      "status must be one of: Placed, Confirmed, Packed, Shipped, Delivered, Cancelled",
      400
    );
  }

  const status = String(rawStatus) as OrderStatus;
  if (!VALID_ORDER_STATUSES.includes(status)) {
    throw new AppError(
      "status must be one of: Placed, Confirmed, Packed, Shipped, Delivered, Cancelled",
      400
    );
  }

  return status;
};

/**
 * Parse and validate duration filter.
 */
const parseDuration = (rawDuration: unknown): ExportDuration => {
  if (!rawDuration) {
    return "all";
  }

  if (Array.isArray(rawDuration)) {
    throw new AppError("duration must be one of: week, month, all", 400);
  }

  const duration = String(rawDuration).toLowerCase() as ExportDuration;
  if (!VALID_DURATIONS.includes(duration)) {
    throw new AppError("duration must be one of: week, month, all", 400);
  }

  return duration;
};

/**
 * Parse date filter string to Date object.
 */
const parseDateFilter = (rawDate: unknown, isEndDate: boolean): Date | undefined => {
  if (!rawDate) {
    return undefined;
  }

  if (Array.isArray(rawDate)) {
    throw new AppError("startDate/endDate must be a valid date string", 400);
  }

  const parsedDate = new Date(String(rawDate));

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError("startDate/endDate must be a valid date string", 400);
  }

  if (isEndDate) {
    parsedDate.setHours(23, 59, 59, 999);
  } else {
    parsedDate.setHours(0, 0, 0, 0);
  }

  return parsedDate;
};

/**
 * Resolve createdAt range from duration or explicit date filters.
 */
const getCreatedAtRange = (duration: ExportDuration, startDate?: Date, endDate?: Date) => {
  if (startDate || endDate) {
    const range: { $gte?: Date; $lte?: Date } = {};

    if (startDate) {
      range.$gte = startDate;
    }

    if (endDate) {
      range.$lte = endDate;
    }

    if (startDate && endDate && startDate > endDate) {
      throw new AppError("startDate cannot be after endDate", 400);
    }

    return range;
  }

  if (duration === "all") {
    return undefined;
  }

  const now = new Date();
  const start = new Date(now);

  if (duration === "week") {
    start.setDate(start.getDate() - 7);
  }

  if (duration === "month") {
    start.setMonth(start.getMonth() - 1);
  }

  return { $gte: start, $lte: now };
};

/**
 * Resolve export file metadata from format.
 */
const getExportFormatMeta = (format: ExportFormat) => {
  if (format === "excel") {
    return {
      extension: "xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  if (format === "xml") {
    return {
      extension: "xml",
      contentType: "application/xml",
    };
  }

  return {
    extension: "pdf",
    contentType: "application/pdf",
  };
};

/**
 * Convert unknown value to a clean string for export output.
 */
const normalizeCellValue = (value: unknown): string | number => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return value;
  }

  return String(value);
};

/**
 * Format date-like values as ISO strings.
 */
const toIsoDateString = (value: Date | string | undefined): string => {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString();
};

/**
 * Build a true XLSX file from export rows.
 */
const buildExcelBuffer = async (
  sheetName: string,
  columns: ExportColumnDefinition[],
  rows: Array<Record<string, unknown>>
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || 20,
  }));

  rows.forEach((row) => {
    const normalizedRow: Record<string, string | number> = {};

    columns.forEach((column) => {
      normalizedRow[column.key] = normalizeCellValue(row[column.key]);
    });

    worksheet.addRow(normalizedRow);
  });

  worksheet.getRow(1).font = { bold: true };

  const workbookData = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(workbookData) ? workbookData : Buffer.from(workbookData);
};

/**
 * Build a proper XML document from export rows.
 */
const buildXmlBuffer = (
  rootName: string,
  rowName: string,
  columns: ExportColumnDefinition[],
  rows: Array<Record<string, unknown>>,
  metadata: ExportMetadata
) => {
  const document = create({ version: "1.0", encoding: "UTF-8" }).ele(rootName);

  const metadataNode = document.ele("metadata");
  metadataNode.ele("totalRecords").txt(String(metadata.totalRecords));
  metadataNode.ele("returnedRecords").txt(String(metadata.returnedRecords));
  metadataNode.ele("maxRecords").txt(String(metadata.maxRecords));
  metadataNode.ele("truncated").txt(String(metadata.truncated));

  const rowsNode = document.ele("rows");

  rows.forEach((row) => {
    const rowNode = rowsNode.ele(rowName);

    columns.forEach((column) => {
      rowNode.ele(column.key).txt(String(normalizeCellValue(row[column.key])));
    });
  });

  const xmlString = document.end({ prettyPrint: true });
  return Buffer.from(xmlString, "utf-8");
};

/**
 * Build a readable PDF list from export rows.
 */
const buildPdfBuffer = async (
  title: string,
  columns: ExportColumnDefinition[],
  rows: Array<Record<string, unknown>>,
  metadata: ExportMetadata
): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 36 });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    document.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    document.on("error", (error) => {
      reject(error);
    });

    document.fontSize(16).text(title, { align: "left" });
    document.moveDown(0.5);
    document
      .fontSize(10)
      .text(`Generated At: ${new Date().toISOString()}`)
      .text(`Total Records: ${metadata.totalRecords}`)
      .text(`Returned Records: ${metadata.returnedRecords}`)
      .text(`Max Records: ${metadata.maxRecords}`)
      .text(`Truncated: ${metadata.truncated ? "Yes" : "No"}`);

    document.moveDown(1);
    document.fontSize(9).text(columns.map((column) => column.header).join(" | "));
    document.moveDown(0.5);

    rows.forEach((row) => {
      const line = columns
        .map((column) => String(normalizeCellValue(row[column.key])))
        .join(" | ");

      document.fontSize(8).text(line, {
        width: document.page.width - document.page.margins.left - document.page.margins.right,
      });

      if (document.y > document.page.height - document.page.margins.bottom - 20) {
        document.addPage();
      }
    });

    document.end();
  });
};

/**
 * Build export buffer based on selected format.
 */
const buildExportBuffer = async (
  format: ExportFormat,
  options: {
    sheetOrRootName: string;
    rowName: string;
    title: string;
    columns: ExportColumnDefinition[];
    rows: Array<Record<string, unknown>>;
    metadata: ExportMetadata;
  }
) => {
  if (format === "excel") {
    return buildExcelBuffer(options.sheetOrRootName, options.columns, options.rows);
  }

  if (format === "xml") {
    return buildXmlBuffer(
      options.sheetOrRootName,
      options.rowName,
      options.columns,
      options.rows,
      options.metadata
    );
  }

  return buildPdfBuffer(options.title, options.columns, options.rows, options.metadata);
};

/**
 * Build standardized export metadata.
 */
const buildMetadata = (totalRecords: number, returnedRecords: number): ExportMetadata => {
  return {
    totalRecords,
    returnedRecords,
    maxRecords: MAX_EXPORT_RECORDS,
    truncated: totalRecords > returnedRecords,
  };
};

/**
 * Export seller orders in the requested format.
 */
export const exportSellerOrders = async (
  sellerId: string,
  filters: SellerOrderExportFilters
): Promise<ExportResult> => {
  const format = parseExportFormat(filters.format);
  const status = parseOrderStatus(filters.status);
  const duration = parseDuration(filters.duration);
  const startDate = parseDateFilter(filters.startDate, false);
  const endDate = parseDateFilter(filters.endDate, true);
  const createdAtRange = getCreatedAtRange(duration, startDate, endDate);

  const query: Record<string, unknown> = {
    "items.sellerId": new Types.ObjectId(sellerId),
  };

  if (status) {
    query.status = status;
  }

  if (createdAtRange) {
    query.createdAt = createdAtRange;
  }

  const [orders, totalRecords] = await Promise.all([
    Order.find(query)
      .select("_id createdAt status paymentMethod paymentStatus totalAmount buyerId items")
      .sort({ createdAt: -1 })
      .limit(MAX_EXPORT_RECORDS)
      .lean(),
    Order.countDocuments(query),
  ]);

  const sellerRows: SellerOrderRow[] = [];

  orders.forEach((order) => {
    const matchingItems = order.items.filter((item) => String(item.sellerId) === sellerId);

    matchingItems.forEach((item) => {
      sellerRows.push({
        orderId: String(order._id),
        createdAt: toIsoDateString(order.createdAt),
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        buyerId: String(order.buyerId),
        productTitle: item.title,
        variant: [item.variantKey, item.variantValue].filter(Boolean).join(": "),
        quantity: item.quantity,
        unitPrice: item.price,
        itemTotal: item.itemTotal,
        orderTotalAmount: order.totalAmount,
      });
    });
  });

  const metadata = buildMetadata(totalRecords, orders.length);
  const columns: ExportColumnDefinition[] = [
    { key: "orderId", header: "Order ID", width: 30 },
    { key: "createdAt", header: "Created At", width: 26 },
    { key: "status", header: "Status", width: 14 },
    { key: "paymentMethod", header: "Payment Method", width: 16 },
    { key: "paymentStatus", header: "Payment Status", width: 16 },
    { key: "buyerId", header: "Buyer ID", width: 30 },
    { key: "productTitle", header: "Product Title", width: 28 },
    { key: "variant", header: "Variant", width: 22 },
    { key: "quantity", header: "Quantity", width: 10 },
    { key: "unitPrice", header: "Unit Price", width: 12 },
    { key: "itemTotal", header: "Item Total", width: 12 },
    { key: "orderTotalAmount", header: "Order Total", width: 12 },
  ];

  const buffer = await buildExportBuffer(format, {
    sheetOrRootName: "sellerOrders",
    rowName: "order",
    title: "Seller Orders Export",
    columns,
    rows: sellerRows,
    metadata,
  });

  const formatMeta = getExportFormatMeta(format);
  const dateSegment = new Date().toISOString().slice(0, 10);

  return {
    buffer,
    contentType: formatMeta.contentType,
    fileName: `seller-orders-${dateSegment}.${formatMeta.extension}`,
    metadata,
  };
};

/**
 * Export seller products in the requested format.
 */
export const exportSellerProducts = async (
  sellerId: string,
  filters: SellerProductExportFilters
): Promise<ExportResult> => {
  const format = parseExportFormat(filters.format);

  const query = { sellerId: new Types.ObjectId(sellerId) };

  const [products, totalRecords] = await Promise.all([
    Product.find(query)
      .select("_id createdAt title category basePrice stock ratings reviewsCount tags")
      .sort({ createdAt: -1 })
      .limit(MAX_EXPORT_RECORDS)
      .lean(),
    Product.countDocuments(query),
  ]);

  const rows: SellerProductRow[] = products.map((product) => ({
    productId: String(product._id),
    createdAt: toIsoDateString(product.createdAt),
    title: product.title,
    category: product.category,
    basePrice: product.basePrice,
    stock: product.stock,
    ratings: product.ratings,
    reviewsCount: product.reviewsCount,
    tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
  }));

  const metadata = buildMetadata(totalRecords, products.length);
  const columns: ExportColumnDefinition[] = [
    { key: "productId", header: "Product ID", width: 30 },
    { key: "createdAt", header: "Created At", width: 26 },
    { key: "title", header: "Title", width: 30 },
    { key: "category", header: "Category", width: 18 },
    { key: "basePrice", header: "Base Price", width: 12 },
    { key: "stock", header: "Stock", width: 10 },
    { key: "ratings", header: "Ratings", width: 10 },
    { key: "reviewsCount", header: "Reviews", width: 10 },
    { key: "tags", header: "Tags", width: 30 },
  ];

  const buffer = await buildExportBuffer(format, {
    sheetOrRootName: "sellerProducts",
    rowName: "product",
    title: "Seller Products Export",
    columns,
    rows,
    metadata,
  });

  const formatMeta = getExportFormatMeta(format);
  const dateSegment = new Date().toISOString().slice(0, 10);

  return {
    buffer,
    contentType: formatMeta.contentType,
    fileName: `seller-products-${dateSegment}.${formatMeta.extension}`,
    metadata,
  };
};
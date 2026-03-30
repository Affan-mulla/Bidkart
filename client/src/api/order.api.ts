import axiosInstance from "@/api/axiosInstance";

export interface OrderItem {
  productId: string;
  sellerId: string;
  title: string;
  image: string;
  variantKey: string;
  variantValue: string;
  quantity: number;
  price: number;
  itemTotal: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Order {
  _id: string;
  buyerId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  deliveryCharge: number;
  totalAmount: number;
  status: "Placed" | "Confirmed" | "Packed" | "Shipped" | "Delivered" | "Cancelled";
  paymentMethod: "COD" | "Razorpay";
  paymentStatus: "Pending" | "Paid" | "Refunded";
  invoiceNumber?: string;
  cancelReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddressForm {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface PaginatedOrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export type ExportFormat = "excel" | "xml" | "pdf";
export type OrderExportDuration = "week" | "month" | "all";

export interface ExportFileResponse {
  blob: Blob;
  fileName: string;
  metadata: {
    totalCount: number;
    returnedCount: number;
    maxRecords: number;
    truncated: boolean;
  };
}

/**
 * Extract a downloadable filename from content-disposition header.
 */
function getFileNameFromDisposition(
  dispositionHeader: string | undefined,
  fallbackName: string,
): string {
  if (!dispositionHeader) {
    return fallbackName;
  }

  const fileNameMatch = dispositionHeader.match(/filename="?([^";]+)"?/i);

  if (!fileNameMatch?.[1]) {
    return fallbackName;
  }

  return decodeURIComponent(fileNameMatch[1]);
}

/**
 * Places an order from cart items using the provided shipping address.
 */
export async function placeOrder(
  shippingAddress: AddressForm,
  paymentMethod: "COD" | "Razorpay" = "COD",
  couponCode?: string,
): Promise<Order> {
  const response = await axiosInstance.post("/orders", {
    shippingAddress,
    paymentMethod,
    ...(couponCode ? { couponCode } : {}),
  });

  return response.data?.data?.order;
}

/**
 * Confirms a fake Razorpay payment for a buyer order.
 */
export async function confirmFakeOrderPayment(id: string): Promise<Order> {
  const response = await axiosInstance.post(`/orders/${id}/fake-confirm`);
  return response.data?.data?.order;
}

/**
 * Fetches paginated buyer orders.
 */
export async function getBuyerOrders(page: number, limit = 20): Promise<PaginatedOrdersResponse> {
  const response = await axiosInstance.get("/orders", {
    params: { page, limit },
  });

  return response.data?.data;
}

/**
 * Fetches one buyer order by id.
 */
export async function getBuyerOrderById(id: string): Promise<Order> {
  const response = await axiosInstance.get(`/orders/${id}`);
  return response.data?.data?.order;
}

/**
 * Cancels a buyer order.
 */
export async function cancelOrder(id: string, reason?: string): Promise<Order> {
  const response = await axiosInstance.patch(`/orders/${id}/cancel`, {
    ...(reason ? { reason } : {}),
  });

  return response.data?.data?.order;
}

/**
 * Fetches seller-facing paginated orders with optional status filter.
 */
export async function getSellerOrders(
  page: number,
  limit = 10,
  status?: string,
): Promise<PaginatedOrdersResponse> {
  const response = await axiosInstance.get("/orders/seller", {
    params: {
      page,
      limit,
      ...(status ? { status } : {}),
    },
  });

  return response.data?.data;
}

/**
 * Fetches one seller order by id.
 */
export async function getSellerOrderById(id: string): Promise<Order> {
  const response = await axiosInstance.get(`/orders/seller/${id}`);
  return response.data?.data?.order;
}

/**
 * Updates seller order status.
 */
export async function updateOrderStatus(id: string, status: string): Promise<Order> {
  const response = await axiosInstance.patch(`/orders/seller/${id}/status`, {
    status,
  });

  return response.data?.data?.order;
}

/**
 * Exports seller orders into a downloadable file format.
 */
export async function exportSellerOrders(options: {
  format: ExportFormat;
  status?: Order["status"];
  duration: OrderExportDuration;
}): Promise<ExportFileResponse> {
  const response = await axiosInstance.get("/orders/seller/export", {
    params: {
      format: options.format,
      duration: options.duration,
      ...(options.status ? { status: options.status } : {}),
    },
    responseType: "blob",
  });

  const contentDisposition = response.headers["content-disposition"] as string | undefined;
  const fallbackName = `seller-orders.${options.format === "excel" ? "xlsx" : options.format}`;

  const totalCount = Number(response.headers["x-export-total-count"] ?? 0);
  const returnedCount = Number(response.headers["x-export-returned-count"] ?? 0);
  const maxRecords = Number(response.headers["x-export-max-records"] ?? 0);
  const truncatedHeader = String(response.headers["x-export-truncated"] ?? "false").toLowerCase();

  return {
    blob: response.data,
    fileName: getFileNameFromDisposition(contentDisposition, fallbackName),
    metadata: {
      totalCount,
      returnedCount,
      maxRecords,
      truncated: truncatedHeader === "true",
    },
  };
}

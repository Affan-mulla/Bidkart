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
  paymentDeadline?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
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

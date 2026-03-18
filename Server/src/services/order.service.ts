import { Types } from "mongoose";
import Cart from "../models/Cart.model";
import Order, { IOrderDocument, IShippingAddress, OrderStatus, PaymentMethod } from "../models/Order.model";
import Product from "../models/Product.model";
import AppError from "../utils/appError";
import * as cartService from "./cart.service";

interface PaginatedOrdersResult {
  orders: Array<IOrderDocument | Record<string, unknown>>;
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Validate required shipping address fields.
 */
const validateShippingAddress = (shippingAddress: IShippingAddress | undefined) => {
  if (!shippingAddress) {
    throw new AppError("shippingAddress is required", 400);
  }

  const requiredFields: Array<keyof IShippingAddress> = [
    "fullName",
    "phone",
    "addressLine1",
    "city",
    "state",
    "pincode",
  ];

  for (const field of requiredFields) {
    const value = shippingAddress[field];
    if (!value || !String(value).trim()) {
      throw new AppError(`${field} is required`, 400);
    }
  }
};

/**
 * Validate and normalize order id.
 */
const ensureValidOrderId = (orderId: string) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError("Order not found", 404);
  }
};

/**
 * Place a buyer order using all current cart items.
 */
export const placeOrder = async (
  buyerId: string,
  shippingAddress: IShippingAddress,
  paymentMethod: PaymentMethod
): Promise<IOrderDocument> => {
  validateShippingAddress(shippingAddress);

  if (paymentMethod !== "COD") {
    throw new AppError("Invalid payment method", 400);
  }

  const cart = await Cart.findOne({ userId: new Types.ObjectId(buyerId) });

  if (!cart || cart.items.length === 0) {
    throw new AppError("Cart is empty", 400);
  }

  const products = await Promise.all(
    cart.items.map(async (item) => {
      const product = await Product.findById(item.productId);

      if (!product) {
        throw new AppError("Product not found", 404);
      }

      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${item.title}`, 400);
      }

      return product;
    })
  );

  const orderItems = cart.items.map((item) => {
    const itemTotal = item.price * item.quantity;

    return {
      productId: item.productId,
      sellerId: item.sellerId,
      title: item.title,
      image: item.image,
      variantKey: item.variantKey || "",
      variantValue: item.variantValue || "",
      quantity: item.quantity,
      price: item.price,
      itemTotal,
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const deliveryCharge = 0;

  const order = await Order.create({
    buyerId: new Types.ObjectId(buyerId),
    items: orderItems,
    shippingAddress: {
      fullName: shippingAddress.fullName,
      phone: shippingAddress.phone,
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2 || "",
      city: shippingAddress.city,
      state: shippingAddress.state,
      pincode: shippingAddress.pincode,
    },
    subtotal,
    deliveryCharge,
    totalAmount: subtotal + deliveryCharge,
    status: "Placed",
    paymentMethod,
    paymentStatus: "Pending",
    cancelReason: "",
  });

  await Promise.all(
    products.map((product, index) =>
      Product.findByIdAndUpdate(product._id, {
        $inc: { stock: -cart.items[index].quantity },
      })
    )
  );

  await cartService.clearCart(buyerId);

  return order;
};

/**
 * Fetch paginated orders for authenticated buyer.
 */
export const getBuyerOrders = async (
  buyerId: string,
  page: number,
  limit: number
): Promise<PaginatedOrdersResult> => {
  const parsedPage = Math.max(1, page || 1);
  const parsedLimit = Math.max(1, Math.min(50, limit || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  const query = { buyerId: new Types.ObjectId(buyerId) };

  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
    Order.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / parsedLimit));

  return {
    orders,
    total,
    page: parsedPage,
    totalPages,
  };
};

/**
 * Fetch a single buyer order by id.
 */
export const getBuyerOrderById = async (orderId: string, buyerId: string): Promise<IOrderDocument> => {
  ensureValidOrderId(orderId);

  const order = await Order.findOne({
    _id: new Types.ObjectId(orderId),
    buyerId: new Types.ObjectId(buyerId),
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

/**
 * Fetch paginated orders that contain seller items.
 */
export const getSellerOrders = async (
  sellerId: string,
  page: number,
  limit: number,
  status?: string
): Promise<PaginatedOrdersResult> => {
  const parsedPage = Math.max(1, page || 1);
  const parsedLimit = Math.max(1, Math.min(50, limit || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  const query: Record<string, unknown> = {
    "items.sellerId": new Types.ObjectId(sellerId),
  };

  if (status) {
    query.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
    Order.countDocuments(query),
  ]);

  const filteredOrders = orders.map((order) => {
    const orderObject = order.toObject();

    return {
      ...orderObject,
      items: orderObject.items.filter((item) => String(item.sellerId) === sellerId),
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / parsedLimit));

  return {
    orders: filteredOrders,
    total,
    page: parsedPage,
    totalPages,
  };
};

/**
 * Fetch one seller-visible order by id.
 */
export const getSellerOrderById = async (
  orderId: string,
  sellerId: string
): Promise<Record<string, unknown>> => {
  ensureValidOrderId(orderId);

  const order = await Order.findOne({
    _id: new Types.ObjectId(orderId),
    "items.sellerId": new Types.ObjectId(sellerId),
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const orderObject = order.toObject();

  return {
    ...orderObject,
    items: orderObject.items.filter((item) => String(item.sellerId) === sellerId),
  };
};

/**
 * Update order status with forward-only seller transitions.
 */
export const updateOrderStatus = async (
  orderId: string,
  sellerId: string,
  newStatus: string
): Promise<IOrderDocument> => {
  ensureValidOrderId(orderId);

  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const ownsAtLeastOneItem = order.items.some((item) => String(item.sellerId) === sellerId);

  if (!ownsAtLeastOneItem) {
    throw new AppError("Forbidden", 403);
  }

  const allowedTransitions: Record<string, string> = {
    Placed: "Confirmed",
    Confirmed: "Packed",
    Packed: "Shipped",
    Shipped: "Delivered",
  };

  if (allowedTransitions[order.status] !== newStatus) {
    throw new AppError("Invalid status transition", 400);
  }

  order.status = newStatus as OrderStatus;
  await order.save();

  return order;
};

/**
 * Cancel buyer order and restore stock when eligible.
 */
export const cancelOrder = async (
  orderId: string,
  buyerId: string,
  reason: string
): Promise<IOrderDocument> => {
  ensureValidOrderId(orderId);

  const order = await Order.findOne({
    _id: new Types.ObjectId(orderId),
    buyerId: new Types.ObjectId(buyerId),
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.status !== "Placed" && order.status !== "Confirmed") {
    throw new AppError("Order cannot be cancelled at this stage", 400);
  }

  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      })
    )
  );

  order.status = "Cancelled";
  order.cancelReason = reason;
  await order.save();

  return order;
};

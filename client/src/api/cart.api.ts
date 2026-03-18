import axiosInstance from "@/api/axiosInstance";

export interface CartItem {
  productId: string;
  sellerId: string;
  quantity: number;
  price: number;
  title: string;
  image: string;
  variantKey: string;
  variantValue: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
}

export interface AddToCartPayload {
  productId: string;
  quantity: number;
  variantKey?: string;
  variantValue?: string;
}

export interface UpdateCartPayload {
  productId: string;
  quantity: number;
  variantKey?: string;
  variantValue?: string;
}

export interface RemoveCartPayload {
  productId: string;
  variantKey?: string;
  variantValue?: string;
}

const EMPTY_CART: Cart = {
  items: [],
  subtotal: 0,
  totalItems: 0,
};

/**
 * Fetches the authenticated buyer cart.
 */
export async function getCart(): Promise<Cart> {
  try {
    const response = await axiosInstance.get("/cart");
    return response.data?.data?.cart ?? EMPTY_CART;
  } catch (error: unknown) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: { status?: number } }).response?.status === "number"
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;

    if (status === 401) {
      return EMPTY_CART;
    }

    throw error;
  }
}

/**
 * Adds a product item to the cart.
 */
export async function addToCart(payload: AddToCartPayload): Promise<Cart> {
  const response = await axiosInstance.post("/cart/add", payload);
  return response.data?.data?.cart ?? EMPTY_CART;
}

/**
 * Updates quantity for a cart item.
 */
export async function updateCartItem(payload: UpdateCartPayload): Promise<Cart> {
  const response = await axiosInstance.patch("/cart/update", payload);
  return response.data?.data?.cart ?? EMPTY_CART;
}

/**
 * Removes a cart item.
 */
export async function removeCartItem(payload: RemoveCartPayload): Promise<Cart> {
  const response = await axiosInstance.delete("/cart/remove", {
    data: payload,
  });

  return response.data?.data?.cart ?? EMPTY_CART;
}

/**
 * Clears all items from the cart.
 */
export async function clearCart(): Promise<void> {
  await axiosInstance.delete("/cart/clear");
}

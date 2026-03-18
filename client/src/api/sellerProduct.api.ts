import axiosInstance from "@/api/axiosInstance"

export interface ProductVariant {
  key: string
  value: string
}

export interface Product {
  _id: string
  sellerId: string
  title: string
  description: string
  images: string[]
  category: string
  variants: ProductVariant[]
  basePrice: number
  stock: number
  ratings: number
  reviewsCount: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface SellerStats {
  totalListings: number
  totalStockValue: number
  totalUnits: number
  lowStockCount: number
  outOfStockCount: number
  recentProducts: Product[]
}

export interface PaginatedProducts {
  products: Product[]
  total: number
  page: number
  totalPages: number
}

/**
 * Fetches aggregate listing metrics for the current seller.
 */
export async function getSellerStats(): Promise<SellerStats> {
  const response = await axiosInstance.get("/products/seller/stats")
  return response.data?.data
}

/**
 * Fetches paginated products owned by the current seller.
 */
export async function getMyProducts(
  page: number,
  limit = 10,
): Promise<PaginatedProducts> {
  const response = await axiosInstance.get("/products/seller/mine", {
    params: { page, limit },
  })

  return response.data?.data
}

/**
 * Creates a seller product with optional images payload.
 */
export async function createProduct(formData: FormData): Promise<Product> {
  const response = await axiosInstance.post("/products", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data?.data?.product
}

/**
 * Updates a seller product and optionally replaces its images.
 */
export async function updateProduct(id: string, formData: FormData): Promise<Product> {
  const response = await axiosInstance.put(`/products/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data?.data?.product
}

/**
 * Permanently removes a seller product.
 */
export async function deleteProduct(id: string): Promise<void> {
  await axiosInstance.delete(`/products/${id}`)
}

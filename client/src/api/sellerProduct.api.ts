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

export type ExportFormat = "excel" | "xml" | "pdf"

export interface ExportFileResponse {
  blob: Blob
  fileName: string
  metadata: {
    totalCount: number
    returnedCount: number
    maxRecords: number
    truncated: boolean
  }
}

/**
 * Extract filename from content-disposition response header.
 */
function getFileNameFromDisposition(
  dispositionHeader: string | undefined,
  fallbackName: string,
): string {
  if (!dispositionHeader) {
    return fallbackName
  }

  const fileNameMatch = dispositionHeader.match(/filename="?([^";]+)"?/i)

  if (!fileNameMatch?.[1]) {
    return fallbackName
  }

  return decodeURIComponent(fileNameMatch[1])
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

/**
 * Exports seller product list into the selected file format.
 */
export async function exportSellerProducts(format: ExportFormat): Promise<ExportFileResponse> {
  const response = await axiosInstance.get("/products/seller/export", {
    params: { format },
    responseType: "blob",
  })

  const contentDisposition = response.headers["content-disposition"] as string | undefined
  const fallbackName = `seller-products.${format === "excel" ? "xlsx" : format}`

  const totalCount = Number(response.headers["x-export-total-count"] ?? 0)
  const returnedCount = Number(response.headers["x-export-returned-count"] ?? 0)
  const maxRecords = Number(response.headers["x-export-max-records"] ?? 0)
  const truncatedHeader = String(response.headers["x-export-truncated"] ?? "false").toLowerCase()

  return {
    blob: response.data,
    fileName: getFileNameFromDisposition(contentDisposition, fallbackName),
    metadata: {
      totalCount,
      returnedCount,
      maxRecords,
      truncated: truncatedHeader === "true",
    },
  }
}

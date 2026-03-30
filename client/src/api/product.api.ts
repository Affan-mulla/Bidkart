import axiosInstance from "@/api/axiosInstance";

export interface SearchProduct {
  _id: string;
  title: string;
  images: string[];
  ratings: number;
  basePrice: number;
  stock: number;
  variants: ProductVariant[];
  category: string;
  sellerId: string;
  createdAt: string;
}

export interface SearchProductsParams {
  q: string;
  page: number;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

export interface SearchProductsResponse {
  products: SearchProduct[];
  total: number;
  totalPages: number;
  page: number;
}

const DEFAULT_SEARCH_RESPONSE: SearchProductsResponse = {
  products: [],
  total: 0,
  totalPages: 1,
  page: 1,
};

/**
 * Fetches product search results with optional filtering and pagination.
 */
export async function searchProducts(
  params: SearchProductsParams,
): Promise<SearchProductsResponse> {
  const response = await axiosInstance.get("/products/search", {
    params: {
      q: params.q,
      page: params.page,
      ...(params.category ? { category: params.category } : {}),
      ...(params.minPrice ? { minPrice: params.minPrice } : {}),
      ...(params.maxPrice ? { maxPrice: params.maxPrice } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
    },
  });

  const payload = response.data?.data ?? response.data ?? {};

  return {
    products: payload.products ?? DEFAULT_SEARCH_RESPONSE.products,
    total: payload.total ?? DEFAULT_SEARCH_RESPONSE.total,
    totalPages: payload.totalPages ?? DEFAULT_SEARCH_RESPONSE.totalPages,
    page: payload.page ?? params.page,
  };
}

export interface CatalogProduct {
  _id: string;
  title: string;
  images: string[];
  basePrice: number;
  category: string;
  ratings: number;
  reviewsCount: number;
  stock: number;
  sellerId: string;
  createdAt: string;
}

export interface ProductVariant {
  key: string;
  value: string;
  images: string[];
}

export interface ProductSeller {
  _id: string;
  storeName: string;
  storeLogo: string | null;
  rating: number;
  totalSales: number;
}

export interface ProductDetail {
  _id: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  variants: ProductVariant[];
  basePrice: number;
  stock: number;
  ratings: number;
  reviewsCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  seller: ProductSeller | null;
}

export interface GetProductsParams {
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

export interface GetProductsResponse {
  products: CatalogProduct[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface MonthlyMostSoldProduct extends CatalogProduct {
  totalUnitsSold: number;
  totalRevenue: number;
  ordersCount: number;
}

export interface GetMonthlyMostSoldProductsResponse {
  products: MonthlyMostSoldProduct[];
  period: {
    start: string;
    end: string;
  };
  total: number;
}

/**
 * Fetches paginated catalog products with optional filters.
 */
export async function getProducts(params: GetProductsParams): Promise<GetProductsResponse> {
  const response = await axiosInstance.get("/products", {
    params: {
      ...(params.page !== undefined ? { page: params.page } : {}),
      ...(params.limit !== undefined ? { limit: params.limit } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.minPrice ? { minPrice: params.minPrice } : {}),
      ...(params.maxPrice ? { maxPrice: params.maxPrice } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
    },
  });

  return response.data?.data;
}

/**
 * Fetches current month top-selling products for homepage listing.
 */
export async function getMonthlyMostSoldProducts(
  limit = 8,
): Promise<GetMonthlyMostSoldProductsResponse> {
  const response = await axiosInstance.get("/products/most-sold-monthly", {
    params: { limit },
  });

  return response.data?.data;
}

/**
 * Fetches details for a single product.
 */
export async function getProductById(id: string): Promise<ProductDetail> {
  const response = await axiosInstance.get(`/products/${id}`);
  return response.data?.data?.product;
}

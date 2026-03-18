import axiosInstance from "@/api/axiosInstance";

export interface SearchProduct {
  _id: string;
  title: string;
  images: string[];
  ratings: number;
  basePrice: number;
  stock: number;
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

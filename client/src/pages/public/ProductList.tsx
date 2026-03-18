import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterIcon } from "@hugeicons/core-free-icons";

import { getProducts, type SearchProduct } from "@/api/product.api";
import ProductCard from "@/components/search/ProductCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = ["Electronics", "Clothing", "Books", "Home & Kitchen", "Sports", "Other"];

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Most Popular", value: "popular" },
];

function getPaginationPages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sortedPages = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const result: Array<number | "ellipsis"> = [];

  for (let index = 0; index < sortedPages.length; index += 1) {
    const pageNumber = sortedPages[index];
    const previous = sortedPages[index - 1];

    if (index > 0 && previous !== undefined && pageNumber - previous > 1) {
      result.push("ellipsis");
    }

    result.push(pageNumber);
  }

  return result;
}

/**
 * Renders the full product catalog with filters and pagination.
 */
export default function ProductList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const category = searchParams.get("category") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sort = searchParams.get("sort") || "";

  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
        return;
      }

      params.set(key, value);
    });

    navigate(`/products?${params.toString()}`, { replace: true });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("category");
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("sort");
    params.set("page", "1");
    navigate(`/products?${params.toString()}`, { replace: true });
  };

  const hasActiveFilters = Boolean(category || minPrice || maxPrice || sort);

  const queryResult = useQuery({
    queryKey: ["products", page, category, minPrice, maxPrice, sort],
    queryFn: () =>
      getProducts({
        page,
        limit: 20,
        category: category || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        sort: sort || undefined,
      }),
  });

  const totalPages = Math.max(1, queryResult.data?.totalPages || 1);
  const paginationPages = useMemo(() => getPaginationPages(page, totalPages), [page, totalPages]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-5 space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">All Products</h1>
        <p className="text-sm text-muted-foreground">
          {queryResult.isLoading ? "Loading products..." : `${queryResult.data?.total ?? 0} products found`}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon icon={FilterIcon} className="size-4" />
          Filters
        </div>

        <Select
          value={category || "all"}
          onValueChange={(value) => {
            updateSearchParams({
              category: value === "all" ? undefined : value,
              page: "1",
            });
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((categoryName) => (
              <SelectItem key={categoryName} value={categoryName}>
                {categoryName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sort || "newest"}
          onValueChange={(value) => {
            updateSearchParams({
              sort: value,
              page: "1",
            });
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Min ₹"
          className="w-[120px]"
          value={minPrice}
          onChange={(event) => {
            updateSearchParams({
              minPrice: event.target.value || undefined,
              page: "1",
            });
          }}
        />

        <Input
          type="number"
          placeholder="Max ₹"
          className="w-[120px]"
          value={maxPrice}
          onChange={(event) => {
            updateSearchParams({
              maxPrice: event.target.value || undefined,
              page: "1",
            });
          }}
        />

        {hasActiveFilters ? (
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        ) : null}
      </div>

      {queryResult.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-border bg-card p-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : null}

      {queryResult.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load products.</AlertTitle>
          <AlertDescription>Please try again.</AlertDescription>
        </Alert>
      ) : null}

      {!queryResult.isLoading && !queryResult.isError && (queryResult.data?.products?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center">
          <p className="text-base font-medium text-foreground">No products found</p>
          {hasActiveFilters ? (
            <Button type="button" variant="outline" className="mt-3" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : null}
        </div>
      ) : null}

      {!queryResult.isLoading && !queryResult.isError && (queryResult.data?.products?.length ?? 0) > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {queryResult.data?.products.map((product) => (
              <ProductCard key={product._id} product={product as SearchProduct} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      disabled={page <= 1}
                      onClick={() => {
                        if (page <= 1) {
                          return;
                        }

                        updateSearchParams({ page: String(page - 1) });
                      }}
                    />
                  </PaginationItem>

                  {paginationPages.map((pageNumber, index) => (
                    <PaginationItem key={`${pageNumber}-${index}`}>
                      {pageNumber === "ellipsis" ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          isActive={pageNumber === page}
                          onClick={() => {
                            updateSearchParams({ page: String(pageNumber) });
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      disabled={page >= totalPages}
                      onClick={() => {
                        if (page >= totalPages) {
                          return;
                        }

                        updateSearchParams({ page: String(page + 1) });
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

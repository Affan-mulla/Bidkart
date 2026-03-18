import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { searchProducts } from "@/api/product.api";
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

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Home & Kitchen",
  "Sports",
  "Books",
  "Toys",
  "Beauty",
  "Automotive",
];

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

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const q = searchParams.get("q")?.trim() || "";
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

    navigate(`/s?${params.toString()}`, { replace: true });
  };

  const queryResult = useQuery({
    queryKey: ["search", q, page, category, minPrice, maxPrice, sort],
    queryFn: () =>
      searchProducts({
        q,
        page,
        category: category || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        sort: sort || undefined,
      }),
    enabled: q.length > 0,
  });

  const totalPages = Math.max(1, queryResult.data?.totalPages || 1);
  const paginationPages = useMemo(() => getPaginationPages(page, totalPages), [page, totalPages]);

  if (!q) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-8">
        <Alert>
          <AlertTitle>Search products</AlertTitle>
          <AlertDescription>Type a keyword in the navbar search to see results.</AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-5 rounded-lg border border-border p-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Category</h2>
            <Select
              value={category || "all"}
              onValueChange={(value) => {
                updateSearchParams({
                  category: value === "all" ? undefined : value,
                  page: "1",
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((categoryName) => (
                  <SelectItem key={categoryName} value={categoryName}>
                    {categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Price Range</h2>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
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
                placeholder="Max"
                value={maxPrice}
                onChange={(event) => {
                  updateSearchParams({
                    maxPrice: event.target.value || undefined,
                    page: "1",
                  });
                }}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                updateSearchParams({
                  minPrice: minPrice || undefined,
                  maxPrice: maxPrice || undefined,
                  page: "1",
                });
              }}
            >
              Apply
            </Button>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Sort By</h2>
            <Select
              value={sort || "newest"}
              onValueChange={(value) => {
                updateSearchParams({
                  sort: value,
                  page: "1",
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Newest" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((sortOption) => (
                  <SelectItem key={sortOption.value} value={sortOption.value}>
                    {sortOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Results for "{q}"</h1>
            <p className="text-sm text-muted-foreground">
              {queryResult.data?.total ?? 0} products found
            </p>
          </div>

          {queryResult.isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-lg border border-border p-3">
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
              <AlertTitle>Unable to load search results</AlertTitle>
              <AlertDescription>Please try again in a moment.</AlertDescription>
            </Alert>
          ) : null}

          {!queryResult.isLoading && !queryResult.isError && queryResult.data?.products?.length === 0 ? (
            <Alert>
              <AlertTitle>No products found</AlertTitle>
              <AlertDescription>
                No products found for "{q}". Try a different search term.
              </AlertDescription>
            </Alert>
          ) : null}

          {!queryResult.isLoading && !queryResult.isError && (queryResult.data?.products?.length ?? 0) > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {queryResult.data?.products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

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
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

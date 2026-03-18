import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { getProducts, type SearchProduct } from "@/api/product.api";
import ProductCard from "@/components/search/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { label: "Electronics", emoji: "🔌" },
  { label: "Clothing", emoji: "👕" },
  { label: "Books", emoji: "📚" },
  { label: "Home & Kitchen", emoji: "🏠" },
  { label: "Sports", emoji: "⚽" },
  { label: "Other", emoji: "📦" },
];

/**
 * Renders the buyer landing page with discovery-first sections.
 */
export default function Home() {
  const navigate = useNavigate();

  const featuredProductsQuery = useQuery({
    queryKey: ["featuredProducts"],
    queryFn: () => getProducts({ limit: 10, sort: "newest" }),
  });

  return (
    <main className="bg-background">
      <section className="bg-linear-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="max-w-3xl space-y-5">
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
              <span className="block">Shop Smarter.</span>
              <span className="block">Bid Better.</span>
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Discover thousands of products or win exclusive deals in live auctions.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button size="lg" onClick={() => navigate("/products")}>
                Browse Products
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/s?q=")}>
                Search Items
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-2xl font-semibold text-foreground">Shop by Category</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.label}
              type="button"
              className="min-w-[150px] rounded-xl border border-border bg-card p-4 text-center transition-colors hover:bg-muted"
              onClick={() => navigate(`/products?category=${encodeURIComponent(category.label)}`)}
            >
              <div className="text-2xl" aria-hidden>
                {category.emoji}
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{category.label}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-foreground">Featured Products</h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            onClick={() => navigate("/products")}
          >
            View all
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </button>
        </div>

        {featuredProductsQuery.isLoading ? (
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

        {featuredProductsQuery.isError ? (
          <p className="text-sm text-muted-foreground">Failed to load products</p>
        ) : null}

        {!featuredProductsQuery.isLoading && !featuredProductsQuery.isError ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {(featuredProductsQuery.data?.products ?? []).map((product) => (
              <ProductCard key={product._id} product={product as SearchProduct} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="text-center">
            <p className="text-2xl" aria-hidden>
              🚚
            </p>
            <p className="mt-2 font-medium text-foreground">Fast Delivery</p>
            <p className="mt-1 text-sm text-muted-foreground">Orders shipped within 2-3 business days</p>
          </div>

          <div className="text-center">
            <p className="text-2xl" aria-hidden>
              🔒
            </p>
            <p className="mt-2 font-medium text-foreground">Secure Payments</p>
            <p className="mt-1 text-sm text-muted-foreground">100% secure checkout guaranteed</p>
          </div>

          <div className="text-center">
            <p className="text-2xl" aria-hidden>
              ↩️
            </p>
            <p className="mt-2 font-medium text-foreground">Easy Returns</p>
            <p className="mt-1 text-sm text-muted-foreground">Hassle-free 7-day return policy</p>
          </div>
        </div>
      </section>
    </main>
  );
}

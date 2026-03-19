import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  AuctionIcon,
  CheckmarkCircle01Icon,
  CreditCardIcon,
  FilterIcon,
  MapPinIcon,
  RotateClockwiseIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";

import { getProducts, type SearchProduct } from "@/api/product.api";
import ProductCard from "@/components/search/ProductCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { label: "Electronics", icon: FilterIcon },
  { label: "Clothing", icon: ShoppingBag01Icon },
  { label: "Books", icon: MapPinIcon },
  { label: "Home & Kitchen", icon: CreditCardIcon },
  { label: "Sports", icon: AuctionIcon },
  { label: "Other", icon: CheckmarkCircle01Icon },
];

const TRUST_SIGNALS = [
  {
    title: "Fast Delivery",
    description: "Orders shipped within 2-3 business days.",
    icon: RotateClockwiseIcon,
  },
  {
    title: "Secure Payments",
    description: "Protected checkout with trusted payment processing.",
    icon: CreditCardIcon,
  },
  {
    title: "Easy Returns",
    description: "Simple 7-day returns for eligible orders.",
    icon: CheckmarkCircle01Icon,
  },
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
    <main className="bg-background pb-12">
      <section className="border-b border-border/60 bg-[radial-gradient(circle_at_top,oklch(0.97_0.03_75)_0%,transparent_45%)]">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs tracking-wide">
              Curated marketplace with live auctions
            </Badge>
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
              <span className="block">Shop Smarter.</span>
              <span className="block">Bid Better.</span>
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Discover thousands of products or win exclusive deals in live auctions.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
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

      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-foreground">Shop by Category</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/products")}>View all categories</Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((category) => (
            <Card
              key={category.label}
              className="cursor-pointer border-border/80 bg-card/80 py-0 transition-colors hover:bg-accent"
              onClick={() => navigate(`/products?category=${encodeURIComponent(category.label)}`)}
            >
              <CardContent className="flex items-center gap-2 p-4">
                <HugeiconsIcon icon={category.icon} className="size-5 text-primary" />
                <p className="text-sm font-medium text-foreground">{category.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
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

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TRUST_SIGNALS.map((item) => (
            <Card key={item.title} className="py-0">
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <HugeiconsIcon icon={item.icon} className="size-5" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">{item.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

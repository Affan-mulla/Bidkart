import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  BaseballBatIcon,
  Book,
  CheckmarkCircle01Icon,
  Clothes,
  CreditCardIcon,
  FilterIcon,
  KitchenUtensilsIcon,
  RotateClockwiseIcon,
  SmartAcIcon,
} from "@hugeicons/core-free-icons";

import {
  getMonthlyMostSoldProducts,
  getProducts,
  type SearchProduct,
} from "@/api/product.api";
import ProductCard from "@/components/search/ProductCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { label: "Electronics", icon: SmartAcIcon },
  { label: "Clothing", icon: Clothes },
  { label: "Books", icon: Book },
  { label: "Home & Kitchen", icon: KitchenUtensilsIcon },
  { label: "Sports", icon: BaseballBatIcon },
  { label: "Other", icon: FilterIcon },
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
            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1 text-xs tracking-wide"
            >
              Curated marketplace with live auctions
            </Badge>
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
              <span className="block">Shop Smarter.</span>
              <span className="block">Bid Better.</span>
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Discover thousands of products or win exclusive deals in live
              auctions.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="lg"
                onClick={() => navigate("/products")}
                variant={"form"}
              >
                Browse Products
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/s?q=")}
              >
                Search Items
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-foreground">
            Shop by Category
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/products")}
          >
            View all categories
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((category) => (
            <Card
              key={category.label}
              className="cursor-pointer border-border/80 bg-card/80 py-0 transition-colors hover:bg-accent"
              onClick={() =>
                navigate(
                  `/products?category=${encodeURIComponent(category.label)}`,
                )
              }
            >
              <CardContent className="flex items-center gap-2 p-4">
                <HugeiconsIcon
                  icon={category.icon}
                  className="size-5 text-primary"
                />
                <p className="text-sm font-medium text-foreground">
                  {category.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <div className="mb-4 flex border-l-4 border-primary px-2 items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
            Featured Products
          </h2>
          <p className="text-sm text-muted-foreground">
            Handpicked selections based on new arrivals and trending items.
          </p>
          </div>
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
              <div
                key={index}
                className="space-y-3 rounded-lg border border-border bg-card p-3"
              >
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : null}

        {featuredProductsQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            Failed to load products
          </p>
        ) : null}

        {!featuredProductsQuery.isLoading && !featuredProductsQuery.isError ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {(featuredProductsQuery.data?.products ?? []).map((product) => (
              <ProductCard
                key={product._id}
                product={product as SearchProduct}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TRUST_SIGNALS.map((item) => (
            <Card key={item.title} className="">
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <HugeiconsIcon icon={item.icon} className="size-5" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {item.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>


      <NewArrivalCard />
      <MostSoldProductsCard />
    </main>
  );
}

const NewArrivalCard = () => {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <div className="mb-5 border-l-4 border-primary pl-3">
        <h2 className="text-xl font-bold text-foreground">New Arrival</h2>
        <p className="text-sm text-muted-foreground">
          Fresh picks curated for your next buy
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="relative min-h-[420px] overflow-hidden  border border-white/10 bg-black p-6 sm:p-8">
          <div
            className="absolute -right-10 bottom-0 h-[80%] w-[70%] rounded-full bg-white/3 blur-3xl"
            aria-hidden
          />
          <img
            src="/ps5.png"
            alt="PlayStation 5"
            className="absolute bottom-0 right-0 h-[72%] w-[78%] object-contain object-bottom-right"
          />

          <div className="relative z-10 flex h-full max-w-xs flex-col justify-end gap-2">
            <h3 className="text-3xl font-semibold tracking-tight text-white">
              PlayStation 5
            </h3>
            <p className="text-sm leading-6 text-white/75">
              Black and White version of the PS5 coming out on sale.
            </p>
            <button
              type="button"
              className="mt-2 inline-flex w-fit items-center gap-1 border-b border-white/80 pb-0.5 text-sm font-semibold text-white"
            >
              Shop Now
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </button>
          </div>
        </article>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-2">
          <article className="relative min-h-[200px] overflow-hidden  border border-white/10 bg-black p-5 sm:col-span-2">
            <div
              className="absolute -right-10 top-0 h-full w-2/3 rounded-full bg-white/4 blur-2xl"
              aria-hidden
            />
            <img
              src="/wearing-hat.png"
              alt="Women's Collections"
              className="absolute right-0 top-0 h-full w-[58%] object-contain object-right"
            />

            <div className="relative z-10 flex h-full max-w-xs flex-col justify-center gap-2">
              <h3 className="text-2xl font-semibold text-white">
                Women’s Collections
              </h3>
              <p className="text-sm leading-6 text-white/75">
                Featured woman collections that give you another vibe.
              </p>
              <button
                type="button"
                className="mt-2 inline-flex w-fit items-center gap-1 border-b border-white/80 pb-0.5 text-sm font-semibold text-white"
              >
                Shop Now
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </button>
            </div>
          </article>

          <article className="relative min-h-[216px] overflow-hidden  border border-white/10 bg-black p-5">
            <div
              className="absolute inset-0 bg-linear-to-t from-white/2 to-transparent"
              aria-hidden
            />
            <img
              src="/amazon-echo.png"
              alt="Speakers"
              className="absolute right-2 top-4 h-[56%] w-[76%] object-contain"
            />

            <div className="relative z-10 flex h-full flex-col justify-end gap-1.5">
              <h3 className="text-2xl font-semibold text-white">Speakers</h3>
              <p className="text-sm text-white/75">Amazon wireless speakers</p>
              <button
                type="button"
                className="mt-1 inline-flex w-fit items-center gap-1 border-b border-white/80 pb-0.5 text-sm font-semibold text-white"
              >
                Shop Now
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </button>
            </div>
          </article>

          <article className="relative min-h-[216px] overflow-hidden  border border-white/10 bg-black p-5">
            <div
              className="absolute inset-0 bg-linear-to-t from-white/2 to-transparent"
              aria-hidden
            />
            <img
              src="/gucci.png"
              alt="Perfume"
              className="absolute right-0 top-4 h-[56%] w-[72%] object-contain"
            />

            <div className="relative z-10 flex h-full flex-col justify-end gap-1.5">
              <h3 className="text-2xl font-semibold text-white">Perfume</h3>
              <p className="text-sm text-white/75">GUCCI INTENSE OUD EDP</p>
              <button
                type="button"
                className="mt-1 inline-flex w-fit items-center gap-1 border-b border-white/80 pb-0.5 text-sm font-semibold text-white"
              >
                Shop Now
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

const MostSoldProductsCard = () => {
  const mostSoldProductsQuery = useQuery({
    queryKey: ["mostSoldProductsOfMonth"],
    queryFn: () => getMonthlyMostSoldProducts(8),
  });
  const navigate = useNavigate();
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="border-l-4 border-primary pl-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Most Sold Products of the Month
          </h2>
          <p className="text-sm text-muted-foreground">
            Best performing picks customers are buying most.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          onClick={() => navigate("/products?sort=popular")}
        >
          View all
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
        </button>
      </div>

      {mostSoldProductsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border border-border bg-card p-3"
            >
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : null}

      {mostSoldProductsQuery.isError ? (
        <p className="text-sm text-muted-foreground">
          Failed to load most sold products.
        </p>
      ) : null}

      {!mostSoldProductsQuery.isLoading && !mostSoldProductsQuery.isError ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(mostSoldProductsQuery.data?.products ?? []).map((product) => (
            <ProductCard key={product._id} product={product as SearchProduct} />
          ))}
        </div>
      ) : null}
    </section>
  );
};

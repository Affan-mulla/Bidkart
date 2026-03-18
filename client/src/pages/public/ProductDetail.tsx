import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Package01Icon,
  Store01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { addToCart, type AddToCartPayload } from "@/api/cart.api";
import { getProductById } from "@/api/product.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Renders details for a single product.
 */
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const addMutation = useMutation({
    mutationFn: (payload: AddToCartPayload) => addToCart(payload),
    onSuccess: (updatedCart) => {
      useCartStore.getState().setTotalItems(updatedCart.totalItems);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart!");
    },
    onError: () => {
      toast.error("Failed to add to cart");
    },
  });

  const queryResult = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id!),
    enabled: Boolean(id),
  });

  const product = queryResult.data;

  const variantGroups = useMemo(() => {
    if (!product?.variants?.length) {
      return [] as Array<{ key: string; values: string[] }>;
    }

    const map = new Map<string, Set<string>>();

    product.variants.forEach((variant) => {
      const key = variant.key.trim();
      const value = variant.value.trim();

      if (!key || !value) {
        return;
      }

      if (!map.has(key)) {
        map.set(key, new Set<string>());
      }

      map.get(key)?.add(value);
    });

    return Array.from(map.entries()).map(([key, values]) => ({
      key,
      values: Array.from(values),
    }));
  }, [product?.variants]);

  useEffect(() => {
    if (!product) {
      return;
    }

    setActiveImageIndex(0);
    setQuantity(1);

    const defaults: Record<string, string> = {};
    variantGroups.forEach((group) => {
      defaults[group.key] = group.values[0] || "";
    });

    setSelectedVariants(defaults);
  }, [product, variantGroups]);

  if (queryResult.isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (queryResult.isError || !product) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Failed to load product.</AlertTitle>
          <AlertDescription>Please try again.</AlertDescription>
        </Alert>
      </section>
    );
  }

  const imageUrls = product.images || [];
  const hasImages = imageUrls.length > 0;
  const selectedImage = hasImages ? imageUrls[Math.min(activeImageIndex, imageUrls.length - 1)] : null;
  const maxQuantity = Math.max(1, Math.min(product.stock, 10));

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={product.title}
              className="aspect-square w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <HugeiconsIcon icon={Package01Icon} className="size-12" />
            </div>
          )}

          {imageUrls.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {imageUrls.map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`rounded-lg border ${
                    index === activeImageIndex ? "ring-2 ring-primary" : "border-border"
                  }`}
                >
                  <img
                    src={imageUrl}
                    alt={`${product.title} ${index + 1}`}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <Badge variant="outline" className="inline-flex items-center gap-1">
            <HugeiconsIcon icon={Tag01Icon} className="size-4" />
            {product.category}
          </Badge>

          <h1 className="text-2xl font-bold text-foreground">{product.title}</h1>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className={`text-sm leading-none ${index < Math.round(product.ratings) ? "text-primary" : "text-muted-foreground/40"}`}
                  aria-hidden
                >
                  ★
                </span>
              ))}
            </div>
            {product.reviewsCount > 0 ? (
              <span>({product.reviewsCount} reviews)</span>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>

          <p className="text-3xl font-bold text-foreground">₹{product.basePrice.toLocaleString("en-IN")}</p>

          {product.stock === 0 ? (
            <Badge variant="destructive">Out of Stock</Badge>
          ) : product.stock <= 5 ? (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
              Only {product.stock} left
            </Badge>
          ) : (
            <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
              In Stock
            </Badge>
          )}

          <Separator />

          {variantGroups.length > 0 ? (
            <div className="space-y-4">
              {variantGroups.map((group) => (
                <div key={group.key} className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{group.key}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((value) => {
                      const selectedValue = selectedVariants[group.key];
                      const isSelected = selectedValue === value;

                      return (
                        <button
                          key={`${group.key}-${value}`}
                          type="button"
                          onClick={() => {
                            setSelectedVariants((previous) => ({
                              ...previous,
                              [group.key]: value,
                            }));
                          }}
                          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "border border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {product.stock > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Quantity</p>
              <div className="inline-flex items-center rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setQuantity((previous) => Math.max(1, previous - 1))}
                  className="px-3 py-2 text-foreground hover:bg-muted"
                  aria-label="Decrease quantity"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                </button>
                <span className="min-w-10 text-center text-sm font-medium text-foreground">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((previous) => Math.min(maxQuantity, previous + 1))}
                  className="px-3 py-2 text-foreground hover:bg-muted"
                  aria-label="Increase quantity"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                </button>
              </div>
            </div>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={product.stock === 0 || addMutation.isPending}
            onClick={() => {
              if (!isAuthenticated) {
                navigate(`/login?redirect=${encodeURIComponent(`/products/${id ?? ""}`)}`);
                return;
              }

              const [variantKey, variantValue] = Object.entries(selectedVariants)[0] ?? [undefined, undefined];

              addMutation.mutate({
                productId: product._id,
                quantity,
                ...(variantKey ? { variantKey } : {}),
                ...(variantValue ? { variantValue } : {}),
              });
            }}
          >
            {addMutation.isPending ? "Adding..." : "Add to Cart"}
          </Button>

          <Separator />

          {product.seller ? (
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Store01Icon} className="size-4 text-primary" />
                <p className="font-medium text-foreground">{product.seller.storeName}</p>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="text-sm leading-none text-primary" aria-hidden>
                    ★
                  </span>
                  {product.seller.rating.toFixed(1)}
                </span>
                <span>{product.seller.totalSales} sales</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Product Description</h2>
        <p className="whitespace-pre-wrap text-muted-foreground">
          {product.description?.trim() ? product.description : "No description provided."}
        </p>

        {product.tags?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">Tags:</p>
            {product.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProductDetailSkeleton() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="mt-4 flex gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-16 rounded-lg" />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </section>
  );
}

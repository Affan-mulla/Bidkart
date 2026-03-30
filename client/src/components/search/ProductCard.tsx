import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  FavouriteIcon,
  HeartCheckIcon,
  MinusSignIcon,
  ShoppingCart01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { addToCart, getCart, removeCartItem, type Cart, updateCartItem } from "@/api/cart.api";
import { addToWishlist, removeFromWishlist } from "@/api/wishlist.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SearchProduct } from "@/api/product.api";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useWishlistStore } from "@/store/wishlistStore";

interface ProductCardProps {
  product: SearchProduct;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const imageUrl = product.images?.[0] || product.variants?.[0]?.images?.[0] || "https://placehold.co/600x400?text=No+Image";
  const rating = Number(product.ratings || 0).toFixed(1);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted(product._id));
  const wishlistAdd = useWishlistStore((state) => state.add);
  const wishlistRemove = useWishlistStore((state) => state.remove);

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    enabled: isAuthenticated,
  });

  const cartLineItem = useMemo(() => {
    const items = cartQuery.data?.items ?? [];

    const exact = items.find(
      (item) => item.productId === product._id && !item.variantKey && !item.variantValue,
    );

    if (exact) {
      return exact;
    }

    return items.find((item) => item.productId === product._id);
  }, [cartQuery.data?.items, product._id]);

  const quantityInCart = useMemo(() => {
    const items = cartQuery.data?.items ?? [];
    return items
      .filter((item) => item.productId === product._id)
      .reduce((totalQuantity, item) => totalQuantity + item.quantity, 0);
  }, [cartQuery.data?.items, product._id]);

  const syncCartState = (updatedCart: Cart) => {
    useCartStore.getState().setTotalItems(updatedCart.totalItems);
    queryClient.setQueryData(["cart"], updatedCart);
  };

  const addToCartMutation = useMutation({
    mutationFn: () => addToCart({ productId: product._id, quantity: 1 }),
    onSuccess: (updatedCart) => {
      syncCartState(updatedCart);
      toast.success("Added to cart");
    },
    onError: () => {
      toast.error("Failed to add item to cart");
    },
  });

  const updateCartMutation = useMutation({
    mutationFn: (quantity: number) => {
      if (!cartLineItem) {
        throw new Error("No cart item found for update");
      }

      return updateCartItem({
        productId: product._id,
        quantity,
        variantKey: cartLineItem.variantKey || undefined,
        variantValue: cartLineItem.variantValue || undefined,
      });
    },
    onSuccess: syncCartState,
    onError: () => {
      toast.error("Failed to update quantity");
    },
  });

  const removeCartMutation = useMutation({
    mutationFn: () => {
      if (!cartLineItem) {
        throw new Error("No cart item found for removal");
      }

      return removeCartItem({
        productId: product._id,
        variantKey: cartLineItem.variantKey || undefined,
        variantValue: cartLineItem.variantValue || undefined,
      });
    },
    onSuccess: syncCartState,
    onError: () => {
      toast.error("Failed to update cart");
    },
  });

  const isCartActionPending =
    addToCartMutation.isPending || updateCartMutation.isPending || removeCartMutation.isPending;

  const handleWishlistToggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      return;
    }

    if (isWishlisted) {
      wishlistRemove(product._id);
      try {
        await removeFromWishlist(product._id);
      } catch {
        wishlistAdd(product._id);
        toast.error("Failed to update wishlist");
      }
      return;
    }

    wishlistAdd(product._id);
    try {
      await addToWishlist(product._id);
    } catch {
      wishlistRemove(product._id);
      toast.error("Failed to update wishlist");
    }
  };

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      navigate(`/login?redirect=/product/${product._id}`);
      return;
    }

    if (product.stock <= 0) {
      return;
    }

    addToCartMutation.mutate();
  };

  const handleIncreaseQuantity = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated || isCartActionPending) {
      return;
    }

    if (cartLineItem) {
      updateCartMutation.mutate(cartLineItem.quantity + 1);
      return;
    }

    addToCartMutation.mutate();
  };

  const handleDecreaseQuantity = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated || !cartLineItem || isCartActionPending) {
      return;
    }

    if (cartLineItem.quantity <= 1) {
      removeCartMutation.mutate();
      return;
    }

    updateCartMutation.mutate(cartLineItem.quantity - 1);
  };

  return (
    <Link to={`/product/${product._id}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-border/80 bg-linear-to-b from-background to-muted/20 py-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="relative">
          <img
            src={imageUrl}
            alt={product.title}
            className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            loading="lazy"
          />

          {product.stock > 0 && product.stock <= 5 ? (
            <Badge variant="outline" className="absolute left-2 top-2 border-amber-300 bg-amber-50 text-amber-700">
              Only {product.stock} left
            </Badge>
          ) : null}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={(event) => {
                void handleWishlistToggle(event);
              }}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-sm transition-colors hover:bg-white"
              aria-label="Toggle wishlist"
            >
              <HugeiconsIcon
                icon={FavouriteIcon}
                className={isWishlisted ? "size-4 text-red-500 fill-current" : "size-4 text-muted-foreground"}
              />
            </button>
          ) : null}
        </div>

        <CardContent className="space-y-3 p-3">
          <p className=" text-lg font-medium leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
            {product.title}
          </p>

          <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={StarIcon} className="size-3.5 text-primary" />
            <span>{rating}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold">{formatPrice(product.basePrice || 0)}</p>
            {product.stock === 0 ? <Badge variant="destructive">Out of Stock</Badge> : null}
          </div>

          {product.stock > 0 ? (
            quantityInCart > 0 ? (
              <div
                className="flex items-center justify-between rounded-md border border-border/80 bg-background/80 p-1"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleDecreaseQuantity}
                  disabled={isCartActionPending}
                  aria-label="Decrease quantity"
                >
                  <HugeiconsIcon icon={MinusSignIcon} className="size-4" />
                </Button>

                <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                  <HugeiconsIcon icon={ShoppingCart01Icon} className="size-3.5 text-primary" />
                  <span>{quantityInCart} in cart</span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleIncreaseQuantity}
                  disabled={isCartActionPending}
                  aria-label="Increase quantity"
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={isCartActionPending}
              >
                <HugeiconsIcon icon={ShoppingCart01Icon} className="size-4" />
                {isCartActionPending ? "Adding..." : "Add to Cart"}
              </Button>
            )
          ) : (
            <Button type="button" variant="outline" size="lg" className="w-full" disabled>
              Out of Stock
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

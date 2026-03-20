import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  Delete01Icon,
  MinusSignIcon,
  Package01Icon,
  ShoppingCart01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import {
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
  type Cart,
  type CartItem,
} from "@/api/cart.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/cartStore";

/**
 * Renders the buyer cart page.
 */
export default function Cart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!cartQuery.data) {
      return;
    }

    useCartStore.getState().setTotalItems(cartQuery.data.totalItems);
  }, [cartQuery.data]);

  const updateMutation = useMutation({
    mutationFn: updateCartItem,
    onSuccess: (updatedCart) => {
      useCartStore.getState().setTotalItems(updatedCart.totalItems);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: () => {
      toast.error("Something went wrong");
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: (updatedCart) => {
      useCartStore.getState().setTotalItems(updatedCart.totalItems);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: () => {
      toast.error("Something went wrong");
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      useCartStore.getState().setTotalItems(0);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: () => {
      toast.error("Something went wrong");
    },
  });

  const isAnyMutationPending =
    updateMutation.isPending || removeMutation.isPending || clearMutation.isPending;

  const cart = cartQuery.data;
  const items: CartItem[] = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const totalItems = cart?.totalItems ?? 0;

  const formattedSubtotal = useMemo(
    () => `₹${subtotal.toLocaleString("en-IN")}`,
    [subtotal],
  );

  if (!isAuthenticated) {
    return (
      <section className="min-h-[70vh] bg-background px-4 py-8">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              <HugeiconsIcon icon={ShoppingCart01Icon} className="size-14 text-muted-foreground" />
              <h1 className="text-xl font-semibold text-foreground">Your cart is empty</h1>
              <p className="text-sm text-muted-foreground">Sign in to view your saved cart items</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <Button onClick={() => navigate("/login")}>Sign In</Button>
                <Button variant="outline" onClick={() => navigate("/products")}>Continue Shopping</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (cartQuery.isLoading) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="h-20 w-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/5" />
                </div>
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-5 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (cartQuery.isError) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load cart</AlertTitle>
          <AlertDescription>Please refresh and try again.</AlertDescription>
        </Alert>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="min-h-[70vh] bg-background px-4 py-8">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              <HugeiconsIcon icon={ShoppingCart01Icon} className="size-14 text-muted-foreground" />
              <h1 className="text-xl font-semibold text-foreground">Your cart is empty</h1>
              <Button onClick={() => navigate("/products")}>Start Shopping</Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-foreground">My Cart</h1>
        <Badge variant="outline">{totalItems} items</Badge>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {items.map((item) => (
            <CartItemRow
              key={`${item.productId}-${item.variantKey}-${item.variantValue}`}
              item={item}
              isPending={isAnyMutationPending}
              onIncrease={() => {
                updateMutation.mutate({
                  productId: item.productId,
                  quantity: item.quantity + 1,
                  variantKey: item.variantKey || undefined,
                  variantValue: item.variantValue || undefined,
                });
              }}
              onDecrease={() => {
                if (item.quantity - 1 <= 0) {
                  removeMutation.mutate({
                    productId: item.productId,
                    variantKey: item.variantKey || undefined,
                    variantValue: item.variantValue || undefined,
                  });
                  return;
                }

                updateMutation.mutate({
                  productId: item.productId,
                  quantity: item.quantity - 1,
                  variantKey: item.variantKey || undefined,
                  variantValue: item.variantValue || undefined,
                });
              }}
              onRemove={() => {
                removeMutation.mutate({
                  productId: item.productId,
                  variantKey: item.variantKey || undefined,
                  variantValue: item.variantValue || undefined,
                });
              }}
            />
          ))}

          <div>
            <Button
              variant="link"
              className="h-auto px-0 text-sm text-muted-foreground"
              disabled={clearMutation.isPending}
              onClick={() => {
                clearMutation.mutate();
              }}
            >
              Clear Cart
            </Button>
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
              <span className="font-medium text-foreground">{formattedSubtotal}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-medium text-primary">Free</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">{formattedSubtotal}</span>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate("/login?redirect=/checkout");
                  return;
                }

                navigate("/checkout");
              }}
              variant={"form"}
              size={"lg"}
            >
              Proceed to Checkout
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Button>

            <Button variant="ghost" size={"lg"}  className="w-full" onClick={() => navigate("/products")}>Continue Shopping</Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

type CartItemRowProps = {
  item: CartItem;
  isPending: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
};

/**
 * Renders one item row in the cart list.
 */
function CartItemRow({ item, isPending, onIncrease, onDecrease, onRemove }: CartItemRowProps) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
        {item.image ? (
          <img src={item.image} alt={item.title} className="h-20 w-20 rounded-lg object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <HugeiconsIcon icon={Package01Icon} className="size-7" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium text-foreground">{item.title}</p>
          {item.variantKey ? (
            <p className="mt-1 text-sm text-muted-foreground">{item.variantKey}: {item.variantValue}</p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">₹{item.price.toLocaleString("en-IN")}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border p-2 text-foreground hover:bg-muted disabled:opacity-50"
            onClick={onDecrease}
            disabled={isPending}
            aria-label="Decrease quantity"
          >
            <HugeiconsIcon icon={MinusSignIcon} className="size-4" />
          </button>
          <span className="w-8 text-center text-sm font-medium text-foreground">{item.quantity}</span>
          <button
            type="button"
            className="rounded-md border border-border p-2 text-foreground hover:bg-muted disabled:opacity-50"
            onClick={onIncrease}
            disabled={isPending}
            aria-label="Increase quantity"
          >
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
          </button>
        </div>

        <p className="w-20 text-right font-medium text-foreground">
          ₹{(item.price * item.quantity).toLocaleString("en-IN")}
        </p>

        <button
          type="button"
          className="rounded-md p-2 text-destructive hover:bg-muted disabled:opacity-50"
          onClick={onRemove}
          disabled={isPending}
          aria-label="Remove item"
        >
          <HugeiconsIcon icon={Delete01Icon} className="size-4" />
        </button>
      </CardContent>
    </Card>
  );
}

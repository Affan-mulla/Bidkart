import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, CreditCardIcon, MapPinIcon } from "@hugeicons/core-free-icons";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { getCart } from "@/api/cart.api";
import { placeOrder } from "@/api/order.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/store/cartStore";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Gujarat",
  "Karnataka",
  "Kerala",
  "Maharashtra",
  "Madhya Pradesh",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
  "Delhi",
  "Other",
] as const;

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile number"),
  addressLine1: z.string().min(5, "Address line must be at least 5 characters"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Enter valid 6-digit pincode"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/**
 * Renders checkout address form and order summary.
 */
export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
  });

  useEffect(() => {
    if (cartQuery.isLoading || cartQuery.isError) {
      return;
    }

    if ((cartQuery.data?.items.length ?? 0) === 0) {
      navigate("/cart", { replace: true });
    }
  }, [cartQuery.data?.items.length, cartQuery.isError, cartQuery.isLoading, navigate]);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: (values: CheckoutFormValues) =>
      placeOrder(
        {
          fullName: values.fullName,
          phone: values.phone,
          addressLine1: values.addressLine1,
          addressLine2: values.addressLine2 || "",
          city: values.city,
          state: values.state,
          pincode: values.pincode,
        },
        "COD",
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      useCartStore.getState().reset();
      toast.success("Order placed successfully!");
      navigate("/orders");
    },
    onError: () => {
      toast.error("Failed to place order. Please try again.");
    },
  });

  if (cartQuery.isLoading) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardContent className="space-y-3 p-5">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (cartQuery.isError) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load cart for checkout</AlertTitle>
          <AlertDescription>Please try again.</AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/cart")}>Back to Cart</Button>
      </section>
    );
  }

  const cart = cartQuery.data;

  if (!cart || cart.items.length === 0) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-8">
        <Alert>
          <AlertTitle>Your cart is empty</AlertTitle>
          <AlertDescription>Add items to continue checkout.</AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/cart")}>Back to Cart</Button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <HugeiconsIcon icon={MapPinIcon} className="size-4" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((values) => placeOrderMutation.mutate(values))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="10-digit mobile number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="House no., street, area" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Apartment, landmark" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="City" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {INDIAN_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="6-digit pincode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Payment Method</p>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-sm text-foreground">
                      <HugeiconsIcon icon={CreditCardIcon} className="size-4" />
                      💵 Cash on Delivery
                    </span>
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-4 text-primary" />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={placeOrderMutation.isPending}>
                  {placeOrderMutation.isPending ? "Placing Order..." : "Place Order"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order Summary</span>
              <Badge variant="outline">{cart.totalItems} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={`${item.productId}-${item.variantKey}-${item.variantValue}`} className="flex items-start gap-2">
                  <img
                    src={item.image || "https://placehold.co/40x40?text=No+Image"}
                    alt={item.title}
                    className="h-10 w-10 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    {item.variantKey ? (
                      <p className="text-xs text-muted-foreground">({item.variantKey}: {item.variantValue})</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-foreground">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">₹{cart.subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery</span>
              <span className="text-primary">Free</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">₹{cart.subtotal.toLocaleString("en-IN")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

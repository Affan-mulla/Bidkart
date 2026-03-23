import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, CreditCardIcon, MapPinIcon, RotateClockwiseIcon } from "@hugeicons/core-free-icons";
import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { getCart } from "@/api/cart.api";
import { applyCoupon, type CouponValidateResponse, validateCoupon } from "@/api/coupon.api";
import { cancelOrder, placeOrder } from "@/api/order.api";
import { createRazorpayOrder, verifyPayment } from "@/api/payment.api";
import { getAddresses, type Address } from "@/api/profile.api";
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
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";
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
  const [paymentMethod, setPaymentMethod] = useState<"Razorpay" | "COD">("Razorpay");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidateResponse | null>(null);
  const [isCouponLoading, setIsCouponLoading] = useState(false);

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
  });

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddresses,
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

  const applyAddressToForm = (address: Address) => {
    form.setValue("fullName", address.fullName, { shouldDirty: true });
    form.setValue("phone", address.phone, { shouldDirty: true });
    form.setValue("addressLine1", address.addressLine1, { shouldDirty: true });
    form.setValue("addressLine2", address.addressLine2 || "", { shouldDirty: true });
    form.setValue("city", address.city, { shouldDirty: true });
    form.setValue("state", address.state, { shouldDirty: true });
    form.setValue("pincode", address.pincode, { shouldDirty: true });
  };

  useEffect(() => {
    if (!addressesQuery.data || addressesQuery.data.length === 0) {
      return;
    }

    if (selectedAddressId) {
      const selected = addressesQuery.data.find((address) => address._id === selectedAddressId);
      if (selected) {
        applyAddressToForm(selected);
        return;
      }
    }

    const defaultAddress = addressesQuery.data.find((address) => address.isDefault) || addressesQuery.data[0];
    setSelectedAddressId(defaultAddress._id);
    applyAddressToForm(defaultAddress);
  }, [addressesQuery.data, selectedAddressId]);

  const handleCheckout = async (values: CheckoutFormValues) => {
    try {
      setIsProcessingPayment(true);

      const order = await placeOrder(
        {
          fullName: values.fullName,
          phone: values.phone,
          addressLine1: values.addressLine1,
          addressLine2: values.addressLine2 ?? "",
          city: values.city,
          state: values.state,
          pincode: values.pincode,
        },
        paymentMethod,
        appliedCoupon?.couponCode,
      );

      if (paymentMethod === "COD") {
        if (appliedCoupon?.couponId) {
          try {
            await applyCoupon(appliedCoupon.couponId);
          } catch {
            toast.error("Order placed, but coupon usage was not recorded.");
          }
        }

        queryClient.invalidateQueries({ queryKey: ["cart"] });
        useCartStore.getState().reset();
        toast.success("Order placed successfully!");
        navigate("/orders");
        return;
      }

      const loaded = await loadRazorpayScript();

      if (!loaded) {
        toast.error("Could not load payment gateway. Please try again.");
        await cancelOrder(order._id, "Payment gateway failed to load");
        return;
      }

      const { razorpayOrderId, amount, keyId } = await createRazorpayOrder(order._id);

      try {
        const paymentResponse = await openRazorpayCheckout({
          key: keyId,
          amount,
          currency: "INR",
          name: "BidKart",
          description: `Order #${order._id.slice(-8).toUpperCase()}`,
          order_id: razorpayOrderId,
          prefill: {
            name: values.fullName,
            contact: values.phone,
          },
          theme: { color: "#9b2c2c" },
        });

        await verifyPayment({
          orderId: order._id,
          razorpayOrderId: paymentResponse.razorpay_order_id,
          razorpayPaymentId: paymentResponse.razorpay_payment_id,
          razorpaySignature: paymentResponse.razorpay_signature,
        });

        if (appliedCoupon?.couponId) {
          try {
            await applyCoupon(appliedCoupon.couponId);
          } catch {
            toast.error("Payment completed, but coupon usage was not recorded.");
          }
        }

        queryClient.invalidateQueries({ queryKey: ["cart"] });
        useCartStore.getState().reset();
        toast.success("Payment successful! Order confirmed.");
        navigate("/orders");
      } catch (paymentError) {
        const message = paymentError instanceof Error ? paymentError.message : "";

        if (message === "Payment cancelled") {
          toast.info("Payment cancelled. Your order has been removed.");
        } else {
          toast.error("Payment failed. Please try again.");
        }

        try {
          await cancelOrder(order._id, "Payment not completed");
        } catch {
          // Best-effort cancellation for pending payment orders.
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleApplyCoupon = async () => {
    const normalizedCouponCode = couponCode.trim().toUpperCase();

    if (!normalizedCouponCode) {
      toast.error("Please enter a coupon code.");
      return;
    }

    try {
      setIsCouponLoading(true);
      const validatedCoupon = await validateCoupon(normalizedCouponCode);
      setCouponCode(validatedCoupon.couponCode);
      setAppliedCoupon(validatedCoupon);
      toast.success(`${validatedCoupon.couponCode} applied successfully.`);
    } catch (error) {
      const fallbackMessage = "Unable to apply coupon. Please try again.";
      if (error instanceof AxiosError) {
        const errorMessage = (error.response?.data as { message?: string } | undefined)?.message;
        toast.error(errorMessage || fallbackMessage);
      } else if (error instanceof Error) {
        toast.error(error.message || fallbackMessage);
      } else {
        toast.error(fallbackMessage);
      }
    } finally {
      setIsCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

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
  const totalAmount = appliedCoupon?.finalAmount ?? cart.subtotal;

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
              <form onSubmit={form.handleSubmit(handleCheckout)} className="space-y-4">
                {addressesQuery.isLoading ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </div>
                ) : null}

                {!addressesQuery.isLoading && !addressesQuery.isError && (addressesQuery.data?.length ?? 0) > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Select Saved Address</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {addressesQuery.data?.map((address) => {
                        const isSelected = selectedAddressId === address._id;

                        return (
                          <button
                            key={address._id}
                            type="button"
                            onClick={() => {
                              setSelectedAddressId(address._id);
                              applyAddressToForm(address);
                            }}
                            className={`rounded-lg border p-3 text-left transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <Badge variant="outline">{address.label}</Badge>
                              {address.isDefault ? (
                                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                                  Default
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm font-medium text-foreground">{address.fullName}</p>
                            <p className="text-xs text-muted-foreground">{address.phone}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {address.addressLine1}
                              {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {address.city}, {address.state} - {address.pincode}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Saved address selected. You can still edit details manually below.
                    </p>
                  </div>
                ) : null}

                {addressesQuery.isError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Could not load saved addresses</AlertTitle>
                    <AlertDescription>You can still enter your address manually below.</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <Separator />
                  <p className="text-sm font-medium text-foreground">Or enter / edit delivery address manually</p>
                </div>

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
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Razorpay")}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        paymentMethod === "Razorpay"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex size-8 items-center justify-center rounded-md bg-[#072654] text-xs font-bold text-white">
                        R
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Pay Online</p>
                        <p className="text-xs text-muted-foreground">Card, UPI, NetBanking</p>
                      </div>
                      {paymentMethod === "Razorpay" ? (
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="ml-auto size-4 text-primary" />
                      ) : null}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("COD")}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        paymentMethod === "COD"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex size-8 items-center justify-center rounded-md bg-green-100 text-green-700">
                        <HugeiconsIcon icon={CreditCardIcon} className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Pay when delivered</p>
                      </div>
                      {paymentMethod === "COD" ? (
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="ml-auto size-4 text-primary" />
                      ) : null}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">Coupon Code</p>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      disabled={isCouponLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void handleApplyCoupon();
                      }}
                      disabled={isCouponLoading || couponCode.trim().length === 0}
                    >
                      {isCouponLoading ? (
                        <>
                          <HugeiconsIcon icon={RotateClockwiseIcon} className="size-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2">
                      <p className="text-sm font-medium text-green-700">
                        {appliedCoupon.couponCode} applied - ₹{appliedCoupon.discountAmount.toLocaleString("en-IN")} off!
                      </p>
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </div>

                <Button type="submit" className="w-full" disabled={isProcessingPayment}>
                  {isProcessingPayment
                    ? paymentMethod === "Razorpay"
                      ? "Opening Payment..."
                      : "Placing Order..."
                    : paymentMethod === "Razorpay"
                      ? "Proceed to Pay"
                      : "Place Order"}
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

            {appliedCoupon ? (
              <div className="flex items-center justify-between text-sm text-green-700">
                <span>Coupon ({appliedCoupon.couponCode})</span>
                <span>- ₹{appliedCoupon.discountAmount.toLocaleString("en-IN")}</span>
              </div>
            ) : null}

            <Separator />

            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">₹{totalAmount.toLocaleString("en-IN")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

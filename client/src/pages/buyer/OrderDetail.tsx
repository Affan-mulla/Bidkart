import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  Clock01Icon,
  CreditCardIcon,
  DeliveryBox01Icon,
  Download01Icon,
  MapPinIcon,
  Package01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { cancelOrder, getBuyerOrderById, type Order } from "@/api/order.api";
import { createRazorpayOrder, verifyPayment } from "@/api/payment.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/axios";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";

const ORDER_STEPS: Array<Order["status"]> = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered"];

function getStatusBadgeClass(status: Order["status"]): string {
  const statusClassMap: Record<Order["status"], string> = {
    Placed: "bg-blue-50 text-blue-700 border-blue-200",
    Confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Packed: "bg-purple-50 text-purple-700 border-purple-200",
    Shipped: "bg-amber-50 text-amber-700 border-amber-200",
    Delivered: "bg-green-50 text-green-700 border-green-200",
    Cancelled: "bg-red-50 text-red-700 border-red-200",
  };

  return statusClassMap[status];
}

/**
 * Renders detailed view for a buyer order.
 */
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const orderQuery = useQuery({
    queryKey: ["buyerOrder", id],
    queryFn: () => getBuyerOrderById(id!),
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => cancelOrder(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyerOrders"] });
      queryClient.invalidateQueries({ queryKey: ["buyerOrder", id] });
      toast.success("Order cancelled");
      setShowCancelForm(false);
      setCancelReason("");
    },
    onError: () => {
      toast.error("Failed to cancel order");
    },
  });

  const order = orderQuery.data;

  const currentStepIndex = useMemo(() => {
    if (!order || order.status === "Cancelled") {
      return -1;
    }

    return ORDER_STEPS.indexOf(order.status);
  }, [order]);

  if (orderQuery.isLoading) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-8">
        <Skeleton className="h-10 w-40" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </section>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load order</AlertTitle>
          <AlertDescription>Please try again.</AlertDescription>
        </Alert>
      </section>
    );
  }

  const handleDownloadInvoice = async () => {
    try {
      const res = await api.get(`/orders/${order._id}/invoice`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `BidKart-Invoice-${order.invoiceNumber ?? order._id.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download invoice. Please try again.");
    }
  };

  const handlePayNow = async () => {
    if (!order) return;
    try {
      setIsProcessingPayment(true);

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load payment gateway. Please try again.");
        return;
      }

      const { razorpayOrderId, amount, keyId } = await createRazorpayOrder(order._id);

      const paymentResponse = await openRazorpayCheckout({
        key: keyId,
        amount,
        currency: "INR",
        name: "BidKart",
        description: `Auction Win - Order #${order._id.slice(-8).toUpperCase()}`,
        order_id: razorpayOrderId,
        prefill: {
          name: order.shippingAddress.fullName,
          contact: order.shippingAddress.phone,
        },
        theme: { color: "#9b2c2c" },
      });

      await verifyPayment({
        orderId: order._id,
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature,
      });

      queryClient.invalidateQueries({ queryKey: ["buyerOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["buyerOrders"] });
      toast.success("Payment successful! Your order is confirmed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "Payment cancelled") {
        toast.info("Payment cancelled.");
      } else {
        toast.error("Payment failed. Please try again.");
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const canCancel = order.status === "Placed" || order.status === "Confirmed";
  const canPayNow =
    order.paymentMethod === "Razorpay" &&
    order.paymentStatus === "Pending" &&
    order.status === "Placed";
  const canDownloadInvoice =
    order.paymentStatus === "Paid" ||
    (order.paymentMethod === "COD" && order.status === "Delivered");

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8">
      <Button variant="ghost" className="mb-4" onClick={() => navigate("/orders")}>
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        Back to Orders
      </Button>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-mono text-sm text-foreground">Order #{order._id.slice(-8).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="text-right">
            <Badge variant="outline" className={getStatusBadgeClass(order.status)}>{order.status}</Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              {order.paymentMethod === "Razorpay" ? "Online Payment" : "Cash on Delivery"} · {order.paymentStatus}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <HugeiconsIcon icon={Clock01Icon} className="size-4" />
            Order Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.status === "Cancelled" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="font-medium">Cancelled</p>
              {order.cancelReason ? <p className="mt-1 text-sm">Reason: {order.cancelReason}</p> : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 md:gap-0">
              {ORDER_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step} className="flex items-center md:flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-muted text-muted-foreground"
                        } ${isCurrent ? "ring-2 ring-primary/40 animate-pulse" : ""}`}
                      >
                        {index + 1}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{step}</p>
                    </div>

                    {index < ORDER_STEPS.length - 1 ? (
                      <div className={`mx-2 hidden h-[2px] flex-1 md:block ${isCompleted ? "bg-primary" : "border-t border-dashed border-border"}`} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <HugeiconsIcon icon={Package01Icon} className="size-4" />
            Items Ordered
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div key={`${item.productId}-${item.variantKey}-${item.variantValue}`} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <div className="flex items-center gap-3">
                <img
                  src={item.image || "https://placehold.co/64x64?text=No+Image"}
                  alt={item.title}
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  {item.variantKey ? (
                    <p className="text-sm text-muted-foreground">{item.variantKey}: {item.variantValue}</p>
                  ) : null}
                </div>
              </div>

              <p className="text-sm text-foreground">
                {item.quantity} × ₹{item.price.toLocaleString("en-IN")} = ₹{item.itemTotal.toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <HugeiconsIcon icon={MapPinIcon} className="size-4" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 ? <p>{order.shippingAddress.addressLine2}</p> : null}
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state}, {order.shippingAddress.pincode}
            </p>
            <p>{order.shippingAddress.phone}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <HugeiconsIcon icon={DeliveryBox01Icon} className="size-4" />
              Price Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">₹{order.subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="text-primary">Free</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">₹{order.totalAmount.toLocaleString("en-IN")}</span>
            </div>

            <Separator />

            {canDownloadInvoice ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  void handleDownloadInvoice();
                }}
              >
                <HugeiconsIcon icon={Download01Icon} className="size-4" />
                Download Invoice
              </Button>
            ) : null}

            {canPayNow ? (
              <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                <div>
                  <p className="text-sm font-medium text-amber-800">Payment Required</p>
                  {order.paymentDeadline ? (
                    <p className="text-xs text-amber-700">
                      Pay before:{" "}
                      {new Date(order.paymentDeadline).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : null}
                </div>
                <Button
                  className="w-full bg-[#9b2c2c] text-white hover:bg-[#7f2323]"
                  onClick={() => void handlePayNow()}
                  disabled={isProcessingPayment}
                >
                  <HugeiconsIcon icon={CreditCardIcon} className="size-4" />
                  {isProcessingPayment ? "Opening Payment..." : "Pay Now"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {canCancel ? (
        <Card className="mt-4">
          <CardContent className="space-y-3 p-4">
            <div className="inline-flex items-center gap-2 text-foreground">
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              <p className="font-medium">Need to cancel this order?</p>
            </div>

            {!showCancelForm ? (
              <Button variant="outline" className="text-destructive" onClick={() => setShowCancelForm(true)}>
                Cancel Order
              </Button>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  placeholder="Reason (optional)"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => cancelMutation.mutate(cancelReason.trim() || undefined)}
                    disabled={cancelMutation.isPending}
                  >
                    Confirm Cancellation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelForm(false);
                      setCancelReason("");
                    }}
                  >
                    Keep Order
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShoppingBag01Icon } from "@hugeicons/core-free-icons";

import { getBuyerOrders, type Order } from "@/api/order.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ORDER_STATUS_TABS = [
  "All",
  "Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;

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
 * Renders buyer order history.
 */
export default function Orders() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<(typeof ORDER_STATUS_TABS)[number]>("All");

  const ordersQuery = useQuery({
    queryKey: ["buyerOrders", page],
    queryFn: () => getBuyerOrders(page, 20),
  });

  const filteredOrders = useMemo(() => {
    const orders = ordersQuery.data?.orders ?? [];

    if (activeTab === "All") {
      return orders;
    }

    return orders.filter((order) => order.status === activeTab);
  }, [activeTab, ordersQuery.data?.orders]);

  const totalPages = ordersQuery.data?.totalPages ?? 1;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-foreground">My Orders</h1>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {ORDER_STATUS_TABS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setActiveTab(status)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              activeTab === status
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {ordersQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : null}

      {!ordersQuery.isLoading && filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <HugeiconsIcon icon={ShoppingBag01Icon} className="size-14 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">No orders yet</p>
            <Button onClick={() => navigate("/products")} size={"lg"}>Start Shopping</Button>
          </CardContent>
        </Card>
      ) : null}

      {!ordersQuery.isLoading && filteredOrders.length > 0 ? (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card key={order._id} className="transition-shadow hover:shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-foreground">Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <Badge variant="outline" className={getStatusBadgeClass(order.status)}>
                    {order.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {order.items.slice(0, 2).map((item) => (
                    <div key={`${order._id}-${item.productId}-${item.variantValue}`} className="flex items-center gap-2 rounded border border-border bg-muted/20 px-2 py-1">
                      <img
                        src={item.image || "https://placehold.co/32x32?text=No+Image"}
                        alt={item.title}
                        className="h-8 w-8 rounded object-cover"
                      />
                      <p className="max-w-32 truncate text-xs text-foreground">{item.title}</p>
                    </div>
                  ))}

                  {order.items.length > 2 ? (
                    <p className="text-xs text-muted-foreground">+ {order.items.length - 2} more items</p>
                  ) : null}

                  {order.paymentMethod === "Razorpay" && order.paymentStatus === "Pending" && order.status === "Placed" ? (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                      Payment Required
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {order.items.length} item(s) · ₹{order.totalAmount.toLocaleString("en-IN")} · {order.paymentMethod === "Razorpay" ? "Razorpay" : "COD"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/orders/${order._id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  DeliveryBox01Icon,
  Download,
  PackageIcon,
  UserListIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import {
  exportSellerOrders,
  getSellerOrderById,
  getSellerOrders,
  type ExportFormat,
  type OrderExportDuration,
  updateOrderStatus,
  type Order,
} from "@/api/order.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/apiError";

const STATUS_FILTERS: Array<"All" | Order["status"]> = [
  "All",
  "Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

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

function getNextValidStatuses(status: Order["status"]): Array<Order["status"]> {
  const transitionMap: Record<Order["status"], Array<Order["status"]>> = {
    Placed: ["Confirmed", "Cancelled"],
    Confirmed: ["Packed", "Cancelled"],
    Packed: ["Shipped"],
    Shipped: ["Delivered"],
    Delivered: [],
    Cancelled: [],
  };

  return transitionMap[status];
}

/**
 * Renders seller order list with status management.
 */
export default function SellerOrders() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [exportDuration, setExportDuration] = useState<OrderExportDuration>("all");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const sellerOrdersQuery = useQuery({
    queryKey: ["sellerOrders", page, status],
    queryFn: () => getSellerOrders(page, 10, status === "All" ? undefined : status),
    placeholderData: (previousData) => previousData,
  });

  const sellerOrderDetailQuery = useQuery({
    queryKey: ["sellerOrder", selectedOrderId],
    queryFn: () => getSellerOrderById(selectedOrderId!),
    enabled: Boolean(selectedOrderId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: Order["status"] }) =>
      updateOrderStatus(id, nextStatus),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sellerOrders"] });
      queryClient.invalidateQueries({ queryKey: ["sellerOrder", variables.id] });
      toast.success("Order status updated");
    },
    onError: () => {
      toast.error("Could not update order status");
    },
  });

  const exportOrdersMutation = useMutation({
    mutationFn: () =>
      exportSellerOrders({
        format: exportFormat,
        duration: exportDuration,
        status: status === "All" ? undefined : status,
      }),
    onSuccess: (result) => {
      const downloadUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download = result.fileName;

      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);

      if (result.metadata.truncated) {
        toast.warning(
          `Export is capped at ${result.metadata.maxRecords.toLocaleString("en-IN")} records. Returned ${result.metadata.returnedCount.toLocaleString("en-IN")} of ${result.metadata.totalCount.toLocaleString("en-IN")}.`,
        );
      } else {
        toast.success("Order export downloaded");
      }
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error, "Could not export orders"));
    },
  });

  const orders = sellerOrdersQuery.data?.orders ?? [];
  const totalPages = sellerOrdersQuery.data?.totalPages ?? 1;

  const selectedOrder = sellerOrderDetailQuery.data;

  const nextStatuses = useMemo(
    () => (selectedOrder ? getNextValidStatuses(selectedOrder.status) : []),
    [selectedOrder],
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Seller Orders</h1>
          <p className="text-sm text-muted-foreground">Track and update your order fulfillment pipeline.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={status === filter ? "default" : "outline"}
              onClick={() => {
                setPage(1);
                setStatus(filter);
              }}
            >
              {filter}
            </Button>
          ))}
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
          <Select value={exportDuration} onValueChange={(value) => setExportDuration(value as OrderExportDuration)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="xml">XML</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>

          <Button  onClick={() => exportOrdersMutation.mutate()} disabled={exportOrdersMutation.isPending}>
            <HugeiconsIcon icon={Download} className="size-4" />
            {exportOrdersMutation.isPending ? "Exporting..." : "Export Orders"}
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {sellerOrdersQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 px-4 text-center">
              <HugeiconsIcon icon={PackageIcon} className="size-10 text-muted-foreground" />
              <p className="text-base font-medium text-foreground">No orders found</p>
              <p className="text-sm text-muted-foreground">Orders will appear here when buyers place purchases.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Order</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Buyer</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Items</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

                    return (
                      <tr key={order._id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs text-foreground">#{order._id.slice(-8).toUpperCase()}</td>
                        <td className="px-4 py-3 text-foreground">{order.shippingAddress.fullName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{totalQuantity} items</td>
                        <td className="px-4 py-3 font-medium text-foreground">₹{order.totalAmount.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={getStatusBadgeClass(order.status)}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrderId(order._id)}>
                            <HugeiconsIcon icon={ViewIcon} className="size-4" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => setPage((previous) => previous - 1)} disabled={page === 1}>
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <Button
            variant="outline"
            onClick={() => setPage((previous) => previous + 1)}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Dialog open={Boolean(selectedOrderId)} onOpenChange={(nextOpen) => !nextOpen && setSelectedOrderId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>

          {sellerOrderDetailQuery.isLoading || !selectedOrder ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <p className="font-mono text-xs text-foreground">#{selectedOrder._id.toUpperCase()}</p>
                  <p className="text-sm text-muted-foreground">
                    Buyer: {selectedOrder.shippingAddress.fullName} • {selectedOrder.shippingAddress.phone}
                  </p>
                </div>
                <Badge variant="outline" className={getStatusBadgeClass(selectedOrder.status)}>
                  {selectedOrder.status}
                </Badge>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Order Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={`${item.productId}-${item.variantKey}-${item.variantValue}`} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image || "https://placehold.co/56x56?text=No+Image"}
                          alt={item.title}
                          className="h-14 w-14 rounded-md object-cover"
                        />
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          {item.variantKey ? (
                            <p className="text-xs text-muted-foreground">
                              {item.variantKey}: {item.variantValue}
                            </p>
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="inline-flex items-center gap-2 text-base">
                      <HugeiconsIcon icon={UserListIcon} className="size-4" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{selectedOrder.shippingAddress.fullName}</p>
                    <p>{selectedOrder.shippingAddress.addressLine1}</p>
                    {selectedOrder.shippingAddress.addressLine2 ? <p>{selectedOrder.shippingAddress.addressLine2}</p> : null}
                    <p>
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}, {selectedOrder.shippingAddress.pincode}
                    </p>
                    <p>{selectedOrder.shippingAddress.phone}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="inline-flex items-center gap-2 text-base">
                      <HugeiconsIcon icon={DeliveryBox01Icon} className="size-4" />
                      Fulfillment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Update Status</p>
                      <Select
                        value=""
                        onValueChange={(value) => {
                          updateStatusMutation.mutate({
                            id: selectedOrder._id,
                            nextStatus: value as Order["status"],
                          });
                        }}
                        disabled={nextStatuses.length === 0 || updateStatusMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={nextStatuses.length ? "Select next status" : "No further transitions"} />
                        </SelectTrigger>
                        <SelectContent>
                          {nextStatuses.map((nextStatus) => (
                            <SelectItem key={nextStatus} value={nextStatus}>
                              {nextStatus}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-foreground">₹{selectedOrder.subtotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-semibold text-foreground">₹{selectedOrder.totalAmount.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

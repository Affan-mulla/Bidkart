import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUpRight01Icon,
  AuctionIcon,
  DeliveryBox02Icon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts"

import {
  getAuctionPerformance,
  getOrderSummary,
  getRevenueData,
  getTopProducts,
  type OrderSummary,
  type TopProduct,
} from "@/api/analytics.api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("en-IN")

const orderStatusColors: Record<string, string> = {
  Delivered: "#16a34a",
  Shipped: "#f59e0b",
  Placed: "#3b82f6",
  Cancelled: "#dc2626",
  Confirmed: "#6b7280",
  Packed: "#9ca3af",
}

/**
 * Renders seller analytics dashboard page.
 */
export default function SellerAnalytics() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d")

  const revenueQuery = useQuery({
    queryKey: ["sellerRevenue", period],
    queryFn: () => getRevenueData(period),
  })

  const orderSummaryQuery = useQuery({
    queryKey: ["sellerOrderSummary"],
    queryFn: getOrderSummary,
  })

  const topProductsQuery = useQuery({
    queryKey: ["sellerTopProducts"],
    queryFn: getTopProducts,
  })

  const auctionPerfQuery = useQuery({
    queryKey: ["sellerAuctionPerformance"],
    queryFn: getAuctionPerformance,
  })

  const revenueChartData = useMemo(() => {
    const labels = revenueQuery.data?.labels || []
    const values = revenueQuery.data?.data || []

    return labels.map((label, index) => ({
      label,
      value: values[index] || 0,
    }))
  }, [revenueQuery.data?.data, revenueQuery.data?.labels])

  const orderSummary = orderSummaryQuery.data

  const orderPieData = useMemo(() => {
    if (!orderSummary) {
      return []
    }

    return [
      { name: "Delivered", value: orderSummary.Delivered },
      { name: "Shipped", value: orderSummary.Shipped },
      { name: "Placed", value: orderSummary.Placed },
      { name: "Confirmed", value: orderSummary.Confirmed },
      { name: "Packed", value: orderSummary.Packed },
      { name: "Cancelled", value: orderSummary.Cancelled },
    ].filter((entry) => entry.value > 0)
  }, [orderSummary])

  const topProductsData = useMemo(() => {
    return (topProductsQuery.data || []).slice(0, 5).map((product) => ({
      ...product,
      shortTitle: product.title.length > 20 ? `${product.title.slice(0, 20)}...` : product.title,
    }))
  }, [topProductsQuery.data])

  const revenueGrowth = revenueQuery.data?.growth ?? 0

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Seller Analytics</h1>

          <Select value={period} onValueChange={(value) => setPeriod(value as "7d" | "30d" | "90d")}>
            <SelectTrigger className="w-[120px] border-gray-200 bg-white">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7d</SelectItem>
              <SelectItem value="30d">30d</SelectItem>
              <SelectItem value="90d">90d</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {revenueQuery.isLoading ? (
            <KpiSkeleton />
          ) : revenueQuery.isError ? (
            <InlineErrorCard sectionName="revenue" />
          ) : (
            <KpiCard
              icon={ArrowUpRight01Icon}
              label="Total Revenue"
              value={currencyFormatter.format(revenueQuery.data?.total || 0)}
              growth={revenueGrowth}
            />
          )}

          {orderSummaryQuery.isLoading ? (
            <KpiSkeleton />
          ) : orderSummaryQuery.isError ? (
            <InlineErrorCard sectionName="order count" />
          ) : (
            <KpiCard
              icon={ShoppingBag01Icon}
              label="Total Orders"
              value={numberFormatter.format(orderSummaryQuery.data?.totalOrders || 0)}
            />
          )}

          {orderSummaryQuery.isLoading ? (
            <KpiSkeleton />
          ) : orderSummaryQuery.isError ? (
            <InlineErrorCard sectionName="fulfillment" />
          ) : (
            <KpiCard
              icon={DeliveryBox02Icon}
              label="Fulfillment Rate"
              value={`${(orderSummaryQuery.data?.fulfillmentRate || 0).toFixed(1)}%`}
            />
          )}

          {auctionPerfQuery.isLoading ? (
            <KpiSkeleton />
          ) : auctionPerfQuery.isError ? (
            <InlineErrorCard sectionName="auction KPI" />
          ) : (
            <KpiCard
              icon={AuctionIcon}
              label="Avg Bids / Auction"
              value={
                auctionPerfQuery.data && auctionPerfQuery.data.totalAuctions > 0
                  ? auctionPerfQuery.data.avgBidsPerAuction.toFixed(1)
                  : "-"
              }
            />
          )}
        </div>

        <Card className="mt-6 rounded-xl border border-gray-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 py-4">
            <CardTitle>Revenue Over Time</CardTitle>

            <Select value={period} onValueChange={(value) => setPeriod(value as "7d" | "30d" | "90d")}>
              <SelectTrigger className="w-[120px] border-gray-200 bg-white">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7d</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
                <SelectItem value="90d">90d</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            {revenueQuery.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : revenueQuery.isError ? (
              <InlineAlert sectionName="revenue chart" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      tickFormatter={(value: number) => `₹${numberFormatter.format(value)}`}
                    />
                    <Tooltip
                      formatter={(value: number) => currencyFormatter.format(value)}
                      contentStyle={{ borderRadius: 10, borderColor: "#e5e7eb" }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#9b2c2c" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <CardHeader className="px-5 py-4">
              <CardTitle>Order Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {orderSummaryQuery.isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : orderSummaryQuery.isError ? (
                <InlineAlert sectionName="order distribution" />
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={100}
                        paddingAngle={3}
                      >
                        {orderPieData.map((entry) => (
                          <Cell key={entry.name} fill={orderStatusColors[entry.name] || "#9ca3af"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => numberFormatter.format(value)} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <CardHeader className="px-5 py-4">
              <CardTitle>Top 5 Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {topProductsQuery.isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : topProductsQuery.isError ? (
                <InlineAlert sectionName="top products" />
              ) : topProductsData.length === 0 ? (
                <p className="text-sm text-gray-500">No product sales data yet.</p>
              ) : (
                <div className="space-y-3">
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProductsData} layout="vertical" margin={{ left: 10, right: 28, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          tickFormatter={(value: number) => `₹${Math.round(value / 1000)}k`}
                        />
                        <YAxis dataKey="shortTitle" type="category" tick={{ fill: "#6b7280", fontSize: 12 }} width={126} />
                        <Tooltip
                          formatter={(value: number) => currencyFormatter.format(value)}
                          contentStyle={{ borderRadius: 10, borderColor: "#e5e7eb" }}
                        />
                        <Bar dataKey="totalRevenue" fill="#9b2c2c" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5">
                    {topProductsData.map((item) => (
                      <p key={item.productId} className="text-xs text-gray-500">
                        {item.shortTitle}: {item.totalUnitsSold} units
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {!auctionPerfQuery.isLoading && !auctionPerfQuery.isError && (auctionPerfQuery.data?.totalAuctions || 0) > 0 ? (
          <Card className="mt-6 rounded-xl border border-gray-100 bg-white shadow-sm">
            <CardHeader className="px-5 py-4">
              <CardTitle>Auction Performance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 px-5 pb-5 md:grid-cols-3 lg:grid-cols-6">
              <AuctionPerfStat label="Total Auctions" value={numberFormatter.format(auctionPerfQuery.data?.totalAuctions || 0)} />
              <AuctionPerfStat label="Live Now" value={numberFormatter.format(auctionPerfQuery.data?.liveAuctions || 0)} />
              <AuctionPerfStat label="Completed" value={numberFormatter.format(auctionPerfQuery.data?.completedAuctions || 0)} />
              <AuctionPerfStat label="Total Bids" value={numberFormatter.format(auctionPerfQuery.data?.totalBids || 0)} />
              <AuctionPerfStat label="Highest Sale" value={currencyFormatter.format(auctionPerfQuery.data?.highestSale || 0)} />
              <AuctionPerfStat label="Won Rate" value={`${(auctionPerfQuery.data?.wonRate || 0).toFixed(1)}%`} />
            </CardContent>
          </Card>
        ) : null}

        {auctionPerfQuery.isError ? (
          <div className="mt-6">
            <InlineAlert sectionName="auction performance" />
          </div>
        ) : null}
      </div>
    </section>
  )
}

function KpiCard({
  icon,
  label,
  value,
  growth,
}: {
  icon: unknown
  label: string
  value: string
  growth?: number
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} className="size-5" />
        </span>

        {growth !== undefined ? (
          <Badge
            variant="outline"
            className={growth >= 0 ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}
          >
            {growth >= 0 ? "+" : ""}
            {growth.toFixed(1)}%
          </Badge>
        ) : null}
      </div>

      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-2 h-4 w-24" />
    </div>
  )
}

function InlineErrorCard({ sectionName }: { sectionName: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-red-700">Could not load {sectionName}. Try refreshing.</p>
    </div>
  )
}

function InlineAlert({ sectionName }: { sectionName: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Could not load {sectionName}</AlertTitle>
      <AlertDescription>Try again in a moment.</AlertDescription>
    </Alert>
  )
}

function AuctionPerfStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  )
}
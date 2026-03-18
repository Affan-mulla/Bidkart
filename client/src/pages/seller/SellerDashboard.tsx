import { getSellerStats, type Product } from "@/api/sellerProduct.api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/store/authStore"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  Boxes,
  ImageIcon,
  IndianRupee,
  Package,
  PackageOpen,
  XCircle,
} from "lucide-react"
import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"

const rupeeFormatter = new Intl.NumberFormat("en-IN")

/**
 * Renders the seller dashboard with stock-focused metrics and recent listings.
 */
export default function SellerDashboard() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sellerStats"],
    queryFn: getSellerStats,
  })

  const greeting = useMemo(() => getTimeGreeting(), [])
  const storeName = user?.sellerProfile?.storeName?.trim() || user?.name || "Your Store"

  const totalListings = data?.totalListings ?? 0
  const totalStockValue = data?.totalStockValue ?? 0
  const totalUnits = data?.totalUnits ?? 0
  const lowStockCount = data?.lowStockCount ?? 0
  const outOfStockCount = data?.outOfStockCount ?? 0

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {greeting}, {user?.name || "Seller"} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-1 text-sm text-gray-600">Here&apos;s what&apos;s happening with your store today.</p>
          </div>

          <Badge className="border-orange-200 bg-orange-50 px-3 py-1 text-orange-700" variant="outline">
            <span aria-hidden>🏪</span>
            <span>{storeName}</span>
          </Badge>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <Card className="border-red-200 bg-white shadow-sm">
            <CardContent className="py-8 text-center text-sm text-red-700">
              Could not load seller stats. Please refresh and try again.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard
              icon={<Package className="size-5 text-blue-600" />}
              iconWrapperClassName="bg-blue-50"
              value={String(totalListings)}
              label="Total Listings"
            />
            <StatCard
              icon={<IndianRupee className="size-5 text-orange-600" />}
              iconWrapperClassName="bg-orange-50"
              value={`₹${rupeeFormatter.format(totalStockValue)}`}
              label="Stock Value"
            />
            <StatCard
              icon={<Boxes className="size-5 text-purple-600" />}
              iconWrapperClassName="bg-purple-50"
              value={rupeeFormatter.format(totalUnits)}
              label="Units in Stock"
            />
            <StatCard
              icon={<AlertTriangle className="size-5 text-amber-600" />}
              iconWrapperClassName="bg-amber-50"
              value={String(lowStockCount)}
              label="Low Stock"
              showPulse={lowStockCount > 0}
            />
            <StatCard
              icon={<XCircle className="size-5 text-red-600" />}
              iconWrapperClassName="bg-red-50"
              value={String(outOfStockCount)}
              label="Out of Stock"
              className={outOfStockCount > 0 ? "border-red-200" : undefined}
            />
          </div>
        )}

        <Card className="mt-6 border border-gray-100 bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Listings</h2>
              <Link to="/seller/listings" className="text-sm font-medium text-orange-600 hover:text-orange-700">
                View all →
              </Link>
            </div>

            {isLoading ? (
              <RecentRowsSkeleton />
            ) : (data?.recentProducts?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <PackageOpen className="size-12 text-gray-300" />
                <p className="mt-4 text-base font-medium text-gray-600">No products yet</p>
                <p className="mt-1 text-sm text-gray-400">Start by adding your first product listing.</p>
                <Button
                  variant="form"
                  className="mt-4 h-9"
                  onClick={() => navigate("/seller/listings")}
                >
                  Add your first product
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto px-5 pb-4 pt-2">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400">
                      <th className="py-3 font-medium">Thumbnail</th>
                      <th className="py-3 font-medium">Product</th>
                      <th className="py-3 font-medium">Category</th>
                      <th className="py-3 font-medium">Price</th>
                      <th className="py-3 font-medium">Stock</th>
                      <th className="py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentProducts.slice(0, 5).map((product) => (
                      <RecentProductRow key={product._id} product={product} onEdit={() => navigate("/seller/listings")} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="form" className="h-10" onClick={() => navigate("/seller/listings")}>Add New Product</Button>
          <Button variant="outline" className="h-10" onClick={() => navigate("/seller/orders")}>View All Orders</Button>
        </div>
      </div>
    </section>
  )
}

/**
 * Returns an appropriate greeting based on local time.
 */
function getTimeGreeting(): string {
  const hour = new Date().getHours()

  if (hour < 12) {
    return "Good morning"
  }

  if (hour < 17) {
    return "Good afternoon"
  }

  return "Good evening"
}

type StatCardProps = {
  icon: React.ReactNode
  iconWrapperClassName: string
  value: string
  label: string
  showPulse?: boolean
  className?: string
}

/**
 * Displays a single stat metric card.
 */
function StatCard({ icon, iconWrapperClassName, value, label, showPulse, className }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-5 shadow-sm ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${iconWrapperClassName}`}>
          {icon}
        </span>
        {showPulse ? <span className="mt-1 inline-flex size-2 animate-pulse rounded-full bg-amber-500" /> : null}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  )
}

/**
 * Displays a skeleton placeholder for a stat card.
 */
function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="mt-3 h-7 w-20" />
      <Skeleton className="mt-2 h-4 w-24" />
    </div>
  )
}

/**
 * Shows loading placeholders for recent-listings table rows.
 */
function RecentRowsSkeleton() {
  return (
    <div className="px-5 py-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[48px_1.6fr_1fr_1fr_1fr_80px] items-center gap-3 border-b border-gray-100 py-3">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-8 w-14" />
        </div>
      ))}
    </div>
  )
}

type RecentProductRowProps = {
  product: Product
  onEdit: () => void
}

/**
 * Renders one row in recent listings section.
 */
function RecentProductRow({ product, onEdit }: RecentProductRowProps) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} className="h-11 w-11 rounded-lg object-cover" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
            <ImageIcon className="size-4" />
          </div>
        )}
      </td>
      <td className="max-w-[260px] py-3">
        <p className="truncate font-medium text-gray-900">{product.title}</p>
      </td>
      <td className="py-3 text-sm text-gray-500">{product.category}</td>
      <td className="py-3 font-medium text-gray-900">₹{rupeeFormatter.format(product.basePrice)}</td>
      <td className="py-3">
        <StockBadge stock={product.stock} />
      </td>
      <td className="py-3">
        <Button variant="ghost" className="h-8 px-3 text-orange-600 hover:text-orange-700" onClick={onEdit}>
          Edit
        </Button>
      </td>
    </tr>
  )
}

type StockBadgeProps = {
  stock: number
}

/**
 * Renders stock health badge.
 */
function StockBadge({ stock }: StockBadgeProps) {
  if (stock === 0) {
    return <Badge className="bg-red-50 text-red-700" variant="outline">Out of Stock</Badge>
  }

  if (stock <= 5) {
    return <Badge className="bg-amber-50 text-amber-700" variant="outline">Low: {stock}</Badge>
  }

  return <Badge className="bg-green-50 text-green-700" variant="outline">{stock} units</Badge>
}

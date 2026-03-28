import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ImageIcon, PackageOpen, Pencil, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import {
  deleteProduct,
  exportSellerProducts,
  getMyProducts,
  type ExportFormat,
  type Product,
} from "@/api/sellerProduct.api"
import ProductFormModal from "@/components/seller/ProductFormModal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { extractApiErrorMessage } from "@/lib/apiError"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { AddCircleFreeIcons, ArrowDown01Icon, Download } from "@hugeicons/core-free-icons"

const rupeeFormatter = new Intl.NumberFormat("en-IN")

/**
 * Renders paginated seller listings with create, update, and delete controls.
 */
export default function SellerListings() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["myProducts", page],
    queryFn: () => getMyProducts(page),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProducts"] })
      queryClient.invalidateQueries({ queryKey: ["sellerStats"] })
      setDeletingProduct(null)
      toast.success("Product deleted")
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error, "Could not delete product"))
    },
  })

  const exportProductsMutation = useMutation({
    mutationFn: () => exportSellerProducts(exportFormat),
    onSuccess: (result) => {
      const downloadUrl = URL.createObjectURL(result.blob)
      const anchor = document.createElement("a")

      anchor.href = downloadUrl
      anchor.download = result.fileName

      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(downloadUrl)

      if (result.metadata.truncated) {
        toast.warning(
          `Export is capped at ${result.metadata.maxRecords.toLocaleString("en-IN")} records. Returned ${result.metadata.returnedCount.toLocaleString("en-IN")} of ${result.metadata.totalCount.toLocaleString("en-IN")}.`,
        )
      } else {
        toast.success("Product export downloaded")
      }
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error, "Could not export products"))
    },
  })

  const products = data?.products ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const rowStart = useMemo(() => (page - 1) * 10 + 1, [page])

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">My Listings</h1>
            <Badge className="bg-gray-100 text-gray-600" variant="outline">
              {total}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
              <SelectTrigger className="h-9 w-[120px] border-gray-200 bg-white">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size={"lg"}
              onClick={() => exportProductsMutation.mutate()}
              disabled={exportProductsMutation.isPending}
            >
              <HugeiconsIcon icon={Download} className="size-4" />
              {exportProductsMutation.isPending ? "Exporting..." : "Export Products"}
            </Button>

            <Button size={"lg"} onClick={() => setIsCreateOpen(true)}>
              <HugeiconsIcon icon={AddCircleFreeIcons} className="size-4" />
              Add Product
            </Button>
          </div>
        </header>

        <Card className="border-gray-100 bg-white shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="px-4 py-3">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="py-3 font-medium">#</th>
                      <th className="py-3 font-medium">Image</th>
                      <th className="py-3 font-medium">Title</th>
                      <th className="py-3 font-medium">Category</th>
                      <th className="py-3 font-medium">Price</th>
                      <th className="py-3 font-medium">Stock</th>
                      <th className="py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }).map((_, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3"><Skeleton className="h-4 w-6" /></td>
                        <td className="py-3"><Skeleton className="h-12 w-12 rounded-lg" /></td>
                        <td className="py-3"><Skeleton className="h-4 w-52" /></td>
                        <td className="py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3"><Skeleton className="h-7 w-24 rounded-full" /></td>
                        <td className="py-3"><Skeleton className="h-8 w-20" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : isError ? (
              <div className="px-6 py-12 text-center text-sm text-red-600">
                Could not load products. Please refresh and try again.
              </div>
            ) : products.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-4 text-center">
                <PackageOpen className="size-14 text-gray-300" />
                <p className="mt-4 text-base text-gray-500">No products yet</p>
                <p className="mt-1 text-sm text-gray-400">Add your first product to get started</p>
                <Button className="mt-5 h-9" onClick={() => setIsCreateOpen(true)}>
                  <HugeiconsIcon icon={AddCircleFreeIcons} className="size-4" />
                  Add Product
                </Button>
              </div>
            ) : (
              <div className="px-4 py-3">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                        <th className="py-3 font-medium">#</th>
                        <th className="py-3 font-medium">Image</th>
                        <th className="py-3 font-medium">Title</th>
                        <th className="py-3 font-medium">Category</th>
                        <th className="py-3 font-medium">Price</th>
                        <th className="py-3 font-medium">Stock</th>
                        <th className="py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product, index) => (
                        <tr key={product._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 text-gray-600">{rowStart + index}</td>
                          <td className="py-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                                <ImageIcon className="size-4" />
                              </div>
                            )}
                          </td>
                          <td className="max-w-[260px] py-3">
                            <p className="line-clamp-2 font-medium text-gray-900">{product.title}</p>
                          </td>
                          <td className="py-3 text-sm text-gray-500">{product.category}</td>
                          <td className="py-3 font-medium text-gray-900">₹{rupeeFormatter.format(product.basePrice)}</td>
                          <td className="py-3"><StockBadge stock={product.stock} /></td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-8"
                                onClick={() => setEditingProduct(product)}
                                aria-label="Edit product"
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-8 border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => setDeletingProduct(product)}
                                aria-label="Delete product"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 ? (
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <Button variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                      Previous
                    </Button>
                    <p className="text-sm text-gray-600">Page {page} of {totalPages}</p>
                    <Button
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ProductFormModal
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["myProducts"] })
        }}
      />

      <ProductFormModal
        mode="edit"
        product={editingProduct ?? undefined}
        open={Boolean(editingProduct)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingProduct(null)
          }
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["myProducts"] })
        }}
      />

      <Dialog open={Boolean(deletingProduct)} onOpenChange={(nextOpen) => !nextOpen && setDeletingProduct(null)}>
        <DialogContent className="max-w-md border-gray-200">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete {deletingProduct?.title}? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProduct(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingProduct?._id) {
                  deleteMutation.mutate(deletingProduct._id)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

type StockBadgeProps = {
  stock: number
}

/**
 * Renders stock-level badge for listings table.
 */
function StockBadge({ stock }: StockBadgeProps) {
  if (stock === 0) {
    return (
      <Badge className="bg-red-50 text-red-700" variant="outline">
        Out of Stock
      </Badge>
    )
  }

  if (stock <= 5) {
    return (
      <Badge className="bg-amber-50 text-amber-700" variant="outline">
        Low: {stock}
      </Badge>
    )
  }

  return (
    <Badge className="bg-green-50 text-green-700" variant="outline">
      {stock} units
    </Badge>
  )
}

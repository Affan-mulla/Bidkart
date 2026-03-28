import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon, FavouriteIcon } from "@hugeicons/core-free-icons"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { addToCart } from "@/api/cart.api"
import { getWishlist, removeFromWishlist } from "@/api/wishlist.api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCartStore } from "@/store/cartStore"
import { useWishlistStore } from "@/store/wishlistStore"

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price)

/**
 * Renders the buyer wishlist page.
 */
export default function Wishlist() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const wishlistRemove = useWishlistStore((state) => state.remove)

  const wishlistQuery = useQuery({
    queryKey: ["wishlist", page],
    queryFn: () => getWishlist(page),
  })

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] })
      toast.success("Removed from wishlist")
    },
    onError: () => {
      toast.error("Could not remove from wishlist")
    },
  })

  const addCartMutation = useMutation({
    mutationFn: (productId: string) => addToCart({ productId, quantity: 1 }),
    onSuccess: (cart) => {
      useCartStore.getState().setTotalItems(cart.totalItems)
      queryClient.invalidateQueries({ queryKey: ["cart"] })
      toast.success("Added to cart")
    },
    onError: () => {
      toast.error("Could not add to cart")
    },
  })

  const items = wishlistQuery.data?.items || []
  const totalPages = wishlistQuery.data?.totalPages || 1

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-foreground">My Wishlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">({wishlistQuery.data?.total || 0} saved items)</p>
      </div>

      {wishlistQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-52 w-full" />
          ))}
        </div>
      ) : null}

      {!wishlistQuery.isLoading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <HugeiconsIcon icon={FavouriteIcon} className="size-16 text-muted-foreground" />
          <p className="text-lg font-medium">Your wishlist is empty</p>
          <p className="text-sm text-muted-foreground">Save products you love for later</p>
          <Button onClick={() => navigate("/products")}>Browse Products</Button>
        </div>
      ) : null}

      {!wishlistQuery.isLoading && items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <Link key={item._id} to={`/product/${item._id}`}>
                <Card className="h-full overflow-hidden py-0">
                  <div className="relative">
                    <img
                      src={item.images?.[0] || "https://placehold.co/500x500?text=Product"}
                      alt={item.title}
                      className="h-36 w-full object-cover"
                    />
                    {item.stock === 0 ? <Badge variant="destructive" className="absolute right-2 top-2">Out of Stock</Badge> : null}
                  </div>

                  <CardContent className="space-y-2 p-3">
                    <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">★ {item.ratings.toFixed(1)}</p>
                    <p className="text-sm font-semibold text-foreground">{formatPrice(item.basePrice)}</p>

                    {item.stock > 0 ? (
                      <Button
                        type="button"
                        className="w-full"
                        onClick={(event) => {
                          event.preventDefault()
                          void addCartMutation.mutateAsync(item._id)
                        }}
                        disabled={addCartMutation.isPending}
                        
                        size={"lg"}
                      >
                        Add to Cart
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={(event) => {
                          event.preventDefault()
                          toast.success("We will notify you when back in stock!")
                        }}
                      >
                        Notify Me
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={(event) => {
                        event.preventDefault()
                        wishlistRemove(item._id)
                        removeMutation.mutate(item._id)
                      }}
                      disabled={removeMutation.isPending}
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((previousPage) => Math.max(1, previousPage - 1))}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((previousPage) => Math.min(totalPages, previousPage + 1))}
              >
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
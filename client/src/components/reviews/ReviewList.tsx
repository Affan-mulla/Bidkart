import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { StarIcon } from "@hugeicons/core-free-icons"
import { useNavigate } from "react-router-dom"

import { getProductReviews } from "@/api/review.api"
import ReviewCard from "@/components/reviews/ReviewCard"
import ReviewForm from "@/components/reviews/ReviewForm"
import StarRating from "@/components/reviews/StarRating"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const SORT_OPTIONS = [
  { label: "Most Recent", value: "newest" },
  { label: "Highest Rated", value: "highest" },
  { label: "Lowest Rated", value: "lowest" },
  { label: "Most Helpful", value: "most_helpful" },
] as const

/**
 * Renders product reviews summary, sorting, pagination, and write-review actions.
 */
export default function ReviewList({
  productId,
  currentUserId,
  currentUserRole,
}: {
  productId: string
  currentUserId?: string
  currentUserRole?: string
}) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>("newest")
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reviews", productId, page, sort],
    queryFn: () => getProductReviews(productId, page, sort),
  })

  const averageRating = useMemo(() => {
    if (!data?.total) {
      return 0
    }

    const weightedTotal =
      data.ratingBreakdown[5] * 5 +
      data.ratingBreakdown[4] * 4 +
      data.ratingBreakdown[3] * 3 +
      data.ratingBreakdown[2] * 2 +
      data.ratingBreakdown[1] * 1

    return weightedTotal / data.total
  }, [data])

  return (
    <section className="space-y-5">
      <h2 className="text-xl font-semibold text-foreground">Customer Reviews</h2>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Please try again.</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && data ? (
        <>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <StarRating value={averageRating} showValue />
                  <p className="text-sm text-muted-foreground">{data.total} reviews</p>
                </div>
                <p className="text-sm text-muted-foreground">{averageRating.toFixed(1)} out of 5</p>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={sort}
                  onValueChange={(value) => {
                    setSort(value as (typeof SORT_OPTIONS)[number]["value"])
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="min-w-[180px]">
                    <SelectValue placeholder="Sort reviews" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {currentUserRole !== "seller" ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (!currentUserId) {
                        navigate("/login")
                        return
                      }

                      setIsReviewDialogOpen(true)
                    }}
                  >
                    Write a Review
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = data.ratingBreakdown[rating as 1 | 2 | 3 | 4 | 5]
                const pct = data.total ? Math.round((count / data.total) * 100) : 0

                return (
                  <div key={rating} className="grid grid-cols-[60px_1fr_86px] items-center gap-2 text-xs">
                    <div className="inline-flex items-center gap-1 text-amber-500">
                      <span>{rating}</span>
                      <HugeiconsIcon icon={StarIcon} className="size-3.5" />
                    </div>
                    <div className="h-2 rounded-full bg-gray-200">
                      <div className="h-2 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-muted-foreground">{pct}% ({count})</div>
                  </div>
                )
              })}
            </div>
          </div>

          {data.reviews.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-10 text-center">
              <p className="text-base font-medium text-foreground">No reviews yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Be the first to review this product!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.reviews.map((review) => (
                <ReviewCard
                  key={review._id}
                  review={review}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                />
              ))}
            </div>
          )}

          {data.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((previousPage) => Math.max(1, previousPage - 1))}
              >
                Prev
              </Button>
              <p className="text-sm text-muted-foreground">
                Page {page} of {data.totalPages}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={page >= data.totalPages}
                onClick={() => setPage((previousPage) => Math.min(data.totalPages, previousPage + 1))}
              >
                Next
              </Button>
            </div>
          ) : null}

          <ReviewForm
            productId={productId}
            open={isReviewDialogOpen}
            onOpenChange={setIsReviewDialogOpen}
            onSuccess={() => {
              setPage(1)
            }}
          />
        </>
      ) : null}
    </section>
  )
}

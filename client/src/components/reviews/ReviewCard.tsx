import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, ThumbsUpIcon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { addSellerReply, deleteReview, toggleHelpful, type Review } from "@/api/review.api"
import StarRating from "@/components/reviews/StarRating"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

/**
 * Renders a single review card with helpful, delete, image preview, and seller reply actions.
 */
export default function ReviewCard({
  review,
  currentUserId,
  currentUserRole,
}: {
  review: Review
  currentUserId?: string
  currentUserRole?: string
}) {
  const queryClient = useQueryClient()

  const [isReplyOpen, setIsReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const hasUserVotedHelpful = useMemo(
    () => Boolean(currentUserId && review.helpfulVotes?.includes(currentUserId)),
    [currentUserId, review.helpfulVotes],
  )

  const helpfulMutation = useMutation({
    mutationFn: () => toggleHelpful(review._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", review.productId] })
    },
    onError: () => {
      toast.error("Could not update helpful vote")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteReview(review._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", review.productId] })
      toast.success("Review deleted")
    },
    onError: () => {
      toast.error("Could not delete review")
    },
  })

  const replyMutation = useMutation({
    mutationFn: () => addSellerReply(review._id, replyText.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", review.productId] })
      toast.success("Reply added")
      setReplyText("")
      setIsReplyOpen(false)
    },
    onError: () => {
      toast.error("Could not add reply")
    },
  })

  return (
    <article className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StarRating value={review.rating} size="sm" />
        <p className="text-sm font-medium text-foreground">{review.title}</p>
      </div>

      {review.isVerifiedPurchase ? <Badge variant="secondary">Verified Purchase</Badge> : null}

      <p className="text-sm text-muted-foreground">
        {review.buyer?.name || "Buyer"} · {formatDate(review.createdAt)}
      </p>

      <p className="text-sm leading-6 text-foreground">{review.body}</p>

      {review.images?.length ? (
        <div className="flex flex-wrap gap-2">
          {review.images.map((image) => (
            <button key={image} type="button" onClick={() => setPreviewImage(image)}>
              <img src={image} alt="Review" className="size-14 rounded-md object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={hasUserVotedHelpful ? "secondary" : "outline"}
          onClick={() => helpfulMutation.mutate()}
          disabled={helpfulMutation.isPending || !currentUserId}
        >
          <HugeiconsIcon icon={ThumbsUpIcon} className="size-4" />
          Helpful ({review.helpfulVotes?.length || 0})
        </Button>

        {review.buyerId === currentUserId ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            Delete
          </Button>
        ) : null}
      </div>

      {review.sellerReply ? (
        <div className="ml-3 rounded-md border border-border bg-muted/50 p-3 italic">
          <p className="text-sm text-foreground">{review.sellerReply.text}</p>
          <p className="mt-1 text-xs text-muted-foreground">- {formatDate(review.sellerReply.repliedAt)}</p>
        </div>
      ) : null}

      {currentUserRole === "seller" && !review.sellerReply ? (
        <div>
          {!isReplyOpen ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsReplyOpen(true)}>
              Reply
            </Button>
          ) : (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Input
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Write a reply"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => replyMutation.mutate()}
                  disabled={replyMutation.isPending || replyText.trim().length < 2}
                >
                  Send Reply
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setIsReplyOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => (!open ? setPreviewImage(null) : null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Image</DialogTitle>
          </DialogHeader>
          {previewImage ? <img src={previewImage} alt="Preview" className="max-h-[70vh] w-full rounded-md object-contain" /> : null}
        </DialogContent>
      </Dialog>
    </article>
  )
}

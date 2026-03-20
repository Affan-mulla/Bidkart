import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"

import { createReview } from "@/api/review.api"
import { getBuyerOrders } from "@/api/order.api"
import StarRating from "@/components/reviews/StarRating"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

interface ReviewFormProps {
  productId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const schema = z.object({
  orderId: z.string().min(1, "Order is required"),
  rating: z.number().min(1, "Rating is required").max(5),
  title: z.string().min(3).max(100),
  body: z.string().min(10).max(1000),
})

type FormValues = z.infer<typeof schema>

/**
 * Dialog form for buyer review submission linked to delivered orders.
 */
export default function ReviewForm({ productId, open, onOpenChange, onSuccess }: ReviewFormProps) {
  const queryClient = useQueryClient()

  const ordersQuery = useQuery({
    queryKey: ["buyerOrders", "review", productId],
    queryFn: () => getBuyerOrders(1, 100),
    enabled: open,
  })

  const reviewableOrders = useMemo(() => {
    const orders = ordersQuery.data?.orders || []

    return orders.filter((order) => {
      if (order.status !== "Delivered") {
        return false
      }

      return order.items.some((item) => item.productId === productId)
    })
  }, [ordersQuery.data?.orders, productId])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderId: "",
      rating: 0,
      title: "",
      body: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createReview({
        orderId: values.orderId,
        rating: values.rating,
        title: values.title,
        body: values.body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] })
      toast.success("Review submitted!")
      form.reset({ orderId: "", rating: 0, title: "", body: "" })
      onSuccess()
      onOpenChange(false)
    },
    onError: () => {
      toast.error("Something went wrong")
    },
  })

  const bodyValue = form.watch("body") || ""
  const ratingValue = form.watch("rating") || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
        </DialogHeader>

        {!ordersQuery.isLoading && reviewableOrders.length === 0 ? (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            No delivered orders found for this product.
          </div>
        ) : (
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Order *</Label>
              <Select
                value={form.watch("orderId") || ""}
                onValueChange={(value) => form.setValue("orderId", value, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select delivered order" />
                </SelectTrigger>
                <SelectContent>
                  {reviewableOrders.map((order) => (
                    <SelectItem key={order._id} value={order._id}>
                      Order #{order._id.slice(-8).toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.orderId ? (
                <p className="text-xs text-destructive">{form.formState.errors.orderId.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Your Rating *</Label>
              <StarRating value={ratingValue} onChange={(rating) => form.setValue("rating", rating, { shouldValidate: true })} size="lg" />
              {form.formState.errors.rating ? (
                <p className="text-xs text-destructive">{form.formState.errors.rating.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="review-title">Review Title *</Label>
              <Input id="review-title" {...form.register("title")} placeholder='e.g. "Great product!"' />
              {form.formState.errors.title ? (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="review-body">Your Review *</Label>
              <textarea
                id="review-body"
                {...form.register("body")}
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              <div className="flex items-center justify-between">
                {form.formState.errors.body ? (
                  <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-muted-foreground">{bodyValue.length} / 1000</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Spinner className="size-4" /> : null}
                Submit Review
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

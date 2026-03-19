import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type AutoBidModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBid: number
  minBid: number
  onPlaceBid: (amount: number, maxAutoBid?: number) => void
  isSubmitting?: boolean
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

/**
 * Collects maximum auto-bid amount and submits it with the minimum valid bid.
 */
export default function AutoBidModal({
  open,
  onOpenChange,
  currentBid,
  minBid,
  onPlaceBid,
  isSubmitting,
}: AutoBidModalProps) {
  const schema = z.object({
    maxAutoBid: z.coerce.number().gt(currentBid, `Must be more than ${formatCurrency(currentBid)}`),
  })

  type AutoBidFormValues = z.infer<typeof schema>

  const form = useForm<AutoBidFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      maxAutoBid: minBid,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({ maxAutoBid: minBid })
    }
  }, [form, minBid, open])

  const onSubmit = (values: AutoBidFormValues) => {
    onPlaceBid(minBid, values.maxAutoBid)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Auto-Bid</DialogTitle>
          <DialogDescription>
            We will automatically bid for you up to your maximum amount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="max-auto-bid" className="text-sm font-medium text-foreground">
              Maximum Bid Amount
            </label>
            <Input
              id="max-auto-bid"
              type="number"
              min={minBid}
              step={1}
              {...form.register("maxAutoBid")}
            />
            <p className="text-xs text-muted-foreground">Must be more than {formatCurrency(currentBid)}</p>
            {form.formState.errors.maxAutoBid ? (
              <p className="text-xs text-destructive">{form.formState.errors.maxAutoBid.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={Boolean(isSubmitting)}>
              {isSubmitting ? "Setting..." : "Set Auto-Bid"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

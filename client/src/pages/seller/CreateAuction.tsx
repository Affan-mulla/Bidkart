import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { createAuction } from "@/api/auction.api"
import { getMyProducts } from "@/api/sellerProduct.api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

const DURATION_OPTIONS = [
  { label: "1 hour", value: "1h", hours: 1 },
  { label: "6 hours", value: "6h", hours: 6 },
  { label: "12 hours", value: "12h", hours: 12 },
  { label: "24 hours", value: "24h", hours: 24 },
  { label: "3 days", value: "3d", hours: 72 },
  { label: "7 days", value: "7d", hours: 168 },
  { label: "Custom", value: "custom", hours: 0 },
] as const

const toDateTimeInputValue = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const parseDateTimeInput = (value: string) => new Date(value)

const schema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    startPrice: z.coerce.number().gt(0, "Starting price must be greater than 0"),
    reservePrice: z.union([z.coerce.number().gt(0), z.nan()]).optional(),
    buyItNowPrice: z.union([z.coerce.number().gt(0), z.nan()]).optional(),
    startTime: z.string().min(1, "Start time is required"),
    duration: z.string().min(1, "Duration is required"),
    customEndTime: z.string().optional(),
  })
  .superRefine((value, context) => {
    const start = parseDateTimeInput(value.startTime)

    if (start.getTime() <= Date.now()) {
      context.addIssue({ code: "custom", path: ["startTime"], message: "Start time must be in the future" })
    }

    if (!Number.isNaN(value.buyItNowPrice as number) && (value.buyItNowPrice as number) <= value.startPrice) {
      context.addIssue({
        code: "custom",
        path: ["buyItNowPrice"],
        message: "Buy-it-now must be greater than starting price",
      })
    }

    if (value.duration === "custom") {
      if (!value.customEndTime) {
        context.addIssue({ code: "custom", path: ["customEndTime"], message: "End time is required" })
        return
      }

      const end = parseDateTimeInput(value.customEndTime)

      if (end <= start) {
        context.addIssue({ code: "custom", path: ["customEndTime"], message: "End time must be after start time" })
      }
    }
  })

type FormValues = z.infer<typeof schema>

/**
 * Renders auction creation form for sellers.
 */
export default function CreateAuction() {
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState("")

  const productsQuery = useQuery({
    queryKey: ["sellerProducts", "auctionCreate"],
    queryFn: () => getMyProducts(1, 100),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: "",
      startPrice: 0,
      reservePrice: Number.NaN,
      buyItNowPrice: Number.NaN,
      startTime: toDateTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)),
      duration: "24h",
      customEndTime: "",
    },
  })

  const duration = form.watch("duration")
  const startTime = form.watch("startTime")
  const selectedProductId = form.watch("productId")

  const selectedDuration = DURATION_OPTIONS.find((option) => option.value === duration)

  const calculatedEndTime = useMemo(() => {
    const start = parseDateTimeInput(startTime)

    if (duration === "custom") {
      const custom = form.getValues("customEndTime")
      return custom ? parseDateTimeInput(custom) : null
    }

    if (!selectedDuration) {
      return null
    }

    return new Date(start.getTime() + selectedDuration.hours * 60 * 60 * 1000)
  }, [duration, form, selectedDuration, startTime])

  useEffect(() => {
    if (duration === "custom") {
      return
    }

    if (!calculatedEndTime) {
      return
    }

    form.setValue("customEndTime", toDateTimeInputValue(calculatedEndTime), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [calculatedEndTime, duration, form])

  const filteredProducts = useMemo(() => {
    const products = productsQuery.data?.products || []

    if (!searchQuery.trim()) {
      return products
    }

    const queryText = searchQuery.trim().toLowerCase()

    return products.filter((product) => product.title.toLowerCase().includes(queryText))
  }, [productsQuery.data?.products, searchQuery])

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const endTime = values.duration === "custom" ? values.customEndTime : toDateTimeInputValue(calculatedEndTime || new Date())

      return createAuction({
        productId: values.productId,
        startPrice: values.startPrice,
        reservePrice: Number.isNaN(values.reservePrice as number) ? undefined : (values.reservePrice as number),
        buyItNowPrice: Number.isNaN(values.buyItNowPrice as number) ? undefined : (values.buyItNowPrice as number),
        startTime: new Date(values.startTime).toISOString(),
        endTime: new Date(endTime || "").toISOString(),
      })
    },
    onSuccess: (auction) => {
      toast.success("Auction created successfully")
      navigate(`/auctions/${auction._id}`)
    },
    onError: () => {
      toast.error("Could not create auction")
    },
  })

  const selectedProduct = (productsQuery.data?.products || []).find((product) => product._id === selectedProductId)

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Create Auction</h1>
      </div>

      {productsQuery.isError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Please try again.</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="space-y-6 rounded-lg border border-border bg-card p-5">
        <div className="space-y-2">
          <Label>Search Product *</Label>
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search your listings"
              className="pl-9"
            />
          </div>

          <div className="max-h-52 overflow-y-auto rounded-md border border-border">
            {filteredProducts.map((product) => {
              const isSelected = selectedProductId === product._id

              return (
                <button
                  key={product._id}
                  type="button"
                  className={`flex w-full items-center gap-3 border-b border-border p-3 text-left last:border-0 ${
                    isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                  }`}
                  onClick={() => form.setValue("productId", product._id, { shouldValidate: true })}
                >
                  <img
                    src={product.images?.[0] || "https://placehold.co/100x100?text=Product"}
                    alt={product.title}
                    className="size-10 rounded-md object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{product.title}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                </button>
              )
            })}

            {!filteredProducts.length ? <p className="p-3 text-sm text-muted-foreground">No products found</p> : null}
          </div>
          {form.formState.errors.productId ? (
            <p className="text-xs text-destructive">{form.formState.errors.productId.message}</p>
          ) : null}
          {selectedProduct ? (
            <p className="text-xs text-muted-foreground">Selected: {selectedProduct.title}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-price">Starting Price *</Label>
            <Input id="start-price" type="number" {...form.register("startPrice")} />
            {form.formState.errors.startPrice ? (
              <p className="text-xs text-destructive">{form.formState.errors.startPrice.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reserve-price">Reserve Price (optional)</Label>
            <Input id="reserve-price" type="number" {...form.register("reservePrice")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="buy-now-price">Buy It Now Price (optional)</Label>
          <Input id="buy-now-price" type="number" {...form.register("buyItNowPrice")} />
          {form.formState.errors.buyItNowPrice ? (
            <p className="text-xs text-destructive">{form.formState.errors.buyItNowPrice.message as string}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-time">Start Time *</Label>
            <Input id="start-time" type="datetime-local" {...form.register("startTime")} />
            {form.formState.errors.startTime ? (
              <p className="text-xs text-destructive">{form.formState.errors.startTime.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Duration *</Label>
            <Select value={duration} onValueChange={(value) => form.setValue("duration", value, { shouldValidate: true })}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {duration === "custom" ? (
          <div className="space-y-2">
            <Label htmlFor="custom-end-time">Custom End Time *</Label>
            <Input id="custom-end-time" type="datetime-local" {...form.register("customEndTime")} />
            {form.formState.errors.customEndTime ? (
              <p className="text-xs text-destructive">{form.formState.errors.customEndTime.message}</p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Ends at: {calculatedEndTime ? calculatedEndTime.toLocaleString("en-IN") : "--"}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/seller/listings")} size={"lg"}>Cancel</Button>
          <Button type="submit" disabled={createMutation.isPending}  size={"lg"}>
            {createMutation.isPending ? <><Spinner/> Creating...</> : "Create Auction"}
          </Button>
        </div>
      </form>
    </section>
  )
}
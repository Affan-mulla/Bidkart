import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
  createProduct,
  updateProduct,
  type Product,
  type ProductVariant,
} from "@/api/sellerProduct.api"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { extractApiErrorMessage } from "@/lib/apiError"

const categories = ["Electronics", "Clothing", "Books", "Home & Kitchen", "Sports", "Other"] as const

const productFormSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  category: z.enum(categories, {
    message: "Please select a category",
  }),
  basePrice: z.number().min(0.01, "Price must be at least 0.01"),
  stock: z.number().min(0, "Stock cannot be negative"),
  tags: z.string().optional(),
  variants: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    }),
  ),
})

type ProductFormValues = z.infer<typeof productFormSchema>

type ProductFormModalProps = {
  mode: "create" | "edit"
  product?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/**
 * Renders create/edit product modal with shared form controls.
 */
export default function ProductFormModal({
  mode,
  product,
  open,
  onOpenChange,
  onSuccess,
}: ProductFormModalProps) {
  const queryClient = useQueryClient()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imagesError, setImagesError] = useState<string | null>(null)

  const {
    control,
    register,
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: undefined,
      basePrice: 0,
      stock: 0,
      tags: "",
      variants: [{ key: "", value: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  })

  const selectedCategory = watch("category")

  const previewUrls = useMemo(
    () => selectedFiles.map((file) => URL.createObjectURL(file)),
    [selectedFiles],
  )

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  useEffect(() => {
    if (!open) {
      return
    }

    if (mode === "edit" && product) {
      reset({
        title: product.title,
        description: product.description,
        category: (categories.includes(product.category as (typeof categories)[number])
          ? product.category
          : "Other") as ProductFormValues["category"],
        basePrice: product.basePrice,
        stock: product.stock,
        tags: product.tags.join(", "),
        variants: product.variants.length ? product.variants : [{ key: "", value: "" }],
      })
    } else {
      reset({
        title: "",
        description: "",
        category: undefined,
        basePrice: 0,
        stock: 0,
        tags: "",
        variants: [{ key: "", value: "" }],
      })
    }

    setSelectedFiles([])
    setImagesError(null)
  }, [mode, open, product, reset])

  const mutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const formData = new FormData()

      formData.append("title", values.title.trim())
      formData.append("description", values.description?.trim() ?? "")
      formData.append("category", values.category)
      formData.append("basePrice", String(values.basePrice))
      formData.append("stock", String(values.stock))
      formData.append("tags", values.tags?.trim() ?? "")

      const cleanedVariants: ProductVariant[] = values.variants
        .map((variant) => ({ key: variant.key.trim(), value: variant.value.trim() }))
        .filter((variant) => variant.key.length > 0 || variant.value.length > 0)

      formData.append("variants", JSON.stringify(cleanedVariants))

      selectedFiles.forEach((file) => {
        formData.append("images", file)
      })

      if (mode === "create") {
        return createProduct(formData)
      }

      if (!product?._id) {
        throw new Error("Product id is required")
      }

      return updateProduct(product._id, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProducts"] })
      queryClient.invalidateQueries({ queryKey: ["sellerStats"] })
      onSuccess()
      onOpenChange(false)
      toast.success(mode === "create" ? "Product created!" : "Product updated!")
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error, "Could not save product"))
    },
  })

  const submitForm = handleSubmit((values) => {
    if (mode === "create" && selectedFiles.length === 0) {
      setImagesError("Please upload at least one image")
      return
    }

    setImagesError(null)
    mutation.mutate(values)
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!mutation.isPending) {
          onOpenChange(nextOpen)
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden border-gray-200 p-0">
        <DialogHeader className="border-b border-gray-100 px-6 py-4">
          <DialogTitle>{mode === "create" ? "Add Product" : "Edit Product"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submitForm} className="max-h-[72vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Product title" {...register("title")} />
            {errors.title ? <p className="text-xs text-red-600">{errors.title.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              className="w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              placeholder="Write a short product description"
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={(value) =>
                  setValue("category", value as ProductFormValues["category"], { shouldValidate: true })
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category ? <p className="text-xs text-red-600">{errors.category.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price</Label>
              <Input
                id="basePrice"
                type="number"
                min={0.01}
                step="0.01"
                {...register("basePrice", { valueAsNumber: true })}
              />
              {errors.basePrice ? <p className="text-xs text-red-600">{errors.basePrice.message}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" min={0} {...register("stock", { valueAsNumber: true })} />
              {errors.stock ? <p className="text-xs text-red-600">{errors.stock.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" placeholder="e.g. wireless, bluetooth, gaming" {...register("tags")} />
              <p className="text-xs text-gray-500">e.g. wireless, bluetooth, gaming</p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <Label>Variants</Label>
              <Button
                type="button"
                variant="outline"
                className="h-8"
                onClick={() => append({ key: "", value: "" })}
              >
                <Plus className="size-4" />
                Add Variant
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input placeholder="Key (e.g. Color)" {...register(`variants.${index}.key`)} />
                  <Input placeholder="Value (e.g. Red)" {...register(`variants.${index}.value`)} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label="Remove variant"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-100 p-4">
            {mode === "edit" && product?.images?.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Current images</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {product.images.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="Current product"
                      className="h-16 w-full rounded-md border border-gray-200 object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="images">Images</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? [])
                  setSelectedFiles(files)
                  setImagesError(null)
                }}
              />
              {imagesError ? <p className="text-xs text-red-600">{imagesError}</p> : null}
            </div>

            {previewUrls.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Selected previews</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {previewUrls.map((url, index) => (
                    <img
                      key={`${url}-${index}`}
                      src={url}
                      alt="Selected preview"
                      className="h-16 w-full rounded-md border border-gray-200 object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-gray-100 bg-white py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="form" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

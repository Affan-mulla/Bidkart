import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import PasswordInput from "@/components/auth/PasswordInput"
import { Button } from "@/components/ui/button"
import { isEmailVerificationEnabled } from "@/config/features"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { registerSeller } from "@/lib/auth.api"
import { useAuthStore } from "@/store/useAuthStore"

const sellerRegisterSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, "Must contain a letter and a number"),
    confirmPassword: z.string(),
    storeName: z.string().min(3, "Store name must be at least 3 characters").max(50, "Store name is too long"),
    storeDescription: z
      .string()
      .min(20, "Store description must be at least 20 characters")
      .max(500, "Store description is too long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

type SellerRegisterSchema = z.infer<typeof sellerRegisterSchema>

export default function SellerRegisterForm() {
  const navigate = useNavigate()
  const setPendingEmail = useAuthStore((state) => state.setPendingEmail)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SellerRegisterSchema>({
    resolver: zodResolver(sellerRegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      storeName: "",
      storeDescription: "",
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsSubmitting(true)
      await registerSeller(values.name, values.email, values.password, values.storeName, values.storeDescription)

      if (isEmailVerificationEnabled) {
        setPendingEmail(values.email)
        sessionStorage.setItem("bidkart_pending_email", values.email)
        navigate("/verify-email")
        return
      }

      toast.success("Seller account created successfully. You can now log in.")
      navigate("/login", { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to register seller account right now."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4">

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" type="text" {...register("name")} className="h-11 bg-white" placeholder="Jane Doe" />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          className="h-11 bg-white"
          placeholder="seller@example.com"
        />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput id="confirmPassword" autoComplete="new-password" {...register("confirmPassword")} />
        {errors.confirmPassword ? <p className="text-xs text-destructive">{errors.confirmPassword.message}</p> : null}
      </div>

      <div className="space-y-1 pt-1">
        <Separator />
        <h3 className="pt-3 text-sm font-semibold text-foreground">Store Details</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="storeName">Store Name</Label>
        <Input
          id="storeName"
          type="text"
          {...register("storeName")}
          className="h-11 bg-white"
          placeholder="BidKart Gadgets"
        />
        {errors.storeName ? <p className="text-xs text-destructive">{errors.storeName.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="storeDescription">Store Description</Label>
        <textarea
          id="storeDescription"
          rows={4}
          {...register("storeDescription")}
          className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-[#9b2c2c] focus-visible:ring-2 focus-visible:ring-[#9b2c2c]/20"
          placeholder="Tell buyers what your store specializes in..."
        />
        {errors.storeDescription ? (
          <p className="text-xs text-destructive">{errors.storeDescription.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full" variant="form" size="lg">
        {isSubmitting ? "Creating seller account..." : "Create seller account"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Just shopping?{" "}
        <Link to="/register" className="text-[#9b2c2c] hover:underline">
          Create a buyer account
        </Link>
      </p>
    </form>
  )
}

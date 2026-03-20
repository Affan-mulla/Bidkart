import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  FavouriteIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import {
  addAddress,
  deleteAddress,
  getAddresses,
  getProfile,
  setDefaultAddress,
  updateAddress,
  updateProfile,
  uploadAvatar,
  type Address,
  type AddressInput,
} from "@/api/profile.api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useAuthStore } from "@/store/useAuthStore"

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Gujarat",
  "Karnataka",
  "Kerala",
  "Maharashtra",
  "Madhya Pradesh",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
  "Delhi",
  "Other",
] as const

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
})

const addressSchema = z.object({
  label: z.enum(["Home", "Work", "Other"]),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile number"),
  addressLine1: z.string().min(5, "Address line must be at least 5 characters"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Enter valid 6-digit pincode"),
  isDefault: z.boolean().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>
type AddressFormValues = z.infer<typeof addressSchema>

/**
 * Renders buyer profile and account settings.
 */
export default function Profile() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dialogState, setDialogState] = useState<{ open: boolean; mode: "add" | "edit"; address?: Address }>(
    { open: false, mode: "add" },
  )
  const [pendingDeleteAddressId, setPendingDeleteAddressId] = useState<string | null>(null)

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  })

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddresses,
  })

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
    },
  })

  useEffect(() => {
    if (!profileQuery.data) {
      return
    }

    profileForm.reset({ name: profileQuery.data.name || "" })
  }, [profileForm, profileQuery.data])

  const updateProfileMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => updateProfile({ name: values.name.trim() }),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })

      const accessToken = useAuthStore.getState().accessToken
      if (accessToken) {
        useAuthStore.getState().setCredentials(updatedUser as never, accessToken)
      }

      toast.success("Profile updated")
    },
    onError: () => {
      toast.error("Could not update profile")
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })

      const accessToken = useAuthStore.getState().accessToken
      if (accessToken) {
        useAuthStore.getState().setCredentials(updatedUser as never, accessToken)
      }

      toast.success("Avatar updated")
    },
    onError: () => {
      toast.error("Could not upload avatar")
    },
  })

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
      toast.success("Address deleted")
      setPendingDeleteAddressId(null)
    },
    onError: () => {
      toast.error("Could not delete address")
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
      toast.success("Default address updated")
    },
    onError: () => {
      toast.error("Could not update default address")
    },
  })

  const profile = profileQuery.data
  const addresses = addressesQuery.data || []

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((namePart) => namePart[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U"

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="space-y-6">
        <Card className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <CardHeader className="px-5 py-4">
            <CardTitle>Profile Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            {profileQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : profileQuery.isError || !profile ? (
              <Alert variant="destructive">
                <AlertTitle>Could not load profile</AlertTitle>
                <AlertDescription>Try refreshing this page.</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="relative inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarMutation.isPending ? <Spinner className="size-5" /> : null}
                    {!avatarMutation.isPending && profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                    ) : null}
                    {!avatarMutation.isPending && !profile.avatar ? initials : null}
                  </button>

                  <div className="space-y-2">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      Change Photo
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) {
                          return
                        }

                        avatarMutation.mutate(file)
                        event.target.value = ""
                      }}
                    />
                  </div>
                </div>

                <form
                  onSubmit={profileForm.handleSubmit((values) => updateProfileMutation.mutate(values))}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" {...profileForm.register("name")} />
                    {profileForm.formState.errors.name ? (
                      <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-700">{profile.email}</span>
                      {profile.isVerified ? (
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                          Verified
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <CardHeader className="px-5 py-4">
            <CardTitle>Address Book</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            {addressesQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : addressesQuery.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Could not load addresses</AlertTitle>
                <AlertDescription>Try refreshing this page.</AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {addresses.map((address) => (
                  <div key={address._id} className="rounded-lg border border-gray-200 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline">{address.label}</Badge>
                      {address.isDefault ? (
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                          Default
                        </Badge>
                      ) : null}
                    </div>

                    <p className="text-sm font-medium text-gray-900">{address.fullName}</p>
                    <p className="text-sm text-gray-600">{address.phone}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {address.addressLine1}
                      {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                    </p>
                    <p className="text-sm text-gray-600">
                      {address.city}, {address.state} - {address.pincode}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!address.isDefault ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDefaultMutation.mutate(address._id)}
                          disabled={setDefaultMutation.isPending}
                        >
                          Set Default
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDialogState({
                            open: true,
                            mode: "edit",
                            address,
                          })
                        }
                      >
                        Edit
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setPendingDeleteAddressId(address._id)}
                      >
                        Delete
                      </Button>
                    </div>

                    {pendingDeleteAddressId === address._id ? (
                      <Alert className="mt-3" variant="destructive">
                        <AlertTitle>Delete this address?</AlertTitle>
                        <AlertDescription className="mt-2">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteAddressMutation.mutate(address._id)}
                              disabled={deleteAddressMutation.isPending}
                            >
                              Confirm
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setPendingDeleteAddressId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <Button type="button" variant="outline" onClick={() => setDialogState({ open: true, mode: "add" })}>
              + Add Address
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <CardHeader className="px-5 py-4">
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-5 pb-5">
            <QuickLink to="/orders" icon={ShoppingBag01Icon} label="My Orders" />
            <Separator />
            <QuickLink to="/wishlist" icon={FavouriteIcon} label="My Wishlist" />
          </CardContent>
        </Card>
      </div>

      <AddressFormDialog
        mode={dialogState.mode}
        address={dialogState.address}
        open={dialogState.open}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState({ open: false, mode: "add" })
            return
          }

          setDialogState((previous) => ({ ...previous, open }))
        }}
      />
    </section>
  )
}

function QuickLink({
  to,
  icon,
  label,
}: {
  to: string
  icon: unknown
  label: string
}) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-gray-50">
      <div className="inline-flex items-center gap-2 text-sm text-gray-700">
        <HugeiconsIcon icon={icon} className="size-4 text-primary" />
        {label}
      </div>
      <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-gray-400" />
    </Link>
  )
}

function AddressFormDialog({
  mode,
  address,
  open,
  onOpenChange,
}: {
  mode: "add" | "edit"
  address?: Address
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "Home",
      fullName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: false,
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (mode === "edit" && address) {
      addressForm.reset({
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || "",
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        isDefault: address.isDefault,
      })
      return
    }

    addressForm.reset({
      label: "Home",
      fullName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: false,
    })
  }, [address, addressForm, mode, open])

  const addAddressMutation = useMutation({
    mutationFn: (payload: AddressInput) => addAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
      toast.success("Address added")
      onOpenChange(false)
    },
    onError: () => {
      toast.error("Could not add address")
    },
  })

  const updateAddressMutation = useMutation({
    mutationFn: (payload: { id: string; data: Partial<AddressInput> }) => updateAddress(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
      toast.success("Address updated")
      onOpenChange(false)
    },
    onError: () => {
      toast.error("Could not update address")
    },
  })

  const isSubmitting = addAddressMutation.isPending || updateAddressMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Address" : "Edit Address"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={addressForm.handleSubmit((values) => {
            const payload: AddressInput = {
              label: values.label,
              fullName: values.fullName.trim(),
              phone: values.phone,
              addressLine1: values.addressLine1.trim(),
              addressLine2: values.addressLine2?.trim() || "",
              city: values.city.trim(),
              state: values.state,
              pincode: values.pincode,
              isDefault: values.isDefault,
            }

            if (mode === "edit" && address) {
              updateAddressMutation.mutate({ id: address._id, data: payload })
              return
            }

            addAddressMutation.mutate(payload)
          })}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Select
              value={addressForm.watch("label")}
              onValueChange={(value) => addressForm.setValue("label", value as AddressFormValues["label"], { shouldValidate: true })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Home">Home</SelectItem>
                <SelectItem value="Work">Work</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput label="Full Name" field="fullName" form={addressForm} />
            <FormInput label="Phone" field="phone" form={addressForm} />
          </div>

          <FormInput label="Address Line 1" field="addressLine1" form={addressForm} />
          <FormInput label="Address Line 2" field="addressLine2" form={addressForm} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput label="City" field="city" form={addressForm} />

            <div className="space-y-1.5">
              <Label>State</Label>
              <Select
                value={addressForm.watch("state")}
                onValueChange={(value) => addressForm.setValue("state", value, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((stateName) => (
                    <SelectItem key={stateName} value={stateName}>
                      {stateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addressForm.formState.errors.state ? (
                <p className="text-xs text-destructive">{addressForm.formState.errors.state.message}</p>
              ) : null}
            </div>
          </div>

          <FormInput label="Pincode" field="pincode" form={addressForm} />

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={Boolean(addressForm.watch("isDefault"))} onChange={(event) => addressForm.setValue("isDefault", event.target.checked)} />
            Set as default
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormInput({
  label,
  field,
  form,
}: {
  label: string
  field: keyof AddressFormValues
  form: ReturnType<typeof useForm<AddressFormValues>>
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...form.register(field)} />
      {form.formState.errors[field] ? (
        <p className="text-xs text-destructive">{String(form.formState.errors[field]?.message || "")}</p>
      ) : null}
    </div>
  )
}
import axiosInstance from "@/api/axiosInstance"

export interface Address {
  _id: string
  label: "Home" | "Work" | "Other"
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

export interface AddressInput {
  label: "Home" | "Work" | "Other"
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  isDefault?: boolean
}

export interface ProfileUser {
  _id: string
  name: string
  email: string
  role: "buyer" | "seller"
  avatar?: string
  isVerified?: boolean
}

/**
 * Fetches current authenticated user profile.
 */
export async function getProfile(): Promise<ProfileUser> {
  const response = await axiosInstance.get("/users/profile")
  return response.data?.data?.user
}

/**
 * Updates profile name.
 */
export async function updateProfile(data: { name: string }): Promise<ProfileUser> {
  const response = await axiosInstance.patch("/users/profile", data)
  return response.data?.data?.user
}

/**
 * Uploads profile avatar image.
 */
export async function uploadAvatar(file: File): Promise<ProfileUser> {
  const formData = new FormData()
  formData.append("avatar", file)

  const response = await axiosInstance.post("/users/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data?.data?.user
}

/**
 * Fetches saved addresses for current user.
 */
export async function getAddresses(): Promise<Address[]> {
  const response = await axiosInstance.get("/users/addresses")
  return response.data?.data?.addresses || []
}

/**
 * Adds a new address.
 */
export async function addAddress(data: AddressInput): Promise<Address> {
  const response = await axiosInstance.post("/users/addresses", data)
  return response.data?.data?.address
}

/**
 * Updates an existing address.
 */
export async function updateAddress(id: string, data: Partial<AddressInput>): Promise<Address> {
  const response = await axiosInstance.patch(`/users/addresses/${id}`, data)
  return response.data?.data?.address
}

/**
 * Deletes an address.
 */
export async function deleteAddress(id: string): Promise<void> {
  await axiosInstance.delete(`/users/addresses/${id}`)
}

/**
 * Marks an address as default.
 */
export async function setDefaultAddress(id: string): Promise<void> {
  await axiosInstance.patch(`/users/addresses/${id}/default`)
}

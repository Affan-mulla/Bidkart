import { Types } from "mongoose";
import SellerProfile from "../models/SellerProfile.model";
import User from "../models/User.model";
import AppError from "../utils/appError";

export interface AddressInput {
  label: "Home" | "Work" | "Other";
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface Address {
  _id: string;
  label: "Home" | "Work" | "Other";
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface SafeUser {
  _id: string;
  name: string;
  email: string;
  role: "buyer" | "seller";
  avatar: string | null;
  isVerified: boolean;
  sellerProfile?: { storeName: string } | null;
}

/**
 * Build safe user object for profile endpoints.
 */
const toSafeUser = (user: {
  _id: unknown;
  name: string;
  email: string;
  role: "buyer" | "seller";
  avatar?: string | null;
  isVerified: boolean;
}): SafeUser => {
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
    isVerified: user.isVerified,
  };
};

/**
 * Normalize address data from mixed schema storage.
 */
const normalizeAddresses = (addresses: unknown[]): Address[] => {
  const normalizedAddresses: Address[] = [];

  for (const item of addresses) {
    const value = (item || {}) as Partial<Address> & { _id?: unknown; isDefault?: unknown };

    if (!value._id) {
      continue;
    }

    normalizedAddresses.push({
      _id: String(value._id),
      label: (value.label as Address["label"]) || "Home",
      fullName: String(value.fullName || ""),
      phone: String(value.phone || ""),
      addressLine1: String(value.addressLine1 || ""),
      addressLine2: value.addressLine2 ? String(value.addressLine2) : undefined,
      city: String(value.city || ""),
      state: String(value.state || ""),
      pincode: String(value.pincode || ""),
      isDefault: Boolean(value.isDefault),
    });
  }

  return normalizedAddresses;
};

/**
 * Fetch profile for authenticated user with seller details when applicable.
 */
export const getProfile = async (userId: string): Promise<SafeUser> => {
  const user = await User.findById(userId).select("_id name email role avatar isVerified");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const result = toSafeUser(user);

  if (user.role === "seller") {
    const sellerProfile = await SellerProfile.findOne({ userId: user._id }).select("storeName");

    result.sellerProfile = sellerProfile
      ? {
          storeName: sellerProfile.storeName,
        }
      : null;
  }

  return result;
};

/**
 * Update basic profile fields.
 */
export const updateProfile = async (
  userId: string,
  data: { name?: string }
): Promise<SafeUser> => {
  const user = await User.findById(userId).select("_id name email role avatar isVerified");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();

    if (trimmedName.length < 2) {
      throw new AppError("Name must be at least 2 characters", 400);
    }

    user.name = trimmedName;
  }

  await user.save();
  return toSafeUser(user);
};

/**
 * Update avatar URL for authenticated user.
 */
export const updateAvatar = async (userId: string, avatarUrl: string): Promise<SafeUser> => {
  const user = await User.findById(userId).select("_id name email role avatar isVerified");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.avatar = avatarUrl;
  await user.save();

  return toSafeUser(user);
};

/**
 * Return normalized address list for user.
 */
export const getAddresses = async (userId: string): Promise<Address[]> => {
  const user = await User.findById(userId).select("addresses");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return normalizeAddresses(user.addresses || []);
};

/**
 * Add a new address to user profile.
 */
export const addAddress = async (userId: string, addressData: AddressInput): Promise<Address[]> => {
  const user = await User.findById(userId).select("addresses");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const addresses = normalizeAddresses(user.addresses || []);
  const shouldSetDefault = addresses.length === 0 || Boolean(addressData.isDefault);

  if (shouldSetDefault) {
    addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  const newAddress: Address = {
    _id: String(new Types.ObjectId()),
    label: addressData.label,
    fullName: addressData.fullName,
    phone: addressData.phone,
    addressLine1: addressData.addressLine1,
    addressLine2: addressData.addressLine2,
    city: addressData.city,
    state: addressData.state,
    pincode: addressData.pincode,
    isDefault: shouldSetDefault,
  };

  addresses.push(newAddress);
  user.addresses = addresses;
  await user.save();

  return addresses;
};

/**
 * Update selected address fields.
 */
export const updateAddress = async (
  userId: string,
  addressId: string,
  addressData: Partial<AddressInput>
): Promise<Address[]> => {
  const user = await User.findById(userId).select("addresses");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const addresses = normalizeAddresses(user.addresses || []);
  const targetAddress = addresses.find((address) => String(address._id) === String(addressId));

  if (!targetAddress) {
    throw new AppError("Address not found", 404);
  }

  if (addressData.isDefault === true) {
    addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  if (addressData.label !== undefined) {
    targetAddress.label = addressData.label;
  }

  if (addressData.fullName !== undefined) {
    targetAddress.fullName = addressData.fullName;
  }

  if (addressData.phone !== undefined) {
    targetAddress.phone = addressData.phone;
  }

  if (addressData.addressLine1 !== undefined) {
    targetAddress.addressLine1 = addressData.addressLine1;
  }

  if (addressData.addressLine2 !== undefined) {
    targetAddress.addressLine2 = addressData.addressLine2;
  }

  if (addressData.city !== undefined) {
    targetAddress.city = addressData.city;
  }

  if (addressData.state !== undefined) {
    targetAddress.state = addressData.state;
  }

  if (addressData.pincode !== undefined) {
    targetAddress.pincode = addressData.pincode;
  }

  if (addressData.isDefault !== undefined) {
    targetAddress.isDefault = addressData.isDefault;
  }

  user.addresses = addresses;
  await user.save();

  return addresses;
};

/**
 * Delete one address from address book.
 */
export const deleteAddress = async (userId: string, addressId: string): Promise<Address[]> => {
  const user = await User.findById(userId).select("addresses");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const addresses = normalizeAddresses(user.addresses || []);
  const deletedAddress = addresses.find((address) => String(address._id) === String(addressId));

  if (!deletedAddress) {
    throw new AppError("Address not found", 404);
  }

  const remainingAddresses = addresses.filter(
    (address) => String(address._id) !== String(addressId)
  );

  if (deletedAddress.isDefault && remainingAddresses.length > 0) {
    remainingAddresses[0].isDefault = true;
  }

  user.addresses = remainingAddresses;
  await user.save();

  return remainingAddresses;
};

/**
 * Mark one address as default.
 */
export const setDefaultAddress = async (userId: string, addressId: string): Promise<Address[]> => {
  const user = await User.findById(userId).select("addresses");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const addresses = normalizeAddresses(user.addresses || []);
  const addressExists = addresses.some((address) => String(address._id) === String(addressId));

  if (!addressExists) {
    throw new AppError("Address not found", 404);
  }

  addresses.forEach((address) => {
    address.isDefault = String(address._id) === String(addressId);
  });

  user.addresses = addresses;
  await user.save();

  return addresses;
};

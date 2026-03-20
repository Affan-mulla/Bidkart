import { NextFunction, Request, Response } from "express";
import { IUserDocument } from "../models/User.model";
import * as profileService from "../services/profile.service";
import AppError from "../utils/appError";
import { sendSuccess } from "../utils/response.utils";

/**
 * Resolve authenticated user id from request context.
 */
const getUserIdFromRequest = (req: Request): string => {
  const authUser = req.user as IUserDocument | undefined;

  if (!authUser?._id) {
    throw new AppError("Unauthorized", 401);
  }

  return String(authUser._id);
};

/**
 * Normalize route id param to single string.
 */
const getAddressIdFromParams = (idParam: string | string[] | undefined): string => {
  if (Array.isArray(idParam)) {
    return idParam[0] || "";
  }

  return idParam || "";
};

/**
 * Get current authenticated user profile.
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserIdFromRequest(req);
    const user = await profileService.getProfile(userId);

    return sendSuccess(res, "Profile fetched", { user });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update current user profile.
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserIdFromRequest(req);
    const user = await profileService.updateProfile(userId, req.body);

    return sendSuccess(res, "Profile updated", { user });
  } catch (error) {
    return next(error);
  }
};

/**
 * Upload and update user avatar image.
 */
export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserIdFromRequest(req);
    const uploadedFile = req.file as (Express.Multer.File & { path?: string; secure_url?: string }) | undefined;
    const avatarUrl = uploadedFile?.path || uploadedFile?.secure_url;

    if (!avatarUrl) {
      throw new AppError("Avatar image is required", 400);
    }

    const user = await profileService.updateAvatar(userId, avatarUrl);

    return sendSuccess(res, "Avatar updated", { user });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get address list for current user.
 */
export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserIdFromRequest(req);
    const addresses = await profileService.getAddresses(userId);

    return sendSuccess(res, "Addresses fetched", { addresses });
  } catch (error) {
    return next(error);
  }
};

/**
 * Add address for current user.
 */
export const addAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserIdFromRequest(req);
    const addresses = await profileService.addAddress(userId, req.body);

    return sendSuccess(res, "Address added", { addresses }, 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update one address for current user.
 */
export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserIdFromRequest(req);
    const addressId = getAddressIdFromParams(req.params.id);
    const addresses = await profileService.updateAddress(userId, addressId, req.body);

    return sendSuccess(res, "Address updated", { addresses });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete one address for current user.
 */
export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserIdFromRequest(req);
    const addressId = getAddressIdFromParams(req.params.id);
    const addresses = await profileService.deleteAddress(userId, addressId);

    return sendSuccess(res, "Address deleted", { addresses });
  } catch (error) {
    return next(error);
  }
};

/**
 * Set one address as default for current user.
 */
export const setDefaultAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserIdFromRequest(req);
    const addressId = getAddressIdFromParams(req.params.id);
    const addresses = await profileService.setDefaultAddress(userId, addressId);

    return sendSuccess(res, "Default address updated", { addresses });
  } catch (error) {
    return next(error);
  }
};

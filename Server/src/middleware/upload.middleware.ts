import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { NextFunction, Request, Response } from "express";
import AppError from "../utils/appError";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
};

const uploadFileToCloudinary = (file: Express.Multer.File, folder: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result?.secure_url) {
          return reject(new Error("Image upload failed"));
        }

        return resolve(result.secure_url);
      }
    );

    stream.end(file.buffer);
  });
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    files: 25,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new AppError("Only jpeg, png, webp, and avif images are allowed", 400));
    }

    return callback(null, true);
  },
});

const uploadProductImagesParser = upload.any();

/**
 * Parse multipart files, then upload accepted product images to Cloudinary.
 */
export const uploadProductImages = (req: Request, res: Response, next: NextFunction) => {
  if (!isCloudinaryConfigured()) {
    return next(new AppError("Cloudinary is not configured", 500));
  }

  uploadProductImagesParser(req, res, async (error?: unknown) => {
    if (error) {
      if (error instanceof AppError) {
        return next(error);
      }

      if (error instanceof multer.MulterError) {
        return next(new AppError(error.message, 400));
      }

      return next(error);
    }

    try {
      const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];

      const uploadedUrls = await Promise.all(files.map((file) => uploadFileToCloudinary(file, "bidkart/products")));

      req.files = files.map((file, index) => ({
        ...file,
        path: uploadedUrls[index],
        secure_url: uploadedUrls[index],
      })) as unknown as Request["files"];

      return next();
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        return next(new AppError(`Upload failed: ${caughtError.message}`, 500));
      }

      return next(new AppError("Upload failed due to an unexpected error", 500));
    }
  });
};

const avatarUpload = multer({
  storage,
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new AppError("Only jpeg, png, webp, and avif images are allowed", 400));
    }

    return callback(null, true);
  },
});

const uploadAvatarParser = avatarUpload.single("avatar");

/**
 * Parse multipart file, then upload avatar image to Cloudinary.
 */
export const uploadAvatar = (req: Request, res: Response, next: NextFunction) => {
  if (!isCloudinaryConfigured()) {
    return next(new AppError("Cloudinary is not configured", 500));
  }

  uploadAvatarParser(req, res, async (error?: unknown) => {
    if (error) {
      if (error instanceof AppError) {
        return next(error);
      }

      if (error instanceof multer.MulterError) {
        return next(new AppError(error.message, 400));
      }

      return next(new AppError("Upload failed", 500));
    }

    try {
      const uploadedFile = req.file as Express.Multer.File | undefined;
      if (!uploadedFile) {
        return next();
      }

      const uploadedUrl = await uploadFileToCloudinary(uploadedFile, "bidkart/avatars");

      req.file = {
        ...uploadedFile,
        path: uploadedUrl,
        secure_url: uploadedUrl,
      } as Express.Multer.File;

      return next();
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        return next(new AppError(`Upload failed: ${caughtError.message}`, 500));
      }

      return next(new AppError("Upload failed due to an unexpected error", 500));
    }
  });
};

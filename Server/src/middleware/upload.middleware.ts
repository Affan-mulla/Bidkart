import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import AppError from "../utils/appError";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => {
    return {
      folder: "bidkart/products",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      resource_type: "image",
    } as never;
  },
});

const upload = multer({
  storage,
  limits: {
    files: 5,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new AppError("Only jpeg, png, and webp images are allowed", 400));
    }

    return callback(null, true);
  },
});

export const uploadProductImages = upload.array("images", 5);

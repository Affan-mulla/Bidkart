import { Document, Schema, Types, model } from "mongoose";

export interface ISellerProfile {
  userId: Types.ObjectId;
  storeName: string;
  storeDescription: string;
  storeLogo?: string | null;
  rating: number;
  totalSales: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ISellerProfileDocument = Document<unknown, object, ISellerProfile> & ISellerProfile;

const sellerProfileSchema = new Schema<ISellerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeDescription: {
      type: String,
      trim: true,
      default: "",
    },
    storeLogo: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const SellerProfile = model<ISellerProfile>("SellerProfile", sellerProfileSchema);

export default SellerProfile;

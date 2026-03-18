import { Document, Schema, Types, model } from "mongoose";

export interface ISellerProfile {
  userId: Types.ObjectId;
  storeName: string;
  storeDescription: string;
  storeLogo?: string | null;
  kycDocuments: string[];
  isApproved: boolean;
  isKycSubmitted: boolean;
  rating: number;
  totalSales: number;
  bankDetails: {
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
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
    kycDocuments: {
      type: [String],
      default: [],
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    isKycSubmitted: {
      type: Boolean,
      default: false,
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
    bankDetails: {
      accountNumber: {
        type: String,
        default: "",
      },
      ifsc: {
        type: String,
        default: "",
      },
      bankName: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

const SellerProfile = model<ISellerProfile>("SellerProfile", sellerProfileSchema);

export default SellerProfile;

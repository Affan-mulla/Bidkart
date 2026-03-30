import { Document, Schema, Types, model } from "mongoose";

export interface IProduct {
  sellerId: Types.ObjectId;
  title: string;
  description: string;
  images: string[];
  category: string;
  variants: IProductVariant[];
  basePrice: number;
  stock: number;
  ratings: number;
  reviewsCount: number;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProductVariant {
  key: string;
  value: string;
  images: string[];
}

export type IProductDocument = Document<unknown, object, IProduct> & IProduct;

const productSchema = new Schema<IProduct>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    variants: {
      type: [
        new Schema<IProductVariant>(
          {
            key: {
              type: String,
              required: true,
              trim: true,
            },
            value: {
              type: String,
              required: true,
              trim: true,
            },
            images: {
              type: [String],
              default: [],
            },
          },
          {
            _id: false,
          }
        ),
      ],
      default: [],
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    ratings: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ "variants.key": 1, "variants.value": 1 });

const Product = model<IProduct>("Product", productSchema);

export default Product;

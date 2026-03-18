import { Document, Schema, Types, model } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  sellerId: Types.ObjectId;
  quantity: number;
  price: number;
  title: string;
  image: string;
  variantKey: string;
  variantValue: string;
}

export interface ICart {
  userId: Types.ObjectId;
  items: ICartItem[];
  updatedAt?: Date;
}

export type ICartDocument = Document<unknown, object, ICart> & ICart;

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    variantKey: {
      type: String,
      default: "",
      trim: true,
    },
    variantValue: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Cart = model<ICart>("Cart", cartSchema);

export default Cart;

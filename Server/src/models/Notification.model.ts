import { Document, Schema, Types, model } from "mongoose";

export type NotificationType =
  | "order_update"
  | "bid_placed"
  | "outbid"
  | "auction_won"
  | "auction_ended"
  | "review_reply"
  | "payment_received"
  | "coupon_applied";

export interface INotification {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type INotificationDocument = Document<unknown, object, INotification> & INotification;

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "order_update",
        "bid_placed",
        "outbid",
        "auction_won",
        "auction_ended",
        "review_reply",
        "payment_received",
        "coupon_applied",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = model<INotification>("Notification", notificationSchema);

export default Notification;

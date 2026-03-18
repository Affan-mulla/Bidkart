import bcrypt from "bcryptjs";
import { Document, Model, Schema, Types, model } from "mongoose";
import { UserRole } from "../types/auth";

export interface IUser {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string | null;
  isVerified: boolean;
  isActive: boolean;
  refreshToken?: string | null;
  passwordResetOtp?: string | null;
  passwordResetOtpExpiry?: Date | null;
  emailVerificationOtp?: string | null;
  emailVerificationOtpExpiry?: Date | null;
  addresses: unknown[];
  wishlist: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserMethods {
  comparePassword(password: string): Promise<boolean>;
}

export type IUserDocument = Document<unknown, object, IUser> & IUser & IUserMethods;

type UserModel = Model<IUser, object, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
      index: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetOtp: {
      type: String,
      default: null,
    },
    passwordResetOtpExpiry: {
      type: Date,
      default: null,
    },
    emailVerificationOtp: {
      type: String,
      default: null,
    },
    emailVerificationOtpExpiry: {
      type: Date,
      default: null,
    },
    addresses: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * Hash password before save only when changed.
 */
userSchema.pre("save", async function handlePasswordHash(next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

/**
 * Compare plain text password with user hash.
 */
userSchema.methods.comparePassword = function comparePassword(password: string) {
  if (!this.password) {
    return Promise.resolve(false);
  }

  return bcrypt.compare(password, this.password);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const sanitized = ret as unknown as Record<string, unknown>;
    delete sanitized.password;
    delete sanitized.refreshToken;
    delete sanitized.__v;
    return sanitized;
  },
});

const User = model<IUser, UserModel>("User", userSchema);

export default User;

export type UserRole = "buyer" | "seller" | "admin";

export interface AuthJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthUserResponse {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  isVerified: boolean;
  sellerProfile?: {
    storeName: string;
    isApproved: boolean;
  } | null;
}

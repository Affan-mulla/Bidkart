import { IUserDocument } from "../models/User.model";

declare global {
  namespace Express {
    interface User extends IUserDocument {}

    interface Request {
      user?: IUserDocument;
    }
  }
}

export {};

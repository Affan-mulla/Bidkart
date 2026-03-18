export type FieldError = { field?: string; message: string };

export default class AppError extends Error {
  statusCode: number;
  status: "fail" | "error";
  isOperational: boolean;
  errors: FieldError[];

  /**
   * @param message Error message.
   * @param statusCode HTTP status code.
   * @param errors Optional field-level errors.
   */
  constructor(message: string, statusCode: number, errors: FieldError[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

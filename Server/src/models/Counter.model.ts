import { Schema, model } from "mongoose";

interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = model<ICounter>("Counter", counterSchema);

export default Counter;

/**
 * Atomically increments invoice counter and returns a formatted invoice number.
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await Counter.findByIdAndUpdate(
    "invoiceNumber",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const padded = String(counter?.seq || 0).padStart(6, "0");
  return `BK-${year}-${padded}`;
}

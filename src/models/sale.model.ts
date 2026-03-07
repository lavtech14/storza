import mongoose, { Schema, Document } from "mongoose";

export interface ISale extends Document {
  invoiceNumber: string;
  customerName?: string;
  paymentMethod: string;
  totalAmount: number;
  storeId: mongoose.Types.ObjectId;
}

const saleSchema = new Schema<ISale>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    customerName: {
      type: String,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "credit"],
      default: "cash",
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model<ISale>("Sale", saleSchema);

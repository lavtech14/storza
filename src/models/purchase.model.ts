import mongoose, { Schema, Document } from "mongoose";

export interface IPurchase extends Document {
  supplierName: string;
  storeId: mongoose.Types.ObjectId;
  totalAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "credit";
  purchaseDate: Date;
}

const purchaseSchema = new Schema<IPurchase>(
  {
    supplierName: {
      type: String,
      required: true,
    },

    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "credit"],
      default: "cash",
    },

    purchaseDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IPurchase>("Purchase", purchaseSchema);

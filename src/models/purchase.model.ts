import mongoose, { Schema, Document } from "mongoose";

export interface IPurchase extends Document {
  supplierName: string;
  storeId: mongoose.Types.ObjectId;

  subtotal: number;
  gstAmount: number;
  cgst: number;
  sgst: number;

  totalAmount: number;

  paymentMethod: "cash" | "upi" | "card" | "credit";
  purchaseDate: Date;
}

const purchaseSchema = new Schema<IPurchase>(
  {
    supplierName: {
      type: String,
      required: true,
      index: true, // index for search
    },

    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true, // important for filtering
    },

    subtotal: {
      type: Number,
      default: 0,
    },

    gstAmount: {
      type: Number,
      default: 0,
    },

    cgst: {
      type: Number,
      default: 0,
    },

    sgst: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "credit"],
      default: "cash",
      index: true,
    },

    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

/*
🔥 Compound indexes (very important for performance)
*/

// used for store filtering + latest purchases
purchaseSchema.index({ storeId: 1, createdAt: -1 });

// used for supplier search within store
purchaseSchema.index({ storeId: 1, supplierName: 1 });

// used for payment filtering
purchaseSchema.index({ storeId: 1, paymentMethod: 1 });

// used for date filtering
purchaseSchema.index({ storeId: 1, purchaseDate: -1 });

export default mongoose.model<IPurchase>("Purchase", purchaseSchema);

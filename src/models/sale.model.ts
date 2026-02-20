import mongoose, { Schema, Document } from "mongoose";

export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface ISale extends Document {
  items: ISaleItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  paymentMode: "cash" | "upi" | "card";
  storeId: mongoose.Types.ObjectId;
  createdAt: Date; // ✅ ADD THIS
  updatedAt: Date;
}

const saleSchema = new Schema<ISale>(
  {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: Number,
        price: Number,
        gstRate: Number,
        cgst: Number,
        sgst: Number,
        igst: Number,
        total: Number,
      },
    ],
    subtotal: Number,
    totalTax: Number,
    grandTotal: Number,
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "card"],
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
    },
  },
  { timestamps: true },
);

const Sale = mongoose.model<ISale>("Sale", saleSchema);

export default Sale;

import mongoose, { Schema, Document } from "mongoose";

export interface IPurchaseItem extends Document {
  purchaseId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;

  quantity: number;
  buyPrice: number;

  subtotal: number;

  gst: number;
  gstAmount: number;

  cgst: number;
  sgst: number;

  total: number;
}

const purchaseItemSchema = new Schema<IPurchaseItem>(
  {
    purchaseId: {
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    buyPrice: {
      type: Number,
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
    },

    gst: {
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

    total: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IPurchaseItem>(
  "PurchaseItem",
  purchaseItemSchema,
);

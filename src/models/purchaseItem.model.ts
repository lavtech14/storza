import mongoose, { Schema, Document } from "mongoose";

export interface IPurchaseItem extends Document {
  purchaseId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  buyPrice: number;
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

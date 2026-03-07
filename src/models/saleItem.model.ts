import mongoose, { Schema, Document } from "mongoose";

export interface ISaleItem extends Document {
  saleId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  total: number;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    price: {
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

export default mongoose.model<ISaleItem>("SaleItem", saleItemSchema);

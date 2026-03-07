import mongoose, { Schema, Document } from "mongoose";

export interface ISaleItem extends Document {
  saleId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;

  quantity: number;
  price: number;

  subtotal: number;

  gst: number;
  gstAmount: number;

  cgst: number;
  sgst: number;

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

export default mongoose.model<ISaleItem>("SaleItem", saleItemSchema);

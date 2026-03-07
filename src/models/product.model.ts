import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  category: string;

  sku?: string;
  brand?: string;
  unit?: string;

  buyingPrice?: number;
  sellingPrice?: number;
  discountPrice?: number;

  gst?: number;
  hsnCode?: string;

  barcode?: string;

  quantity: number;
  minStockAlert?: number;

  expiryDate?: Date;

  storeId: mongoose.Types.ObjectId;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      default: "general",
    },

    sku: {
      type: String,
      unique: true,
    },

    brand: {
      type: String,
    },

    unit: {
      type: String,
      enum: ["kg", "gram", "litre", "ml", "piece", "packet", "box"],
      default: "piece",
    },

    buyingPrice: {
      type: Number,
    },

    sellingPrice: {
      type: Number,
    },

    discountPrice: {
      type: Number,
    },

    gst: {
      type: Number, // 5, 12, 18, 28
      default: 0,
    },

    hsnCode: {
      type: String,
    },

    barcode: {
      type: String,
      unique: true,
      sparse: true,
    },

    quantity: {
      type: Number,
      default: 0,
    },

    minStockAlert: {
      type: Number,
      default: 5,
    },

    expiryDate: {
      type: Date,
    },

    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IProduct>("Product", productSchema);

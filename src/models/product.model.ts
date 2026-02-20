import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  price: number;
  stock: number;
  category: string;
  storeId: mongoose.Types.ObjectId;
  gstRate: number; // example: 5, 12, 18
  hsnCode: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    gstRate: {
      type: Number,
      default: 0,
    },
    hsnCode: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const Product = mongoose.model<IProduct>("Product", productSchema);

export default Product;

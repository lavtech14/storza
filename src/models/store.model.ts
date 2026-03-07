import mongoose, { Schema, Document } from "mongoose";

export interface IStore extends Document {
  name: string;
  ownerName: string;
  mobile: string;
  email: string;
  address?: string;
  storeType: "cloth" | "food" | "electrical" | "other";
  isGSTRegistered: boolean;
  gstNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const storeSchema = new Schema<IStore>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
    },
    storeType: {
      type: String,
      enum: ["cloth", "food", "electrical", "other"],
      default: "other",
    },
    isGSTRegistered: {
      type: Boolean,
      default: false,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Store = mongoose.model<IStore>("Store", storeSchema);

export default Store;

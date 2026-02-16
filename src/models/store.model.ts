import mongoose, { Schema, Document } from "mongoose";

export interface IStore extends Document {
  name: string;
  ownerName: string;
  mobile: string;
  email: string;
  isGSTRegistered: boolean;
  gstNumber?: string;
  createdAt: Date;
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
    },
    mobile: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    isGSTRegistered: {
      type: Boolean,
      default: false,
    },
    gstNumber: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const Store = mongoose.model<IStore>("Store", storeSchema);

export default Store;

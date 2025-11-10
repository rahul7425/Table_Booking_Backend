// models/Table.js
import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorBusiness",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    category: {
      type: String,
      enum: ["Normal", "Premium"],
      default: "Normal",
    },
    customCategory: String, // if vendor adds new one manually

    tableNumber: {
      type: String,
      required: true,
    },
    seatingCapacity: {
      type: Number,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Table", tableSchema);

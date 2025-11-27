// models/Table.js
const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
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
    price:{
      type: Number,
      required: true,
    }
  },
  { timestamps: true }
);

// ❌ Wrong:
// export default mongoose.model("Table", tableSchema);

// ✅ Correct:
module.exports = mongoose.model("Table", tableSchema);

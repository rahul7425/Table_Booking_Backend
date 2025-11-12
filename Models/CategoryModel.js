const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorBusiness",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Food", "Drinks"],
      required: true,
    },
    image: String,
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);

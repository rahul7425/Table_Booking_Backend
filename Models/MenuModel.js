const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
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
    category: {
      type: String,
      required: true, // e.g. "Food", "Drinks"
    },
    subCategory: {
      type: String,
      required: true, // e.g. "Veg", "Non-Veg" or "Bottle", "Single Peg"
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    price: {
      type: Number,
      required: true,
    },
    image: String,
    tag: {
      type: String, // e.g. "Roti", "Sabji", "Snacks"
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MenuItem", menuItemSchema);

// models/MenuItem.js
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
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    image: String,
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ❌ Wrong: export default ...
// ✅ Correct:
module.exports = mongoose.model("MenuItem", menuItemSchema);

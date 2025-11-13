const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. Full Plate, 60ml, Bottle
  price: { type: Number, required: true },
  isAvailable: { type: Boolean, default: true },
});

const complimentarySchema = new mongoose.Schema({
  name: { type: String }, // e.g. Water, Ice
  isMandatory: { type: Boolean, default: false },
});

const itemSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },

    // 🔹 food or drink
    type: {
      type: String,
      enum: ["food", "drink"],
      required: true,
    },

    // 🔹 classification
    category: { type: String, required: true }, // e.g. Veg, Whiskey
    subcategory: { type: String }, // e.g. Rotti, Peg, Bottle

    // 🔹 core info
    name: { type: String, required: true }, // e.g. Paneer Butter Masala, Royal Stag
    description: { type: String },
    image: { type: String },
    images: [{ type: String }],

    // 🔹 details
    variants: [variantSchema],
    complimentary: [complimentarySchema], // only used when type = drink

    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);

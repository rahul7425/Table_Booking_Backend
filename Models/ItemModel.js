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
itemSchema.virtual("fullImageUrl").get(function () {
  if (!this.image) {
    return null;
  }

  const BASE_URL = process.env.APP_URL || "http://localhost:3000";
  const cleanedPath = this.image.replace(/\\/g, "/");
  
  return `${BASE_URL}/${cleanedPath}`;
});

// --- 🖼️ Virtual Property for Multiple Image URLs ---
itemSchema.virtual("fullImageUrls").get(function () {
  if (!this.images || this.images.length === 0) {
    return [];
  }

  const BASE_URL = process.env.APP_URL || "http://localhost:3000";

  // Array के हर path को full URL में बदलना
  return this.images.map((imagePath) => {
    const cleanedPath = imagePath.replace(/\\/g, "/");
    return `${BASE_URL}/${cleanedPath}`;
  });
});


// --- Schema Options ---
// सुनिश्चित करें कि virtuals JSON और Object output में शामिल हों
itemSchema.set("toObject", { virtuals: true });
itemSchema.set("toJSON", { virtuals: true });
module.exports = {
    Item: mongoose.model("Item", itemSchema), // Mongoose Model को 'Item' नाम से
    itemSchema: itemSchema // ✅ Raw Schema को भी एक्सपोर्ट करें
};
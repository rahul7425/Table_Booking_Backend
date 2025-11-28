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
categorySchema.virtual("fullImageUrl").get(function () {
  if (!this.image) {
    return null;
  }
  const BASE_URL = process.env.APP_URL || "http://localhost:3000";
  const cleanedPath = this.image.replace(/\\/g, "/");
  return `${BASE_URL}/${cleanedPath}`;
});

// --- Schema Options ---
// सुनिश्चित करें कि virtuals JSON और Object output में शामिल हों ताकि fullImageUrl दिखे
categorySchema.set("toObject", { virtuals: true });
categorySchema.set("toJSON", { virtuals: true });
module.exports = mongoose.model("Category", categorySchema);

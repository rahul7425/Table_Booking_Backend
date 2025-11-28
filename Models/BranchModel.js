// models/Branch.js
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  plotNo: String,
  street: String,
  nearbyPlaces: String,
  area: String,
  city: String,
  state: String,
  pincode: String,
});

const branchSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    name: { type: String, required: false }, // branch name (could be same as business)
    description: String,
    images: [String],
    address: addressSchema,
    isActive: { type: Boolean, default: true }, // open to take bookings
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // vendor who created
    meta: {
      sameMenuAsOtherBranch: { type: Boolean, default: false },
      copiedFromBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", default: null },
  },
  { timestamps: true }
);
branchSchema.virtual("fullImageUrls").get(function () {
  if (!this.images || this.images.length === 0) {
    return [];
  }

  const BASE_URL = process.env.APP_URL || "http://localhost:3000";

  // Backslashes को forward slashes में बदलना और BASE_URL जोड़ना
  return this.images.map((imagePath) => {
    const cleanedPath = imagePath.replace(/\\/g, "/");
    return `${BASE_URL}/${cleanedPath}`;
  });
});
branchSchema.set("toObject", { virtuals: true });
branchSchema.set("toJSON", { virtuals: true });
module.exports = mongoose.model("Branch", branchSchema);

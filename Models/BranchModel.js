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

module.exports = mongoose.model("Branch", branchSchema);

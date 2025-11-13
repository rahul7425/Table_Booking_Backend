// models/Business.js
const mongoose = require("mongoose");

// -------------------- Address Schema --------------------
const addressSchema = new mongoose.Schema({
  plotNo: String,
  street: String,
  nearbyPlaces: String,
  area: String,
  city: String,
  state: String,
  pincode: String,
});

// -------------------- Business Schema --------------------
const businessSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: { type: String, required: true },
    description: String,
    images: [String],
    address: addressSchema,

    isActive: { type: Boolean, default: true },

    branches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }],
    menuItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    tables: [{ type: mongoose.Schema.Types.ObjectId, ref: "Table" }],
    schedules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Schedule" }],
    commissionId: { type: mongoose.Schema.Types.ObjectId, ref: "Commission" },
    wallets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Wallet" }],
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],

    defaultCommissionPercentage: { type: Number, default: 50 },

    // ⭐ New Additions for Filter API
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    categoryType: {
      type: String,
      enum: ["veg", "nonveg", "drinks", "both"],
      default: "both",
    },

    // 🌍 Location for Nearby Filter
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
       // ⭐ NEW FIELD
    requestStatus: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Text & Geo Indexes
businessSchema.index({ location: "2dsphere" });
businessSchema.index({
  name: "text",
  description: "text",
  "address.area": "text",
  "address.street": "text",
  "address.city": "text",
});

module.exports = mongoose.model("Business", businessSchema);

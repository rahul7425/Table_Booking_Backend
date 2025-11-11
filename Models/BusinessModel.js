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
    // Vendor who owns this business (main owner)
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Core business info
    name: { type: String, required: true },
    description: String,
    images: [String],
    address: addressSchema,

    // Business active or temporarily paused (accepting bookings or not)
    isActive: { type: Boolean, default: true },

    // 🏪 Branches under this business (multi-location)
    branches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
      },
    ],

    // 🍴 Menu Items belonging to this business (can be same across branches)
    menuItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuItem",
      },
    ],

    // 📂 Categories (like Food / Drinks / etc.)
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    // 🪑 Tables (could be shared across branches logically)
    tables: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Table",
      },
    ],

    // 📅 Schedules (table booking slots)
    schedules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Schedule",
      },
    ],

    // 💸 Commission info (for this vendor or business)
    commissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commission",
    },

    // 👛 Wallets (each branch has one wallet but business can have aggregated wallet)
    wallets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wallet",
      },
    ],

    // ⭐ Reviews from users for this business
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],

    // 🧾 Default commission snapshot at creation (50% admin by default)
    defaultCommissionPercentage: { type: Number, default: 50 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Business", businessSchema);

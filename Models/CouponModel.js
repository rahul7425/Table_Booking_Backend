const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    code: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
    },

    // "percent" or "flat"
    discountType: {
      type: String,
      enum: ["percent", "flat"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
    },

    expiryDate: {
      type: Date,
      required: false
    },
    isActive: {
      type: Boolean,
      default: true
    },

    image: {
      type: String, // Cloud URL path 
      default: null,
    },

    usageHistory: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
        usedAt: { type: Date, default: Date.now },
      }
    ],

    totalUsedCount: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });
couponSchema.index({ "usageHistory.user_id": 1 });

module.exports = mongoose.model("Coupon", couponSchema);

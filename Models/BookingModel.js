const mongoose = require("mongoose");
const { itemSchema } = require("./ItemModel");

const bookingSchema = new mongoose.Schema(
  {
    table_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },

    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null
    },

    discountApplied: {
      type: Number,
      default: 0
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ शेड्यूल की ID पहले से मौजूद है
    schedule_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true, // इसे अनिवार्य (required: true) करना उचित हो सकता है
    },
    items_ordered: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item", // आइटम मॉडल का रेफरेंस 
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        selected_variant_id: {
          type: String, // Variant ID स्ट्रिंग हो सकती है, यदि वह Sub-document ID है
          required: true,
        }
      },
    ],

    requestStatus: {
      type: String,
      enum: ["pending", "accepted", "denied"],
      default: "pending",
    },

    refundMode: {
      type: String,
      enum: ["full", "partial"],
      default: "partial"
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    totalAmount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },

    bookingDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
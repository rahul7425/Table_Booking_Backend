const mongoose = require("mongoose");
const { itemSchema } = require("./ItemModel"); 
const bookingSchema = new mongoose.Schema(
  {
    table_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    schedule_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
    },

   items_ordered: [
      {
        // 🔥 FIX: item_details को हटाकर IDs और Quantity को सीधे यहाँ रखें
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
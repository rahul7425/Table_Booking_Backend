const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

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
        item_details: itemSchema, 
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        selected_variant_id: {
            type: String, 
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
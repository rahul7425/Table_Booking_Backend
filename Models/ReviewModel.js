const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    foodItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodItem",
      default: null, // ✅ Optional
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      required: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);

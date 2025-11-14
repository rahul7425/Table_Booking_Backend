// models/ReferralModel.js
const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema({
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User A
  referredUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User B
  referralCode: { type: String, required: true }, // Code used
  rewardAmount: { type: Number, default: 100 }, // Default or admin-controlled
  rewardCredited: { type: Boolean, default: false },
  bookingCompleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Referral", referralSchema);

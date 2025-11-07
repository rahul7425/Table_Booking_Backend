const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, unique: true },
  emailVerified: { type: Boolean, default: false },
  mobile: { type: String, unique: true },
  mobileVerified: { type: Boolean, default: false },
  otp: { type: String },
  role: {
    type: String,
    enum: ["user", "vendor", "admin"],
    default: "user",
  },
  age: { type: Number },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  address: { type: String },
  profilePicture: { type: String },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);

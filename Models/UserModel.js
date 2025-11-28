// const mongoose = require("mongoose");
// const { generateRefId } = require("../Utils/generateRefId");

// const userSchema = new mongoose.Schema({
//   firstName: { type: String },
//   lastName: { type: String },
//   email: { type: String, unique: true },
//   emailVerified: { type: Boolean, default: false },
//   mobile: { type: String, unique: true },
//   referral:{ type:String, default:generateRefId},
//   mobileVerified: { type: Boolean, default: false },
//   otp: { type: String },
//   role: {
//     type: String,
//     enum: ["user", "vendor", "admin"],
//     default: "user",
//   },
//   age: { type: Number },
//   gender: { type: String, enum: ["Male", "Female", "Other"] },
//   address: { type: String },
//   profilePicture: { type: String },
//   status: { type: String, enum: ["active", "inactive"], default: "active" },
//   currentLocation: {
//     type: {
//         type: String, // Don't forget the "type" field
//         enum: ['Point'],
//         default: 'Point',
//     },
//     coordinates: {
//         type: [Number], // [longitude, latitude]
//         default: [0, 0], // Default to 0,0 or null
//         index: '2dsphere' // 2dsphere index for geospatial queries
//     },
//   },
// },{ timestamps: true,
//     toJSON: { virtuals: true }, 
//     toObject: { virtuals: true }
//  });
// userSchema.virtual('profilePictureUrl').get(function() {
//     if (!this.profilePicture) {
//       return null;
//     }
//     const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
//     return `${BASE_URL}/uploads/${this.profilePicture}`;
// });
// module.exports = mongoose.model("User", userSchema);



// models/UserModel.js
const mongoose = require("mongoose");
const { generateRefId } = require("../Utils/generateRefId");

const userSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, unique: true },
  emailVerified: { type: Boolean, default: false },
  mobile: { type: String, unique: true },
  referral: { type: String, default: generateRefId },
  referredBy: { type: String, default: null }, // Referral code used by this user
  // walletBalance: { type: Number, default: 0 }, // Money from referrals
  firstBookingDone: { type: Boolean, default: false },
  mobileVerified: { type: Boolean, default: false },
  otp: { type: String },
  role: {
    type: String,
    enum: ["user", "vendor", "admin"],
    default: "user",
  },
  age: { type: Number },
  gender: { type: String, enum: ["male", "female", "Other"] },
  address: { type: String },
  profilePicture: { type: String },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  currentLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
      index: "2dsphere",
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

userSchema.virtual("profilePictureUrl").get(function () {
  if (!this.profilePicture) return null;
  const BASE_URL = process.env.APP_URL || "http://localhost:3000";
  return `${BASE_URL}/uploads/${this.profilePicture}`;
});

module.exports = mongoose.model("User", userSchema);

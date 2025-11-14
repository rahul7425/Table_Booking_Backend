// // models/Schedule.js
// const mongoose = require("mongoose");

// const slotSchema = new mongoose.Schema({
//   time: { type: String, required: true }, // e.g., "8:00 AM"
//   isAvailable: { type: Boolean, default: true },
//   bookingId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Booking",
//     default: null,
//   },
// });

// const scheduleSchema = new mongoose.Schema(
//   {
//     businessId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "VendorBusiness",
//       required: true,
//     },
//     branchId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//     },
//     tableId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Table",
//       required: true,
//     },
//     date: {
//       type: Date,
//       required: true,
//     },
//     slots: [slotSchema],

//     scheduleType: {
//       type: String,
//       enum: ["1 Week", "1 Month", "1 Year"],
//       default: "1 Week",
//     },
//   },
//   { timestamps: true }
// );

// // ✅ CommonJS export
// module.exports = mongoose.model("Schedule", scheduleSchema);


// models/Schedule.js
const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  time: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    default: null,
  },
});

const dayEnum = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const scheduleSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorBusiness",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },

    // ⬇️ NEW FIELD → vendor can mark OFF days
    closedDays: {
      type: [String],
      enum: dayEnum,
      default: [],
    },

    date: {
      type: Date,
      required: true,
    },

    slots: [slotSchema],

    scheduleType: {
      type: String,
      enum: ["1 Week", "1 Month", "1 Year"],
      default: "1 Week",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schedule", scheduleSchema);

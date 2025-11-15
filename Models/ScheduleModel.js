// models/Schedule.js
const mongoose = require("mongoose");

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
    date: {
      type: Date,
      required: true,
    },
    slotSetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Slot",
        required: true,
    },
  },
  { timestamps: true }
);

// ✅ CommonJS export
module.exports = mongoose.model("Schedule", scheduleSchema);

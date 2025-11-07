const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    mail: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "vendor", "admin"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);

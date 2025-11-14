const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        walletId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Wallet",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String, // "credit" | "debit"
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        note: {
            type: String,
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            default: null, // यह null हो सकता है यदि यह बुकिंग से संबंधित न हो
        },
        // balanceSnapshot: Number, // (Optional: लेनदेन के समय वॉलेट का बैलेंस)
        createdAt: { 
            type: Date, 
            default: Date.now 
        },
    }
);

module.exports = mongoose.model("Transaction", transactionSchema);
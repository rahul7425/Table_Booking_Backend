const mongoose = require("mongoose");

// एक विशिष्ट दिन के लिए समय स्लॉट संरचना
const daySlotSchema = new mongoose.Schema({
    // यह दर्शाता है कि उस दिन स्लॉट उपलब्ध हैं या नहीं (e.g., Wednesday is closed)
    isOpen: {
        type: Boolean,
        default: true,
    },
    // उस दिन के सभी विशिष्ट, अलग-अलग स्लॉट टाइम
    times: [{
        time: { 
            type: String, 
            required: false // e.g., "9:00 AM", "10:00 AM"
        }, 
        isAvailable: { 
            type: Boolean, 
            default: true 
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            default: null,
        },
    }],
});

const slotSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VendorBusiness",
            required: true,
        },
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
        },
        tableId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Table",
            required: false,
        },
        slotSetName: {
            type: String,
            required: true,
        },
        
        // प्रत्येक दिन के लिए अलग-अलग स्लॉट सेटिंग्स
        monday: daySlotSchema,
        tuesday: daySlotSchema,
        wednesday: daySlotSchema,
        thursday: daySlotSchema,
        friday: daySlotSchema,
        saturday: daySlotSchema,
        sunday: daySlotSchema,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Slot", slotSchema);
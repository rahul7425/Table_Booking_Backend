const Slot = require("../Models/Slot");
exports.createSlotSet = async (req, res) => {
    try {
        const newSlotSet = new Slot(req.body); // req.body से डेटा लेता है
        const savedSlotSet = await newSlotSet.save(); // डेटाबेस में सेव करता है
        res.status(201).json(savedSlotSet); // 201 स्टेटस के साथ ऑब्जेक्ट रिटर्न करता है
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 📚 सभी स्लॉट सेट प्राप्त करें (Get all Slot Sets)
exports.getAllSlotSets = async (req, res) => {
    try {
        const slotSets = await Slot.find({ businessId: req.params.businessId });
        res.status(200).json(slotSets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 🔎 विशिष्ट स्लॉट सेट प्राप्त करें (Get a specific Slot Set by ID)
exports.getSlotSetById = async (req, res) => {
    try {
        const slotSet = await Slot.findById(req.params.id);
        if (!slotSet) {
            return res.status(404).json({ message: "Slot Set not found" });
        }
        res.status(200).json(slotSet);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 📝 स्लॉट सेट अपडेट करें (Update a Slot Set)
exports.updateSlotSet = async (req, res) => {
    try {
        const updatedSlotSet = await Slot.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedSlotSet) {
            return res.status(404).json({ message: "Slot Set not found" });
        }
        res.status(200).json(updatedSlotSet);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// ❌ स्लॉट सेट डिलीट करें (Delete a Slot Set)
exports.deleteSlotSet = async (req, res) => {
    try {
        const deletedSlotSet = await Slot.findByIdAndDelete(req.params.id);
        if (!deletedSlotSet) {
            return res.status(404).json({ message: "Slot Set not found" });
        }
        res.status(200).json({ message: "Slot Set successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ⏰ किसी विशिष्ट दिन के समय (times) को अपडेट करें
exports.updateDayTimes = async (req, res) => {
    try {
        const { day, times } = req.body; // day: "monday", times: [...]
        const slotSet = await Slot.findById(req.params.id);

        if (!slotSet) {
            return res.status(404).json({ message: "Slot Set not found" });
        }

        // जाँच करें कि दिन वैध है या नहीं
        if (!slotSet[day]) {
            return res.status(400).json({ message: "Invalid day specified" });
        }

        // विशिष्ट दिन के times सरणी को अपडेट करें
        slotSet[day].times = times;
        const updatedSlotSet = await slotSet.save();

        res.status(200).json(updatedSlotSet);

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
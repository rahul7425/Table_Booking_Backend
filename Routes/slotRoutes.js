const express = require("express");
const router = express.Router();
const slotController = require("../Controllers/slotController");

router.post("/", slotController.createSlotSet);

// businessId के आधार पर सभी स्लॉट सेट प्राप्त करें
router.get("/business/:businessId", slotController.getAllSlotSets); 

// विशिष्ट स्लॉट सेट प्राप्त करें
router.get("/:id", slotController.getSlotSetById);

// स्लॉट सेट अपडेट करें
router.put("/:id", slotController.updateSlotSet);

// स्लॉट सेट डिलीट करें
router.delete("/:id", slotController.deleteSlotSet);

// किसी विशिष्ट दिन के times को अपडेट करें (नया रूट)
router.patch("/:id/times", slotController.updateDayTimes);

module.exports = router;
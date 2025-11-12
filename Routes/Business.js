// this is for business manage 
const express = require("express");
const router = express.Router();
const upload = require("../Middleware/UploadMiddleware");
const { protect } = require("../Middleware/AuthMiddleware");
const { 
  createBusiness, 
  addBranch, 
  updateBusiness, 
  getBusinessById, 
  getBusinesses, 
  deleteBusiness,
  toggleStatus
} = require("../Controllers/BusinessController");

// Create business (multiple images)
router.post(
  "/",
  protect,
  upload.array("images", 10), // send files with key 'images'
  createBusiness
);

// Add branch to business (upload branch images with fieldname 'images')
router.post(
  "/:businessId/branches",
  protect,
  upload.array("images", 10),
  addBranch
);

// Update business
router.put(
  "/:businessId",
  protect,
  upload.array("images", 10),
  updateBusiness
);

// Get business by id
router.get("/:businessId", getBusinessById);

// Get businesses (filter via body vendorId etc)
router.post("/list", protect, getBusinesses);

// Delete business
router.delete("/:businessId", protect, deleteBusiness);

// toggle status
router.put("/toggle/:type/:id", protect, toggleStatus);

module.exports = router;

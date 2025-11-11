const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  createMenuItem,
  getAllMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
  getAllTags,
  getItemsByTag,
} = require("../Controllers/MenuController");

const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware"); // ✅ import your middleware

// ✅ Multer setup for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/menuItems/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});
const upload = multer({ storage });

// -------------------- ROUTES -------------------- //

// 🔒 Vendor-only Routes
router.post("/", protect, authorizeRoles("vendor"), upload.single("image"), createMenuItem);
router.put("/:id", protect, authorizeRoles("vendor"), upload.single("image"), updateMenuItem);
router.delete("/:id", protect, authorizeRoles("vendor"), deleteMenuItem);

// 🌍 Public Routes
router.get("/", getAllMenuItems);
router.get("/:id", getMenuItemById);
router.get("/tags/all", getAllTags);
router.get("/tags/:tag", getItemsByTag);
router.get("/filter", filterMenuItems); // ✅ Combined filtering route

module.exports = router;

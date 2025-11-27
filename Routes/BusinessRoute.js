// this is for business parts like menu, scheddule etc.
const express = require("express");
const upload = require("../Middleware/UploadMiddleware");
const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware");
const {
  createBusinessData,
  updateBusinessData,
  deleteBusinessData,
  getAllBusinessData,
  getByIdBusinessData,
} = require("../Controllers/vendorBusiness");

const router = express.Router();

const setUploadType = (type) => (req, res, next) => {
  req.uploadType = type;
  next();
};

router.post(
  "/restaurant/create",
  protect,
  authorizeRoles("vendor"),
  setUploadType("restaurant"),
  upload.array("images", 5),
  createBusinessData
);

router.put(
  "/restaurant/update",
  protect,
  authorizeRoles("vendor"),
  setUploadType("restaurant"),
  upload.array("images", 5),
  updateBusinessData
);

router.post(
  "/menu/create",
  protect,
  authorizeRoles("vendor"),
  setUploadType("menu"),
  upload.array("images", 5),
  createBusinessData
);

router.put(
  "/menu/update",
  protect,
  authorizeRoles("vendor"),
  setUploadType("menu"),
  upload.array("images", 5),
  updateBusinessData
);

router.post(
  "/create",
  protect,
  // authorizeRoles("vendor"),
  authorizeRoles("admin", "vendor"),
  setUploadType("category"),
  upload.single("image"),
  createBusinessData
);

router.put(
  "/update",
  protect,
  // authorizeRoles("vendor"),

  authorizeRoles("admin", "vendor"),

  setUploadType("category"),
  upload.single("image"),
  updateBusinessData
);

router.delete("/delete",
  protect,
  // authorizeRoles("vendor"),
  authorizeRoles("admin", "vendor"),

  deleteBusinessData);
router.post("/get-all", protect, getAllBusinessData);
router.post("/get-by-id", protect, getByIdBusinessData);

module.exports = router;
// Routes/vendorBusinessRoute.js
const express = require("express");
const upload = require("../Middleware/UploadMiddleware");
const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware");
const {
  createBusinessData,
  updateBusinessData,
  deleteBusinessData,
  getAllBusinessData,
  getByIdBusinessData,
  getByVendorBusinessData,
} = require("../Controllers/vendorBusiness");

const router = express.Router();

const setUploadType = (type) => (req, res, next) => {
  req.uploadType = type;
  next();
};

// 🔹 Create / Update Restaurant Info
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

// 🔹 Create / Update Menu Item (Food or Drink)
router.post(
  "/item/create",
  protect,
  authorizeRoles("vendor"),
  setUploadType("menu"),
  upload.array("images", 5),
  createBusinessData
);

router.put(
  "/item/update",
  protect,
  authorizeRoles("vendor"),
  setUploadType("menu"),
  upload.array("images", 5),
  updateBusinessData
);

// 🔹 Category
router.post(
  "/category/create",
  protect,
  authorizeRoles("vendor"),
  setUploadType("category"),
  upload.single("image"),
  createBusinessData
);

router.put(
  "/category/update",
  protect,
  authorizeRoles("vendor"),
  setUploadType("category"),
  upload.single("image"),
  updateBusinessData
);

// 🔹 Delete / Fetch
router.delete("/delete", protect, authorizeRoles("vendor"), deleteBusinessData);
router.post("/get-all", protect, getAllBusinessData);
router.post("/get-by-id", protect, getByIdBusinessData);
router.post("/get-by-vendor", protect, authorizeRoles("vendor"), getByVendorBusinessData);

module.exports = router;



// // this is for business parts like menu, scheddule etc.
// const express = require("express");
// const upload = require("../Middleware/UploadMiddleware");
// const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware");
// const {
//   createBusinessData,
//   updateBusinessData,
//   deleteBusinessData,
//   getAllBusinessData,
//   getByIdBusinessData,
// } = require("../Controllers/vendorBusiness");

// const router = express.Router();

// const setUploadType = (type) => (req, res, next) => {
//   req.uploadType = type;
//   next();
// };

// router.post(
//   "/restaurant/create",
//   protect,
//   authorizeRoles("vendor"),
//   setUploadType("restaurant"),
//   upload.array("images", 5),
//   createBusinessData
// );

// router.put(
//   "/restaurant/update",
//   protect,
//   authorizeRoles("vendor"),
//   setUploadType("restaurant"),
//   upload.array("images", 5),
//   updateBusinessData
// );

// router.post(
//   "/menu/create",
//   protect,
//   authorizeRoles("vendor"),
//   setUploadType("menu"),
//   upload.array("images", 5),
//   createBusinessData
// );

// router.put(
//   "/menu/update",
//   protect,
//   authorizeRoles("vendor"),
//   setUploadType("menu"),
//   upload.array("images", 5),
//   updateBusinessData
// );

// router.post(
//   "/create",
//   protect,
//   authorizeRoles("vendor"),
//   setUploadType("category"),
//   upload.single("image"),
//   createBusinessData
// );

// router.put(
//   "/update",
//   protect,
//   authorizeRoles("vendor"),
//   setUploadType("category"),
//   upload.single("image"),
//   updateBusinessData
// );

// router.delete("/delete", protect, authorizeRoles("vendor"), deleteBusinessData);
// router.post("/get-all", protect, getAllBusinessData);
// router.post("/get-by-id", protect, getByIdBusinessData);

// module.exports = router;

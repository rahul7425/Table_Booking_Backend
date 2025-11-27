const express = require("express");
const router = express.Router();
const upload = require("../Middleware/UploadMiddleware");
const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware");
const cc = require("../Controllers/CouponController");

// Create coupon
router.post(
  "/create",
  protect,
  // authorizeRoles("vendor"),
  authorizeRoles("admin", "vendor"),

  upload.single("image"),
  cc.createCoupon
);

// Fetch coupons of business
router.get(
  "/business/:business_id",
  protect,
  // authorizeRoles("vendor"),
  authorizeRoles("admin", "vendor"),

  cc.getCouponsByBusiness
);

// Get details of one coupon
router.get(
  "/details/:couponId",
  protect,
  // authorizeRoles("vendor"),
  authorizeRoles("admin", "vendor"),

  cc.getCouponDetails
);

// Validate coupon
router.post(
  "/validate",
  protect,
  cc.validateCoupon
);

router.put(
  "/update/:couponId",
  protect,
  // authorizeRoles("vendor"),
  authorizeRoles("admin", "vendor"),

  upload.single("image"),   // optional image
  cc.updateCoupon
);


router.delete(
  "/delete/:couponId",
  protect,
  // authorizeRoles("vendor"),
  authorizeRoles("admin", "vendor"),

  cc.deleteCoupon
);

module.exports = router;

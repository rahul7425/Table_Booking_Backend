const express = require("express");
const router = express.Router();
const upload = require("../Middleware/UploadMiddleware");
const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware");
const multer = require('multer');
const {
  registerUser,
  verifyMobile,
  verifyMail,
  verifyOtpAndLogin,
  sendOtpLogin,
  updateProfile,
  softDelete,
  getAllUsers,
  updateUserProfile,
  getUserById,
  applyReferralCode,
  updateWalletAfterBooking,
  updateReferralReward,
  getReferralReward,
  getAllReferrals,
  getReferralsByUser,
} = require("../Controllers/User");

router.post("/register", registerUser);
router.post("/verify-mobile",verifyMobile);
router.post("/verify-mail",verifyMail);

// 🔹 OTP Verification + Login
router.post("/send-otp-login", sendOtpLogin);
router.post("/verify-otp-login", verifyOtpAndLogin);


// 🔹 Profile Management
router.put("/update-profile", protect, upload.single("profilePicture"), updateProfile);
router.put("/delete", protect, softDelete);

// Admin
router.get("/all", protect, authorizeRoles("admin", "vendor"), getAllUsers);

// Get by ID
router.get("/:id", protect, authorizeRoles("admin", "vendor","user"), getUserById);
router.post('/profile',protect,
    upload.single('profilePicture'),
    updateUserProfile
);

// Referral
router.post("/apply-referral", protect, applyReferralCode);

// 🔹 Admin Referral Control

router.post("/admin/update-reward", protect, authorizeRoles("admin"), updateReferralReward);
router.get("/admin/get-reward", protect, authorizeRoles("admin"), getReferralReward);
router.get("/admin/referrals", protect, authorizeRoles("admin"), getAllReferrals);
router.get("/admin/referrals/:userId", protect, authorizeRoles("admin"), getReferralsByUser);

module.exports = router;

const express = require("express");
const router = express.Router();
const upload = require("../Middleware/UploadMiddleware");
const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware");
const {
  registerUser,
  sendMobileOtp,
  verifyMobileOtp,
  verifyMail,
  verifyOtpAndLogin,
  forgotPassword,
  updateProfile,
  softDelete,
  getAllUsers,
  getUserById,
} = require("../Controllers/User");

// 🔹 Registration (User/Vendor)
router.post("/register", registerUser);

router.post("/send-mobile-otp",sendMobileOtp);
router.post("/verify-mobile-otp",verifyMobileOtp);
router.post("/verify-mail",verifyMail);

// 🔹 OTP Verification + Login
router.post("/verify-otp-login", verifyOtpAndLogin);

// 🔹 Forgot Password
router.post("/forgot-password", forgotPassword);

// 🔹 Profile Management
router.put("/update-profile", protect, upload.single("profilePicture"), updateProfile);
router.put("/delete", protect, softDelete);

// 🔹 Admin
router.get("/all", protect, authorizeRoles("admin"), getAllUsers);

// 🔹 Get by ID
router.get("/:id", protect, getUserById);

module.exports = router;

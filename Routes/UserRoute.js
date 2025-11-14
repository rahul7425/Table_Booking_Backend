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

// 🔹 Admin
router.get("/all", protect, authorizeRoles("admin", "vendor"), getAllUsers);

// 🔹 Get by ID
router.get("/:id", protect, authorizeRoles("admin", "vendor"), getUserById);
router.post('/profile',  
    upload.single('profilePicture'), // 'profilePicture' aapki form-data key hai
    updateUserProfile
);
module.exports = router;

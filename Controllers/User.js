const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../Models/UserModel");
const { generateRefId } = require("../Utils/generateRefId");

const EMAIL_API = "https://api.7uniqueverfiy.com/api/verify/email_checker_v1";
const MOBILE_API = "https://api.7uniqueverfiy.com/api/verify/mobile_operator";

exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, role } = req.body;

    if (!["user", "vendor"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Choose 'user' or 'vendor'." });
    }

    const refid = generateRefId();

    // ✅ Verify Email
    const emailVerify = await axios.post(
      EMAIL_API,
      { refid, email },
      {
        headers: {
          "content-type": "application/json",
          "x-env": process.env["X-Env"],
          "client-id": process.env["Client-Id"],
          "authorization": process.env.Authorization,
        },
      }
    );

    if (!emailVerify.data.success) {
      return res.status(400).json({
        message: "Email verification failed",
        response: emailVerify.data,
      });
    }

    // ✅ Verify Mobile
    const mobileVerify = await axios.post(
      MOBILE_API,
      { refid, mobile },
      {
        headers: {
          "content-type": "application/json",
          "x-env": process.env["X-Env"],
          "client-id": process.env["Client-Id"],
          "authorization": process.env.Authorization,
        },
      }
    );

    if (!mobileVerify.data.success) {
      return res.status(400).json({
        message: "Mobile verification failed",
        response: mobileVerify.data,
      });
    }

    // ✅ Generate OTP and send using Fast2SMS
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      { variables_values: otp, route: "otp", numbers: mobile },
      { headers: { authorization: process.env.FAST2SMS_API_KEY } }
    );

    // ✅ Save/Update user record
    const user = await User.findOneAndUpdate(
      { mobile },
      {
        firstName,
        lastName,
        email,
        mobile,
        role,
        emailVerified: true,
        mobileVerified: true,
        otp,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: "OTP sent successfully to mobile number",
      userId: user._id,
    });
  } catch (error) {
    if (error.response) {
      console.error("🔴 External API Error:", error.response.data);
      res.status(400).json({ error: error.response.data });
    } else {
      console.error("🔴 Internal Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
};

exports.verifyOtpAndLogin = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    const user = await User.findOne({ mobile });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    // OTP verified successfully — clear it
    user.otp = null;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      role: user.role,
      user,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not found" });

    // Send OTP via Fast2SMS (mock for simplicity)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        variables_values: otp,
        route: "otp",
        numbers: user.mobile,
      },
      {
        headers: {
          authorization: FAST2SMS_API_KEY,
        },
      }
    );

    user.otp = otp;
    await user.save();

    res.json({ success: true, message: "OTP sent successfully for password reset" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, mobile, age, gender, address } = req.body;

    const updateData = { firstName, lastName, email, mobile, age, gender, address };
    if (req.file) updateData.profilePicture = req.file.path;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    res.json({ success: true, message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.softDelete = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByIdAndUpdate(userId, { status: "inactive" }, { new: true });
    res.json({ success: true, message: "Profile deactivated successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

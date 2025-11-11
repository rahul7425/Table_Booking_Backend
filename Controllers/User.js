const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../Models/UserModel");
const { generateRefId } = require("../Utils/generateRefId");

const EMAIL_API = "https://api.7uniqueverfiy.com/api/verify/email_checker_v1";
const MOBILE_API = "https://api.7uniqueverfiy.com/api/verify/mobile_operator";

exports.sendMobileOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required." });
    }

    // 1. Mobile Format/Operator Verification
    const refid = generateRefId();

    // 💡 LOGGING POINT A (Check before first API call)
    console.log("Attempting Mobile Verification for:", mobile);

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
    console.log("mobileVerify Success Response:", mobileVerify.data);

    if (!mobileVerify.data.success) {
      return res.status(400).json({
        message: "Mobile verification failed or invalid number.",
        response: mobileVerify.data,
      });
    }

    // 2. Generate OTP and Send using Fast2SMS
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `Aapka registration OTP hai: ${otp}. Kripya iska upyog karein.`;

    // 💡 LOGGING POINT B (Check before Fast2SMS call)
    console.log("Attempting Fast2SMS with Key:", process.env.FAST2SMS_API_KEY ? "Key Loaded" : "Key Missing!");

    const smsResponse = await axios.post( // Response capture kiya gaya
      "https://www.fast2sms.com/dev/bulkV2",
      { 
        message: message,
        language: "english",
        route: "v3",
        numbers: mobile 
      },
      { headers: { authorization: process.env.FAST2SMS_API_KEY } }
    );
    console.log("Fast2SMS Success Response:", smsResponse.data);


    // 3. Save/Update OTP in Database (upsert: true will create if not found)
    await User.findOneAndUpdate(
      { mobile },
      { otp, mobileVerified: false },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to mobile number. Please verify.",
    });

// =========================================================================
// 🛑 DETAILED CATCH BLOCK (EXACT ERROR FINDER)
// =========================================================================
  } catch (error) {
    let statusCode = 500;
    let clientMessage = "An unknown error occurred during OTP process.";
    let logDetails = error.message;

    if (error.response) {
        // 4xx or 5xx HTTP response code (API did not like the request/credentials)
        statusCode = error.response.status || 400; 
        logDetails = `API Status Error ${statusCode}: ${JSON.stringify(error.response.data)}`;
        clientMessage = "External Service Failed (Check API Key/Credentials).";
        
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        // Network/Connection Error (URL galat hai ya server down hai)
        statusCode = 503;
        logDetails = `Network Error: ${error.code} - Check API URLs or connection.`;
        clientMessage = "Connection to external service failed (Network Issue).";
    }

    console.error(`🔴 Mobile OTP Send Error (${statusCode}):`, logDetails);
    
    res.status(statusCode).json({ 
        success: false, 
        error: clientMessage,
        details: logDetails // Client ko exact reason na dekar, sirf developer ko pata chale
    });
  }
};
// --- 2. VERIFY MOBILE OTP ---
exports.verifyMobileOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    const user = await User.findOne({ mobile, otp });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid mobile or OTP." });
    }
    // Mark as verified and clear OTP
    await User.updateOne({ mobile }, { mobileVerified: true, otp: null });
    res.status(200).json({
      success: true,
      message: "Mobile number successfully verified.",
    });
  } catch (error) {
    console.error("🔴 Mobile OTP Verify Error:", error.message);
    res.status(500).json({ error: "Failed to verify mobile OTP." });
  }
};

exports.verifyMail = async (req, res) => {
 try {
  const { email, mobile } = req.body;
   
  if (!mobile) {
      return res.status(400).json({ message: "Mobile number and Email are required." });
  }
  if (!emailVerify.data.success) {
      return res.status(400).json({
         message: "Email verification failed or invalid email address.",
         response: emailVerify.data,
      });
  }

  const user = await User.findOneAndUpdate(
      { mobile }, 
      { emailVerified: true },
      { new: true, upsert: false }
  );

  if (!user) {
      return res.status(404).json({
          success: false,
          message: "User not found with this mobile number. Please register first.",
      });
  }
  
  return res.status(200).json({
      success: true,
      message: "Email verified successfully and user record updated based on mobile number.",
      userId: user._id
  });
   
 } catch (error) {
    console.error("🔴 Email Verification Error:", error.message);
    return res.status(500).json({ error: "Failed to verify email." });
 }
};


// --- 4. VERIFY EMAIL OTP ---
exports.verifyMail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // 1. Email Verification
    const refid = generateRefId();
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
        message: "Email verification failed or invalid email address.",
        response: emailVerify.data,
      });
    }

    // 🟢 LOGIC FIX: emailVerified: true hona chahiye
    // 🛑 UPSERT FIX: Upsert hata diya gaya taaki naya record na bane
    const user = await User.findOneAndUpdate(
      { email },
      { emailVerified: true }, 
      { new: true, upsert: false } 
    );
    
    // Check if user exists (if upsert:false and user is null)
    if (!user) {
        return res.status(404).json({ message: "User not found with this email. Please register first." });
    }
    
    // 3. Final Response to Client
    res.status(200).json({
      success: true,
      message: "Email verified successfully and user record updated.",
    });
  } catch (error) {
    // 🟢 DETAILED ERROR HANDLING FOR AXIOS
    let errorMessage = "Failed to verify email.";
    let statusCode = 500;
    
    if (error.response) {
        // External API ne 4xx/5xx status code diya
        statusCode = error.response.status;
        errorMessage = `External API Error: Status ${statusCode}. Check logs for data details.`;
        console.error(`🔴 External API Error ${statusCode}:`, error.response.data);
    } else if (error.code) {
        // Network error (ECONNREFUSED, ENOTFOUND, etc.)
        statusCode = 503;
        errorMessage = `Network Error: ${error.code}. Check API URL or connection.`;
        console.error(`🔴 Network Error: ${error.code}`, error.message);
    } else {
        // Other unexpected errors
        console.error("🔴 Unexpected Error:", error.message);
    }
    
    res.status(statusCode).json({ 
        success: false, 
        error: errorMessage 
    });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, role } = req.body;

    // ... (Pre-check logic remains the same)

    if (!firstName || !lastName || !email || !mobile || !role) {
        return res.status(400).json({ message: "Missing required fields." });
    }
    if (!["user", "vendor","admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Choose 'user' or 'vendor' or 'admin'." });
    }

    // 3. Save/Update remaining user details
    const user = await User.findOneAndUpdate(
      { mobile }, // Query: mobile number se dhoondho
      {
        firstName,
        lastName,
        email,
        role,
      },
      { 
          new: true,
          // 🟢 FIX: upsert: true se agar record nahi mila toh naya record insert ho jayega
          upsert: true 
      } 
    );

    res.status(201).json({
      success: true,
      message: "User registered/updated successfully!",
      userId: user._id,
      user: user,
    });
  } catch (error) {
    console.error("🔴 Final Registration Error:", error.message);
    res.status(500).json({ error: "Final registration failed." });
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

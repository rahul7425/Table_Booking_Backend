const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../Models/UserModel");
const Wallet = require("../Models/WalletModel");
const Referral = require("../Models/ReferralModel");
const Setting = require("../Models/SettingModel");
const { generateRefId } = require("../Utils/generateRefId");
const { updateUserLocation } = require('../Utils/locationUtils');
// const EMAIL_API = "https://api.7uniqueverfiy.com/api/verify/email_checker_v1";
const MOBILE_API = "https://api.7uniqueverfiy.com/api/verify/mobile_operator";


exports.verifyMobile = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required." });
    }
    
    
    // 1. Mobile Format/Operator Verification
    const refid = generateRefId();

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
        success: false,
        message: "Mobile verification failed or invalid number.",
        response: mobileVerify.data,
      });
    }

    const userDoc = await User.findOneAndUpdate(
      { mobile }, 
      { mobile, lastVerifiedAt: new Date(), mobileVerified: true }, 
      { upsert: true, new: true, runValidators: true } 
    );

    // 3. Return Success Response
    res.status(200).json({
      success: true,
      message: "Mobile number verified and user data successfully inserted/updated.",
      user: {
        id: userDoc._id,
        mobile: userDoc.mobile,
      }
    });

  } catch (error) {
    let statusCode = 500;
    let clientMessage = "An unknown error occurred during mobile verification and save process.";
    let logDetails = error.message;

    if (error.response) {
        statusCode = error.response.status || 400; 
        logDetails = `API Status Error ${statusCode}: ${JSON.stringify(error.response.data)}`;
        clientMessage = "External Verification Service Failed (Check API Key/Credentials).";
        
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        statusCode = 503;
        logDetails = `Network Error: ${error.code} - Check API URLs or connection.`;
        clientMessage = "Connection to external service failed (Network Issue).";
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        clientMessage = "Database validation failed.";
        logDetails = `DB Validation Error: ${error.message}`;
    }

    console.error(`🔴 Mobile Verification and Save Error (${statusCode}):`, logDetails);
    
    res.status(statusCode).json({ 
        success: false, 
        error: clientMessage,
    });
  }
}

exports.verifyMail = async (req, res) => {
  try {
     const { email, mobile } = req.body;
     
     if (!mobile || !email) {
         return res.status(400).json({ message: "Mobile number and Email are required in the request body." });
     }
    
    console.log("Attempting Email Verification for:", email);
    const refid = generateRefId();
    const emailVerify = await axios.post(
         "https://control.msg91.com/api/v5/email/validate",
         { email,refid },
         { 
            headers: { 
               "content-type": "application/json",
               "x-env": process.env["X-Env"], 
               "client-id": process.env["Client-Id"],
               "authorization": process.env.Authorization,
               "authkey": process.env.MSG91_AUTH_KEY,
            } 
         }
     );
    console.log("EEEE Email Verification API Response:", emailVerify.data);

     // 3. Check the response from the external API
   // 3. Check based on email verification result
const emailResult = emailVerify.data?.data?.result?.result;  

if (emailResult !== "deliverable") {
    return res.status(400).json({
        success: false,
        message: "Email is not deliverable. Verification failed.",
        emailStatus: emailResult
    });
}

    
     // 4. Find User by Mobile and Update Email/Verification Status
     const user = await User.findOneAndUpdate(
         { mobile }, // Mobile number के आधार पर यूज़र को खोजें
         { 
            email: email, // नए Email को अपडेट करें
            emailVerified: true 
         },
         { 
            new: true, 
            upsert: false 
         }
     );

     if (!user) {
         return res.status(404).json({
               success: false,
               message: "User not found with this mobile number. Update failed.",
         });
     }
   
     // 5. Success Response
     return res.status(200).json({
         success: true,
         message: "Email successfully verified and user record updated.",
         userId: user._id,
         updatedEmail: user.email 
     });
     
  } catch (error) {
      console.error("🔴 Email Verification and Update Error:", error.message);
    
    // API-specific error handling (if the external service fails)
    if (error.response) {
        return res.status(error.response.status || 502).json({ 
            success: false,
            error: "External email verification service failed.",
            details: error.response.data
        });
    }
    
      return res.status(500).json({ error: "Failed to verify email due to server error." });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, role } = req.body;

    if (!firstName || !lastName || !email || !mobile || !role) {
        return res.status(400).json({ message: "Missing required fields." });
    }
    if (!["user", "vendor","admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Choose 'user' or 'vendor' or 'admin'." });
    }
    const verifiedUser = await User.findOne({ 
        mobile: mobile,
        mobileVerified: true,
        emailVerified: true
    });
    
    if (!verifiedUser) {
        const initialUserCheck = await User.findOne({ mobile: mobile });
        
        // अगर user है लेकिन verified नहीं है, तो रोक दें
        if (initialUserCheck) {
             return res.status(403).json({ 
                success: false, 
                message: "Please complete both mobile and email verification before finalizing registration."
             });
        }
        
    }

    const user = await User.findOneAndUpdate(
      { mobile }, 
      {
        firstName,
        lastName,
        email, 
        role,
      },
      { 
          new: true,
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

exports.sendOtpLogin = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required." });
    }

    // 1. Mobile Format/Operator Verification
    const refid = generateRefId();

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
        success: false,
        message: "Mobile verification failed or invalid number.",
        response: mobileVerify.data,
      });
    }

    // --- ✅ NEW OTP GENERATION AND SENDING LOGIC ---
    
    // 2. Generate OTP and Message
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `Aapka login OTP hai: ${otp}. Kripya iska upyog karein.`;
    
    // 3. Send OTP using Fast2SMS
    const smsResponse = await axios.post( 
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
    
    // Check if SMS sending was successful (Fast2SMS response structure check)
    // You may need to adjust this check based on actual API response
    if (smsResponse.data.return === false) { 
        console.error("SMS Gateway Error:", smsResponse.data.message);
        return res.status(502).json({
            success: false,
            message: "Mobile verified, but failed to send OTP.",
            sms_response: smsResponse.data
        });
    }

    // --- ✅ UPDATE DATABASE WITH NEW OTP ---
    
    // 4. Save/Update OTP in Database (upsert: true will create if not found)
    const userDoc = await User.findOneAndUpdate(
      { mobile }, 
      { 
         otp: otp, // 👈 OTP को डेटाबेस में सेव करें
         mobile: mobile, 
         lastVerifiedAt: new Date(), 
         mobileVerified: true // या इसे false रखें अगर आप OTP verify होने के बाद true करना चाहते हैं
      }, 
      { upsert: true, new: true, runValidators: true } 
    );

    // --- ✅ SUCCESS RESPONSE ---
    
    // 5. Return Success Response
    res.status(200).json({
      success: true,
      message: "OTP sent successfully to mobile number. Please verify.",
      user_id: userDoc._id,
    });

  } catch (error) {
    let statusCode = 500;
    let clientMessage = "An unknown error occurred during OTP process.";
    let logDetails = error.message;

    if (error.response) {
        statusCode = error.response.status || 400; 
        logDetails = `API Status Error ${statusCode}: ${JSON.stringify(error.response.data)}`;
        clientMessage = "External Service Failed (Check API Key/Credentials).";
        
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        statusCode = 503;
        logDetails = `Network Error: ${error.code} - Check API URLs or connection.`;
        clientMessage = "Connection to external service failed (Network Issue).";
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        clientMessage = "Database validation failed.";
        logDetails = `DB Validation Error: ${error.message}`;
    }

    console.error(`🔴 Mobile OTP Send Error (${statusCode}):`, logDetails);
    
    res.status(statusCode).json({ 
        success: false, 
        error: clientMessage,
    });
  }
};

exports.verifyOtpAndLogin = async (req, res) => {
    try {
        const { mobile, otp, latitude, longitude } = req.body; 

        const user = await User.findOne({ mobile });

        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
        
        if (!user.referral) {
            user.referral = generateRefId(); 
        }

        user.otp = null;
        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        try {
            const existingWallet = await Wallet.findOne({ userId: user._id });
            if (!existingWallet) {
                const newWallet = new Wallet({
                    userId: user._id,
                    balance: 0,
                });
                await newWallet.save();
                console.log(`✅ New Wallet created for user ID: ${user._id}`);
            } else {
                 console.log(`Wallet already exists for user ID: ${user._id}. Skipping creation.`);
            }
        } catch (walletError) {
             console.error("Warning: Failed to create or check user wallet:", walletError.message);
        }

        if (user.role === 'user' && latitude !== undefined && longitude !== undefined) {
            try {
                const lat = Number(latitude);
                const lon = Number(longitude);

                if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                     await updateUserLocation(user._id, lat, lon);
                } else {
                    console.log(`User ${user._id} (role: ${user.role}) sent invalid coordinates.`);
                }
            } catch (locationError) {
                console.error("Warning: Failed to update user location after login:", locationError.message);
            }
        } else if (user.role !== 'user') {
            console.log(`User ${user._id} (role: ${user.role}) skipped location update.`);
        } else {
            console.log(`User ${user._id} logged in, but location data missing.`);
        }

        // --- Final Response ---
        res.json({
            success: true,
            message: "Login successful",
            token,
            role: user.role,
            user,
        });
    } catch (error) {
        console.error("🔴 Login/OTP Verification Error:", error.message);
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
    const users = await User.find({
      role:{$ne:'admin'}
    });
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

exports.updateUserProfile = async (req, res) => { 
    if (!req.user || !req.user._id) {
        return res.status(401).json({ success: false, message: "Unauthorized. Please ensure a valid token is provided." });
    }
    const userId = req.user._id; 
    
    try {
        const currentUser = await User.findById(userId).select('email mobile');
        console.log("currentUser = ", currentUser);

        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found in database for update." });
        }
        const { 
            firstName, 
            lastName, 
            email, 
            mobile,
            age, 
            gender, 
            address, 
            profilePicture 
        } = req.body;

        const updateData = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (age) updateData.age = age;
        if (gender) updateData.gender = gender;
        if (address) updateData.address = address;
        if (profilePicture) updateData.profilePicture = profilePicture;
        
        // 🛑 EMAIL COMPARISON (currentUser.email se)
        if (email && email !== currentUser.email) {
            updateData.email = email;
            updateData.emailVerified = false; 
        }
        
        // 🛑 MOBILE COMPARISON (currentUser.mobile se)
        if (mobile && mobile !== currentUser.mobile) {
            updateData.mobile = mobile;
            updateData.mobileVerified = false; 
        }
        
        // Agar koi field update nahi ho rahi toh return kar sakte hain
        if (Object.keys(updateData).length === 0) {
             return res.status(200).json({ success: true, message: "No changes detected.", user: currentUser });
        }


        // 4. Database mein user ko ID se dhoondhkar update karna
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true } 
        );

        // 5. Success Response
        res.status(200).json({
            success: true,
            message: "Profile updated successfully!",
            user: updatedUser,
        });

    } catch (error) {
        if (error.code === 11000) { 
            return res.status(400).json({ 
                success: false, 
                message: "Email or Mobile number already in use by another account." 
            });
        }
        if (error.name === 'ValidationError') {
             return res.status(400).json({ success: false, message: error.message });
        }
        
        console.error("🔴 Profile Update Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to update profile." });
    }
};

//*******
// Referral code below
//*******

// 🔹 Apply Referral Code (when new user signs up or logs in)
exports.applyReferralCode = async (req, res) => {
  try {
    const { userId, referralCode } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.referredBy)
      return res.status(400).json({ message: "Referral code already used" });

    const referrer = await User.findOne({ referral: referralCode });
    if (!referrer) return res.status(404).json({ message: "Invalid referral code" });

    

    // ✅ Prevent same mobile/email from using another referral again
    const existingReferral = await Referral.findOne({
      referredUser: user._id,
    });
    if (existingReferral) {
      return res.status(400).json({ message: "Referral already exists for this user" });
    }

    // ✅ Get reward dynamically or use default (100)
    let reward = 100;
    if (Setting) {
      const setting = await Setting.findOne({ key: "referralReward" });
      if (setting) reward = setting.value;
    }

    // ✅ Create referral record
    const referral = await Referral.create({
      referrer: referrer._id,
      referredUser: user._id,
      referralCode,
      rewardAmount: reward,
    });

    // ✅ Save referredBy field in user
    user.referredBy = referralCode;
    await user.save();

    res.json({
      success: true,
      message: "Referral code applied successfully",
      referral,
    });
  } catch (error) {
    console.error("Referral Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Admin: Update Referral Reward
exports.updateReferralReward = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount))
      return res.status(400).json({ message: "Valid reward amount required" });

    const setting = await Setting.findOneAndUpdate(
      { key: "referralReward" },
      { value: Number(amount), description: "Reward amount for successful referral" },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: "Referral reward updated to ₹${amount}",
      setting,
    });
  } catch (error) {
    console.error("Admin Update Reward Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Admin: Get Current Referral Reward
exports.getReferralReward = async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "referralReward" });
    const reward = setting ? setting.value : 100;
    res.json({
      success: true,
      reward,
    });
  } catch (error) {
    console.error("Admin Get Reward Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Admin: Get All Referrals
exports.getAllReferrals = async (req, res) => {
  try {
    const referrals = await Referral.find()
      .populate("referrer", "firstName lastName email mobile referral")
      .populate("referredUser", "firstName lastName email mobile referredBy");

    res.json({
      success: true,
      count: referrals.length,
      referrals,
    });
  } catch (error) {
    console.error("Admin Get Referrals Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Admin: Get Referrals by User ID (either referrer or referred user)
exports.getReferralsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const referrals = await Referral.find({
      $or: [{ referrer: userId }, { referredUser: userId }],
    })
      .populate("referrer", "firstName lastName email mobile referral")
      .populate("referredUser", "firstName lastName email mobile referredBy");

    res.json({
      success: true,
      count: referrals.length,
      referrals,
    });
  } catch (error) {
    console.error("Admin Get User Referrals Error:", error);
    res.status(500).json({ error: error.message });
  }
};
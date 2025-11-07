const axios = require("axios");
require("dotenv").config();

const sendOtp = async (mobile, otp) => {
  try {
    const response = await axios.post(process.env.FAST2SMS_URL, null, {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        variables_values: otp,
        route: "otp",
        numbers: mobile,
      },
    });

    console.log("✅ OTP sent successfully to:", mobile);
    return response.data;
  } catch (error) {
    console.error("❌ OTP sending failed:", error.message);
    throw new Error("Failed to send OTP");
  }
};

module.exports = sendOtp;   
const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
    // 1. **Transporter** banayein
    // Yeh aapke email service provider (jaise Gmail, SendGrid, etc.) ka configuration hai.
    // **Apne credentials** (username aur password) use karein.
    // **PRODUCTION** mein, **Environment Variables** ka upyog karna **ZAROORI** hai!
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com", // Example: "smtp.gmail.com"
        port: process.env.SMTP_PORT || 587, // Standard port for TLS/STARTTLS
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USERNAME, // Apka email address
            pass: process.env.SMTP_PASSWORD, // Apka email password/App Password
        },
    });

    // 2. **Email options** define karein
    const mailOptions = {
        from: `Your App Name <${process.env.SMTP_USERNAME}>`, // Kiski taraf se email jaa raha hai
        to: options.email, // Kisko bhejna hai (User/Vendor/Admin ka mail)
        subject: options.subject, // Email ka vishay
        text: options.message, // Plain text content
        // html: options.html, // Agar HTML content bhejna hai toh
    };

    // 3. **Email bhejein**
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
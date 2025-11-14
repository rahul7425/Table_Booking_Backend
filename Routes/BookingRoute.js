// routes/bookingRoutes.js

const express = require('express');
const router = express.Router();
const bookingController = require('../Controllers/BookingController');
const { protect, authorizeRoles } = require('../Middleware/AuthMiddleware');
// 1. बुकिंग बनाना (Booking Creation)
// इसमें Wallet/Topup/Insufficient Balance checks शामिल हैं।
router.post('/create',protect, bookingController.createBooking);

// 2. स्टाफ चेक-इन (Staff Check-in)
// बुकिंग स्टेटस को 'pending' से 'checked-in' में बदलता है।
router.post('/checkin', bookingController.staffCheckIn);

// 3. ऑफलाइन आइटम्स जोड़ना (Adding Offline Items)
// 'checked-in' होने के बाद बिल में आइटम्स जोड़ना।
router.post('/add-offline-items', bookingController.addOfflineItems);

// 4. बिल क्लोजर और कमीशन (Final Payment & Commission Split)
// भुगतान को 'paid' करता है और एडमिन/बिजनेस कमीशन ट्रांसफर करता है।
router.post('/close-bill', bookingController.billClosure);

// 5. बुकिंग कैंसिल करना (Cancellation)
// 'pending' स्टेटस में कैंसिलेशन और रिफंड लॉजिक।
router.post('/cancel', bookingController.cancelBooking);

// (Optional: Wallet Topup Route - Testing के लिए)
const { topupWallet } = require('../Controllers/WalletController');
router.post('/wallet/topup', topupWallet);


module.exports = router;
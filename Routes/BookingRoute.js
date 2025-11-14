// routes/bookingRoutes.js

const express = require('express');
const router = express.Router();
const bookingController = require('../Controllers/BookingController');
const { protect, authorizeRoles } = require('../Middleware/AuthMiddleware');

router.post('/create',protect, bookingController.createBooking);

router.post('/checkin', bookingController.staffCheckIn);

router.post('/add-offline-items', bookingController.addOfflineItems);

router.post('/close-bill', bookingController.billClosure);

router.post('/cancel', bookingController.cancelBooking);

const { topupWallet } = require('../Controllers/WalletController');
router.post('/wallet/topup', topupWallet);


module.exports = router;
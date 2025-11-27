// routes/bookingRoutes.js

const express = require('express');
const router = express.Router();
const bookingController = require('../Controllers/BookingController');
const { protect, authorizeRoles } = require('../Middleware/AuthMiddleware');

router.post('/create',protect, bookingController.createBooking);

router.post('/checkin', bookingController.staffCheckIn);

router.post('/add-offline-items', bookingController.addOfflineItems);

router.post('/close-bill', bookingController.billClosure);

// router.post('/cancel', bookingController.cancelBooking);
router.post('/cancel/:id', protect, authorizeRoles("user"), bookingController.cancelBooking);

const { topupWallet } = require('../Controllers/WalletController');
router.post('/wallet/topup', topupWallet);


router.put("/:id/accept", protect, authorizeRoles("admin", "vendor"), bookingController.acceptBooking);
router.put("/:id/deny", protect, authorizeRoles("admin", "vendor"), bookingController.denyBooking);

router.get("/all", protect, authorizeRoles("admin", "vendor"), bookingController.getAllBookings);
router.get("/:id", protect, authorizeRoles("admin", "vendor"), bookingController.getBookingById);



module.exports = router;
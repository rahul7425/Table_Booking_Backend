// BookingController.js

const Booking = require('../Models/BookingModel'); // सुनिश्चित करें कि path सही हो
const User = require('../Models/UserModel');     // सुनिश्चित करें कि path सही हो
const { deductFromWallet, refundToWallet, transferCommission } = require('./WalletController');
const { sendBookingConfirmation } = require('./NotificationService');

// Static minimum table price for mandatory check (example value)
const MIN_TABLE_PRICE_FOR_CHECK = 2000;
const CANCELLATION_FEE_PERCENT = 0.15; // 15%

// Helper function to calculate price (for simplicity, using item quantity)
const calculateTotalAmount = (tablePrice, items) => {
    // Note: In a real app, you'd fetch item/variant prices from the Item model
    let itemsTotal = items.reduce((sum, item) => sum + item.quantity * 100, 0); // Assuming item price is 100 for example
    return tablePrice + itemsTotal;
};

// --- Main Booking Logic ---
exports.createBooking = async (req, res) => {
    const { user_id, table_id, schedule_id, items_ordered = [], paymentMethod } = req.body;
    
    try {
        const user = await User.findById(user_id);
        if (!user) return res.status(404).send({ message: "User not found." });

        // Step 1.2: Calculate total amount (Assuming a fixed table price for demo)
        const tablePrice = 500; // Example table price
        const totalAmount = calculateTotalAmount(tablePrice, items_ordered);
        
        let onlinePaymentAmount = 0;

        // Step 1.3 & 1.4: Wallet/Payment Check & Decision
        if (tablePrice >= MIN_TABLE_PRICE_FOR_CHECK && user.walletBalance < MIN_TABLE_PRICE_FOR_CHECK) {
            return res.status(400).send({ message: "Minimum balance of 2000 required for this table. Please topup." });
        }

        if (paymentMethod === 'online') {
            onlinePaymentAmount = totalAmount;
        } else if (paymentMethod === 'cash') {
            onlinePaymentAmount = tablePrice; // Cash payment requires table price online
        } else {
            return res.status(400).send({ message: "Invalid payment method." });
        }

        // Step 1.5: Final Balance Check
        if (user.walletBalance < onlinePaymentAmount) {
            return res.status(400).send({ message: `Insufficient balance for online payment of ${onlinePaymentAmount}.` });
        }

        // Step 2.1: Deduct funds (Admin's Escrow Wallet)
        const deductionResult = await deductFromWallet(user_id, onlinePaymentAmount, "BOOKING_ADVANCE");
        if (!deductionResult.success) {
            return res.status(500).send({ message: "Payment deduction failed." });
        }

        // Step 2.2: Create Booking Document
        const booking = new Booking({
            user_id,
            table_id,
            schedule_id,
            business_id: deductionResult.adminWalletId, // Use admin ID as business for escrow in this flow
            items_ordered,
            totalAmount,
            paymentStatus: onlinePaymentAmount > 0 ? "paid" : "unpaid",
            status: "pending",
        });
        await booking.save();
        
        // Step 2.3: Send Email
        await sendBookingConfirmation(user.email, booking._id, "Business Name", table_id);

        // Step 2.4: Success Response
        res.status(201).send({ message: "Booking successful!", bookingId: booking._id });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error during booking." });
    }
};


// --- On-Site Check-in (Staff Logic) ---
exports.staffCheckIn = async (req, res) => {
    const { bookingId } = req.body;
    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).send({ message: "Booking not found." });
        
        if (booking.status !== 'pending') {
            return res.status(400).send({ message: `Booking already ${booking.status}.` });
        }

        // Step 3.2: Status Update
        booking.status = 'checked-in';
        await booking.save();

        res.send({ message: "User successfully checked-in.", booking });

    } catch (error) {
        res.status(500).send({ message: "Error during check-in." });
    }
};

// --- Offline Item Ordering (Staff Logic) ---
exports.addOfflineItems = async (req, res) => {
    const { bookingId, newItems } = req.body; // newItems must be in the format of items_ordered array
    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).send({ message: "Booking not found." });
        
        if (booking.status !== 'checked-in') {
            return res.status(400).send({ message: "Items can only be added after check-in." });
        }
        
        // Step 3.3: Add New Items
        booking.items_ordered.push(...newItems);
        
        // Step 3.4: Update Total Bill (Recalculate total amount including new items)
        const updatedTotalAmount = calculateTotalAmount(500, booking.items_ordered);
        booking.totalAmount = updatedTotalAmount;
        
        await booking.save();
        res.send({ message: "Items added and total amount updated.", totalAmount: booking.totalAmount });

    } catch (error) {
        res.status(500).send({ message: "Error adding offline items." });
    }
};


// --- Final Bill Payment & Commission Split ---
exports.billClosure = async (req, res) => {
    const { bookingId } = req.body;
    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).send({ message: "Booking not found." });
        
        if (booking.paymentStatus === 'paid') {
            return res.status(400).send({ message: "Bill is already paid." });
        }

        // In a real application, handle offline cash payment collection here, 
        // or process final online payment for remaining balance.
        
        // Step 5.1: Payment Status Update (Assuming full payment is now made)
        booking.paymentStatus = 'paid';
        await booking.save();
        
        // Step 5.2 - 5.5: Calculate & Transfer Commission
        const commissionAmount = booking.totalAmount * 0.50; // 50% commission
        const businessShare = booking.totalAmount - commissionAmount;

        // Transfer funds from Admin's Escrow to Business Wallet
        // Logic should handle deducting the initial online payment amount before calculating commission.
        // For simplicity, here we assume total amount is now being distributed from Admin's Escrow.
        await transferCommission(booking.business_id, businessShare, "BOOKING_PAYMENT_SETTLEMENT");
        // Commission amount stays in Admin's account

        res.send({ message: "Bill paid and commission settled.", businessShare, commissionAmount });

    } catch (error) {
        res.status(500).send({ message: "Error during bill closure." });
    }
};

// --- Cancellation Logic ---
exports.cancelBooking = async (req, res) => {
    const { bookingId } = req.body;
    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).send({ message: "Booking not found." });

        // Step 4.1: Status Check (Only before checked-in)
        if (booking.status !== 'pending') {
            return res.status(400).send({ message: "Cancellation only allowed before check-in." });
        }
        
        // Get the amount that was originally paid online (if any)
        const paidAmount = 500; // You should fetch this from the transaction history or booking record
        
        if (paidAmount > 0) {
            // Step 4.2 & 4.3: Calculate Refund
            const cancellationCharge = paidAmount * CANCELLATION_FEE_PERCENT;
            const refundAmount = paidAmount - cancellationCharge;

            // Step 4.4: Transaction (Admin to User)
            await refundToWallet(booking.user_id, refundAmount, "BOOKING_CANCELLATION_REFUND");
            
            // Step 4.5: Update Booking
            booking.status = 'cancelled';
            booking.paymentStatus = 'refunded';
            await booking.save();

            res.send({ message: "Booking cancelled successfully.", refunded: refundAmount, fee: cancellationCharge });
        } else {
            booking.status = 'cancelled';
            await booking.save();
            res.send({ message: "Booking cancelled. No refund required." });
        }

    } catch (error) {
        res.status(500).send({ message: "Error during cancellation." });
    }
};
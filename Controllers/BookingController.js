// BookingController.js

const Booking = require('../Models/BookingModel');
const User = require('../Models/UserModel');
const Table = require('../Models/TableModel'); 
const ItemModel = require('../Models/ItemModel'); 
const Item = ItemModel.Item;
const { deductFromWallet, refundToWallet, transferCommission } = require('./WalletController');
const { sendBookingConfirmation } = require('./services/NotificationService');

const MIN_TABLE_PRICE_FOR_CHECK = 2000;
const CANCELLATION_FEE_PERCENT = 0.15; // 15%

// Helper function to calculate price (for simplicity, using item quantity)
const calculateTotalAmount = (tablePrice, items) => {
    // Note: In a real app, you'd fetch item/variant prices from the Item model
    let itemsTotal = items.reduce((sum, item) => sum + item.quantity * 100, 0); // Assuming item price is 100 for example
    return tablePrice + itemsTotal;
};


exports.createBooking = async (req, res) => {
    const user_id = req.user._id;
    const { table_id, schedule_id, items_ordered = [], paymentMethod } = req.body;   

    try {
        const user = await User.findById(user_id);
        console.log("user = ", user);

        if (!user) return res.status(401).send({ message: "Authenticated user not found." });

        const table = await Table.findById(table_id);
        if (!table) return res.status(404).send({ message: "Table not found." });
        
        const tablePrice = (typeof table.price === 'number' && !isNaN(table.price)) ? table.price : 0; 

        let validatedTotalAmount = tablePrice; // Table price से शुरुआत
        let finalItemsOrdered = [];

        for (const orderItem of items_ordered) {
            const { itemId, quantity: quantityStr, selected_variant_id } = orderItem;
            const quantity = Number(quantityStr); // स्ट्रिंग को नंबर में बदलें
            
            // Quantity/ID Validation
            if (!itemId || isNaN(quantity) || quantity < 1 || !selected_variant_id) {
                return res.status(400).send({ message: "Invalid quantity or missing item details." });
            }
            
            const itemFromDB = await Item.findById(itemId);
            if (!itemFromDB) {
                return res.status(404).send({ message: `Item not found for ID: ${itemId}` });
            }

            const selectedVariant = itemFromDB.variants.find(
                v => v._id.toString() === selected_variant_id
            );

            // Price/Variant Validation
            if (!selectedVariant || !selectedVariant.isAvailable || typeof selectedVariant.price !== 'number' || isNaN(selectedVariant.price)) {
                return res.status(400).send({ message: `Selected variant is unavailable or its price is invalid.` });
            }

            const itemPrice = selectedVariant.price * quantity;
            validatedTotalAmount += itemPrice; 

            finalItemsOrdered.push({
                itemId: itemFromDB._id,
                quantity: quantity,
                selected_variant_id: selectedVariant._id
            });
        }
        
        const totalAmount = validatedTotalAmount; 
        
        // NaN Check
        if (isNaN(totalAmount)) {
            console.error("Critical Error: Final totalAmount is NaN after calculation.");
            return res.status(500).send({ message: "Internal error: Failed to calculate total amount." });
        }
        
        let onlinePaymentAmount = 0;
        if (user.walletBalance < MIN_TABLE_PRICE_FOR_CHECK) {
            return res.status(400).send({ 
                message: `Minimum balance of ${MIN_TABLE_PRICE_FOR_CHECK} is required in your wallet for any booking. Please topup.` 
            });
        }
        
        // 4. Payment Decision
        if (paymentMethod === 'online') {
            onlinePaymentAmount = totalAmount; 
        } else if (paymentMethod === 'cash') {
            onlinePaymentAmount = tablePrice; 
        } else {
            return res.status(400).send({ message: "Invalid payment method." });
        }

        // 5. Final Balance Check (यह सुनिश्चित करता है कि पेमेंट के लिए आवश्यक राशि वॉलेट में हो)
        if (user.walletBalance < onlinePaymentAmount) {
            return res.status(400).send({ message: `Insufficient balance for online payment of ${onlinePaymentAmount}.` });
        }

        // 6. Deduct funds
        const deductionResult = await deductFromWallet(user_id, onlinePaymentAmount, "BOOKING_ADVANCE");
        if (!deductionResult.success) {
            return res.status(500).send({ message: "Payment deduction failed." });
        }

        // 7. Create Booking Document
        const booking = new Booking({
            user_id,
            table_id,
            schedule_id,
            items_ordered: finalItemsOrdered, 
            totalAmount, 
            paymentStatus: onlinePaymentAmount > 0 ? "paid" : "unpaid", 
            status: "pending",
        });
        await booking.save();
        
        // 8. Success Response
        await sendBookingConfirmation(user.email, booking._id, "Business Name", table_id);
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
const Booking = require('../Models/BookingModel');
const Business = require('../Models/BusinessModel');
const Referral = require('../Models/ReferralModel');
const User = require('../Models/UserModel');
const Table = require('../Models/TableModel');
const ItemModel = require('../Models/ItemModel');
const Wallet = require('../Models/WalletModel');
const Transaction = require('../Models/Transaction');
const Item = ItemModel.Item;
const { transferCommission } = require('./WalletController');
const { deductFromWallet, refundToWallet } = require('../Utils/walletFunctions');
const { sendBookingConfirmation } = require('./services/NotificationService');

const MIN_TABLE_PRICE_FOR_CHECK = 2000;
const CANCELLATION_FEE_PERCENT = 0.15; // 15%

const calculateTotalAmount = (tablePrice, items) => {
    let itemsTotal = items.reduce((sum, item) => sum + item.quantity * 100, 0);
    return tablePrice + itemsTotal;
};

exports.createBooking = async (req, res) => {
    const user_id = req.user._id;
    const { table_id, schedule_id, items_ordered = [], paymentMethod, couponCode } = req.body;

    let transactionId = null;
    let appliedCoupon = null;
    let discount = 0;

    try {
        const user = await User.findById(user_id);
        if (!user) return res.status(401).send({ message: "Authenticated user not found." });

        const wallet = await Wallet.findOne({ userId: user_id });
        if (!wallet) {
            return res.status(400).send({ message: "User wallet not found. Cannot proceed with booking." });
        }

        const userWalletBalance = wallet.balance;
        const userWalletId = wallet._id;

        const table = await Table.findById(table_id);
        if (!table) return res.status(404).send({ message: "Table not found." });

        const tablePrice = Number(table.price) || 0;
        let validatedTotalAmount = tablePrice;

        // ------------------- ITEM PRICE CALCULATION -------------------
        let finalItemsOrdered = [];
        for (const orderItem of items_ordered) {
            const { itemId, quantity: quantityStr, selected_variant_id } = orderItem;
            const quantity = Number(quantityStr);

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

            if (
                !selectedVariant ||
                !selectedVariant.isAvailable ||
                typeof selectedVariant.price !== "number" ||
                isNaN(selectedVariant.price)
            ) {
                return res.status(400).send({ message: `Selected variant is unavailable or its price is invalid.` });
            }

            const itemPrice = selectedVariant.price * quantity;
            validatedTotalAmount += itemPrice;

            finalItemsOrdered.push({
                itemId: itemFromDB._id,
                quantity,
                selected_variant_id: selectedVariant._id
            });
        }

        if (isNaN(validatedTotalAmount)) {
            return res.status(500).send({ message: "Internal error: Failed to calculate total amount." });
        }

        // ---------------------------------------------------------------
        // ⭐⭐⭐ APPLY COUPON LOGIC (FULL VALIDATION) ⭐⭐⭐
        // ---------------------------------------------------------------
        const Coupon = require("../Models/CouponModel");

        if (couponCode) {
            appliedCoupon = await Coupon.findOne({ code: couponCode });
            if (!appliedCoupon) {
                return res.status(400).send({ message: "Invalid coupon code" });
            }

            // ❌ Expired?
            if (appliedCoupon.expiryDate && new Date() > appliedCoupon.expiryDate) {
                return res.status(400).send({ message: "This coupon has expired" });
            }

            // ❌ Inactive?
            if (!appliedCoupon.isActive) {
                return res.status(400).send({ message: "This coupon is inactive" });
            }

            // ❌ Check min order value
            if (validatedTotalAmount < appliedCoupon.minOrderValue) {
                return res.status(400).send({
                    message: `Minimum order value ₹${appliedCoupon.minOrderValue} required for this coupon`
                });
            }

            // ❌ Check max usage per day
            if (appliedCoupon.maxUsePerDay > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const usedToday = appliedCoupon.usageHistory.filter(u =>
                    new Date(u.usedAt) >= today
                ).length;

                if (usedToday >= appliedCoupon.maxUsePerDay) {
                    return res.status(400).send({ message: "Coupon usage limit reached for today" });
                }
            }

            // ❌ Already used by this user?
            const alreadyUsed = appliedCoupon.usageHistory.some(
                entry => entry.user_id.toString() === user_id.toString()
            );

            if (alreadyUsed) {
                return res.status(400).send({ message: "You have already used this coupon" });
            }

            // Apply Discount
            if (appliedCoupon.discountType === "percent") {
                discount = (validatedTotalAmount * appliedCoupon.discountValue) / 100;
            } else {
                discount = appliedCoupon.discountValue;
            }

            validatedTotalAmount -= discount;
            if (validatedTotalAmount < 0) validatedTotalAmount = 0;
        }

        // ---------------------------------------------------------------
        let onlinePaymentAmount = 0;

        if (userWalletBalance < MIN_TABLE_PRICE_FOR_CHECK) {
            return res.status(400).send({
                message: `Minimum balance of ${MIN_TABLE_PRICE_FOR_CHECK} is required in your wallet. Please topup.`
            });
        }

        if (paymentMethod === "online") {
            onlinePaymentAmount = validatedTotalAmount;
        } else if (paymentMethod === "cash") {
            onlinePaymentAmount = tablePrice;
        } else {
            return res.status(400).send({ message: "Invalid payment method." });
        }

        if (userWalletBalance < onlinePaymentAmount) {
            return res.status(400).send({
                message: `Insufficient balance for online payment of ${onlinePaymentAmount}.`
            });
        }

        const deductionResult = await deductFromWallet(
            user_id,
            userWalletId,
            onlinePaymentAmount,
            appliedCoupon
                ? `BOOKING_ADVANCE (Discount applied: ${discount})`
                : "BOOKING_ADVANCE"
        );

        if (!deductionResult.success) {
            return res.status(500).send({ message: deductionResult.message || "Payment deduction failed." });
        }

        transactionId = deductionResult.transactionId;

        // ---------------- CREATE BOOKING ----------------
        const booking = new Booking({
            user_id,
            table_id,
            schedule_id,
            items_ordered: finalItemsOrdered,
            totalAmount: validatedTotalAmount,
            paymentStatus: onlinePaymentAmount > 0 ? "paid" : "unpaid",
            status: "pending",
            requestStatus: "pending",

            couponId: appliedCoupon ? appliedCoupon._id : null,
            discountApplied: discount
        });

        await booking.save();

        // ✅ AFTER BOOKING SUCCESS — HANDLE REFERRAL WALLET CREDIT
        try {
            const referral = await Referral.findOne({
                referredUser: user_id,
                rewardCredited: false
            }).populate("referrer");

            if (referral && !user.firstBookingDone) {
                console.log("Referral reward applicable.");

                // 🔹 Referrer ka wallet fetch karo
                let referrerWallet = await Wallet.findOne({ userId: referral.referrer._id });

                // Agar wallet nahi ho to create karo
                if (!referrerWallet) {
                    referrerWallet = await Wallet.create({
                        userId: referral.referrer._id,
                        branchId: table.branchId,   // or any default branch
                        balance: 0
                    });
                }

                // 🔹 Wallet me credit
                referrerWallet.balance += referral.rewardAmount;
                await referrerWallet.save();

                // 🔹 Transaction record
                await Transaction.create({
                    userId: referral.referrer._id,
                    walletId: referrerWallet._id,
                    amount: referral.rewardAmount,
                    type: "credit",
                    description: `Referral reward credited for booking ${booking._id}`
                });

                // 🔹 Update referral record
                referral.rewardCredited = true;
                referral.bookingCompleted = true;
                await referral.save();

                // 🔹 Mark user first booking done
                user.firstBookingDone = true;
                await user.save();

                console.log("Referral reward added successfully!");
            }

        } catch (err) {
            console.error("Referral reward process failed:", err);
        }


        // ---------------- STORE COUPON USAGE ----------------
        if (appliedCoupon) {
            appliedCoupon.usageHistory.push({
                user_id,
                booking_id: booking._id,
                usedAt: new Date()
            });

            appliedCoupon.totalUsedCount += 1;
            await appliedCoupon.save();
        }

        if (transactionId) {
            await Transaction.findByIdAndUpdate(transactionId, { bookingId: booking._id });
        }

        await sendBookingConfirmation(user.email, booking._id, "Business Name", table_id);

        return res.status(201).send({
            message: "Booking successful! Payment deducted from wallet.",
            bookingId: booking._id,
            transactionId
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error during booking." });
    }
};


// exports.createBooking = async (req, res) => {
//     const user_id = req.user._id;
//     const { table_id, schedule_id, items_ordered = [], paymentMethod, couponCode  } = req.body; 	
//     let transactionId = null; 

//     try {
//         const user = await User.findById(user_id);
//         if (!user) return res.status(401).send({ message: "Authenticated user not found." });

//         const wallet = await Wallet.findOne({ userId: user_id });

//         if (!wallet) {
//             return res.status(400).send({ message: "User wallet not found. Cannot proceed with booking." });
//         }
//         const userWalletBalance = wallet.balance; 
//         const userWalletId = wallet._id;

//         const table = await Table.findById(table_id);
//         if (!table) return res.status(404).send({ message: "Table not found." });

//         const tablePrice = (typeof table.price === 'number' && !isNaN(table.price)) ? table.price : 0; 

//         let validatedTotalAmount = tablePrice;
//         let finalItemsOrdered = [];
//         for (const orderItem of items_ordered) {
//             const { itemId, quantity: quantityStr, selected_variant_id } = orderItem;
//             const quantity = Number(quantityStr);
//             if (!itemId || isNaN(quantity) || quantity < 1 || !selected_variant_id) {
//                 return res.status(400).send({ message: "Invalid quantity or missing item details." });
//             }
//             const itemFromDB = await Item.findById(itemId);
//             if (!itemFromDB) {
//                 return res.status(404).send({ message: `Item not found for ID: ${itemId}` });
//             }
//             const selectedVariant = itemFromDB.variants.find(
//                 v => v._id.toString() === selected_variant_id
//             );
//             if (!selectedVariant || !selectedVariant.isAvailable || typeof selectedVariant.price !== 'number' || isNaN(selectedVariant.price)) {
//                 return res.status(400).send({ message: `Selected variant is unavailable or its price is invalid.` });
//             }
//             const itemPrice = selectedVariant.price * quantity;
//             validatedTotalAmount += itemPrice; 
//             finalItemsOrdered.push({
//                 itemId: itemFromDB._id,
//                 quantity: quantity,
//                 selected_variant_id: selectedVariant._id
//             });
//         }

//         const totalAmount = validatedTotalAmount; 

//         if (isNaN(totalAmount)) {
//             console.error("Critical Error: Final totalAmount is NaN after calculation.");
//             return res.status(500).send({ message: "Internal error: Failed to calculate total amount." });
//         }

//         let onlinePaymentAmount = 0;

//         // 2. Minimum Wallet Balance Check
//         if (userWalletBalance < MIN_TABLE_PRICE_FOR_CHECK) {
//             return res.status(400).send({ 
//                 message: `Minimum balance of ${MIN_TABLE_PRICE_FOR_CHECK} is required in your wallet for any booking. Please topup.` 
//             });
//         }

//         // 3. Payment Decision
//         if (paymentMethod === 'online') {
//             onlinePaymentAmount = totalAmount; 
//         } else if (paymentMethod === 'cash') {
//             onlinePaymentAmount = tablePrice; 
//         } else {
//             return res.status(400).send({ message: "Invalid payment method." });
//         }

//         // 4. Final Balance Check
//         if (userWalletBalance < onlinePaymentAmount) {
//             return res.status(400).send({ message: `Insufficient balance for online payment of ${onlinePaymentAmount}.` });
//         }

//         const deductionResult = await deductFromWallet(
//             user_id, 
//             userWalletId, 
//             onlinePaymentAmount, 
//             "BOOKING_ADVANCE"
//         );

//         if (!deductionResult.success) {
//             return res.status(500).send({ message: deductionResult.message || "Payment deduction failed." });
//         }

//         transactionId = deductionResult.transactionId;

//         const booking = new Booking({
//             user_id,
//             table_id,
//             schedule_id,
//             items_ordered: finalItemsOrdered, 
//             totalAmount, 
//             paymentStatus: onlinePaymentAmount > 0 ? "paid" : "unpaid", 
//             status: "pending",
//             requestStatus: "pending"
//         });
//         await booking.save();

//         if (onlinePaymentAmount > 0 && transactionId) {
//             await Transaction.findByIdAndUpdate(transactionId, { bookingId: booking._id });
//         }

//         // 8. Success Response
//         await sendBookingConfirmation(user.email, booking._id, "Business Name", table_id);
//         res.status(201).send({ 
//             message: "Booking successful! Payment deducted from wallet.", 
//             bookingId: booking._id,
//             transactionId: transactionId 
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).send({ message: "Server error during booking." });
//     }
// };
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
    try {
        const userId = req.user._id;
        const bookingId = req.params.id;

        const booking = await Booking.findById(bookingId);

        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Step 4.1: Status Check (Must be 'pending')
        if (booking.status !== 'pending') {
            return res.status(400).send({ message: "Cancellation only allowed for pending bookings." });
        }

        const initialTransaction = await Transaction.findOne({
            bookingId: bookingId,
            type: 'debit', // वह राशि जो ग्राहक ने शुरू में चुकाई थी
        }).sort({ createdAt: 1 }); // सबसे पहला डेबिट ट्रांजैक्शन

        let paidAmount = 0;
        if (initialTransaction) {
            paidAmount = initialTransaction.amount;
        }

        // यदि कोई भुगतान नहीं किया गया है (e.g., cash payment method and tablePrice=0)
        if (paidAmount <= 0) {
            booking.status = 'cancelled';
            await booking.save();
            return res.send({ message: "Booking cancelled. No online payment found, no refund required." });
        }

        // भुगतान किया गया है (> 0)

        // Step 4.2 & 4.3: RefundToWallet यूटिलिटी को कॉल करें (यह शुल्क काट लेगा)
        const refundResult = await refundToWallet(
            booking.user_id,
            paidAmount,
            CANCELLATION_FEE_PERCENT, // 0.15 (15%)
            booking._id
        );

        if (!refundResult.success) {
            // यदि रिफंड विफल होता है (जैसे डेटाबेस त्रुटि), तो बुकिंग स्थिति अपडेट न करें।
            return res.status(500).send({ message: refundResult.message || "Refund failed. Please contact support." });
        }

        // Step 4.4 & 4.5: Update Booking
        booking.status = 'cancelled';
        booking.paymentStatus = 'refunded';
        await booking.save();

        res.send({
            message: "Booking cancelled successfully. Refund processed.",
            refunded: refundResult.refundAmount,
            feeCharged: refundResult.feeCharged,
            transactionId: refundResult.transactionId
        });

    } catch (error) {
        console.error("Error during cancellation:", error);
        res.status(500).send({ message: "Server error during cancellation." });
    }
};

exports.denyBooking = async (req, res) => {
    try {
        const vendorId = req.user._id;
        const bookingId = req.params.id;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        const table = await Table.findById(booking.table_id);
        if (!table) {
            return res.status(404).json({ message: "Table not found" });
        }

        const business = await Business.findById(table.businessId);
        if (!business) return res.status(404).json({ message: "Business not found" });

        if (business.vendorId.toString() !== vendorId.toString()) {
            return res.status(403).json({
                message: "You cannot deny this booking – not your business"
            });
        }



        if (booking.requestStatus !== "pending") {
            return res.status(400).json({ message: "Already decided" });
        }

        // ----------- STEP 1: Update Booking -----------
        booking.requestStatus = "denied";
        booking.status = "cancelled";

        // Vendor denied → always full refund
        booking.refundMode = "full";

        await booking.save();

        // ----------- STEP 2: Refund Logic -----------
        const refundAmount = booking.totalAmount;

        console.log("fsfsdfsdfsfsdfsdfs", refundAmount);

        // const refund = await refundToWallet(
        //     booking.user_id,
        //     refundAmount,
        //     "BOOKING_DENIED_BY_VENDOR"
        // );

        const refund = await refundToWallet(
            booking.user_id,
            refundAmount,     // totalPaidAmount
            0,                // feePercentage (0% → full refund)
            booking._id       // bookingId
        );

        return res.status(200).json({
            message: "Booking denied & full amount refunded",
            booking,
            refundTransactionId: refund.transactionId
        });

    } catch (err) {
        console.error(err);
        // res.status(500).json({ message: "Server error" });
        return res.status(500).json({ message: err.message, error: err });

    }
};

exports.acceptBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Allow approval only when status is pending
        if (booking.status !== "pending") {
            return res.status(400).json({ message: `Cannot approve booking because it is already '${booking.status}'.` });
        }

        // Update booking status
        booking.status = "confirmed"; // because approved not allowed
        booking.requestStatus = "accepted"; // accepted is allowed


        await booking.save();

        return res.status(200).json({
            message: "Booking approved successfully.",
            booking
        });

    } catch (error) {
        console.error("Error approving booking:", error);
        return res.status(500).json({ message: "Server error while approving booking." });
    }
};


exports.getAllBookings = async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user._id;

        let bookings;

        if (role === "admin") {
            // ADMIN → everything
            bookings = await Booking.find()
                .populate("user_id", "name email")
                .populate("table_id")
                .populate("couponId");
        }

        else if (role === "vendor") {
            // Step 1: find vendor ka business
            const business = await Business.findOne({ vendorId: userId });
            if (!business) {
                return res.status(404).json({ message: "Business not found for this vendor" });
            }

            // Step 2: find tables of vendor
            const tables = await Table.find({ businessId: business._id }).select("_id");

            const tableIds = tables.map(t => t._id);

            // Step 3: find bookings of these tables
            bookings = await Booking.find({ table_id: { $in: tableIds } })
                .populate("user_id", "name email")
                .populate("table_id")
                .populate("couponId");
        }

        return res.status(200).json({
            message: "Bookings fetched successfully",
            count: bookings.length,
            bookings
        });

    } catch (error) {
        console.error("Error fetching bookings:", error);
        return res.status(500).json({ message: "Server error while fetching bookings" });
    }
};


exports.getBookingById = async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user._id;
        const bookingId = req.params.id;

        const booking = await Booking.findById(bookingId)
            .populate("user_id", "name email")
            .populate("table_id")
            .populate("couponId");

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // ADMIN → direct allow

        if (role === "admin") {
            return res.status(200).json({ booking });
        }

        // VENDOR → verify booking belongs to his tables
        if (role === "vendor") {
            const table = await Table.findById(booking.table_id);
            if (!table) {
                return res.status(404).json({ message: "Table not found" });
            }

            const business = await Business.findById(table.businessId);

            if (!business || business.vendorId.toString() !== userId.toString()) {
                return res.status(403).json({
                    message: "You are not authorized to view this booking"
                });
            }

            return res.status(200).json({ booking });
        }

    } catch (error) {
        console.error("Error fetching booking:", error);
        return res.status(500).json({ message: "Server error while fetching booking details" });
    }
};

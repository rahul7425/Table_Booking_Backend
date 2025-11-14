// ../utils/walletFunctions.js

const Wallet = require('../Models/WalletModel');
const mongoose = require('mongoose');
const Transaction = require('../Models/Transaction');

/**
 * उपयोगकर्ता के वॉलेट से राशि काटता है और ट्रांजैक्शन रिकॉर्ड बनाता है।
 * यह फ़ंक्शन अब ट्रांजैक्शन ID को भी वापस करता है।
 * @param {mongoose.Types.ObjectId} userId - उपयोगकर्ता ID।
 * @param {mongoose.Types.ObjectId} walletId - वॉलेट ID।
 * @param {number} amount - कटौती की जाने वाली राशि।
 * @param {string} note - ट्रांजैक्शन का विवरण।
 * @param {mongoose.Types.ObjectId} [bookingId=null] - बुकिंग ID (अगर उपलब्ध हो)।
 * @returns {object} { success: boolean, transactionId: ObjectId, newBalance: number }
 */
const deductFromWallet = async (userId, walletId, amount, note, bookingId = null) => {
    if (typeof amount !== 'number' || amount <= 0) {
        return { success: false, message: "Invalid deduction amount." };
    }

    // 1. ट्रांजैक्शन डॉक्यूमेंट बनाएं (बिना वॉलेट ट्रांजैक्शन ऐरे में जोड़े)
    const newTransaction = new Transaction({
        userId: userId,
        walletId: walletId,
        type: "debit",
        amount: amount,
        note: note,
        bookingId: bookingId, // यदि बुकिंग ID पास की गई है
    });

    try {
        await newTransaction.save();

        // 2. वॉलेट बैलेंस और ट्रांजैक्शन ऐरे को अपडेट करें (परमाणु रूप से)
        const updatedWallet = await Wallet.findOneAndUpdate(
            { 
                _id: walletId, 
                balance: { $gte: amount } // पर्याप्त बैलेंस की जाँच
            },
            {
                $inc: { balance: -amount }, // बैलेंस घटाएँ
                $push: { transactions: newTransaction._id } // ट्रांजैक्शन ID जोड़ें
            },
            { new: true }
        );

        if (!updatedWallet) {
            // यदि वॉलेट अपडेट विफल होता है (अपरिप्याप्त बैलेंस या वॉलेट नहीं मिला), 
            // तो बनाए गए ट्रांजैक्शन को हटाना (रोलबैक) आवश्यक है।
            await Transaction.deleteOne({ _id: newTransaction._id });
            return { success: false, message: "Insufficient wallet balance or wallet not found." };
        }

        return { 
            success: true, 
            transactionId: newTransaction._id,
            newBalance: updatedWallet.balance 
        };

    } catch (error) {
        console.error("Error deducting from wallet:", error);
        // संभावित रूप से, आंशिक अपडेट को रोलबैक करने की आवश्यकता हो सकती है (यदि केवल ट्रांजैक्शन सेव हुआ)
        if (newTransaction._id) {
             await Transaction.deleteOne({ _id: newTransaction._id });
        }
        return { success: false, message: `Database error during deduction.` };
    }
};

const refundToWallet = async (userId, totalPaidAmount, feePercentage, bookingId) => {
    if (typeof totalPaidAmount !== 'number' || totalPaidAmount <= 0) {
        return { success: false, message: "Invalid paid amount for refund." };
    }
    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
        return { success: false, message: "User wallet not found for refund." };
    }
    const walletId = wallet._id;
    // 2. शुल्क और रिफंड की गणना करें
    const feeCharged = totalPaidAmount * feePercentage;
    const refundAmount = totalPaidAmount - feeCharged;

    if (refundAmount < 0) {
        return { success: false, message: "Negative refund amount calculated." };
    }
    
    const newTransaction = new Transaction({
        userId: userId,
        walletId: walletId,
        type: "credit",
        amount: refundAmount, 
        note: `BOOKING_CANCELLATION_REFUND (Fee: ${feeCharged.toFixed(2)})`,
        bookingId: bookingId,
    });

    try {
        await newTransaction.save();

        const updatedWallet = await Wallet.findOneAndUpdate(
            { _id: walletId },
            {
                $inc: { balance: refundAmount }, // बैलेंस में रिफंड राशि जोड़ें
                $push: { transactions: newTransaction._id } // ट्रांजैक्शन ID जोड़ें
            },
            { new: true }
        );

        if (!updatedWallet) {
            await Transaction.deleteOne({ _id: newTransaction._id });
            return { success: false, message: "Wallet update failed during refund." };
        }

        return { 
            success: true, 
            transactionId: newTransaction._id,
            refundAmount: refundAmount,
            feeCharged: feeCharged,
            newBalance: updatedWallet.balance 
        };

    } catch (error) {
        console.error("Error refunding to wallet:", error);
        if (newTransaction._id) {
            await Transaction.deleteOne({ _id: newTransaction._id });
        }
        return { success: false, message: `Database error during refund.` };
    }
};

module.exports = {
    deductFromWallet,
    refundToWallet
};
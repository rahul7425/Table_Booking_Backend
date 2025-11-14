// WalletController.js

const User = require('../Models/UserModel'); // User model (which must have a walletBalance field)
// const AdminWallet = require('../models/AdminWallet'); // Separate Admin/Business Wallet models are needed in a real app

const ADMIN_WALLET_ID = "60c0d500c0d500c0d500c0d5"; // Placeholder for Admin's Account/ID

// --- Deduct/Escrow from User to Admin ---
exports.deductFromWallet = async (userId, amount, transactionType) => {
    try {
        const user = await User.findById(userId);
        if (!user || user.walletBalance < amount) {
            return { success: false, message: "Insufficient balance or user not found." };
        }
        
        // 1. Deduct from User (Decrease balance)
        user.walletBalance -= amount;
        await user.save();

        // 2. Log transaction to Admin's Escrow (Simulated by just returning the ID)
        // In a real application, you would log this as a pending transaction in a separate transaction log/model.
        
        console.log(`Deducted ${amount} from User ${userId}. Logged to Admin Escrow.`);
        
        return { success: true, adminWalletId: ADMIN_WALLET_ID };

    } catch (error) {
        console.error("Deduction error:", error);
        return { success: false, message: "Transaction failed." };
    }
};

// --- Refund from Admin Escrow to User ---
exports.refundToWallet = async (userId, amount, transactionType) => {
    try {
        const user = await User.findById(userId);
        if (!user) return { success: false, message: "User not found." };

        // 1. Add to User (Increase balance)
        user.walletBalance += amount;
        await user.save();

        // 2. Log transaction (Deduct from Admin's Escrow balance/log)
        console.log(`Refunded ${amount} to User ${userId}. Deducted from Admin Escrow.`);

        return { success: true };

    } catch (error) {
        console.error("Refund error:", error);
        return { success: false, message: "Refund transaction failed." };
    }
};

// --- Transfer Business Share (Admin Escrow to Business Wallet) ---
exports.transferCommission = async (businessId, amount, transactionType) => {
    try {
        // Find Business/Vendor (Assuming Business model has a walletBalance)
        const business = await User.findById(businessId); // Assuming Business is also a 'User' for simplicity
        if (!business) return { success: false, message: "Business not found." };

        // 1. Add to Business Wallet
        business.walletBalance += amount;
        await business.save();

        // 2. Log transaction (Deduct from Admin's Escrow and log commission retention)
        console.log(`Transferred ${amount} to Business ${businessId}. Commission retained by Admin.`);

        return { success: true };

    } catch (error) {
        console.error("Transfer error:", error);
        return { success: false, message: "Commission transfer failed." };
    }
};

// --- User Topup (Admin Escrow) ---
exports.topupWallet = async (req, res) => {
    
    try {
        const { userId, amount } = req.body;
        const user = await User.findById(userId);
        
        user.walletBalance += amount; // Add funds to user wallet
        await user.save();
        
        // Log funds added to Admin's main account
        console.log(`User ${userId} topped up ${amount}. Funds go to Admin's main account.`);

        res.send({ message: "Wallet topup successful. Funds credited to user wallet (via Admin)." });
        
    } catch (error) {
        res.status(500).send({ message: "Topup error." });
    }
};
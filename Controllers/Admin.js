const User = require("../Models/UserModel");
const Commission = require("../Models/CommissionModel");
const Booking = require("../Models/BookingModel");

exports.setCommission = async (req, res) => {
  try {
    const { vendorId, commissionPercentage } = req.body;

    if (!vendorId)
      return res.status(400).json({ message: "Vendor ID is required" });

    // Commission default = 50%
    const commissionValue = commissionPercentage ? commissionPercentage : 50;

    const commission = await Commission.findOneAndUpdate(
      { vendorId },
      { commissionPercentage: commissionValue },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Commission set successfully",
      data: commission,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllCommissions = async (req, res) => {
  try {
    const commissions = await Commission.find().populate("vendorId", "firstName lastName email mobile");
    res.status(200).json({ success: true, data: commissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDashboardTotals = async (req, res) => {
  try {
    // 1. Users & Vendors count
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalVendors = await User.countDocuments({ role: "vendor" });

    // 2. Booking stats (mocked for now; replace with your real model later)
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const completedBookings = await Booking.countDocuments({ status: "completed" });
    const cancelledBookings = await Booking.countDocuments({ status: "cancelled" });

    // 3. Revenue (assuming each booking has a `totalAmount` and `vendorId`)
    const bookings = await Booking.find();

    let totalVendorRevenue = 0;
    let totalAdminRevenue = 0;

    for (const booking of bookings) {
      const commission = await Commission.findOne({ vendorId: booking.vendorId });
      const commissionRate = commission ? commission.commissionPercentage : 50;

      const vendorShare = booking.totalAmount * ((100 - commissionRate) / 100);
      const adminShare = booking.totalAmount * (commissionRate / 100);

      totalVendorRevenue += vendorShare;
      totalAdminRevenue += adminShare;
    }

    res.status(200).json({
      success: true,
      totals: {
        users: totalUsers,
        vendors: totalVendors,
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },
        revenue: {
          totalVendorRevenue,
          totalAdminRevenue,
          totalRevenue: totalVendorRevenue + totalAdminRevenue,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

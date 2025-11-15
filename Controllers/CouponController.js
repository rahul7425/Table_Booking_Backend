const Coupon = require("../Models/CouponModel");
const path = require("path");
const fs = require("fs");

exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      expiryDate,
      minOrderValue,
      maxUsePerDay,
      isActive,
      business_id,
    } = req.body;

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    let couponImage = null;
    if (req.file) {
      couponImage = req.file.filename;
    }

    const coupon = new Coupon({
      code,
      description,
      discountType,
      discountValue,
      expiryDate,
      minOrderValue,
      maxUsePerDay,
      isActive,
      business_id,
      image: couponImage,
    });

    await coupon.save();

    res.status(201).json({
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCouponsByBusiness = async (req, res) => {
  try {
    const { business_id } = req.params;

    const coupons = await Coupon.find({ business_id }).sort({ createdAt: -1 });

    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCouponDetails = async (req, res) => {
  try {
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId);

    if (!coupon)
      return res.status(404).json({ message: "Coupon not found" });

    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const user_id = req.user._id;

    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon)
      return res.status(404).json({ message: "Invalid coupon code" });

    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ message: "Coupon is inactive" });
    }

    const alreadyUsed = coupon.usageHistory.some(
      (entry) => entry.user_id.toString() === user_id.toString()
    );

    if (alreadyUsed) {
      return res.status(400).json({
        message: "You have already used this coupon",
      });
    }

    res.status(200).json({
      message: "Coupon is valid",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderValue: coupon.minOrderValue,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

exports.updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    // Body se data nikal lo
    const {
      code,
      discountType,
      discountValue,
      expiryDate,
      isActive,
      description,
      minOrderValue,
      maxUsePerDay
    } = req.body;

    // Coupon code duplicate check (except same coupon)
    if (code && code !== coupon.code) {
      const existing = await Coupon.findOne({ code });
      if (existing) {
        return res.status(400).json({ message: "Coupon code already exists" });
      }
    }

    // Update fields
    coupon.code = code || coupon.code;
    coupon.discountType = discountType || coupon.discountType;
    coupon.discountValue = discountValue || coupon.discountValue;
    coupon.expiryDate = expiryDate || coupon.expiryDate;
    coupon.isActive = isActive ?? coupon.isActive;
    coupon.description = description || coupon.description;
    coupon.minOrderValue = minOrderValue || coupon.minOrderValue;
    coupon.maxUsePerDay = maxUsePerDay || coupon.maxUsePerDay;

    // Image update
    if (req.file) {
      // Purani image delete
      if (coupon.image) {
        const oldPath = path.join("Coupons", coupon.image);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      coupon.image = req.file.filename;
    }

    await coupon.save();

    return res.status(200).json({
      message: "Coupon updated successfully",
      coupon
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


exports.deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    // Delete image if exists
    if (coupon.image) {
      const filePath = path.join("Coupons", coupon.image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await coupon.deleteOne();

    return res.status(200).json({
      message: "Coupon deleted successfully",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};
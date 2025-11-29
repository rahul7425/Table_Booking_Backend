const Business = require("../Models/BusinessModel");
const { Item } = require("../Models/ItemModel"); // 👈 correct import
const Branch = require("../Models/BranchModel");
const Wallet = require("../Models/WalletModel");
const Commission = require("../Models/CommissionModel");
const Table = require("../Models/TableModel");
const Schedule = require("../Models/ScheduleModel");
const mongoose = require("mongoose");


const copyMenuTablesSchedules = async (vendorId, businessId, sourceBranchId, targetBranchId) => {
  // Copy MenuItems
  const menuItems = await Item.find({ businessId, branchId: sourceBranchId });
  if (menuItems && menuItems.length) {
    const clonedMenus = menuItems.map((m) => {
      const obj = m.toObject();
      delete obj._id;
      obj.businessId = businessId;
      obj.branchId = targetBranchId;
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
      return obj;
    });
    if (clonedMenus.length) await Item.insertMany(clonedMenus);
  }

  // Copy Tables
  const tables = await Table.find({ businessId, branchId: sourceBranchId });
  if (tables && tables.length) {
    const clonedTables = tables.map((t) => {
      const obj = t.toObject();
      delete obj._id;
      obj.businessId = businessId;
      obj.branchId = targetBranchId;
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
      return obj;
    });
    if (clonedTables.length) await Table.insertMany(clonedTables);
  }

  // Copy Schedules (careful: schedules reference tableIds — those tableIds changed)
  // For simplicity: only copy schedules that are not tightly coupled, or copy as-is but remove tableId reference (vendor must reassign).
  // Here we will not copy schedules because table._id mapping is required.
  // If you want schedules copy, you'll need to map old table IDs -> new table IDs after table insert (more complex).
};

exports.createBusiness = async (req, res) => {
  try {
    const vendorId = req.body.vendorId || req.user?._id; // prefer logged in vendor
    if (!vendorId) return res.status(400).json({ success: false, message: "Vendor ID required" });

    const {
      name,
      description,
      address, // can be object or stringified JSON
      isActive = true,
      defaultCommissionPercentage,
      branches,
      requestStatus = "pending", // 👈 new field
    } = req.body;

    const images = [];
    if (req.files && req.files.length) {
      req.files.forEach((f) => images.push(f.path.replace(/\\/g, "/")));
    }

    // parse address if sent as string
    let parsedAddress = address;
    if (typeof address === "string") {
      try { parsedAddress = JSON.parse(address); } catch (e) { parsedAddress = address; }
    }

    const business = new Business({
      vendorId,
      name,
      description,
      images,
      address: parsedAddress,
      isActive,
      requestStatus, // 👈 include here
      defaultCommissionPercentage: defaultCommissionPercentage || 50,
    });

    await business.save();


    // Ensure business has its own commission record (default 50%)
    const commission = await Commission.findOneAndUpdate(
      { businessId: business._id },
      {
        $setOnInsert: {
          commissionPercentage: business.defaultCommissionPercentage,
          businessId: business._id,
          vendorId: vendorId,
        },
      },
      { upsert: true, new: true }
    );

    // Link commission to business
    business.commissionId = commission._id;
    await business.save();


    // If branches provided in creation payload, create them
    if (branches && Array.isArray(branches) && branches.length) {
      for (const brRaw of branches) {
        // each brRaw may contain: name, description, address, images (or we'll map upload files)
        let brAddress = brRaw.address;
        if (typeof brAddress === "string") {
          try { brAddress = JSON.parse(brAddress); } catch (e) { /* noop */ }
        }

        // collect branch images from req if field is like branchImages[0], etc — fallback: use business images
        const branchDoc = new Branch({
          businessId: business._id,
          name: brRaw.name || business.name,
          description: brRaw.description || business.description || "",
          images: brRaw.images || [], // if you want to accept file uploads per branch, adapt route to accept fields
          address: brAddress || {},
          isActive: typeof brRaw.isActive === "boolean" ? brRaw.isActive : true,
          createdBy: vendorId,
        });  

        await branchDoc.save();

        // create wallet for this branch
        const wallet = new Wallet({ branchId: branchDoc._id, balance: 0 });
        await wallet.save();

        // attach wallet to branch and branch to business
        branchDoc.walletId = wallet._id;
        await branchDoc.save();

        business.branches.push(branchDoc._id);
      }

      await business.save();
    }

    return res.status(201).json({ success: true, message: "Business created", data: business });
  } catch (error) {
    console.error("createBusiness error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// default commission ko update karne ka controller
exports.updateCommission = async (req, res) => {
  try {
    const { businessId, commissionPercentage } = req.body;

    // Validate Input 
    if (!businessId || commissionPercentage == null) {
      return res
        .status(400)
        .json({ message: "businessId and commissionPercentage are required" });
    }

    if (commissionPercentage < 0 || commissionPercentage > 100) {
      return res
        .status(400)
        .json({ message: "Commission must be between 0 and 100" });
    }

    // Find Business
    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }

    // Update or Create Commission Record
    const updatedCommission = await Commission.findOneAndUpdate(
      { businessId },
      { commissionPercentage, businessId },
      { upsert: true, new: true }
    );

    // Update Business field
    business.commissionId = updatedCommission._id;
    business.defaultCommissionPercentage = commissionPercentage; // <--- FIX HERE
    await business.save();

    return res.status(200).json({
      success: true,
      message: `Commission updated to ${commissionPercentage}% for business`,
      data: {
        businessId,
        commissionPercentage,
        commissionRecord: updatedCommission,
      },
    });
  } catch (error) {
    console.error("updateCommission error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.addBranch = async (req, res) => {
  try {
    const vendorId = req.user?._id || req.body.vendorId;
    const { businessId } = req.params;
    if (!businessId) return res.status(400).json({ message: "businessId param required" });

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: "Business not found" });

    // branch fields may be in body; images in req.files
    const { name, description, address, sameAsBranchId } = req.body;
    let parsedAddress = address;
    if (typeof address === "string") {
      try { parsedAddress = JSON.parse(address); } catch (e) { parsedAddress = address; }
    }

    // images from upload
    const images = [];
    if (req.files && req.files.length) req.files.forEach((f) => images.push(f.path));

    const branch = new Branch({
      businessId: business._id,
      name: name || business.name,
      description,
      images,
      address: parsedAddress,
      isActive: true,
      createdBy: vendorId,
      meta: {
        sameMenuAsOtherBranch: !!sameAsBranchId,
        copiedFromBranchId: sameAsBranchId || null,
      },
    });

    await branch.save();

    // create wallet for branch
    // const wallet = new Wallet({ branchId: branch._id, balance: 0 });
    // await wallet.save();

    // branch.walletId = wallet._id;
    // await branch.save();

    // add to business
    business.branches.push(branch._id);
    await business.save();

    // If sameAsBranchId provided, copy menu & tables
    if (sameAsBranchId) {
      // validate source branch exists
      const srcBranch = await Branch.findById(sameAsBranchId);
      if (srcBranch) {
        await copyMenuTablesSchedules(vendorId, business._id, sameAsBranchId, branch._id);
      }
    }

    return res.status(201).json({ success: true, message: "Branch added", data: branch });
  } catch (error) {
    console.error("addBranch error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};



// Branch update controller
exports.updateBranch = async (req, res) => {
  try {
    const vendorId = req.user?._id || req.body.vendorId;
    const { businessId, branchId } = req.params;

    if (!businessId || !branchId) {
      return res
        .status(400)
        .json({ success: false, message: "businessId and branchId are required" });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    }

    if (branch.businessId.toString() !== businessId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Branch does not belong to this business",
      });
    }

    const { name, description, address, isActive, plotNo, street, nearbyPlaces, area, city, state, pincode } = req.body;

    let parsedAddress = address;

    // 1️⃣ Agar `address` diya hai (object ya string), use lo
    if (typeof parsedAddress === "string") {
      try { parsedAddress = JSON.parse(parsedAddress); } catch (e) {}
    }

    // 2️⃣ Agar flat fields aaye hain (plotNo, street, city...), to unse address banao
    const addressFromFlat = {};
    if (plotNo) addressFromFlat.plotNo = plotNo;
    if (street) addressFromFlat.street = street;
    if (nearbyPlaces) addressFromFlat.nearbyPlaces = nearbyPlaces;
    if (area) addressFromFlat.area = area;
    if (city) addressFromFlat.city = city;
    if (state) addressFromFlat.state = state;
    if (pincode) addressFromFlat.pincode = pincode;

    // agar addressFromFlat me kuch hai to use override kar do
    if (Object.keys(addressFromFlat).length > 0) {
      parsedAddress = { ...(branch.address?.toObject?.() || branch.address || {}), ...addressFromFlat };
    }

    const updateData = {};

    if (typeof name !== "undefined") updateData.name = name;
    if (typeof description !== "undefined") updateData.description = description;
    if (typeof parsedAddress !== "undefined") updateData.address = parsedAddress;
    if (typeof isActive !== "undefined") updateData.isActive = isActive;

    if (req.files && req.files.length) {
      updateData.images = req.files.map((f) => f.path);
    }

    if (vendorId) {
      updateData.createdBy = vendorId;
    }

    const updatedBranch = await Branch.findByIdAndUpdate(
      branchId,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Branch updated",
      data: updatedBranch,
    });
  } catch (error) {
    console.error("updateBranch error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};


exports.updateBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!businessId) return res.status(400).json({ message: "businessId param required" });

    const updateData = { ...req.body };

    // handle images
    if (req.files && req.files.length) {
      updateData.images = req.files.map((f) => f.path);
    }

    if (updateData.address && typeof updateData.address === "string") {
      try { updateData.address = JSON.parse(updateData.address); } catch (e) { }
    }

    const updated = await Business.findByIdAndUpdate(businessId, updateData, { new: true });
    return res.status(200).json({ success: true, message: "Business updated", data: updated });
  } catch (error) {
    console.error("updateBusiness error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getBusinessById = async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!businessId)
      return res.status(400).json({ message: "businessId param required" });

    const business = await Business.findById(businessId)
      .populate("categories")
      .populate("menuItems")
      .populate("tables")
      .populate("schedules")
      .populate({
        path: "branches",
        populate: { path: "walletId", model: "Wallet" },
      })
      .populate({
        path: "reviews", // 👈 Add this
        populate: {
          path: "userId", // 👈 Assuming each review has userId
          select: "name email profileImage", // optional — only select needed fields
        },
      });

    if (!business)
      return res.status(404).json({ message: "Business not found" });

    return res.status(200).json({ success: true, data: business });
  } catch (error) {
    console.error("getBusinessById error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getBusinesses = async (req, res) => {
  try {
    const {
      // req.body से vendorId को हटा दें या उसका उपयोग केवल Admin के लिए करें
      vendorId, 
      page = 1,
      limit = 20,
      businessName,
      menuItemName,
      category,
      area,
      street,
      pincode,
      minRate,
      maxRate,
      nearby,
      topRated,
      activeOnly,
      requestStatus, 
    } = req.body;

    let filter = {};

    // 💡 Role and User ID from Request (Authentication Middleware से प्राप्त)
    const userRole = req.user?.role;
    const currentUserId = req.user?._id; 

    // --- 🔹 Role-based Business Filter (नया/संशोधित लॉजिक) ---
    if (userRole === 'vendor' && currentUserId) {
      // ✅ VENDOR: केवल अपने vendorId से जुड़े बिज़नेस दिखाएं
      filter.vendorId = currentUserId;
    } else if (userRole === 'admin' && vendorId) {
      // ✅ ADMIN: अगर req.body में vendorId दिया गया है, तो उसे फ़िल्टर करें
      filter.vendorId = vendorId;
    }
    // Note: अगर userRole 'admin' है और vendorId नहीं दिया गया है, तो सभी बिज़नेस दिखेंगे
    // -------------------------------------------------------------------

    // 🔹 Active business filter
    if (activeOnly) filter.isActive = true;

    // 🔹 Search by Business Name
    if (businessName) {
      filter.name = { $regex: businessName, $options: "i" };
    }

    // 🔹 Location-based filters
    if (area) filter["address.area"] = { $regex: area, $options: "i" };
    if (street) filter["address.street"] = { $regex: street, $options: "i" };
    if (pincode) filter["address.pincode"] = pincode;

    // 🔹 Rating Filter (Top Rated Businesses)
    if (topRated) {
      filter.averageRating = { $gte: 2 }; 
    }

    // ✅ New Filter
    if (requestStatus) {
      filter.requestStatus = requestStatus; // e.g. pending / approved / denied
    }

    // 🔹 Menu Filters (Price Range + Item Name + Category)
    let menuBusinessIds = [];

    if (minRate || maxRate || menuItemName || category) {
      const menuFilter = {};

      // 🔹 Price Filter
      if (minRate || maxRate) {
        menuFilter.price = {};
        if (minRate) menuFilter.price.$gte = Number(minRate);
        if (maxRate) menuFilter.price.$lte = Number(maxRate);
      }

      // 🔹 Menu Item Name Filter
      if (menuItemName)
        menuFilter.name = { $regex: menuItemName, $options: "i" };

      // 🔹 Category Filter
      if (category)
        menuFilter.category = { $regex: category, $options: "i" };

      // 🔹 Find Matching Menu Items
      const menus = await Item.find(menuFilter).select("businessId");
      menuBusinessIds = menus.map((m) => m.businessId);

      // 🔹 If no menus match, return empty response early
      if (menuBusinessIds.length === 0) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }

      // 🔹 Apply Business ID Filter
      filter._id = { $in: menuBusinessIds };
    }


    // 🔹 Nearby Filter (example using city or lat/lng if available)
    if (nearby && nearby.city) {
      filter["address.city"] = { $regex: nearby.city, $options: "i" };
    }

    // 🔹 Execute Query with Pagination
    const businesses = await Business.find(filter)
      .sort(topRated ? { rating: -1 } : { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("categories")
      .populate("menuItems")
      .populate("tables")
      .populate("schedules")
      .populate({
        path: "branches",
        populate: { path: "walletId", model: "Wallet" },
      })
      .populate({
        path: "reviews",
        populate: {
          path: "userId",
          select: "name email profileImage",
        },
      });

    const count = await Business.countDocuments(filter);

    res.status(200).json({
      success: true,
      count,
      data: businesses,
    });
  } catch (error) {
    console.error("getBusinesses error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!businessId) return res.status(400).json({ message: "businessId param required" });

    // optional: also delete branches, wallets, and related menu/table/schedules
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: "Business not found" });

    // delete related branches and wallets
    for (const brId of business.branches) {
      await Wallet.deleteOne({ branchId: brId });
      await Branch.findByIdAndDelete(brId);
      // optionally: delete MenuItem/Table/Schedule for that branch
      await Item.deleteMany({ businessId: business._id, branchId: brId });
      await Table.deleteMany({ businessId: business._id, branchId: brId });
      await Schedule.deleteMany({ businessId: business._id, branchId: brId });
    }

    await Business.findByIdAndDelete(businessId);
    return res.status(200).json({ success: true, message: "Business deleted" });
  } catch (error) {
    console.error("deleteBusiness error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.toggleStatus = async (req, res) => {
  try {
    const { type, id } = req.params; // type = business OR branch
    const vendorId = req.user?._id || req.body.vendorId;

    let record, modelName;

    if (type === "business") {
      record = await Business.findById(id);   // ✅ FIXED
      modelName = "Business";
    } else if (type === "branch") {
      record = await Branch.findById(id).populate("businessId");
      modelName = "Branch";
    } else {
      return res.status(400).json({ message: "Invalid type parameter" });
    }

    if (!record) return res.status(404).json({ message: `${modelName} not found` });

    // ✅ Ensure vendor owns it
    const ownerId =
      type === "business"
        ? record.vendorId
        : record.businessId?.vendorId;

    if (String(ownerId) !== String(vendorId)) {
      return res.status(403).json({ message: `You are not owner of this ${modelName}` });
    }

    // ✅ Toggle status
    record.isActive = !record.isActive;
    await record.save();

    res.status(200).json({
      success: true,
      type,
      message: `${modelName} is now ${record.isActive ? "Active" : "Inactive"}`,
      status: record.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateBusinessStatus = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status } = req.body; // expected: "approved" | "pending" | "denied"

    if (!["approved", "pending", "denied"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: "Business not found" });

    business.requestStatus = status;
    await business.save();

    res.status(200).json({
      success: true,
      message: `Business status updated to ${status}`,
      data: business,
    });
  } catch (error) {
    console.error("updateBusinessStatus error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const MenuItem = require("../Models/MenuModel");


exports.createMenuItem = async (req, res) => {
  try {
    const { businessId, branchId, category, subCategory, name, description, price, tag } = req.body;

    if (!businessId || !branchId || !category || !subCategory || !name || !price) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const image = req.file ? req.file.path : null;

    const menuItem = await MenuItem.create({
      businessId,
      branchId,
      category,
      subCategory,
      name,
      description,
      price,
      image,
      tag,
    });

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: menuItem,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get All Menu Items (Public)
exports.getAllMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
 
// ✅ Get Menu Item by ID (Public)
exports.getMenuItemById = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update Menu Item (Vendor Only)
exports.updateMenuItem = async (req, res) => {
  try {
    const updateData = req.body;
    if (req.file) updateData.image = req.file.path;

    const updatedItem = await MenuItem.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedItem) return res.status(404).json({ message: "Item not found" });

    res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete Menu Item (Vendor Only)
exports.deleteMenuItem = async (req, res) => {
  try {
    const deleted = await MenuItem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Item not found" });

    res.status(200).json({ success: true, message: "Menu item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get All Tags (Public)
exports.getAllTags = async (req, res) => {
  try {
    const tags = await MenuItem.distinct("tag");
    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getItemsByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const items = await MenuItem.find({ tag: { $regex: new RegExp(tag, "i") } });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.filterMenuItems = async (req, res) => {
  try {
    const { category, subCategory, tag } = req.query;

    let filter = {};

    if (category) filter.category = { $regex: new RegExp(category, "i") };
    if (subCategory) filter.subCategory = { $regex: new RegExp(subCategory, "i") };
    if (tag) filter.tag = { $regex: new RegExp(tag, "i") };

    const items = await MenuItem.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      filtersUsed: { category, subCategory, tag },
      data: items,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
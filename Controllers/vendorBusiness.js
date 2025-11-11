const Category = require("../Models/CategoryModel");
const MenuItem = require("../Models/MenuModel");
const Table = require("../Models/TableModel");
const Schedule = require("../Models/ScheduleModel");

const models = { Category, MenuItem, Table, Schedule };

const getModel = (modelName) => {
  const SelectedModel = models[modelName];
  if (!SelectedModel) throw new Error("Invalid model name");
  return SelectedModel;
};

const createBusinessData = async (req, res) => {
  try {
    const { model } = req.body;
    const SelectedModel = getModel(model);
    const payload = { ...req.body };

    // ✅ Handle single or multiple images
    if (req.files && req.files.length > 0) {
      payload.images = req.files.map((file) => file.path);
    } else if (req.file) {
      payload.image = req.file.path;
    }

    delete payload.model;

    const newItem = new SelectedModel(payload);
    await newItem.save();

    res.status(201).json({
      success: true,
      message: `${model} created successfully`,
      data: newItem,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBusinessData = async (req, res) => {
  try {
    const { model, id, ...updateData } = req.body;
    const SelectedModel = getModel(model);

    if (!id) return res.status(400).json({ message: "Missing document id" });

    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map((file) => file.path);
    } else if (req.file) {
      updateData.image = req.file.path;
    }

    const updated = await SelectedModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.status(200).json({
      success: true,
      message: `${model} updated successfully`,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteBusinessData = async (req, res) => {
  try {
    const { model, id } = req.body;
    const SelectedModel = getModel(model);

    if (!id) return res.status(400).json({ message: "Missing document id" });

    await SelectedModel.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: `${model} deleted successfully`,
    });
  } catch (error) {
    console.error("Error in deleteBusinessData:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllBusinessData = async (req, res) => {
  try {
    const { model, businessId, branchId } = req.body;
    const SelectedModel = getModel(model);

    const filter = {};
    if (businessId) filter.businessId = businessId;
    if (branchId) filter.branchId = branchId;

    const data = await SelectedModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error in getAllBusinessData:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getByIdBusinessData = async (req, res) => {
  try {
    const { model, id } = req.body;
    const SelectedModel = getModel(model);

    if (!id) return res.status(400).json({ message: "Missing document id" });

    const data = await SelectedModel.findById(id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getByIdBusinessData:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getByVendorBusinessData = async (req, res) => {
  try {
    const { model, branchId } = req.body;
    const SelectedModel = getModel(model);

    const vendorId = req.vendor._id; // from middleware
    const filter = { vendorId };
    if (branchId) filter.branchId = branchId;

    const data = await SelectedModel.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error in getByVendorBusinessData:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBusinessData,
  updateBusinessData,
  deleteBusinessData,
  getAllBusinessData,
  getByIdBusinessData,
  getByVendorBusinessData,
};

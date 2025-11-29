const Category = require("../Models/CategoryModel");
const Item = require("../Models/ItemModel");
const Table = require("../Models/TableModel");
const Schedule = require("../Models/ScheduleModel");
const Business = require("../Models/BusinessModel");
const User = require('../Models/UserModel');

const models = { Category, Item: Item.Item, Table, Schedule };

const businessFieldMap = {
  Category: "categories",
  Item: "menuItems",
  Table: "tables",
  Schedule: "schedules",
};

const getModel = (modelName) => {
  const SelectedModel = models[modelName];
  if (!SelectedModel) throw new Error("Invalid model name");
  return SelectedModel;
};

// ✅ CREATE
const createBusinessData = async (req, res) => {
  
  try {
    const { model } = req.body;
    const SelectedModel = getModel(model);
    const payload = { ...req.body };

    // ✅ handle file upload
    if (req.files && req.files.length > 0) {
      payload.images = req.files.map((f) => f.path.replace(/\\/g, "/"));
    } else if (req.file) {
      payload.image = req.file.path.replace(/\\/g, "/");
    }

    // vendor from middleware
    if (req.vendor && req.vendor._id) {
      payload.vendorId = req.vendor._id;
    }

    delete payload.model;

    const newItem = new SelectedModel(payload);
    await newItem.save();

    // ✅ auto-link with Business
    if (payload.businessId && businessFieldMap[model]) {
      await Business.findByIdAndUpdate(payload.businessId, {
        $push: { [businessFieldMap[model]]: newItem._id },
      });
    }

    res.status(201).json({
      success: true,
      message: `${model} created successfully`,
      data: newItem,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ✅ UPDATE
const updateBusinessData = async (req, res) => {
  try {
    const { model, id, ...updateData } = req.body;
    const SelectedModel = getModel(model);
    if (!id) return res.status(400).json({ message: "Missing document id" });

    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map((f) => f.path.replace(/\\/g, "/"));
    } else if (req.file) {
      updateData.image = req.file.path.replace(/\\/g, "/");
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

// ✅ DELETE
const deleteBusinessData = async (req, res) => {
  try {
    const { model, id } = req.body;
    const SelectedModel = getModel(model);
    if (!id) return res.status(400).json({ message: "Missing document id" });

    await SelectedModel.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: `${model} deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ GET ALL
// const getAllBusinessData = async (req, res) => {
//   try {
//     const { model, businessId, branchId, type } = req.body;
//     const SelectedModel = getModel(model);

//     const filter = {};
//     if (businessId) filter.businessId = businessId;
//     if (branchId) filter.branchId = branchId;
//     if (type) filter.type = type; // filter by food/drink

//     const data = await SelectedModel.find(filter).sort({ createdAt: -1 });
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

const populateMap = {
  Schedule: [
    { path: "businessId", select: "name email phone" },
    { path: "branchId" },
    { path: "tableId" },
    { path: "slotSetId" }
  ],
  Table: [
    { path: "businessId" },
    { path: "branchId" }
  ],
  Item: [
    { path: "businessId" },
    { path: "branchId" }
  ]
};

// ✅ GET ALL
const getBusinessIdForUser = async (userId) => {
  try {
      const user = await User.findById(userId).select('role');         
      if (!user || user.role !== 'vendor') {
          return null;
      }
      const business = await Business.findOne({ vendorId: userId }).select('_id');
      if (business) {
          return business._id;
      }
      return null;         
  } catch (error) {
      console.error("Error fetching business ID for user:", error);
      return null;
  }
};
const getAllBusinessData = async (req, res) => {
    const user = req.user; 
    
    try {
        const { model, businessId, branchId, type } = req.body;
        const SelectedModel = getModel(model);

        const filter = {};
        if (businessId) filter.businessId = businessId;
        if (branchId) filter.branchId = branchId;
        if (type) filter.type = type;

        if (user.role === 'vendor') {
            const vendorBusinessId = await getBusinessIdForUser(user._id);            
            if (vendorBusinessId) {
                filter.businessId = vendorBusinessId; 
                if (businessId && String(businessId) !== String(vendorBusinessId)) {
                    return res.status(403).json({ 
                        success: false, 
                        message: "Unauthorized access to this business data." 
                    });
                }
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }
        
        let query = SelectedModel.find(filter).sort({ createdAt: -1 });
        
        // Apply populate dynamically
        if (populateMap[model]) {
            populateMap[model].forEach(pop => {
                query = query.populate(pop);
            });
        }

        const data = await query;
        res.status(200).json({ success: true, count: data.length, data});
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



// ✅ GET BY ID
const getByIdBusinessData = async (req, res) => {
  try {
    const { model, id } = req.body;
    const SelectedModel = getModel(model);
    if (!id) return res.status(400).json({ message: "Missing document id" });

    const data = await SelectedModel.findById(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ GET BY VENDOR
const getByVendorBusinessData = async (req, res) => {
  try {
    const { model, branchId, type } = req.body;
    const SelectedModel = getModel(model);

    const vendorId = req.vendor._id;
    const filter = { vendorId };
    if (branchId) filter.branchId = branchId;
    if (type) filter.type = type;

    const data = await SelectedModel.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

// const Category = require("../Models/CategoryModel");
// const MenuItem = require("../Models/MenuModel");
// const Table = require("../Models/TableModel");
// const Schedule = require("../Models/ScheduleModel");
// const Business = require("../Models/BusinessModel");

// const models = { Category, MenuItem, Table, Schedule };

// // Map models to Business array fields
// const businessFieldMap = {
//   Category: "categories",
//   MenuItem: "menuItems",
//   Table: "tables",
//   Schedule: "schedules",
// };


// const getModel = (modelName) => {
//   const SelectedModel = models[modelName];
//   if (!SelectedModel) throw new Error("Invalid model name");
//   return SelectedModel;
// };

// const createBusinessData = async (req, res) => {
//   try {
//     const { model } = req.body;
//     const SelectedModel = getModel(model);
//     const payload = { ...req.body };

//     // ✅ Handle single or multiple images
//     if (req.files && req.files.length > 0) {
//       payload.images = req.files.map((file) => file.path.replace(/\\/g, "/"));
//     } else if (req.file) {
//       payload.image = req.file.path.replace(/\\/g, "/");
//     }

//     delete payload.model;

//     const newItem = new SelectedModel(payload);
//     await newItem.save();

//     // ✅ AUTO PUSH TO BUSINESS DOCUMENT
//     if (payload.businessId && businessFieldMap[model]) {
//       await Business.findByIdAndUpdate(payload.businessId, {
//         $push: { [businessFieldMap[model]]: newItem._id }
//       });
//     }

//     res.status(201).json({
//       success: true,
//       message: `${model} created successfully`,
//       data: newItem,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// const updateBusinessData = async (req, res) => {
//   try {
//     const { model, id, ...updateData } = req.body;
//     const SelectedModel = getModel(model);

//     if (!id) return res.status(400).json({ message: "Missing document id" });

//     if (req.files && req.files.length > 0) {
//       updateData.images = req.files.map((file) => file.path);
//     } else if (req.file) {
//       updateData.image = req.file.path;
//     }

//     const updated = await SelectedModel.findByIdAndUpdate(id, updateData, {
//       new: true,
//     });

//     res.status(200).json({
//       success: true,
//       message: `${model} updated successfully`,
//       data: updated,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// const deleteBusinessData = async (req, res) => {
//   try {
//     const { model, id } = req.body;
//     const SelectedModel = getModel(model);

//     if (!id) return res.status(400).json({ message: "Missing document id" });

//     await SelectedModel.findByIdAndDelete(id);
//     return res.status(200).json({
//       success: true,
//       message: `${model} deleted successfully`,
//     });
//   } catch (error) {
//     console.error("Error in deleteBusinessData:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// const getAllBusinessData = async (req, res) => {
//   try {
//     const { model, businessId, branchId } = req.body;
//     const SelectedModel = getModel(model);

//     const filter = {};
//     if (businessId) filter.businessId = businessId;
//     if (branchId) filter.branchId = branchId;

//     const data = await SelectedModel.find(filter).sort({ createdAt: -1 });

//     return res.status(200).json({
//       success: true,
//       count: data.length,
//       data,
//     });
//   } catch (error) {
//     console.error("Error in getAllBusinessData:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// const getByIdBusinessData = async (req, res) => {
//   try {
//     const { model, id } = req.body;
//     const SelectedModel = getModel(model);

//     if (!id) return res.status(400).json({ message: "Missing document id" });

//     const data = await SelectedModel.findById(id);
//     return res.status(200).json({
//       success: true,
//       data,
//     });
//   } catch (error) {
//     console.error("Error in getByIdBusinessData:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// const getByVendorBusinessData = async (req, res) => {
//   try {
//     const { model, branchId } = req.body;
//     const SelectedModel = getModel(model);

//     const vendorId = req.vendor._id; // from middleware
//     const filter = { vendorId };
//     if (branchId) filter.branchId = branchId;

//     const data = await SelectedModel.find(filter).sort({ createdAt: -1 });
//     return res.status(200).json({
//       success: true,
//       count: data.length,
//       data,
//     });
//   } catch (error) {
//     console.error("Error in getByVendorBusinessData:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// module.exports = {
//   createBusinessData,
//   updateBusinessData,
//   deleteBusinessData,
//   getAllBusinessData,
//   getByIdBusinessData,
//   getByVendorBusinessData,
// };

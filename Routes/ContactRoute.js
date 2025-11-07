const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware");
const {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
} = require("../Controllers/Contact");

router.post("/create", protect, createContact);
router.get("/all", protect, authorizeRoles("admin"), getAllContacts);
router.get("/:id", protect, authorizeRoles("admin"), getContactById);
router.put("/:id", protect, authorizeRoles("admin"), updateContact);
router.delete("/:id", protect, authorizeRoles("admin"), deleteContact);

module.exports = router;

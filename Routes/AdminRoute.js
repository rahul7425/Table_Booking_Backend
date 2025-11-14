const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware");
const {
  setCommission,    
  getAllCommissions,
  getDashboardTotals,
} = require("../Controllers/Admin");

// All admin routes are protected and only accessible by admin
router.post("/set-commission", protect, authorizeRoles("admin"), setCommission);
router.get("/commissions", protect, authorizeRoles("admin"), getAllCommissions);
router.get("/dashboard", protect, authorizeRoles("admin","vendor"), getDashboardTotals);

module.exports = router;

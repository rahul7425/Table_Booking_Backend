// routes/commentRoutes.js
const express = require("express");
const router = express.Router();

const {
  createComment,
  getCommentsByBlog,
  getCommentById,
  deleteComment,
  approveComment,
  replyToComment,
  listAllComments,
} = require("../Controllers/commentController");

const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware");

// Create comment for a blog (protected: any authenticated user)
router.post("/blog/:blogId", protect, createComment);

// Get comments for a blog (public, default returns approved only)
router.get("/blog/:blogId", getCommentsByBlog);

// Get single comment by id (public)
router.get("/:id", getCommentById);

// Admin: list all comments (optionally ?blogId=)
router.get("/", protect, authorizeRoles("admin"), listAllComments);

// Admin: approve/unapprove comment
router.put("/:id/approve", protect, authorizeRoles("admin"), approveComment);

// Admin: reply
router.post("/:id/reply", protect, authorizeRoles("admin"), replyToComment);

// Admin: delete comment
router.delete("/:id", protect, authorizeRoles("admin"), deleteComment);

module.exports = router;

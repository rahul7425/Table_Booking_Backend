// controllers/commentController.js
const Comment = require("../Models/Comment");
const Blog = require("../Models/Blog");
const mongoose = require("mongoose");

// Create a comment for a blog (protected - user or admin)
exports.createComment = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { name, email, message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      return res.status(400).json({ message: "Invalid blog id" });
    }

    const blog = await Blog.findById(blogId);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    if (!name || !message) {
      return res.status(400).json({ message: "Name and message are required" });
    }

    const commentData = {
      blog: blogId,
      name,
      email: email || "",
      message,
      approved: false,
    };

    // if user is authenticated, attach userId
    if (req.user && req.user.id) commentData.userId = req.user.id;

    const comment = new Comment(commentData);
    await comment.save();

    return res.status(201).json({ message: "Comment created, awaiting approval", comment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get comments for a blog. Public endpoint returns only approved by default.
// Query param: approved=true/false/all (default: true)
exports.getCommentsByBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      return res.status(400).json({ message: "Invalid blog id" });
    }

    const q = (req.query.approved || "true").toLowerCase();

    let filter = { blog: blogId };
    if (q === "true") filter.approved = true;
    else if (q === "false") filter.approved = false;
    // if q === 'all' then no approved filter (admin use)

    const comments = await Comment.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({ comments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get single comment by id
exports.getCommentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

    const comment = await Comment.findById(id).lean();
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    return res.json({ comment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: delete comment
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    await Comment.findByIdAndDelete(id);

    return res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: approve (or unapprove) comment
exports.approveComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { approve } = req.body; // boolean true/false (optional) ; default to true
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.approved = approve === undefined ? true : !!approve;
    await comment.save();

    return res.json({ message: `Comment ${comment.approved ? "approved" : "unapproved"}`, comment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: reply to a comment (adds a reply entry)
exports.replyToComment = async (req, res) => {
  try {
    const { id } = req.params; // comment id
    const { message } = req.body;

    if (!message) return res.status(400).json({ message: "Reply message is required" });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = {
      message,
      author: req.user && req.user.name ? req.user.name : "Admin",
      authorId: req.user && req.user.id ? req.user.id : undefined,
      byAdmin: true,
      createdAt: new Date(),
    };

    comment.replies.push(reply);
    await comment.save();

    return res.json({ message: "Reply added", comment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: list all comments (optionally filter by blog)
exports.listAllComments = async (req, res) => {
  try {
    const { blogId } = req.query;
    const filter = {};
    if (blogId && mongoose.Types.ObjectId.isValid(blogId)) filter.blog = blogId;

    const comments = await Comment.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({ comments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createComment: exports.createComment,
  getCommentsByBlog: exports.getCommentsByBlog,
  getCommentById: exports.getCommentById,
  deleteComment: exports.deleteComment,
  approveComment: exports.approveComment,
  replyToComment: exports.replyToComment,
  listAllComments: exports.listAllComments,
};

// models/Comment.js
const mongoose = require("mongoose");

const ReplySchema = new mongoose.Schema({
  message: { type: String, required: true },
  author: { type: String, default: "Admin" }, 
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  createdAt: { type: Date, default: Date.now },
  byAdmin: { type: Boolean, default: true },
});

const CommentSchema = new mongoose.Schema({
  blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  name: { type: String, required: true },
  email: { type: String, required: false },
  message: { type: String, required: true },
  approved: { type: Boolean, default: false },
  replies: [ReplySchema],
}, {
  timestamps: true
});

module.exports = mongoose.model("Comment", CommentSchema);

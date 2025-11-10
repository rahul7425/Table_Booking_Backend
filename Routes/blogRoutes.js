// routes/blogRoutes.js
const express = require("express");
const router = express.Router();
const upload = require("../Middleware/UploadMiddleware");
const {
  createBlog,
  listBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
} = require("../Controllers/blogController");

const setUploadType = (type) => (req, res, next) => {
  req.uploadType = type;
  next();
};

router.post(
  "/",
  setUploadType("blog"),
  upload.single("image"),
  createBlog
);

// List blogs paginated
router.get("/", listBlogs);

// Get single by slug or id
router.get("/:slugOrId", getBlog);

// Update blog (allow replacing image)
router.put(
  "/:id",
  setUploadType("blog"),
  upload.single("image"),
  updateBlog
);

// Delete
router.delete("/:id", deleteBlog);

module.exports = router;

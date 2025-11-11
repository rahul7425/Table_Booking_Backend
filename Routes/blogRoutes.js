// // routes/blogRoutes.js
// const express = require("express");
// const router = express.Router();
// const upload = require("../Middleware/UploadMiddleware");
// const {
//   createBlog,
//   listBlogs,
//   getBlog,
//   updateBlog,
//   deleteBlog,
// } = require("../Controllers/blogController");

// const setUploadType = (type) => (req, res, next) => {
//   req.uploadType = type;
//   next();
// };

// router.post(
//   "/",
//   setUploadType("blog"),
//   upload.single("image"),
//   createBlog
// );

// // List blogs paginated
// router.get("/", listBlogs);

// // Get single by slug or id
// router.get("/:slugOrId", getBlog);

// // Update blog (allow replacing image)
// router.put(
//   "/:id",
//   setUploadType("blog"),
//   upload.single("image"),
//   updateBlog
// );

// // Delete
// router.delete("/:id", deleteBlog);

// module.exports = router;





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

const { protect, authorizeRoles } = require("../Middleware/AuthMiddleware");

const setUploadType = (type) => (req, res, next) => {
  req.uploadType = type;
  next();
};

// Create (admin only)
router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  setUploadType("blog"),
  upload.single("image"),
  createBlog
);

// List blogs paginated (public)
router.get("/", listBlogs);

// Get single by slug or id (public)
router.get("/:slugOrId", getBlog);

// Update blog (admin only)
router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  setUploadType("blog"),
  upload.single("image"),
  updateBlog
);

// Delete (admin only)
router.delete("/:id", protect, authorizeRoles("admin"), deleteBlog);

module.exports = router;

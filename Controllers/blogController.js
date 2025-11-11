// controllers/blogController.js
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Blog = require("../Models/Blog");
const slugify = require("slugify");

// helper: delete file if exists
const deleteFileIfExists = (filePath) => {
  try {
    if (!filePath) return;
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch (err) {
    console.error("Error deleting file:", err);
  }
};

// CREATE blog
// exports.createBlog = async (req, res) => {
//   try {
//     const { title, description, content, slug: providedSlug, author } = req.body;

//     if (!title) return res.status(400).json({ message: "Title is required" });

//     // generate slug
//     let slug = providedSlug ? slugify(providedSlug, { lower: true, strict: true }) : slugify(title, { lower: true, strict: true });

//     // Make unique slug if exists
//     let slugCandidate = slug;
//     let i = 1;
//     while (await Blog.findOne({ slug: slugCandidate })) {
//       slugCandidate = `${slug}-${i++}`;
//     }
//     slug = slugCandidate;

//     const blogData = {
//       title,
//       slug,
//       description,
//       content,
//       author,
//     };

//    if (req.file) {
//       blogData.image = `uploads/blogs/${req.file.filename}`;
//     }

//     const blog = new Blog(blogData);
//     await blog.save();

//     return res.status(201).json({ message: "Blog created", blog });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// CREATE blog

exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      slug: providedSlug,
      author,
      meta_keywords,
      meta_description,
    } = req.body;

    if (!title) return res.status(400).json({ message: "Title is required" });

    // ✅ Generate slug
    let slug = providedSlug
      ? slugify(providedSlug, { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });

    // ✅ Make slug unique
    let slugCandidate = slug;
    let i = 1;
    while (await Blog.findOne({ slug: slugCandidate })) {
      slugCandidate = `${slug}-${i++}`;
    }
    slug = slugCandidate;

    // ✅ Convert comma-separated keywords string → array
    let keywordsArray = [];
    if (meta_keywords) {
      keywordsArray = meta_keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    }

    const blogData = {
      title,
      slug,
      description,
      content,
      author,
      meta: {
        keywords: keywordsArray,
        description: meta_description || "",
      },
    };

    // ✅ Save image
    if (req.file) {
      blogData.image = `uploads/blogs/${req.file.filename}`;
    }

    const blog = new Blog(blogData);
    await blog.save();

    return res.status(201).json({ message: "Blog created", blog });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


// LIST blogs (paginated) — page param (1-indexed), limit default 3
exports.listBlogs = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    if (page < 1) page = 1;
    const limit = parseInt(req.query.limit, 10) || 3; // default 3 per request
    const skip = (page - 1) * limit;

    // optional: allow search by title or tag
    const q = req.query.q ? req.query.q.trim() : null;
    const filter = {};
    if (q) filter.$or = [
      { title: new RegExp(q, "i") },
      { description: new RegExp(q, "i") },
      { content: new RegExp(q, "i") }
    ];

    const [total, blogs] = await Promise.all([
      Blog.countDocuments(filter),
      Blog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title slug description image createdAt author") // list fields
        .lean()
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      blogs,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET single blog by slug (or id fallback)
exports.getBlog = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const query = mongooseIdCheck(slugOrId) ? { _id: slugOrId } : { slug: slugOrId };
    const blog = await Blog.findOne(query).lean();
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    return res.json({ blog });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// UPDATE blog (supports replacing image)
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, slug: newSlug, author } = req.body;
    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    if (title) blog.title = title;
    if (description !== undefined) blog.description = description;
    if (content !== undefined) blog.content = content;
    if (author !== undefined) blog.author = author;

    if (newSlug) {
      const candidate = slugify(newSlug, { lower: true, strict: true });
      if (candidate !== blog.slug) {
        // ensure uniqueness
        let slugCandidate = candidate;
        let i = 1;
        while (await Blog.findOne({ slug: slugCandidate, _id: { $ne: id } })) {
          slugCandidate = `${candidate}-${i++}`;
        }
        blog.slug = slugCandidate;
      }
    } else if (title && !newSlug) {
      // optionally update slug on title change (comment/uncomment as per preference)
      // const candidate = slugify(title, { lower: true, strict: true });
      // blog.slug = candidate; // careful about uniqueness
    }

   if (req.file) {
      if (blog.image) fs.unlink(blog.image, () => {});
      blog.image = `uploads/blogs/${req.file.filename}`;
    }

    await blog.save();
    return res.json({ message: "Blog updated", blog });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE blog
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Delete image file
    if (blog.image) deleteFileIfExists(blog.image);

    // ✅ Correct way to delete in Mongoose v7+
    await Blog.findByIdAndDelete(id);

    return res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


// utility to check if param looks like a mongoose id
function mongooseIdCheck(val) {
  return /^[0-9a-fA-F]{24}$/.test(val);
}

module.exports = {
  createBlog: exports.createBlog,
  listBlogs: exports.listBlogs,
  getBlog: exports.getBlog,
  updateBlog: exports.updateBlog,
  deleteBlog: exports.deleteBlog,
};

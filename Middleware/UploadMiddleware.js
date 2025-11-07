const multer = require("multer");
const fs = require("fs");
const path = require("path");

// ✅ Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Default folder
    let folder = "uploads";

    // Check upload type
    switch (req.uploadType) {
      case "user":
        folder = "uploads/users";
        break;
      case "restaurant":
        folder = "uploads/restaurants";
        break;
      case "category":
        folder = "uploads/categories";
        break;
      case "owner":
        folder = "uploads/owners";
        break;
      default:
        folder = "uploads/others";
    }

    // ✅ Create folder if not exists
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = Date.now() + "_" + Math.round(Math.random() * 1e9) + ext;
    cb(null, fileName);
  },
});

// ✅ File filter (optional — to allow only images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

// ✅ Initialize multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5 MB
});

module.exports = upload;

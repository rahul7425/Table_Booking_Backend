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
      case "blog":  
        folder = "uploads/blogs";
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

// ✅ Sudhara Hua File filter (Added AVIF support)
const fileFilter = (req, file, cb) => {
    // Added 'avif' to allowed extensions
    const allowedExts = /jpeg|jpg|png|webp|avif/;
    
    // Explicitly checking MIME type for better reliability, including image/avif
    const allowedMimes = /image\/jpeg|image\/jpg|image\/png|image\/webp|image\/avif/;
    
    const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, WEBP, AVIF) are allowed!"));
  }
};

// ✅ Initialize multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
const express = require("express");
const router = express.Router();
const { protect } = require("../Middleware/AuthMiddleware");

const {
    createReview,
    getReviewsByBusiness,
    getTopBusinesses,
    getAllReviews,
    updateReview,
    deleteReview,
} = require("../Controllers/ReviewController");

// ✅ Create Review
router.post("/create", protect, createReview);

// ✅ Get all reviews for one business + avg rating
router.get("/business/:id", getReviewsByBusiness);

// ✅ Get Top 5 Popular Businesses
router.get("/top/businesses", getTopBusinesses);

// ✅ Get all reviews (admin)
router.get("/all", getAllReviews);


// ✅ Update own review
router.put("/:id", protect, updateReview);

// ✅ Delete own review
router.delete("/:id", protect, deleteReview);

module.exports = router;

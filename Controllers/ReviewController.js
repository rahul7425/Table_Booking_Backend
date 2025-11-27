const Review = require("../Models/ReviewModel");
const Business = require("../Models/BusinessModel");


// ✅ 1. Create Review (and Update Business Rating)
exports.createReview = async (req, res) => {
  try {
    const { businessId, foodItemId, rating, review } = req.body;

    if (!businessId || !rating || !review) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Step 1️⃣ - Create Review
    const newReview = await Review.create({
      userId: req.user._id || req.user.id,
      businessId,
      foodItemId: foodItemId || null,
      rating,
      review,
    });

    // Step 2️⃣ - Push review ID to Business
    await Business.findByIdAndUpdate(
      businessId,
      { $push: { reviews: newReview._id } },
      { new: true }
    );

    // Step 3️⃣ - Recalculate Business averageRating & totalRatings
    const allReviews = await Review.find({ businessId });
    const totalRatings = allReviews.length;
    const avgRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0) / totalRatings;

    await Business.findByIdAndUpdate(businessId, {
      averageRating: avgRating.toFixed(1),
      totalRatings,
    });

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      review: newReview,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ 2. Get all reviews by Business ID + Average Rating
exports.getReviewsByBusiness = async (req, res) => {
    try {
        const businessId = req.params.id;

        const reviews = await Review.find({ businessId })
            .populate("userId", "name email")
            .sort({ createdAt: -1 });

        // Calculate Average Rating 
        const avgRating =
            reviews.length > 0
                ? reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length
                : 0;

        res.status(200).json({
            success: true,
            totalReviews: reviews.length,
            averageRating: avgRating.toFixed(1),
            reviews,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ 3. Get Top 5 Popular Businesses (Based on Most Reviews)
// exports.getTopBusinesses = async (req, res) => {
//     try {
//         const top = await Review.aggregate([
//             {
//                 $group: {
//                     _id: "$businessId",
//                     totalReviews: { $sum: 1 },
//                     avgRating: { $avg: "$rating" },
//                 },
//             },
//             { $sort: { totalReviews: -1, avgRating: -1 } },
//             { $limit: 5 },
//         ]);

//         res.status(200).json({
//             success: true,
//             topBusinesses: top,
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

exports.getTopBusinesses = async (req, res) => {
  try {
    const top = await Review.aggregate([
      {
        $group: {
          _id: "$businessId",
          totalReviews: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
      { $sort: { totalReviews: -1, avgRating: -1 } },
      { $limit: 5 },

      // ✅ Join Business Details
      {
        $lookup: {
          from: "businesses",         // collection name (lowercase plural)
          localField: "_id",
          foreignField: "_id",
          as: "businessData",
        },
      },

      // convert array → object
      { $unwind: "$businessData" },

      // optional - fields clean karna
      {
        $project: {
          _id: 1,
          totalReviews: 1,
          avgRating: 1,
          businessData: {
            name: 1,
            email: 1,
            phone: 1,
            address: 1,
            images: 1,
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      topBusinesses: top,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ Get All Reviews
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("userId", "name email")
      .populate("businessId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalReviews: reviews.length,
      reviews,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ Update Review
exports.updateReview = async (req, res) => {
  try {
    const reviewId = req.params.id;

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, userId: req.user._id },
      req.body,
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ Delete Review
// exports.deleteReview = async (req, res) => {
//   console.log("id = ",req.params.id);
//   console.log("user id = ",req.user._id);
//   try {
//         const review = await Review.findOneAndDelete({
//             _id: req.params.id,
//             userId: req.user._id,
//         });

//         if (!review) {
//             return res.status(404).json({ message: "Review not found" });
//         }

//         res.status(200).json({
//             success: true,
//             message: "Review deleted successfully",
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

// ✅ Delete Review (User or Admin)
exports.deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    let review;

    if (userRole === "admin") {
      // Admin can delete ANY review
      review = await Review.findByIdAndDelete(reviewId);
    } else {
      // Normal user can delete only his own review
      review = await Review.findOneAndDelete({
        _id: reviewId,
        userId: userId,
      });
    }

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

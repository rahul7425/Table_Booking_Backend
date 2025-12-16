// controllers/homeController.js
const Business = require("../Models/BusinessModel");
const Branch = require("../Models/BranchModel");

// Constants
const LIMIT = 10; // हर सेक्शन में दिखाने के लिए maximum items

exports.getGlobalHomeData = async (req, res) => {
  try {
    const { lat, lon, radius = 5000 } = req.query; 
    const popularBusinesses = await Business.find({ 
      isActive: true, 
      requestStatus: "approved",
      isPopular: true 
    })
    .sort({ totalRatings: -1 })
    .limit(LIMIT)
    .select("name description averageRating totalRatings fullImageUrls categoryType");

    const topRatedBusinesses = await Business.find({ 
      isActive: true, 
      requestStatus: "approved",
      averageRating: { $gt: 4.0 } 
    })
    .sort({ averageRating: -1, totalRatings: -1 })
    .limit(LIMIT)
    .select("name description averageRating totalRatings fullImageUrls categoryType");

    // --- 3. Branches by Type (Restaurant, Pub, Bar, etc.) ---
    // सभी branch types के लिए data collect करना
    const branchTypes = ["restaurant", "cafe", "bar", "pub", "eatery", "food_truck"];
    const branchesByType = {};

    for (const type of branchTypes) {
        const branches = await Branch.find({ 
            isActive: true,
            type: type 
        })
        .limit(LIMIT)
        .populate({
            path: 'businessId',
            select: 'name averageRating fullImageUrls categoryType'
        })
        .select("name type description address location fullImageUrls");

        branchesByType[type] = branches;
    }

    // --- 4. Nearby Branches (Optional, requires lat/lon in query) ---
    let nearbyBranches = [];
    if (lat && lon) {
      const longitude = parseFloat(lon);
      const latitude = parseFloat(lat);
      const radiusMeters = parseInt(radius);

      nearbyBranches = await Branch.find({
        isActive: true,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusMeters,
          },
        },
      })
      .limit(LIMIT)
      .populate({
          path: 'businessId',
          select: 'name averageRating fullImageUrls categoryType'
      })
      .select("name type description address location fullImageUrls");
    }

    // --- Final Response ---
    res.status(200).json({
      success: true,
      data: {
        popularBusinesses,
        topRatedBusinesses,
        nearbyBranches,
        branchesByType, // इसमें restaurant, pub, bar आदि types का data होगा
      },
      message: "Global home data fetched successfully.",
    });

  } catch (error) {
    console.error("Error fetching home data:", error);
    res.status(500).json({
      success: false,
      message: "Server error occurred while fetching home data.",
      error: error.message,
    });
  }
};
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const blogRoutes = require("./Routes/blogRoutes");
const commentRoutes = require("./Routes/commentRoutes");
const contactRoutes = require("./Routes/ContactRoute");
const reviewRoutes = require("./Routes/ReviewRoute");
const userRoutes = require("./Routes/UserRoute");

// const restaurantRoutes = require("./routes/RestaurantRoutes");
// const tableRoutes = require("./routes/TableRoutes");
const adminRoutes = require("./Routes/AdminRoute");
const businessRoutes = require("./Routes/BusinessRoute");
const detailRoutes = require("./Routes/Business");
const bookingRoutes = require("./Routes/BookingRoute");
const couponRoutes = require("./Routes/CouponRoutes");
const slotRoutes = require("./Routes/slotRoutes");

const app = express();
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


// Connect MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// API Routes
app.use("/api/users", userRoutes);

// app.use("/api/restaurants", restaurantRoutes);
// app.use("/api/tables", tableRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/details", detailRoutes);

app.use("/api/bookings", bookingRoutes);
// app.use("/api/orders", orderRoutes);

app.use("/api/blogs", blogRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/slots", slotRoutes);
// Default Route
app.get("/", (req, res) => {
  res.send("🍽️ Hotel Table Booking Backend is Running...");
});

// Error Middleware (should be last)
const { notFound, errorHandler } = require("./middleware/ErrorMiddleware");
app.use(notFound);
app.use(errorHandler);

// Server listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

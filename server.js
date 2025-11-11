require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const blogRoutes = require("./Routes/blogRoutes");
const commentRoutes = require("./Routes/commentRoutes");


// Routes
const userRoutes = require("./Routes/UserRoute");
const adminRoutes = require("./Routes/AdminRoute");
const businessRoutes = require("./Routes/BusinessRoute");
// const bookingRoutes = require("./routes/BookingRoutes");
// const orderRoutes = require("./routes/OrderRoutes");

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
app.use("/api/admin", adminRoutes);
app.use("/api/business", businessRoutes);
// app.use("/api/bookings", bookingRoutes);
// app.use("/api/orders", orderRoutes);

app.use("/api/blogs", blogRoutes);
app.use("/api/comments", commentRoutes);


// Default route 
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

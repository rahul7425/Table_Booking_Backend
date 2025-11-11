require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Routes
const userRoutes = require("./Routes/UserRoute");
const contactRoutes = require("./Routes/ContactRoute");

// const restaurantRoutes = require("./routes/RestaurantRoutes");
// const tableRoutes = require("./routes/TableRoutes");
// const bookingRoutes = require("./routes/BookingRoutes");
// const orderRoutes = require("./routes/OrderRoutes");

const app = express();

// Connect MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);

// app.use("/api/restaurants", restaurantRoutes);
// app.use("/api/tables", tableRoutes);
// app.use("/api/bookings", bookingRoutes);
// app.use("/api/orders", orderRoutes);

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

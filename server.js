const express = require("express");
require("dotenv").config();
const path = require("path");

const app = express();

// Middleware
app.use(express.json());

// ✅ Serve frontend properly
app.use(express.static(path.join(__dirname, "frontend")));

// Import routes
const authRoutes = require("./routes/authRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reportRoutes = require("./routes/reportRoutes");

// Middleware
const { verifyToken, requireApproved } = require("./middleware/authMiddleware");

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/vehicles", verifyToken, vehicleRoutes);
app.use("/api/services", verifyToken, requireApproved, serviceRoutes);
app.use("/api/reports", reportRoutes);

// Start server
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

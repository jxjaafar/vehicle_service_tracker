const express = require("express");
const router = express.Router();

const {
    getPendingMechanics,
    approveMechanic,
    rejectMechanic,
    getAllCentres,
    getAllUsers,
    getAllVehicles,
    getAllServiceRecords,
    getDashboardStats
} = require("../controllers/adminController");

const { verifyToken, requireRole } = require("../middleware/authMiddleware");

// All admin routes require admin role
router.use(verifyToken, requireRole(["admin"]));

// Get dashboard stats
router.get("/stats", getDashboardStats);

// Mechanics management
router.get("/mechanics/pending", getPendingMechanics);
router.post("/mechanics/approve", approveMechanic);
router.post("/mechanics/reject", rejectMechanic);
router.get("/centres", getAllCentres);
router.get("/centres/pending", getPendingMechanics);
router.post("/centres/approve", approveMechanic);
router.post("/centres/reject", rejectMechanic);

// View all data
router.get("/users", getAllUsers);
router.get("/vehicles", getAllVehicles);
router.get("/services", getAllServiceRecords);

module.exports = router;

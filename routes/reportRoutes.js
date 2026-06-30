const express = require("express");
const router = express.Router();

const {
    generateReport,
    getMyReports,
    deactivateReport,
    getPublicReport
} = require("../controllers/reportController");

const { verifyToken, requireRole } = require("../middleware/authMiddleware");

router.get("/public/:code", getPublicReport);
router.use(verifyToken);
router.get("/", requireRole(["owner", "admin"]), getMyReports);
router.post("/", requireRole(["owner", "admin"]), generateReport);
router.patch("/:report_id/deactivate", requireRole(["owner", "admin"]), deactivateReport);

module.exports = router;

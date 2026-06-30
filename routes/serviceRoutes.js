const express = require("express");
const router = express.Router();

const {
    addServiceRecord,
    getServiceHistory,
    getAllServiceRecords
} = require("../controllers/serviceController");

router.post("/", addServiceRecord);
router.get("/", getAllServiceRecords);
router.get("/:vehicle_id", getServiceHistory);

module.exports = router;
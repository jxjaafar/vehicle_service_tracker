const express = require("express");
const router = express.Router();

const {
    addVehicle,
    getVehicles,
    getVehicleById,
    findVehicleByRegistration,
    deleteVehicle
} = require("../controllers/vehicleController");

router.post("/", addVehicle);
router.get("/", getVehicles);
router.get("/registration/:registration_number", findVehicleByRegistration);
router.get("/:vehicle_id", getVehicleById);
router.delete("/:vehicle_id", deleteVehicle);

module.exports = router;

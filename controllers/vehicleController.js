const db = require("../config/db");

const addVehicle = (req, res) => {
    const {
        vin_number,
        registration_number,
        make,
        model,
        year_manufactured
    } = req.body;

    if (req.user.role !== "owner" && req.user.role !== "admin") {
        return res.status(403).json({
            message: "Only vehicle owners can add vehicles"
        });
    }

    const owner_id = req.user.user_id;

    if (!vin_number || !registration_number || !make || !model || !year_manufactured) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const sql = `
        INSERT INTO vehicles
        (
            owner_id,
            vin_number,
            registration_number,
            make,
            model,
            year_manufactured
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            owner_id,
            vin_number,
            registration_number,
            make,
            model,
            year_manufactured
        ],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Error adding vehicle",
                    error: err.message
                });
            }

            res.status(201).json({
                message: "Vehicle added successfully",
                vehicle_id: result.insertId
            });
        }
    );
};

const getVehicles = (req, res) => {
    const isOwner = req.user.role === "owner";

    const sql = isOwner
        ? `
            SELECT v.*, u.full_name AS owner_name
            FROM vehicles v
            LEFT JOIN users u ON v.owner_id = u.user_id
            WHERE v.owner_id = ?
            ORDER BY v.created_at DESC
        `
        : `
            SELECT v.*, u.full_name AS owner_name
            FROM vehicles v
            LEFT JOIN users u ON v.owner_id = u.user_id
            ORDER BY v.created_at DESC
        `;

    db.query(sql, isOwner ? [req.user.user_id] : [], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error retrieving vehicles",
                error: err.message
            });
        }

        res.json(results);
    });
};

const getVehicleById = (req, res) => {
    const { vehicle_id } = req.params;
    const isOwner = req.user.role === "owner";

    const sql = isOwner
        ? `
            SELECT v.*, u.full_name AS owner_name
            FROM vehicles v
            LEFT JOIN users u ON v.owner_id = u.user_id
            WHERE v.vehicle_id = ? AND v.owner_id = ?
        `
        : `
            SELECT v.*, u.full_name AS owner_name
            FROM vehicles v
            LEFT JOIN users u ON v.owner_id = u.user_id
            WHERE v.vehicle_id = ?
        `;

    db.query(sql, isOwner ? [vehicle_id, req.user.user_id] : [vehicle_id], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error retrieving vehicle",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Vehicle not found"
            });
        }

        res.json(results[0]);
    });
};

const deleteVehicle = (req, res) => {
    const { vehicle_id } = req.params;
    const owner_id = req.user.user_id;

    const sql = `
        DELETE FROM vehicles
        WHERE vehicle_id = ? AND owner_id = ?
    `;

    db.query(sql, [vehicle_id, owner_id], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: "Error deleting vehicle",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Vehicle not found"
            });
        }

        res.json({
            message: "Vehicle deleted successfully"
        });
    });
};

module.exports = {
    addVehicle,
    getVehicles,
    getVehicleById,
    deleteVehicle
};

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
    const centreRole = req.user.role === "centre_admin" || req.user.role === "mechanic";

    let sql = `
        SELECT v.*, u.full_name AS owner_name
        FROM vehicles v
        LEFT JOIN users u ON v.owner_id = u.user_id
    `;
    const params = [];

    if (isOwner) {
        sql += " WHERE v.owner_id = ?";
        params.push(req.user.user_id);
    } else if (centreRole) {
        sql += `
            INNER JOIN (
                SELECT DISTINCT vehicle_id
                FROM service_records
                WHERE service_centre_id = ? OR serviced_by = ?
            ) served ON served.vehicle_id = v.vehicle_id
        `;
        params.push(req.user.centre_id || 0, req.user.user_id);
    }

    sql += " ORDER BY v.created_at DESC";

    db.query(sql, params, (err, results) => {
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
    const centreRole = req.user.role === "centre_admin" || req.user.role === "mechanic";

    let sql = `
        SELECT v.*, u.full_name AS owner_name
        FROM vehicles v
        LEFT JOIN users u ON v.owner_id = u.user_id
    `;
    const params = [vehicle_id];

    if (isOwner) {
        sql += " WHERE v.vehicle_id = ? AND v.owner_id = ?";
        params.push(req.user.user_id);
    } else if (centreRole) {
        sql += `
            WHERE v.vehicle_id = ?
              AND EXISTS (
                  SELECT 1
                  FROM service_records sr
                  WHERE sr.vehicle_id = v.vehicle_id
                    AND (sr.service_centre_id = ? OR sr.serviced_by = ?)
              )
        `;
        params.push(req.user.centre_id || 0, req.user.user_id);
    } else {
        sql += " WHERE v.vehicle_id = ?";
    }

    db.query(sql, params, (err, results) => {
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

const findVehicleByRegistration = (req, res) => {
    const registrationNumber = String(req.params.registration_number || "").trim();

    if (!registrationNumber) {
        return res.status(400).json({
            message: "registration_number is required"
        });
    }

    const vehicleSql = `
        SELECT v.*, u.full_name AS owner_name
        FROM vehicles v
        LEFT JOIN users u ON v.owner_id = u.user_id
        WHERE UPPER(v.registration_number) = UPPER(?)
        LIMIT 1
    `;

    db.query(vehicleSql, [registrationNumber], (vehicleErr, vehicles) => {
        if (vehicleErr) {
            return res.status(500).json({
                message: "Error searching vehicle",
                error: vehicleErr.message
            });
        }

        if (vehicles.length === 0) {
            return res.status(404).json({
                message: "Vehicle not found"
            });
        }

        const vehicle = vehicles[0];

        const historySql = `
            SELECT sr.*, sp.full_name AS service_provider_name, sc.centre_name
            FROM service_records sr
            LEFT JOIN users sp ON COALESCE(sr.recorded_by, sr.serviced_by) = sp.user_id
            LEFT JOIN service_centres sc ON sr.service_centre_id = sc.centre_id
            WHERE sr.vehicle_id = ?
            ORDER BY sr.service_date DESC
        `;

        db.query(historySql, [vehicle.vehicle_id], (historyErr, records) => {
            if (historyErr) {
                return res.status(500).json({
                    message: "Error loading service history",
                    error: historyErr.message
                });
            }

            res.json({
                vehicle,
                service_records: records
            });
        });
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
    findVehicleByRegistration,
    deleteVehicle
};

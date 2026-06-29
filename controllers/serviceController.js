const db = require("../config/db");

const addServiceRecord = (req, res) => {
    const {
        vehicle_id,
        service_date,
        mileage,
        description,
        parts_replaced,
        cost
    } = req.body;

    if (req.user.role !== "mechanic" && req.user.role !== "admin") {
        return res.status(403).json({
            message: "Only approved service providers can add service records"
        });
    }

    if (!vehicle_id || !service_date || !mileage || !description || !cost) {
        return res.status(400).json({
            message: "Required fields: vehicle_id, service_date, mileage, description, cost"
        });
    }

    if (isNaN(mileage) || isNaN(cost)) {
        return res.status(400).json({
            message: "Mileage and cost must be numbers"
        });
    }

    const sql = `
        INSERT INTO service_records
        (vehicle_id, service_date, mileage, description, parts_replaced, cost, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    db.query(sql,
        [vehicle_id, service_date, mileage, description, parts_replaced || null, cost],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Error adding service record",
                    error: err.message
                });
            }

            res.status(201).json({
                message: "Service record added successfully",
                service_id: result.insertId
            });
        }
    );
};

const getServiceHistory = (req, res) => {
    const vehicle_id = req.params.vehicle_id;

    if (!vehicle_id) {
        return res.status(400).json({
            message: "vehicle_id is required"
        });
    }

    const isOwner = req.user.role === "owner";

    const sql = isOwner
        ? `
            SELECT sr.*, v.make, v.model, v.vin_number, v.registration_number, u.full_name AS owner_name
            FROM service_records sr
            INNER JOIN vehicles v ON sr.vehicle_id = v.vehicle_id
            LEFT JOIN users u ON v.owner_id = u.user_id
            WHERE sr.vehicle_id = ? AND v.owner_id = ?
            ORDER BY sr.service_date DESC
        `
        : `
            SELECT sr.*, v.make, v.model, v.vin_number, v.registration_number, u.full_name AS owner_name
            FROM service_records sr
            INNER JOIN vehicles v ON sr.vehicle_id = v.vehicle_id
            LEFT JOIN users u ON v.owner_id = u.user_id
            WHERE sr.vehicle_id = ?
            ORDER BY sr.service_date DESC
        `;

    db.query(sql, isOwner ? [vehicle_id, req.user.user_id] : [vehicle_id], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error retrieving service history",
                error: err.message
            });
        }

        res.json(results);
    });
};

const getAllServiceRecords = (req, res) => {
    const isOwner = req.user.role === "owner";

    const sql = isOwner
        ? `
            SELECT sr.*, v.make, v.model, v.vin_number, v.registration_number, u.full_name AS owner_name
            FROM service_records sr
            INNER JOIN vehicles v ON sr.vehicle_id = v.vehicle_id
            LEFT JOIN users u ON v.owner_id = u.user_id
            WHERE v.owner_id = ?
            ORDER BY sr.created_at DESC
        `
        : `
            SELECT sr.*, v.make, v.model, v.vin_number, v.registration_number, u.full_name AS owner_name
            FROM service_records sr
            LEFT JOIN vehicles v ON sr.vehicle_id = v.vehicle_id
            LEFT JOIN users u ON v.owner_id = u.user_id
            ORDER BY sr.created_at DESC
        `;

    db.query(sql, isOwner ? [req.user.user_id] : [], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error retrieving service records",
                error: err.message
            });
        }

        res.json(results);
    });
};

module.exports = {
    addServiceRecord,
    getServiceHistory,
    getAllServiceRecords
};

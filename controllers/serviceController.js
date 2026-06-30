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

    const centreRole = req.user.role === "centre_admin" || req.user.role === "mechanic";

    if (!centreRole && req.user.role !== "admin") {
        return res.status(403).json({
            message: "Only approved service centres can add service records"
        });
    }

    if (centreRole && !req.user.centre_id) {
        return res.status(403).json({
            message: "Your account is not linked to an approved service centre"
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
        (vehicle_id, service_date, mileage, description, parts_replaced, cost, service_centre_id, recorded_by, serviced_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    db.query(sql,
        [
            vehicle_id,
            service_date,
            mileage,
            description,
            parts_replaced || null,
            cost,
            req.user.centre_id || null,
            req.user.user_id,
            req.user.user_id
        ],
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
    const centreRole = req.user.role === "centre_admin" || req.user.role === "mechanic";

    let sql = `
        SELECT sr.*, v.make, v.model, v.vin_number, v.registration_number,
               u.full_name AS owner_name,
               sp.full_name AS service_provider_name,
               sc.centre_name
        FROM service_records sr
        INNER JOIN vehicles v ON sr.vehicle_id = v.vehicle_id
        LEFT JOIN users u ON v.owner_id = u.user_id
        LEFT JOIN users sp ON COALESCE(sr.recorded_by, sr.serviced_by) = sp.user_id
        LEFT JOIN service_centres sc ON sr.service_centre_id = sc.centre_id
        WHERE sr.vehicle_id = ?
    `;
    const params = [vehicle_id];

    if (isOwner) {
        sql += " AND v.owner_id = ?";
        params.push(req.user.user_id);
    } else if (centreRole) {
        sql += `
            AND EXISTS (
                SELECT 1
                FROM service_records own_sr
                WHERE own_sr.vehicle_id = sr.vehicle_id
                  AND (
                      own_sr.service_centre_id = ?
                      OR own_sr.serviced_by = ?
                  )
            )
        `;
        params.push(req.user.centre_id || 0, req.user.user_id);
    }

    sql += " ORDER BY sr.service_date DESC";

    db.query(sql, params, (err, results) => {
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
    const centreRole = req.user.role === "centre_admin" || req.user.role === "mechanic";

    let sql = `
        SELECT sr.*, v.make, v.model, v.vin_number, v.registration_number,
               u.full_name AS owner_name,
               sp.full_name AS service_provider_name,
               sc.centre_name
        FROM service_records sr
        INNER JOIN vehicles v ON sr.vehicle_id = v.vehicle_id
        LEFT JOIN users u ON v.owner_id = u.user_id
        LEFT JOIN users sp ON COALESCE(sr.recorded_by, sr.serviced_by) = sp.user_id
        LEFT JOIN service_centres sc ON sr.service_centre_id = sc.centre_id
    `;
    const params = [];

    if (isOwner) {
        sql += " WHERE v.owner_id = ?";
        params.push(req.user.user_id);
    } else if (centreRole) {
        sql += " WHERE sr.service_centre_id = ? OR sr.serviced_by = ?";
        params.push(req.user.centre_id || 0, req.user.user_id);
    }

    sql += " ORDER BY sr.created_at DESC";

    db.query(sql, params, (err, results) => {
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

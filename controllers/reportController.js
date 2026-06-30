const crypto = require("crypto");
const db = require("../config/db");

const createReportCode = () => {
    return crypto.randomBytes(12).toString("hex").toUpperCase();
};

const generateReport = (req, res) => {
    const { vehicle_id, expires_in_days } = req.body;
    const days = Number(expires_in_days || 14);

    if (!vehicle_id) {
        return res.status(400).json({ message: "vehicle_id is required" });
    }

    if (!Number.isInteger(days) || days < 1 || days > 90) {
        return res.status(400).json({ message: "Expiry must be between 1 and 90 days" });
    }

    const vehicleSql = req.user.role === "owner"
        ? "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND owner_id = ?"
        : "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?";

    const vehicleParams = req.user.role === "owner"
        ? [vehicle_id, req.user.user_id]
        : [vehicle_id];

    db.query(vehicleSql, vehicleParams, (vehicleErr, vehicles) => {
        if (vehicleErr) {
            return res.status(500).json({
                message: "Error checking vehicle",
                error: vehicleErr.message
            });
        }

        if (vehicles.length === 0) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        const reportCode = createReportCode();
        const insertSql = `
            INSERT INTO vehicle_reports (vehicle_id, report_code, created_by, expires_at)
            VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))
        `;

        db.query(insertSql, [vehicle_id, reportCode, req.user.user_id, days], (insertErr, result) => {
            if (insertErr) {
                return res.status(500).json({
                    message: "Error generating report",
                    error: insertErr.message
                });
            }

            res.status(201).json({
                message: "Report generated successfully",
                report_id: result.insertId,
                report_code: reportCode,
                report_url: `/report.html?code=${reportCode}`,
                expires_in_days: days
            });
        });
    });
};

const getMyReports = (req, res) => {
    const isOwner = req.user.role === "owner";
    const sql = isOwner
        ? `
            SELECT vr.report_id, vr.vehicle_id, vr.report_code, vr.expires_at, vr.is_active, vr.created_at,
                   v.make, v.model, v.registration_number, v.vin_number
            FROM vehicle_reports vr
            INNER JOIN vehicles v ON vr.vehicle_id = v.vehicle_id
            WHERE v.owner_id = ?
            ORDER BY vr.created_at DESC
        `
        : `
            SELECT vr.report_id, vr.vehicle_id, vr.report_code, vr.expires_at, vr.is_active, vr.created_at,
                   v.make, v.model, v.registration_number, v.vin_number, u.full_name AS owner_name
            FROM vehicle_reports vr
            INNER JOIN vehicles v ON vr.vehicle_id = v.vehicle_id
            LEFT JOIN users u ON v.owner_id = u.user_id
            ORDER BY vr.created_at DESC
        `;

    db.query(sql, isOwner ? [req.user.user_id] : [], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error retrieving reports",
                error: err.message
            });
        }

        res.json(results);
    });
};

const deactivateReport = (req, res) => {
    const { report_id } = req.params;
    const isOwner = req.user.role === "owner";

    const sql = isOwner
        ? `
            UPDATE vehicle_reports vr
            INNER JOIN vehicles v ON vr.vehicle_id = v.vehicle_id
            SET vr.is_active = 0
            WHERE vr.report_id = ? AND v.owner_id = ?
        `
        : "UPDATE vehicle_reports SET is_active = 0 WHERE report_id = ?";

    db.query(sql, isOwner ? [report_id, req.user.user_id] : [report_id], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: "Error deactivating report",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Report not found" });
        }

        res.json({ message: "Report deactivated successfully" });
    });
};

const getPublicReport = (req, res) => {
    const { code } = req.params;

    const reportSql = `
        SELECT vr.report_id, vr.report_code, vr.expires_at, vr.created_at,
               v.vehicle_id, v.vin_number, v.registration_number, v.make, v.model, v.year_manufactured
        FROM vehicle_reports vr
        INNER JOIN vehicles v ON vr.vehicle_id = v.vehicle_id
        WHERE vr.report_code = ?
          AND vr.is_active = 1
          AND vr.expires_at > NOW()
    `;

    db.query(reportSql, [code], (reportErr, reports) => {
        if (reportErr) {
            return res.status(500).json({
                message: "Error loading report",
                error: reportErr.message
            });
        }

        if (reports.length === 0) {
            return res.status(404).json({
                message: "Report not found, expired, or deactivated"
            });
        }

        const report = reports[0];
        const historySql = `
            SELECT sr.service_id, sr.service_date, sr.mileage, sr.description, sr.parts_replaced,
                   sr.cost, sr.created_at, sc.centre_name, u.full_name AS service_provider_name
            FROM service_records sr
            LEFT JOIN service_centres sc ON sr.service_centre_id = sc.centre_id
            LEFT JOIN users u ON COALESCE(sr.recorded_by, sr.serviced_by) = u.user_id
            WHERE sr.vehicle_id = ?
            ORDER BY sr.service_date DESC
        `;

        db.query(historySql, [report.vehicle_id], (historyErr, records) => {
            if (historyErr) {
                return res.status(500).json({
                    message: "Error loading service history",
                    error: historyErr.message
                });
            }

            res.json({
                report: {
                    report_code: report.report_code,
                    generated_at: report.created_at,
                    expires_at: report.expires_at
                },
                vehicle: {
                    vin_number: report.vin_number,
                    registration_number: report.registration_number,
                    make: report.make,
                    model: report.model,
                    year_manufactured: report.year_manufactured
                },
                service_records: records
            });
        });
    });
};

module.exports = {
    generateReport,
    getMyReports,
    deactivateReport,
    getPublicReport
};

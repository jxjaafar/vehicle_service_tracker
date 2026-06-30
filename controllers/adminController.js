const db = require("../config/db");

// Get all pending service centres
const getPendingMechanics = (req, res) => {
    const sql = `
        SELECT sc.centre_id, sc.centre_name, sc.email AS centre_email, sc.phone, sc.address, sc.city,
               sc.business_registration_number, sc.created_at,
               u.user_id, u.full_name, u.email AS admin_email
        FROM service_centres sc
        INNER JOIN centre_staff cs ON cs.centre_id = sc.centre_id AND cs.staff_role = 'centre_admin'
        INNER JOIN users u ON u.user_id = cs.user_id
        WHERE sc.status = 'pending'
        ORDER BY sc.created_at DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(results);
    });
};

// Approve a service centre
const approveMechanic = (req, res) => {
    const { centre_id, user_id } = req.body;

    const centreSql = centre_id
        ? "SELECT centre_id FROM service_centres WHERE centre_id = ?"
        : "SELECT centre_id FROM centre_staff WHERE user_id = ?";

    db.query(centreSql, [centre_id || user_id], (lookupErr, centres) => {
        if (lookupErr) {
            return res.status(500).json(lookupErr);
        }

        if (centres.length === 0) {
            return res.status(404).json({ message: "Service centre not found" });
        }

        const targetCentreId = centres[0].centre_id;
        const sql = `
            UPDATE service_centres sc
            INNER JOIN centre_staff cs ON cs.centre_id = sc.centre_id
            INNER JOIN users u ON u.user_id = cs.user_id
            SET sc.status = 'approved', u.status = 'approved'
            WHERE sc.centre_id = ?
        `;

        db.query(sql, [targetCentreId], (err, result) => {
            if (err) {
                return res.status(500).json(err);
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Service centre not found" });
            }

            res.json({ message: "Service centre approved successfully" });
        });
    });
};

// Reject a pending service centre
const rejectMechanic = (req, res) => {
    const { centre_id, user_id } = req.body;

    const centreSql = centre_id
        ? "SELECT centre_id FROM service_centres WHERE centre_id = ?"
        : "SELECT centre_id FROM centre_staff WHERE user_id = ?";

    db.query(centreSql, [centre_id || user_id], (lookupErr, centres) => {
        if (lookupErr) {
            return res.status(500).json(lookupErr);
        }

        if (centres.length === 0) {
            return res.status(404).json({ message: "Service centre not found" });
        }

        const targetCentreId = centres[0].centre_id;
        const sql = `
            UPDATE service_centres sc
            INNER JOIN centre_staff cs ON cs.centre_id = sc.centre_id
            INNER JOIN users u ON u.user_id = cs.user_id
            SET sc.status = 'rejected', u.status = 'pending'
            WHERE sc.centre_id = ? AND sc.status = 'pending'
        `;

        db.query(sql, [targetCentreId], (err, result) => {
            if (err) {
                return res.status(500).json(err);
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Pending service centre not found" });
            }

            res.json({ message: "Service centre rejected" });
        });
    });
};

const getAllCentres = (req, res) => {
    const sql = `
        SELECT sc.*, u.full_name AS centre_admin_name, u.email AS centre_admin_email
        FROM service_centres sc
        LEFT JOIN centre_staff cs ON cs.centre_id = sc.centre_id AND cs.staff_role = 'centre_admin'
        LEFT JOIN users u ON u.user_id = cs.user_id
        ORDER BY sc.created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(results);
    });
};

// Get all users
const getAllUsers = (req, res) => {
    const sql = `
        SELECT u.user_id, u.full_name, u.email, u.role, u.status, u.created_at,
               sc.centre_name, sc.status AS centre_status
        FROM users u
        LEFT JOIN centre_staff cs ON cs.user_id = u.user_id
        LEFT JOIN service_centres sc ON sc.centre_id = cs.centre_id
        ORDER BY u.created_at DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(results);
    });
};

// Get all vehicles
const getAllVehicles = (req, res) => {
    const sql = `
        SELECT v.*, u.full_name as owner_name 
        FROM vehicles v 
        LEFT JOIN users u ON v.owner_id = u.user_id
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(results);
    });
};

// Get all service records
const getAllServiceRecords = (req, res) => {
    const sql = `
        SELECT sr.*, v.make, v.model, v.vin_number, v.registration_number,
               sp.full_name AS service_provider_name, sc.centre_name
        FROM service_records sr 
        LEFT JOIN vehicles v ON sr.vehicle_id = v.vehicle_id
        LEFT JOIN users sp ON COALESCE(sr.recorded_by, sr.serviced_by) = sp.user_id
        LEFT JOIN service_centres sc ON sr.service_centre_id = sc.centre_id
        ORDER BY sr.created_at DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(results);
    });
};

// Get admin dashboard stats
const getDashboardStats = (req, res) => {
    const queries = [
        "SELECT COUNT(*) as total_users FROM users",
        "SELECT COUNT(*) as total_vehicles FROM vehicles",
        "SELECT COUNT(*) as total_services FROM service_records",
        "SELECT COUNT(*) as total_centres FROM service_centres",
        "SELECT COUNT(*) as pending_mechanics FROM service_centres WHERE status = 'pending'"
    ];

    let stats = {};
    let completed = 0;

    queries.forEach((sql, index) => {
        db.query(sql, (err, result) => {
            if (err) return res.status(500).json(err);
            
            stats = { ...stats, ...result[0] };
            completed++;

            if (completed === queries.length) {
                res.json(stats);
            }
        });
    });
};

module.exports = {
    getPendingMechanics,
    approveMechanic,
    rejectMechanic,
    getAllCentres,
    getAllUsers,
    getAllVehicles,
    getAllServiceRecords,
    getDashboardStats
};

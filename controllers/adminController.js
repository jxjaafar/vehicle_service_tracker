const db = require("../config/db");

// Get all pending mechanics
const getPendingMechanics = (req, res) => {
    const sql = "SELECT user_id, full_name, email, created_at FROM users WHERE role = 'mechanic' AND status = 'pending'";
    
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(results);
    });
};

// Approve a mechanic
const approveMechanic = (req, res) => {
    const { user_id } = req.body;

    const sql = "UPDATE users SET status = 'approved' WHERE user_id = ? AND role = 'mechanic'";
    
    db.query(sql, [user_id], (err, result) => {
        if (err) {
            return res.status(500).json(err);
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Mechanic not found" });
        }

        res.json({ message: "Mechanic approved successfully" });
    });
};

// Reject/delete a pending mechanic
const rejectMechanic = (req, res) => {
    const { user_id } = req.body;

    const sql = "DELETE FROM users WHERE user_id = ? AND role = 'mechanic' AND status = 'pending'";
    
    db.query(sql, [user_id], (err, result) => {
        if (err) {
            return res.status(500).json(err);
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Mechanic not found" });
        }

        res.json({ message: "Mechanic rejected" });
    });
};

// Get all users
const getAllUsers = (req, res) => {
    const sql = "SELECT user_id, full_name, email, role, status, created_at FROM users";
    
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
        SELECT sr.*, v.make, v.model, v.vin_number 
        FROM service_records sr 
        LEFT JOIN vehicles v ON sr.vehicle_id = v.vehicle_id
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
        "SELECT COUNT(*) as pending_mechanics FROM users WHERE role = 'mechanic' AND status = 'pending'"
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
    getAllUsers,
    getAllVehicles,
    getAllServiceRecords,
    getDashboardStats
};

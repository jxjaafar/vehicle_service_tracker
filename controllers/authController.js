const db = require("../config/db");
const bcrypt = require("bcryptjs");

const register = async (req, res) => {
    let {
        full_name,
        email,
        password,
        role,
        centre_name,
        business_registration_number,
        centre_email,
        centre_phone,
        centre_address,
        centre_city
    } = req.body;

    if (!full_name || !email || !password || !role) {
        return res.status(400).json({
            message: "All fields are required: full_name, email, password, role"
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters"
        });
    }

    if (role === "service_provider" || role === "mechanic") {
        role = "centre_admin";
    }

    const validRoles = ["owner", "centre_admin", "mechanic", "admin"];
    if (!validRoles.includes(role)) {
        return res.status(400).json({
            message: "Invalid role. Allowed: owner, centre_admin, mechanic, admin"
        });
    }

    if (role === "centre_admin") {
        if (!centre_name || !centre_phone || !centre_address || !centre_city) {
            return res.status(400).json({
                message: "Service centre name, phone, address, and city are required"
            });
        }
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const status = role === "centre_admin" || role === "mechanic" ? "pending" : "approved";

        db.beginTransaction((transactionErr) => {
            if (transactionErr) {
                return res.status(500).json({
                    message: "Error starting registration",
                    error: transactionErr.message
                });
            }

            const userSql = `
                INSERT INTO users(full_name, email, password, role, status, created_at)
                VALUES(?, ?, ?, ?, ?, NOW())
            `;

            db.query(userSql, [full_name, email, hashedPassword, role, status], (err, userResult) => {
                if (err) {
                    return db.rollback(() => {
                        if (err.code === "ER_DUP_ENTRY") {
                            return res.status(400).json({
                                message: "Email already registered"
                            });
                        }

                        return res.status(500).json({
                            message: "Error registering user",
                            error: err.message
                        });
                    });
                }

                if (role !== "centre_admin") {
                    return db.commit((commitErr) => {
                        if (commitErr) {
                            return db.rollback(() => res.status(500).json({
                                message: "Error completing registration",
                                error: commitErr.message
                            }));
                        }

                        return res.status(201).json({
                            message: "User registered successfully"
                        });
                    });
                }

                const centreSql = `
                    INSERT INTO service_centres
                    (centre_name, business_registration_number, email, phone, address, city, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
                `;

                db.query(
                    centreSql,
                    [
                        centre_name,
                        business_registration_number || null,
                        centre_email || email,
                        centre_phone,
                        centre_address,
                        centre_city
                    ],
                    (centreErr, centreResult) => {
                        if (centreErr) {
                            return db.rollback(() => {
                                if (centreErr.code === "ER_DUP_ENTRY") {
                                    return res.status(400).json({
                                        message: "Service centre email or registration number already exists"
                                    });
                                }

                                return res.status(500).json({
                                    message: "Error registering service centre",
                                    error: centreErr.message
                                });
                            });
                        }

                        const staffSql = `
                            INSERT INTO centre_staff (centre_id, user_id, staff_role, status, created_at)
                            VALUES (?, ?, 'centre_admin', 'active', NOW())
                        `;

                        db.query(staffSql, [centreResult.insertId, userResult.insertId], (staffErr) => {
                            if (staffErr) {
                                return db.rollback(() => res.status(500).json({
                                    message: "Error linking centre admin",
                                    error: staffErr.message
                                }));
                            }

                            db.commit((commitErr) => {
                                if (commitErr) {
                                    return db.rollback(() => res.status(500).json({
                                        message: "Error completing registration",
                                        error: commitErr.message
                                    }));
                                }

                                res.status(201).json({
                                    message: "Service centre registered successfully! Awaiting main admin approval"
                                });
                            });
                        });
                    }
                );
            });
        });
    } catch (error) {
        res.status(500).json({
            message: "Error registering user",
            error: error.message
        });
    }
};

const jwt = require("jsonwebtoken");

const login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const sql = `
        SELECT u.*, cs.centre_id, cs.staff_role, sc.centre_name, sc.status AS centre_status
        FROM users u
        LEFT JOIN centre_staff cs ON cs.user_id = u.user_id AND cs.status = 'active'
        LEFT JOIN service_centres sc ON sc.centre_id = cs.centre_id
        WHERE u.email = ?
        LIMIT 1
    `;

    db.query(sql, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error logging in",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const centreRole = user.role === "centre_admin" || user.role === "mechanic";
        if (centreRole && (user.status !== "approved" || user.centre_status !== "approved")) {
            return res.status(403).json({
                message: "Your service centre account is pending main admin approval"
            });
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role,
                status: user.status,
                centre_id: user.centre_id || null,
                centre_name: user.centre_name || null,
                centre_status: user.centre_status || null,
                staff_role: user.staff_role || null
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                status: user.status,
                centre_id: user.centre_id || null,
                centre_name: user.centre_name || null,
                centre_status: user.centre_status || null,
                staff_role: user.staff_role || null
            }
        });
    });
};

module.exports = {
    register,
    login
};

const db = require("../config/db");
const bcrypt = require("bcryptjs");

const register = async (req, res) => {
    let { full_name, email, password, role } = req.body;

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

    if (role === "service_provider") {
        role = "mechanic";
    }

    const validRoles = ["owner", "mechanic", "admin"];
    if (!validRoles.includes(role)) {
        return res.status(400).json({
            message: "Invalid role. Allowed: owner, mechanic, admin"
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const status = role === "mechanic" ? "pending" : "approved";

        const sql = `
        INSERT INTO users(full_name, email, password, role, status, created_at)
        VALUES(?, ?, ?, ?, ?, NOW())
        `;

        db.query(
            sql,
            [full_name, email, hashedPassword, role, status],
            (err, result) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(400).json({
                            message: "Email already registered"
                        });
                    }
                    return res.status(500).json({
                        message: "Error registering user",
                        error: err.message
                    });
                }

                res.status(201).json({
                    message: role === "mechanic" ? "Registration successful! Awaiting admin approval" : "User registered successfully"
                });
            }
        );
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

    const sql = "SELECT * FROM users WHERE email = ?";

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

        if (user.role === "mechanic" && user.status !== "approved") {
            return res.status(403).json({
                message: "Your account is pending admin approval"
            });
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role,
                status: user.status
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
                status: user.status
            }
        });
    });
};

module.exports = {
    register,
    login
};

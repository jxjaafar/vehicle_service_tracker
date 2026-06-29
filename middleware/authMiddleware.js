const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            message: "Invalid token"
        });
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Not authenticated"
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied. Required role: " + roles.join(" or ")
            });
        }

        next();
    };
};

const requireApproved = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Not authenticated"
        });
    }

    if (req.user.role === "mechanic" && req.user.status !== "approved") {
        return res.status(403).json({
            message: "Your account is pending admin approval"
        });
    }

    next();
};

module.exports = {
    verifyToken,
    requireRole,
    requireApproved
};

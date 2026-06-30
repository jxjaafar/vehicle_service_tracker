const API_BASE = "/api";

function getToken() {
    return localStorage.getItem("token");
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (error) {
        return {};
    }
}

function setSession(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
}

function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedVehicleId");
}

function logout() {
    clearSession();
    window.location.href = "login.html";
}

function requireAuth(roles = []) {
    const token = getToken();
    const user = getUser();

    if (!token || !user.role) {
        window.location.href = "login.html";
        return null;
    }

    if (roles.length && !roles.includes(user.role)) {
        window.location.href = "dashboard.html";
        return null;
    }

    return { token, user };
}

async function apiFetch(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

function routeToDashboard() {
    const user = getUser();

    if (user.role === "admin") {
        window.location.href = "admin-dashboard.html";
        return;
    }

    if (user.role === "mechanic" || user.role === "centre_admin") {
        window.location.href = "mechanic-dashboard.html";
        return;
    }

    window.location.href = "owner-dashboard.html";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) return "Not set";
    return new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function formatMoney(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0
    }).format(number);
}

function isExpired(value) {
    return value ? new Date(value).getTime() < Date.now() : false;
}

function roleLabel(role) {
    if (role === "mechanic") return "Service Provider";
    if (role === "centre_admin") return "Centre Admin";
    if (role === "admin") return "Admin";
    return "Vehicle Owner";
}

function statusPill(status) {
    const safeStatus = escapeHtml(status || "approved");
    const className = safeStatus === "pending"
        ? "pill-warning"
        : safeStatus === "rejected" || safeStatus === "inactive" || safeStatus === "expired"
            ? "pill-danger"
            : "pill-success";
    return `<span class="pill ${className}">${safeStatus}</span>`;
}

function verifiedBadge(label = "Verified") {
    return `<span class="pill pill-verified">${escapeHtml(label)}</span>`;
}

function reportStatusPill(report) {
    if (!report || Number(report.is_active) === 0) {
        return statusPill("inactive");
    }

    if (isExpired(report.expires_at)) {
        return statusPill("expired");
    }

    return statusPill("active");
}

function appNav(active = "") {
    const user = getUser();
    const isAdmin = user.role === "admin";
    const isCentre = user.role === "mechanic" || user.role === "centre_admin";
    const items = isAdmin
        ? [
            ["Overview", "admin-dashboard.html", "overview"],
            ["Pending Centres", "admin-dashboard.html#pending", "pending"],
            ["Users", "admin-dashboard.html#users", "users"],
            ["Vehicles", "admin-dashboard.html#vehicles", "vehicles"],
            ["Service Records", "admin-dashboard.html#services", "services"],
            ["Public Reports", "admin-dashboard.html#reports", "reports"]
        ]
        : isCentre
            ? [
                ["Dashboard", "mechanic-dashboard.html", "dashboard"],
                ["Centre Vehicles", "mechanic-dashboard.html#vehicles", "vehicles"],
                ["Vehicle Lookup", "mechanic-dashboard.html#lookup", "lookup"],
                ["Service Records", "mechanic-dashboard.html#records", "records"],
                ["Add Service", "add-service.html", "add-service"]
            ]
            : [
                ["Dashboard", "owner-dashboard.html", "dashboard"],
                ["My Vehicles", "owner-dashboard.html#vehicles", "vehicles"],
                ["Service History", "owner-dashboard.html#history", "history"],
                ["Public Reports", "owner-dashboard.html#reports", "reports"],
                ["Add Vehicle", "add-vehicle.html", "add-vehicle"]
            ];

    return `
        <nav class="app-nav" aria-label="Application navigation">
            ${items.map(([label, href, key]) => `
                <a class="${active === key ? "active" : ""}" href="${href}">${label}</a>
            `).join("")}
            <button class="btn btn-ghost btn-nav" onclick="logout()">Logout</button>
        </nav>
    `;
}

function showMessage(elementId, message, type = "success") {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.className = `message ${type === "error" ? "error-message" : "success-message"}`;
    element.textContent = message;
    element.hidden = false;
}

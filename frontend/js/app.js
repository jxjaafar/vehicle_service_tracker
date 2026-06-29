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

    if (user.role === "mechanic") {
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

function roleLabel(role) {
    if (role === "mechanic") return "Service Provider";
    if (role === "admin") return "Admin";
    return "Vehicle Owner";
}

function statusPill(status) {
    const safeStatus = escapeHtml(status || "approved");
    return `<span class="pill ${safeStatus === "pending" ? "pill-warning" : "pill-success"}">${safeStatus}</span>`;
}

function showMessage(elementId, message, type = "success") {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.className = `message ${type === "error" ? "error-message" : "success-message"}`;
    element.textContent = message;
    element.hidden = false;
}

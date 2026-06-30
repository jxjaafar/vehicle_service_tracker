CREATE DATABASE IF NOT EXISTS vehicle_service_system;
USE vehicle_service_system;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('owner', 'centre_admin', 'mechanic', 'admin') NOT NULL DEFAULT 'owner',
    status ENUM('pending', 'approved') NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_centres (
    centre_id INT AUTO_INCREMENT PRIMARY KEY,
    centre_name VARCHAR(160) NOT NULL,
    business_registration_number VARCHAR(120) NULL UNIQUE,
    email VARCHAR(160) NOT NULL UNIQUE,
    phone VARCHAR(40) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS centre_staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    centre_id INT NOT NULL,
    user_id INT NOT NULL,
    staff_role ENUM('centre_admin', 'mechanic', 'receptionist') NOT NULL DEFAULT 'centre_admin',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_centre_staff_centre
        FOREIGN KEY (centre_id) REFERENCES service_centres(centre_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_centre_staff_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_centre_staff_user UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    vin_number VARCHAR(80) NOT NULL UNIQUE,
    registration_number VARCHAR(80) NOT NULL UNIQUE,
    make VARCHAR(80) NOT NULL,
    model VARCHAR(80) NOT NULL,
    year_manufactured INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicles_owner
        FOREIGN KEY (owner_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_records (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    service_date DATE NOT NULL,
    mileage INT NOT NULL,
    description TEXT NOT NULL,
    parts_replaced TEXT NULL,
    cost DECIMAL(12, 2) NOT NULL,
    service_centre_id INT NULL,
    recorded_by INT NULL,
    serviced_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_records_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_service_records_provider
        FOREIGN KEY (serviced_by) REFERENCES users(user_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_service_records_centre
        FOREIGN KEY (service_centre_id) REFERENCES service_centres(centre_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_service_records_recorder
        FOREIGN KEY (recorded_by) REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vehicle_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    report_code VARCHAR(80) NOT NULL UNIQUE,
    created_by INT NOT NULL,
    expires_at DATETIME NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_reports_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_vehicle_reports_creator
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX idx_service_records_vehicle_id ON service_records(vehicle_id);
CREATE INDEX idx_service_records_centre_id ON service_records(service_centre_id);
CREATE INDEX idx_service_records_recorded_by ON service_records(recorded_by);
CREATE INDEX idx_service_records_serviced_by ON service_records(serviced_by);
CREATE INDEX idx_service_centres_status ON service_centres(status);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_vehicle_reports_vehicle_id ON vehicle_reports(vehicle_id);
CREATE INDEX idx_vehicle_reports_code ON vehicle_reports(report_code);

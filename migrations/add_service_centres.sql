ALTER TABLE users
    MODIFY role ENUM('owner', 'centre_admin', 'mechanic', 'admin') NOT NULL DEFAULT 'owner';

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

ALTER TABLE service_records
    ADD COLUMN service_centre_id INT NULL AFTER cost,
    ADD COLUMN recorded_by INT NULL AFTER service_centre_id,
    ADD CONSTRAINT fk_service_records_centre
        FOREIGN KEY (service_centre_id) REFERENCES service_centres(centre_id)
        ON DELETE SET NULL,
    ADD CONSTRAINT fk_service_records_recorder
        FOREIGN KEY (recorded_by) REFERENCES users(user_id)
        ON DELETE SET NULL;

UPDATE service_records
SET recorded_by = serviced_by
WHERE recorded_by IS NULL AND serviced_by IS NOT NULL;

CREATE INDEX idx_service_records_centre_id ON service_records(service_centre_id);
CREATE INDEX idx_service_records_recorded_by ON service_records(recorded_by);
CREATE INDEX idx_service_centres_status ON service_centres(status);

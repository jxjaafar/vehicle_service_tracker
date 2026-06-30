ALTER TABLE service_records
    ADD COLUMN serviced_by INT NULL AFTER cost,
    ADD CONSTRAINT fk_service_records_provider
        FOREIGN KEY (serviced_by) REFERENCES users(user_id)
        ON DELETE CASCADE;

CREATE INDEX idx_service_records_serviced_by ON service_records(serviced_by);

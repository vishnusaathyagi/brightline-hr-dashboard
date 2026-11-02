-- Drop old table if exists to align perfectly with starter kit integration logs
DROP TABLE IF EXISTS request_logs CASCADE;

CREATE TABLE request_logs (
    id SERIAL PRIMARY KEY,
    integration_id VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    status_code INT NOT NULL,
    response_time_ms INT NOT NULL,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Composite index for fast rolling window aggregations
CREATE INDEX idx_logs_timestamp_integration 
ON request_logs (timestamp DESC, integration_id);
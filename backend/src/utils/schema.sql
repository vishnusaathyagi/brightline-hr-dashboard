-- Create database tables for Brightline HR Integration Monitor
CREATE TABLE IF NOT EXISTS request_logs (
    id SERIAL PRIMARY KEY,
    integration_id VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    status_code INT NOT NULL,
    response_time_ms INT NOT NULL,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for optimizing rolling window queries
CREATE INDEX IF NOT EXISTS idx_logs_timestamp_integration 
ON request_logs (timestamp DESC, integration_id);
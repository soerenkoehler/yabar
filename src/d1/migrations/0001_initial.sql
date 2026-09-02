CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    expiration TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_expiration_created_at
    ON messages (expiration, created_at);
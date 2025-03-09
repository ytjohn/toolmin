-- Users table for authentication and authorization
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Will store Argon2 hash
    role TEXT CHECK(role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastlogin TIMESTAMP
);

-- Scripts table for storing TCL scripts
CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    access_level TEXT CHECK(access_level IN ('public', 'user', 'admin')) NOT NULL DEFAULT 'user',
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Variables table for storing configuration
CREATE TABLE IF NOT EXISTS vars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Secrets table with encrypted values
CREATE TABLE IF NOT EXISTS secrets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value BLOB NOT NULL, -- Encrypted using AES-256 GCM
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
); 


-- Add signing keys table
CREATE TABLE IF NOT EXISTS signing_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_data TEXT NOT NULL,        -- JWK format key data
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1
);

-- Add index for quick lookup of active, non-expired keys
CREATE INDEX IF NOT EXISTS idx_signing_keys_active_expiry 
ON signing_keys(is_active, expires_at);


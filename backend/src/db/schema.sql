-- Banco de dados: C1 Trader Pro

CREATE TABLE IF NOT EXISTS licenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key VARCHAR(64) UNIQUE NOT NULL,
    status      VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','expired')),
    account     BIGINT,
    broker      VARCHAR(128),
    symbol      VARCHAR(32),
    expires_at  DATE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_licenses_key ON licenses(license_key);

CREATE TABLE IF NOT EXISTS license_logs (
    id          BIGSERIAL PRIMARY KEY,
    license_key VARCHAR(64),
    account     BIGINT,
    broker      VARCHAR(128),
    symbol      VARCHAR(32),
    result      VARCHAR(16),
    ip          VARCHAR(45),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

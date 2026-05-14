ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_id TEXT NULL,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) NOT NULL DEFAULT 'local';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique
ON users (google_id)
WHERE google_id IS NOT NULL;

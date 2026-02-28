-- Create extensions and tables for authentication
-- Run with: psql <DATABASE_URL> -f migrations/create_tables.sql

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(100) UNIQUE NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  email_verified_at timestamptz NULL,
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tokens table for email verification / password reset (store hash only)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  type varchar(40) NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_token_hash ON auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);

-- Note: session table will be created automatically by connect-pg-simple if needed.
-- Explicit session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS session (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamptz NOT NULL,
  PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

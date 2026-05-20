-- ============================================================
-- RepoIntel — PostgreSQL Schema
-- Run this once against your Supabase project (SQL Editor)
-- or any Postgres 14+ instance.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── USERS ─────────────────────────────────────────────────
-- Mirrors Supabase auth.users but stores app-level profile.
-- If using Supabase Auth, keep user_id = auth.uid().
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id     BIGINT UNIQUE,                     -- from GitHub OAuth
    github_login  TEXT UNIQUE NOT NULL,
    github_email  TEXT,
    avatar_url    TEXT,
    name          TEXT,
    plan          TEXT NOT NULL DEFAULT 'free'       -- 'free' | 'pro' | 'team'
                  CHECK (plan IN ('free','pro','team')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── WORKSPACES ────────────────────────────────────────────
-- One workspace = one analyzed GitHub repo.
-- Owned by a user, can be shared with a team.
CREATE TABLE IF NOT EXISTS workspaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_key        TEXT NOT NULL,              -- "owner/repo"
    repo_name       TEXT NOT NULL,
    repo_url        TEXT NOT NULL,
    description     TEXT,
    language        TEXT,
    stars           INTEGER DEFAULT 0,
    forks           INTEGER DEFAULT 0,
    file_count      INTEGER DEFAULT 0,
    ai_summary      TEXT,
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    share_token     TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
    last_indexed_at TIMESTAMPTZ,
    chroma_collection TEXT,                    -- ChromaDB collection name
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (owner_id, repo_key)
);

-- ── WORKSPACE MEMBERS ─────────────────────────────────────
-- Org / team collaboration — who has access to a workspace.
CREATE TABLE IF NOT EXISTS workspace_members (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_email TEXT,                        -- for pending invites (no account yet)
    role         TEXT NOT NULL DEFAULT 'viewer'
                 CHECK (role IN ('viewer','contributor','admin')),
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','revoked')),
    invited_by   UUID REFERENCES users(id),
    accepted_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, user_id)
);

-- ── CHAT SESSIONS ─────────────────────────────────────────
-- One chat session per user per workspace.
CREATE TABLE IF NOT EXISTS chat_sessions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT,                         -- auto-generated from first message
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CHAT MESSAGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id   UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role         TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content      TEXT NOT NULL,
    sources      TEXT[],                       -- array of file paths cited
    tokens_used  INTEGER,
    model        TEXT,
    duration_ms  INTEGER,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── QUERY ANALYTICS ───────────────────────────────────────
-- Every /query call logged for usage analytics and billing.
CREATE TABLE IF NOT EXISTS query_log (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    question     TEXT NOT NULL,
    answer_len   INTEGER,
    sources      TEXT[],
    model        TEXT,
    tokens_in    INTEGER,
    tokens_out   INTEGER,
    duration_ms  INTEGER,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ARCHITECTURE SNAPSHOTS ────────────────────────────────
-- Stores the last AI-generated architecture graph for a workspace.
CREATE TABLE IF NOT EXISTS arch_snapshots (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    nodes        JSONB NOT NULL DEFAULT '[]',
    edges        JSONB NOT NULL DEFAULT '[]',
    version      INTEGER NOT NULL DEFAULT 1,
    generated_by TEXT DEFAULT 'heuristic',    -- 'heuristic' | 'llm'
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── API KEYS ──────────────────────────────────────────────
-- For programmatic access (future public API).
CREATE TABLE IF NOT EXISTS api_keys (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash     TEXT NOT NULL UNIQUE,         -- store bcrypt hash, never plaintext
    name         TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AUDIT LOG ─────────────────────────────────────────────
-- Immutable log of all significant actions.
CREATE TABLE IF NOT EXISTS audit_log (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    action       TEXT NOT NULL,               -- 'workspace.create' | 'invite.send' | etc.
    metadata     JSONB DEFAULT '{}',
    ip_address   INET,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workspaces_owner   ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_token   ON workspaces(share_token);
CREATE INDEX IF NOT EXISTS idx_workspaces_repo    ON workspaces(repo_key);
CREATE INDEX IF NOT EXISTS idx_members_workspace  ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_user       ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email      ON workspace_members(invited_email);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON chat_sessions(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session   ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_query_log_ws       ON query_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_log_user     ON query_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arch_workspace     ON arch_snapshots(workspace_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user         ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_workspace    ON audit_log(workspace_id, created_at DESC);

-- ============================================================
-- TRIGGERS — auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','workspaces','chat_sessions']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
             CREATE TRIGGER trg_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- ROW-LEVEL SECURITY (Supabase)
-- Enable this block if using Supabase Auth + anon key in frontend.
-- ============================================================

ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE arch_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- Users: can read/update own row only
CREATE POLICY "users_self" ON users
    FOR ALL USING (id = auth.uid()::UUID);

-- Workspaces: owner full access; members can read
CREATE POLICY "workspaces_owner" ON workspaces
    FOR ALL USING (owner_id = auth.uid()::UUID);

CREATE POLICY "workspaces_member_read" ON workspaces
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = workspaces.id
              AND user_id = auth.uid()::UUID
              AND status = 'accepted'
        )
        OR is_public = TRUE
    );

-- Members: workspace admin or owner can manage
CREATE POLICY "members_owner_manage" ON workspace_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = workspace_members.workspace_id
              AND owner_id = auth.uid()::UUID
        )
    );

CREATE POLICY "members_self_read" ON workspace_members
    FOR SELECT USING (user_id = auth.uid()::UUID);

-- Chat: own sessions and messages only
CREATE POLICY "chat_sessions_own" ON chat_sessions
    FOR ALL USING (user_id = auth.uid()::UUID);

CREATE POLICY "chat_messages_own" ON chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE id = chat_messages.session_id
              AND user_id = auth.uid()::UUID
        )
    );

-- Query log: own records
CREATE POLICY "query_log_own" ON query_log
    FOR SELECT USING (user_id = auth.uid()::UUID);

-- Arch snapshots: readable by workspace members
CREATE POLICY "arch_member_read" ON arch_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspaces w
            LEFT JOIN workspace_members m ON m.workspace_id = w.id
            WHERE w.id = arch_snapshots.workspace_id
              AND (w.owner_id = auth.uid()::UUID
                   OR (m.user_id = auth.uid()::UUID AND m.status = 'accepted'))
        )
    );

-- API keys: own only
CREATE POLICY "api_keys_own" ON api_keys
    FOR ALL USING (user_id = auth.uid()::UUID);

-- Audit log: read-only for own records
CREATE POLICY "audit_own_read" ON audit_log
    FOR SELECT USING (user_id = auth.uid()::UUID);

-- ============================================================
-- SEED: example data (dev only — remove before production)
-- ============================================================

-- INSERT INTO users (github_id, github_login, github_email, name)
-- VALUES (1234567, 'devuser', 'dev@example.com', 'Dev User')
-- ON CONFLICT (github_login) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ════════════════════════════════
-- 1. Organizations
-- ════════════════════════════════
CREATE TABLE IF NOT EXISTS organizations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(100) UNIQUE NOT NULL,
  logo_url          TEXT,
  plan              VARCHAR(50) DEFAULT 'free',
  settings          JSONB DEFAULT '{}',
  owner_clerk_id    VARCHAR(255) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════
-- 2. Branches (pobočky)
-- ════════════════════════════════
CREATE TABLE IF NOT EXISTS branches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  city              VARCHAR(100),
  address           TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════
-- 3. Roles
-- ════════════════════════════════
CREATE TABLE IF NOT EXISTS org_roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  level             INTEGER NOT NULL,
  is_system         BOOLEAN DEFAULT true,
  permissions       JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════
-- 4. Members
-- ════════════════════════════════
CREATE TABLE IF NOT EXISTS org_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  clerk_user_id     VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  name              VARCHAR(255),
  role_id           UUID REFERENCES org_roles(id) ON DELETE SET NULL,
  status            VARCHAR(50) DEFAULT 'active',
  invited_by        UUID REFERENCES org_members(id) ON DELETE SET NULL,
  joined_at         TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, clerk_user_id),
  UNIQUE(organization_id, email)
);

-- ════════════════════════════════
-- 5. Invitations
-- ════════════════════════════════
CREATE TABLE IF NOT EXISTS org_invitations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  email             VARCHAR(255) NOT NULL,
  role_id           UUID REFERENCES org_roles(id) ON DELETE SET NULL,
  invited_by        UUID NOT NULL REFERENCES org_members(id),
  token             VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status            VARCHAR(50) DEFAULT 'pending',
  expires_at        TIMESTAMPTZ DEFAULT NOW() + INTERVAL '72 hours',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════
-- 6. Indexes
-- ════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_org_members_clerk_id ON org_members(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_branch_id ON org_members(branch_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON org_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON org_invitations(email);

-- ════════════════════════════════════════════
-- STEP 2 — ADD workspace_id TO EXISTING TABLES
-- ════════════════════════════════════════════

-- contacts
ALTER TABLE IF EXISTS contacts 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_member_id UUID REFERENCES org_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';

-- deals
ALTER TABLE IF EXISTS deals
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_member_id UUID REFERENCES org_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';

-- invoices
ALTER TABLE IF EXISTS invoices
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- activities
ALTER TABLE IF EXISTS activities
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- gmail_messages
ALTER TABLE IF EXISTS gmail_messages
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- drive_files
ALTER TABLE IF EXISTS drive_files
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';

-- audit_logs
ALTER TABLE IF EXISTS audit_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- ai_audit_logs
ALTER TABLE IF EXISTS ai_audit_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Indexes for all new columns (Only for tables that were verified to exist avoiding 42P01 error)
CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_visibility ON contacts(visibility);
CREATE INDEX IF NOT EXISTS idx_deals_org_id ON deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_org_id ON gmail_messages(organization_id);

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'invoices') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(organization_id)';
    END IF;
END $$;

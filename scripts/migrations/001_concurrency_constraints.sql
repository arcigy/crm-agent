-- Migration: 001_concurrency_constraints.sql
-- Description: Add unique constraints, indexes, and sequences for concurrency safety.

-- 1. Google tokens: one row per user, one row per email
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'google_tokens_user_id_unique') THEN
        ALTER TABLE google_tokens ADD CONSTRAINT google_tokens_user_id_unique UNIQUE (user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'google_tokens_email_unique') THEN
        ALTER TABLE google_tokens ADD CONSTRAINT google_tokens_email_unique UNIQUE (email);
    END IF;
END $$;

-- 2. Contacts: Deduplicate and add email per workspace constraint
-- Find and delete duplicates, keeping the newest
DELETE FROM contacts
WHERE id NOT IN (
  SELECT DISTINCT ON (email, user_email) id
  FROM contacts
  ORDER BY email, user_email, date_created DESC
);

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_email_per_user_unique') THEN
        ALTER TABLE contacts ADD CONSTRAINT contacts_email_per_user_unique UNIQUE (email, user_email);
    END IF;
END $$;

-- 3. Invoice number sequence
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000 INCREMENT 1;

-- Set sequence to start above existing max
SELECT setval('invoice_number_seq', (SELECT COALESCE(MAX(invoice_number), 999) FROM invoices));

-- 4. Activity deduplication for Gmail
CREATE UNIQUE INDEX IF NOT EXISTS activities_gmail_id_unique 
  ON activities ((metadata->>'gmail_id')) 
  WHERE metadata->>'gmail_id' IS NOT NULL;

-- 5. Atomic Lead Claiming support for cold_leads
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cold_leads' AND column_name='processing_run_id') THEN
        ALTER TABLE cold_leads ADD COLUMN processing_run_id UUID;
    END IF;
END $$;

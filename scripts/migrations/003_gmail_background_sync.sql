-- Track last processed Gmail history ID per user
ALTER TABLE google_tokens
  ADD COLUMN IF NOT EXISTS last_gmail_history_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gmail_watch_expiry TIMESTAMPTZ;

-- Index for fast email dedup check
CREATE INDEX IF NOT EXISTS idx_activities_gmail_message_id
  ON activities ((metadata->>'gmail_id'))
  WHERE metadata->>'gmail_id' IS NOT NULL;

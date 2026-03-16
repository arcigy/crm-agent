-- Main email mirror table
CREATE TABLE IF NOT EXISTS gmail_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email          VARCHAR(255) NOT NULL,
  gmail_message_id    VARCHAR(255) NOT NULL,
  gmail_thread_id     VARCHAR(255),
  subject             TEXT,
  from_email          VARCHAR(500),
  from_name           VARCHAR(255),
  to_emails           TEXT[],
  cc_emails           TEXT[],
  snippet             TEXT,
  body_text           TEXT,
  body_html           TEXT,
  received_at         TIMESTAMPTZ,
  is_read             BOOLEAN DEFAULT false,
  is_starred          BOOLEAN DEFAULT false,
  is_important        BOOLEAN DEFAULT false,
  has_attachments     BOOLEAN DEFAULT false,
  label_ids           TEXT[],
  size_estimate       INTEGER,
  ai_intent           VARCHAR(100),
  ai_priority         VARCHAR(50),
  ai_summary          TEXT,
  ai_classified_at    TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT gmail_messages_unique 
    UNIQUE (user_email, gmail_message_id)
);

-- Indexes for fast pagination and filtering
CREATE INDEX IF NOT EXISTS idx_gmail_messages_user_received 
  ON gmail_messages(user_email, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_gmail_messages_labels 
  ON gmail_messages USING GIN(label_ids);

CREATE INDEX IF NOT EXISTS idx_gmail_messages_starred 
  ON gmail_messages(user_email, is_starred) 
  WHERE is_starred = true;

CREATE INDEX IF NOT EXISTS idx_gmail_messages_unread 
  ON gmail_messages(user_email, is_read) 
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_gmail_messages_thread 
  ON gmail_messages(gmail_thread_id);

-- Sync state tracking per user per label
CREATE TABLE IF NOT EXISTS gmail_sync_state (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email          VARCHAR(255) NOT NULL,
  label_id            VARCHAR(100) NOT NULL,
  history_id          VARCHAR(50),
  total_messages      INTEGER DEFAULT 0,
  synced_messages     INTEGER DEFAULT 0,
  last_full_sync      TIMESTAMPTZ,
  last_incremental    TIMESTAMPTZ,
  sync_status         VARCHAR(50) DEFAULT 'pending',
  
  CONSTRAINT gmail_sync_state_unique 
    UNIQUE (user_email, label_id)
);

-- Accurate label counts (updated after each sync)
CREATE TABLE IF NOT EXISTS gmail_label_counts (
  user_email          VARCHAR(255) NOT NULL,
  label_id            VARCHAR(100) NOT NULL,
  total_count         INTEGER DEFAULT 0,
  unread_count        INTEGER DEFAULT 0,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_email, label_id)
);

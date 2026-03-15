-- Add Gmail label ID to CRM labels table
ALTER TABLE contact_labels 
  ADD COLUMN IF NOT EXISTS gmail_label_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#8e63ce';

-- Index for fast lookup by Gmail label ID
CREATE INDEX IF NOT EXISTS idx_contact_labels_gmail_id 
  ON contact_labels(gmail_label_id) 
  WHERE gmail_label_id IS NOT NULL;

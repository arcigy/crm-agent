-- =====================================================
-- ANDROID SYNC MIGRATION (SMS & CALLS)
-- =====================================================

-- Table for unified android logs
CREATE TABLE IF NOT EXISTS android_logs (
    id SERIAL PRIMARY KEY,
    
    -- Sync Metadata
    type VARCHAR(20) NOT NULL, -- 'sms', 'call'
    direction VARCHAR(20),      -- 'incoming', 'outgoing', 'missed', 'rejected'
    phone_number VARCHAR(50) NOT NULL,
    
    -- Content
    body TEXT,                  -- SMS text
    duration INTEGER DEFAULT 0,  -- Call duration in seconds
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata (všetky dostupné info v JSON)
    extra_data JSONB DEFAULT '{}',
    
    -- Relationship
    contact_id INTEGER,         -- Will be linked via phone number lookup
    
    -- Safety First
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for phone number lookup
CREATE INDEX IF NOT EXISTS idx_android_logs_phone ON android_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_android_logs_type ON android_logs(type);
CREATE INDEX IF NOT EXISTS idx_android_logs_deleted ON android_logs(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE android_logs ENABLE ROW LEVEL SECURITY;

-- Allow all for now (authenticated in production)
CREATE POLICY "Enable all for webhooks" ON android_logs FOR ALL USING (true);

COMMENT ON TABLE android_logs IS 'Logs for SMS and Calls synced from Android devices';

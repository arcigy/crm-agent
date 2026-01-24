-- =====================================================
-- EMAIL ANALYSIS CACHE (AI MEMORY)
-- =====================================================

CREATE TABLE IF NOT EXISTS email_analysis (
    message_id TEXT PRIMARY KEY, -- ID správy z Gmailu
    
    -- AI Výsledky (Uložené ako štruktúrované dáta)
    intent VARCHAR(50),      -- dopyt, spam, etc.
    priority VARCHAR(20),    -- vysoka, nizka
    sentiment VARCHAR(20),   -- pozitivny, negativny
    service_category VARCHAR(100),
    estimated_budget VARCHAR(100),
    next_step TEXT,
    summary TEXT,
    
    -- Metadáta
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pre rýchle vyhľadávanie pri načítavaní inboxu
CREATE INDEX IF NOT EXISTS idx_email_analysis_message_id ON email_analysis(message_id);

-- RLS Policies
ALTER TABLE email_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analysis" ON email_analysis FOR SELECT USING (true);
CREATE POLICY "Users can insert analysis" ON email_analysis FOR INSERT WITH CHECK (true);

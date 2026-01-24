-- Create table for Google Calendar tokens
CREATE TABLE IF NOT EXISTS google_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date BIGINT,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own google tokens') THEN
        CREATE POLICY "Users can view their own google tokens" ON google_tokens
            FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own google tokens') THEN
        CREATE POLICY "Users can insert their own google tokens" ON google_tokens
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own google tokens') THEN
        CREATE POLICY "Users can update their own google tokens" ON google_tokens
            FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);
    END IF;
END $$;

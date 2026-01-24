-- Create a staging table for incoming mobile contacts
-- This acts as a holding area before they are processed into main contacts
CREATE TABLE IF NOT EXISTS mobile_sync_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    carddav_uid text NOT NULL, -- The unique ID from the phone
    vcard_data text NOT NULL,  -- The raw contact data
    device_agent text,         -- 'iOS/17.0' or 'Android/...'
    status text DEFAULT 'pending', -- pending, processed, error
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(user_id, carddav_uid)
);

-- Index for faster syncing
CREATE INDEX IF NOT EXISTS mobile_sync_queue_user_idx ON mobile_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS mobile_sync_queue_status_idx ON mobile_sync_queue(status);

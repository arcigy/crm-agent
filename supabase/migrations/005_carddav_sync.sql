-- Add CardDAV sync fields to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS carddav_uid text UNIQUE,
ADD COLUMN IF NOT EXISTS etag text,
ADD COLUMN IF NOT EXISTS vcard_cache text; -- Cache for the full vCard string to speed up sync

-- Create an index for faster lookups during sync
CREATE INDEX IF NOT EXISTS contacts_carddav_uid_idx ON contacts(carddav_uid);

-- Create a function to auto-generate UID if missing
CREATE OR REPLACE FUNCTION generate_carddav_uid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.carddav_uid IS NULL THEN
        NEW.carddav_uid := gen_random_uuid();
    END IF;
    NEW.etag := extract(epoch from now())::text; -- Simple etag based on timestamp
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure every contact has a UID before insert
DROP TRIGGER IF EXISTS ensure_carddav_uid ON contacts;
CREATE TRIGGER ensure_carddav_uid
BEFORE INSERT ON contacts
FOR EACH ROW
EXECUTE FUNCTION generate_carddav_uid();

-- Trigger to update ETAG on every change
CREATE OR REPLACE FUNCTION update_contact_etag()
RETURNS TRIGGER AS $$
BEGIN
    NEW.etag := extract(epoch from now())::text;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_etag_on_change ON contacts;
CREATE TRIGGER update_etag_on_change
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION update_contact_etag();

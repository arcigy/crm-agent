-- 1. TABUĽKA PROFILOV (Rozšírenie základného Auth užívateľa)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABUĽKA KONTAKTOV (Srdce CRM)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  tags TEXT[], -- Pole tagov (VIP, Lead, atď.)
  notes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- Soft Delete
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABUĽKA PRÍSTUPOV K NÁSTROJOM (Prepojenie so Stripe)
CREATE TABLE user_tool_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL, -- ID z tvojho registry.ts
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABUĽKA AUDIT LOGOV (Sledovanie zmien)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- napr. 'DELETE_CONTACT', 'TOOL_PURCHASE'
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INDEXY PRE RÝCHLOSŤ
CREATE INDEX idx_contacts_owner ON contacts(owner_id);
CREATE INDEX idx_tool_access_user ON user_tool_access(user_id);
CREATE INDEX idx_contacts_deleted ON contacts(deleted_at) WHERE deleted_at IS NULL;

-- 6. SECURITY (RLS - Row Level Security)
-- Zapnutie ochrany, aby užívateľ videl len svoje dáta
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tool_access ENABLE ROW LEVEL SECURITY;

-- Politiky pre Kontakty
CREATE POLICY "Users can manage their own contacts" ON contacts
  FOR ALL USING (auth.uid() = owner_id);

-- Politiky pre Prístupy k nástrojom
CREATE POLICY "Users can view their own tool access" ON user_tool_access
  FOR SELECT USING (auth.uid() = user_id);

-- 7. FUNKCIA NA AUTOMATICKÝ PROFIL PRI REGISTRÁCII
-- Keď sa niekto zaregistruje cez Supabase Auth, vytvorí mu to riadok v profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add unique constraint to prevent duplicate access records
ALTER TABLE user_tool_access ADD CONSTRAINT unique_user_tool UNIQUE (user_id, tool_id);

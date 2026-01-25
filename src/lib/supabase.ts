// Supabase stub - NOT USED
// All data operations use Directus
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Only create if env vars exist (for backward compatibility during build)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

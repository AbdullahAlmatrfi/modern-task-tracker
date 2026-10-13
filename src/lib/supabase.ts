import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null when the two env vars are missing: the app then runs on this device only. */
export const supabase: SupabaseClient | null =
  url && anon && !url.includes('YOUR-PROJECT') ? createClient(url, anon) : null;

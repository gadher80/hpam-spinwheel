import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Supabase env vars missing — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(url ?? '', anonKey ?? '');

// Single shared row holds the whole wheel state (mirrors the old localStorage blob).
export const STATE_ROW_ID = 1;
export const STATE_TABLE = 'wheel_state';

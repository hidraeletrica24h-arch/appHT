import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Supabase features will be disabled.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const checkSupabaseConnection = async () => {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  try {
    // Attempt a lightweight query instead of auth to check connection
    const { error } = await supabase.from('configs').select('id').limit(1);
    // Ignore RLS errors (typically code 42501 or empty array), we just want to know if the DB is reachable
    if (error && error.code !== '42501') throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

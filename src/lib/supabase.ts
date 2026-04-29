import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables missing!');
}

// Create base client
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

// Call this after login — injects JWT token into all future Supabase queries
export function setSupabaseToken(token: string) {
  supabase.functions.setAuth(token);
  // Store token for page refresh
  localStorage.setItem('ayush_token', token);
}

// Call this on logout — removes token
export function clearSupabaseToken() {
  supabase.functions.setAuth('');
  localStorage.removeItem('ayush_token');
  localStorage.removeItem('ayush_session');
}

// Call this on app load — restores token if page was refreshed
export function restoreSupabaseToken() {
  const token = localStorage.getItem('ayush_token');
  if (token) {
    supabase.functions.setAuth(token);
    return token;
  }
  return null;
}

import { createClient } from '@supabase/supabase-js';

// Using provided credentials directly to ensure the preview works immediately
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://czjxoavqlznzvhypqtwe.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6anhvYXZxbHpuenZoeXBxdHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTM2ODgsImV4cCI6MjA5Mjg4OTY4OH0.uKLslvmxI106GY_PAQCrxKZVm5KbZ07wG2HBZdSPTZc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options = {}) => {
      const token = localStorage.getItem('token');
      if (token) {
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);
        options.headers = headers;
      }
      return fetch(url, options);
    }
  }
});

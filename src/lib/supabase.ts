import { createClient } from '@supabase/supabase-js';

// Using provided credentials directly to ensure the preview works immediately
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://waxolpvdayhkqhtfnbfk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheG9scHZkYXloa3FodGZuYmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjA4NDIsImV4cCI6MjA4NzMzNjg0Mn0.zzycT73G_iMnS_gimqqrAeWOzV9bR1njvWey5OMxGY8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

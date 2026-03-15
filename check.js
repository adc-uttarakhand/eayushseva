import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://waxolpvdayhkqhtfnbfk.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheG9scHZkYXloa3FodGZuYmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjA4NDIsImV4cCI6MjA4NzMzNjg0Mn0.zzycT73G_iMnS_gimqqrAeWOzV9bR1njvWey5OMxGY8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('patients').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Patient Columns:', Object.keys(data[0]));
  } else {
    console.log('No patient data found');
  }
}
check();

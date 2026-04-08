import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://waxolpvdayhkqhtfnbfk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheG9scHZkYXloa3FodGZuYmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjA4NDIsImV4cCI6MjA4NzMzNjg0Mn0.zzycT73G_iMnS_gimqqrAeWOzV9bR1njvWey5OMxGY8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('master_therapies').select('*');
  console.error('master_therapies:', data?.length, error);
}

run();

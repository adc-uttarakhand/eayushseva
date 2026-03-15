import { supabase } from './src/lib/supabase';

async function check() {
  const { data, error } = await supabase.from('hospitals').select('*').limit(1);
  if (error) {
    console.error('Error fetching from hospitals:', error);
    const { data: data2, error: error2 } = await supabase.from('hospital').select('*').limit(1);
    if (error2) {
      console.error('Error fetching from hospital:', error2);
    } else {
      console.log('Keys in hospital table:', Object.keys(data2[0]));
    }
  } else {
    console.log('Keys in hospitals table:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  }
}

check();

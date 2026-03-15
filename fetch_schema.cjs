const supabaseUrl = 'https://waxolpvdayhkqhtfnbfk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheG9scHZkYXloa3FodGZuYmZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc2MDg0MiwiZXhwIjoyMDg3MzM2ODQyfQ.9fmfeXL_rNI4sTTYZMaMbtkNgCQaKFwe0tgMg9bYHzE';

async function fetchSpec() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const spec = await res.json();
    console.log('medicine_inventory:', Object.keys(spec.definitions.medicine_inventory.properties));
    console.log('medicine_master:', Object.keys(spec.definitions.medicine_master.properties));
  } catch (err) {
    console.error(err.message);
  }
}

fetchSpec();

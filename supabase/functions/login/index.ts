import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// You should set JWT_SECRET as an environment variable in Supabase.
const jwtSecret = Deno.env.get('JWT_SECRET') || 'your-super-secret-jwt-key-replace-me';

// Function to generate JWT Token
async function generateJWT(payload: any) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign", "verify"]
  );

  return create({ alg: "HS512", typ: "JWT" }, { ...payload, exp: getNumericDate(60 * 60 * 24) }, key); // 24 hours
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    // Initialize Supabase Client with Service Role Key to bypass RLS and read admin records
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Admin Login check
    const { data: adminData } = await supabaseClient
      .from('admin_logins')
      .select('*')
      .eq('admin_userid', trimmedUsername)
      .single();

    if (adminData && adminData.admin_password === password) {
      let role = 'DISTRICT_ADMIN';
      if (adminData.admin_access === 'PHARMACY_MANAGER') {
        role = 'PHARMACY_MANAGER';
      } else {
        const hasAllDistricts = adminData.access_districts?.includes('All');

        if (hasAllDistricts) {
          if (adminData.admin_userid === 'adc.uttarakhand') {
            role = 'SUPER_ADMIN';
          } else {
            role = 'STATE_ADMIN';
          }
        } else if (adminData.admin_userid?.toLowerCase().includes('medicine') || adminData.name?.toLowerCase().includes('medicine') || adminData.admin_name?.toLowerCase().includes('medicine')) {
          role = 'DISTRICT_MEDICINE_INCHARGE';
        }
      }

      const userDetails = {
        role: role,
        id: adminData.id?.toString() || adminData.admin_userid,
        name: adminData.name || adminData.admin_name || adminData.admin_userid,
        access_districts: adminData.access_districts || [],
        access_systems: adminData.access_systems || [],
        district: adminData.district,
      };

      const token = await generateJWT(userDetails);

      return new Response(
        JSON.stringify({ session: userDetails, token, type: 'admin' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Staff Login check
    const { data: staffDataList, error: staffError } = await supabaseClient
      .from('staff')
      .select('*')
      .or(`mobile_number.eq."${trimmedUsername}",employee_id.eq."${trimmedUsername}"`);

    if (staffDataList && staffDataList.length > 0) {
      // Check password using the first matched staff
      const firstStaff = staffDataList[0];
      if (firstStaff.login_password === password || firstStaff.password === password) {
        // Find all hospital associations for this person
        const staffIds = staffDataList.map(s => s.id);
        
        // Direct links
        const directLinks = staffDataList.map(s => {
          const links = [{
            staffId: s.id,
            hospitalId: s.hospital_id,
            staffRecord: s
          }];
          
          if (s.secondary_hospitals && Array.isArray(s.secondary_hospitals)) {
            s.secondary_hospitals.forEach((h: any) => {
              links.push({ staffId: s.id, hospitalId: h.hospital_id, staffRecord: s });
            });
          }
          return links;
        }).flat().filter(l => l.hospitalId);

        // Incharge links
        const { data: inchargeHospitals } = await supabaseClient
          .from('hospitals')
          .select('hospital_id, incharge_staff_id')
          .in('incharge_staff_id', staffIds);
        
        const inchargeLinks = inchargeHospitals?.map(h => ({
          staffId: h.incharge_staff_id,
          hospitalId: h.hospital_id,
          staffRecord: staffDataList.find(s => s.id === h.incharge_staff_id)
        })) || [];

        const allLinksMap = new Map();
        [...directLinks, ...inchargeLinks].forEach(link => {
          const key = `${link.staffId}-${link.hospitalId}`;
          if (!allLinksMap.has(key)) {
            allLinksMap.set(key, link);
          }
        });

        const allLinks = Array.from(allLinksMap.values());

        // We sanitize staffRecord to avoid returning passwords
        const sanitizeStaff = (staff: any) => {
          const { login_password, password, ...safe } = staff;
          return safe;
        };

        if (allLinks.length > 1) {
          const hospitalIds = allLinks.map(l => l.hospitalId);
          const { data: hospitals } = await supabaseClient
            .from('hospitals')
            .select('hospital_id, facility_name, district, block')
            .in('hospital_id', hospitalIds);

          const options = allLinks.map(l => {
            const hosp = hospitals?.find(h => h.hospital_id === l.hospitalId);
            return {
              ...sanitizeStaff(l.staffRecord),
              hospital_id: l.hospitalId,
              hospitalName: hosp?.facility_name || 'Unknown Hospital',
              location: hosp ? `${hosp.block}, ${hosp.district}` : 'Unknown Location'
            };
          });

          return new Response(
            JSON.stringify({ options, type: 'staff_multiple' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        } else if (allLinks.length === 1) {
          const singleLink = allLinks[0];
          const staffRecord = sanitizeStaff(singleLink.staffRecord);
          // Return safe record
          return new Response(
            JSON.stringify({ record: { ...staffRecord, hospital_id: singleLink.hospitalId }, type: 'staff_single' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }
    }

    // 3. Hospital Login check
    const { data: hospitalLoginData } = await supabaseClient
      .from('hospitals')
      .select('hospital_id, facility_name, hospital_password, district')
      .eq('hospital_id', trimmedUsername)
      .maybeSingle();

    if (hospitalLoginData && hospitalLoginData.hospital_password === password) {
      const userDetails = {
        role: 'HOSPITAL',
        id: hospitalLoginData.hospital_id,
        name: hospitalLoginData.facility_name,
        district: hospitalLoginData.district,
      };

      const token = await generateJWT(userDetails);

      return new Response(
        JSON.stringify({ session: userDetails, token, type: 'hospital' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // No match found or wrong password
    return new Response(
      JSON.stringify({ error: 'Invalid username or password' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

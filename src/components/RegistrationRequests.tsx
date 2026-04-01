import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Check, X } from 'lucide-react';

export default function RegistrationRequests({ session }: { session: any }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('RegistrationRequests rendered, session:', session);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    console.log('Fetching requests, session:', session);
    
    // Step A: Fetch all pending requests
    const { data: rawRequests, error: reqErr } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('status', 'PENDING');
      
    if (reqErr) {
      console.error('Error fetching requests:', reqErr);
      setLoading(false);
      return;
    }

    console.log('Raw pending requests:', rawRequests);

    let filteredRequests = rawRequests || [];
    const role = session.role?.toUpperCase();

    // Step B: Manual filtering
    if (role === 'INCHARGE') {
      console.log('Filtering for INCHARGE, hospitalId:', session.hospitalId);
      filteredRequests = filteredRequests.filter(req => req.hospital_id === session.hospitalId);
    } else if (role === 'DISTRICT_ADMIN') {
      const adminDistrict = session.access_districts?.[0];
      console.log('Admin District identified as:', adminDistrict);
      
      if (adminDistrict) {
        const { data: distHospitals, error: hospErr } = await supabase
          .from('hospitals')
          .select('hospital_id')
          .eq('district', adminDistrict);
        
        if (hospErr) {
          console.error('Error fetching hospitals:', hospErr);
        }
        
        console.log('Hospitals in district:', distHospitals);
        const hospitalIds = distHospitals?.map(h => h.hospital_id) || [];
        filteredRequests = filteredRequests.filter(req => hospitalIds.includes(req.hospital_id));
      } else {
        console.warn('DISTRICT_ADMIN role but no access_districts found');
        filteredRequests = [];
      }
    } else if (role === 'STATE_ADMIN' || role === 'SUPER_ADMIN') {
      console.log('No filtering applied for role:', session.role);
    }

    console.log('Filtered requests:', filteredRequests);
    setRequests(filteredRequests);
    setLoading(false);
  };

  const handleApprove = async (request: any) => {
    setLoading(true);
    // 1. Insert into staff table
    const { error: staffError } = await supabase.from('staff').insert({
      full_name: request.full_name,
      mobile_number: request.mobile_number,
      role: request.role,
      hospital_id: request.hospital_id, // hospital_id is TEXT
      login_password: 'ayush@123',
      is_active: true
    });

    if (staffError) {
      console.error('Error adding to staff:', staffError);
      alert('Error approving request.');
      setLoading(false);
      return;
    }

    // 2. Update registration_requests status
    const { error: reqError } = await supabase.from('registration_requests').update({ status: 'APPROVED' }).eq('id', request.id);
    
    if (reqError) {
      console.error('Error updating request status:', reqError);
      alert('Error updating request status.');
      setLoading(false);
      return;
    }

    alert('Employee approved and can now login with ayush@123');
    fetchRequests();
    setLoading(false);
  };

  const handleReject = async (id: string) => {
    await supabase.from('registration_requests').update({ status: 'REJECTED' }).eq('id', id);
    fetchRequests();
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <p className="text-center text-slate-500 py-10">No pending registration requests found in the database.</p>
      ) : (
        requests.map((req, index) => (
          <div key={`req-${req.id}-${index}`} className="p-4 bg-white border border-gray-100 rounded-2xl flex justify-between items-center">
            <div>
              <h3 className="font-bold">{req.full_name}</h3>
              <p className="text-sm text-slate-500">{req.role} - {req.mobile_number}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleApprove(req)} className="p-2 bg-emerald-100 text-emerald-600 rounded-full"><Check size={18} /></button>
              <button onClick={() => handleReject(req.id)} className="p-2 bg-red-100 text-red-600 rounded-full"><X size={18} /></button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, Building2, Calendar, FileText, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import RegistrationRequests from './RegistrationRequests';

interface TransferRequest {
  id: string;
  staff_id: string;
  current_hospital_id: string;
  new_hospital_id: string;
  date_of_joining: string;
  reason: string;
  status: string;
  created_at: string;
  staff?: {
    full_name: string;
    employee_id: string;
    role: string;
    postings: any[];
  };
  current_hospital?: {
    facility_name: string;
    district: string;
  };
  new_hospital?: {
    facility_name: string;
    district: string;
  };
}

export default function TransferRequests({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState<'transfer' | 'registration'>('transfer');
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [session]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch transfer requests
      const { data: requestsData, error: fetchError } = await supabase
        .from('transfer_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.code === '42P01') {
          setError('Transfer requests table is not configured in the database yet.');
          return;
        } else {
          throw fetchError;
        }
      }

      if (requestsData && requestsData.length > 0) {
        // Fetch related staff
        const staffIds = [...new Set(requestsData.map(r => r.staff_id).filter(Boolean))];
        const { data: staffData } = await supabase
          .from('staff')
          .select('id, full_name, employee_id, role, postings')
          .in('id', staffIds);

        const staffMap = new Map(staffData?.map(s => [s.id, s]) || []);

        // Fetch related hospitals
        const hospitalIds = [...new Set([
          ...requestsData.map(r => r.current_hospital_id),
          ...requestsData.map(r => r.new_hospital_id)
        ].filter(Boolean))];

        const { data: hospitalData } = await supabase
          .from('hospitals')
          .select('hospital_id, facility_name, district')
          .in('hospital_id', hospitalIds);

        const hospitalMap = new Map(hospitalData?.map(h => [h.hospital_id, h]) || []);

        // Combine data
        let enrichedData = requestsData.map(req => ({
          ...req,
          staff: staffMap.get(req.staff_id),
          current_hospital: hospitalMap.get(req.current_hospital_id),
          new_hospital: hospitalMap.get(req.new_hospital_id)
        }));

        if (session.role === 'DISTRICT_ADMIN' && session.access_districts && !session.access_districts.includes('All')) {
          enrichedData = enrichedData.filter((req: any) => 
            req.new_hospital && session.access_districts.includes(req.new_hospital.district)
          );
        }
        
        setRequests(enrichedData);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      console.error('Error fetching transfer requests:', err);
      setError(err.message || 'Failed to load transfer requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: TransferRequest) => {
    try {
      setProcessingId(request.id);
      
      // 1. Update request status
      const { error: updateError } = await supabase
        .from('transfer_requests')
        .update({ status: 'Approved' })
        .eq('id', request.id);
        
      if (updateError) throw updateError;

      // 2. Update staff record
      if (request.staff) {
        const currentPostings = request.staff.postings || [];
        
        // Add the new posting
        const newPosting = {
          id: Date.now().toString(),
          hospitalName: request.new_hospital?.facility_name || 'Unknown Hospital',
          fromDate: request.date_of_joining,
          toDate: '',
          status: 'Sugam' // Default or could be derived
        };

        // Update the previous posting's toDate if it's empty
        const updatedPostings = currentPostings.map((p: any, index: number) => {
          if (index === currentPostings.length - 1 && !p.toDate) {
            return { ...p, toDate: request.date_of_joining };
          }
          return p;
        });

        updatedPostings.push(newPosting);

        const { error: staffUpdateError } = await supabase
          .from('staff')
          .update({ 
            hospital_id: request.new_hospital_id,
            postings: updatedPostings
          })
          .eq('id', request.staff_id);

        if (staffUpdateError) throw staffUpdateError;
      }

      // Refresh list
      fetchRequests();
    } catch (err: any) {
      console.error('Error approving request:', err);
      alert('Failed to approve request: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      const { error } = await supabase
        .from('transfer_requests')
        .update({ status: 'Rejected' })
        .eq('id', id);
        
      if (error) throw error;
      fetchRequests();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-slate-400 font-medium">Loading transfer requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center max-w-2xl mx-auto mt-12">
        <h3 className="font-bold text-lg mb-2">Configuration Required</h3>
        <p>{error}</p>
        <p className="text-sm mt-4 opacity-80">
          Please create a 'transfer_requests' table in Supabase with the following columns:
          id (uuid), staff_id (uuid), current_hospital_id (text), new_hospital_id (text), date_of_joining (date), reason (text), status (text), created_at (timestamp).
        </p>
      </div>
    );
  }

  return (
    <div className="pt-24 px-4 sm:px-8 max-w-7xl mx-auto pb-40">
      <div className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
          Requests
        </h1>
        <div className="flex gap-4 mt-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`pb-2 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'transfer' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Transfer Requests
          </button>
        </div>
      </div>

      {activeTab === 'transfer' ? (
        requests.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-gray-200">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No Pending Requests</h3>
            <p className="text-slate-500 mt-2">There are currently no hospital transfer requests to review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {requests.map((req) => (
              <div key={req.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                        <User size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{req.staff?.full_name || 'Unknown Staff'}</h3>
                        <p className="text-xs text-slate-500">{req.staff?.role} • {req.staff?.employee_id}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      req.status === 'Pending Approval' ? 'bg-amber-100 text-amber-700' :
                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">From</p>
                      <p className="font-medium text-slate-900 text-sm flex items-center gap-1">
                        <Building2 size={14} className="text-slate-400" />
                        {req.current_hospital?.facility_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500 ml-5">{req.current_hospital?.district}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">To</p>
                      <p className="font-medium text-emerald-700 text-sm flex items-center gap-1">
                        <Building2 size={14} className="text-emerald-500" />
                        {req.new_hospital?.facility_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-emerald-600/70 ml-5">{req.new_hospital?.district}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                        <Calendar size={12} /> Date of Joining
                      </p>
                      <p className="text-sm font-medium text-slate-900">{new Date(req.date_of_joining).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                        <FileText size={12} /> Reason
                      </p>
                      <p className="text-sm text-slate-600 line-clamp-2">{req.reason}</p>
                    </div>
                  </div>
                </div>

                {req.status === 'Pending Approval' && (
                  <div className="flex md:flex-col gap-3 w-full md:w-auto">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processingId === req.id}
                      className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === req.id ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={processingId === req.id}
                      className="flex-1 md:flex-none bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === req.id ? <Loader2 className="animate-spin" size={18} /> : <X size={18} />}
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <RegistrationRequests session={session} />
      )}
    </div>
  );
}

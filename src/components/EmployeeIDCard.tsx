import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Download, CheckCircle, Clock, XCircle,
  Upload, Eye, Loader2, AlertCircle, User,
  Building2, Calendar, Phone, Mail, MapPin,
  Droplets, Hash, Search, Filter, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────
interface StaffData {
  id: string;
  full_name: string;
  father_name?: string;
  role: string;
  dob?: string;
  employee_id?: string;
  mobile_number: string;
  blood_group?: string;
  email_id?: string;
  current_residential_address?: string;
  permanent_address?: string;
  photograph_url?: string;
  employment_class?: string;
  present_district?: string;
  present_hospital?: string;
  district?: string;
}

interface IDCardRequest {
  id: string;
  staff_id: string;
  hospital_id?: string;
  district?: string;
  status: string;
  requested_at: string;
  approved_by?: string;
  approved_by_id?: string;
  approved_at?: string;
  approver_role?: string;
  signature_url?: string;
  valid_from?: string;
  rejection_reason?: string;
  staff?: StaffData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const isSuperOrState = (s: any) => ['SUPER_ADMIN', 'STATE_ADMIN'].includes(s?.role);
const isDistrictAdmin = (s: any) => s?.role === 'DISTRICT_ADMIN';
const isAdmin = (s: any) => isSuperOrState(s) || isDistrictAdmin(s);

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function validTill(from?: string) {
  if (!from) return '—';
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return fmt(d.toISOString());
}

function statusColor(status: string) {
  if (status === 'approved') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

function statusIcon(status: string) {
  if (status === 'approved') return <CheckCircle size={12} />;
  if (status === 'rejected') return <XCircle size={12} />;
  return <Clock size={12} />;
}

// ── ID Card Visual Component ──────────────────────────────────────────────────
function IDCardPreview({ staff, request, signatureUrl }: { staff: StaffData; request?: IDCardRequest; signatureUrl?: string }) {
  const validFrom = (request?.status === 'approved' && request?.approved_at)
    ? request.approved_at.split('T')[0]
    : (request?.valid_from || new Date().toISOString().split('T')[0]);
  const cardId = request?.id?.slice(0, 8).toUpperCase() || '--------';

  // 54mm x 86mm at 96dpi = 204px x 325px (portrait)
  return (
    <div
      className="bg-white overflow-hidden shadow-2xl border border-slate-200 flex-shrink-0"
      style={{
        width: '204px',
        height: '325px',
        fontFamily: "'Georgia', serif",
        borderRadius: '6px',
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-2.5 py-1.5 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <img src="https://czjxoavqlznzvhypqtwe.supabase.co/storage/v1/object/public/logo/Uttarakhand%20logo.png" alt="Logo" className="h-6 w-auto" />
          <div>
            <p className="text-white font-bold text-[7px] tracking-widest uppercase leading-tight">Govt. of Uttarakhand</p>
            <p className="text-emerald-200 text-[6px] leading-tight">Directorate of Ayurvedic & Unani Services</p>
          </div>
        </div>
        <div className="bg-white/15 rounded px-2 py-0.5 mt-0.5">
          <p className="text-white font-bold text-[7px] tracking-wider uppercase">Employee Identity Card</p>
        </div>
      </div>

      {/* Photo + Name Row */}
      <div className="px-2.5 pt-1.5 flex gap-2">
        {/* Photo */}
        <div className="flex-shrink-0">
          <div className="w-14 h-16 border-2 border-emerald-700 overflow-hidden bg-slate-100 flex items-center justify-center" style={{ borderRadius: '4px' }}>
            {staff.photograph_url ? (
              <img src={staff.photograph_url} alt={staff.full_name} className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-slate-300" />
            )}
          </div>
          {/* Blood Group below photo */}
          <div className="mt-0.5 bg-red-600 text-white text-[7px] text-center font-bold px-1 py-0.5" style={{ borderRadius: '3px' }}>
            {staff.blood_group || 'N/A'}
          </div>
        </div>

        {/* Name + Role */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-emerald-900 text-[9px] leading-tight">{staff.full_name}</p>
          {staff.father_name && (
            <p className="text-slate-500 text-[7px] mt-0.5 leading-tight">S/O D/O {staff.father_name}</p>
          )}
          <div className="mt-1 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5" style={{ borderRadius: '3px' }}>
            <p className="text-emerald-800 font-bold text-[7px] uppercase leading-tight">{staff.role?.replace(/_/g, ' ')}</p>
            {staff.employment_class && <p className="text-emerald-600 text-[6px] leading-tight mt-0.5">{staff.employment_class}</p>}
            {staff.present_hospital && (
              <p className="text-emerald-700 text-[6px] leading-tight mt-0.5 line-clamp-2">{staff.present_hospital}</p>
            )}
            {staff.present_district && (
              <p className="text-emerald-700 text-[6px] leading-tight mt-0.5">{staff.present_district}</p>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="px-2.5 mt-1.5 space-y-0.5">
        {/* Employee ID */}
        {staff.employee_id && (
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[6px] w-14 flex-shrink-0">EMP ID:</span>
            <span className="text-[7px] font-mono font-bold text-slate-700">{staff.employee_id}</span>
          </div>
        )}
        {/* Email */}
        {staff.email_id && (
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[6px] w-14 flex-shrink-0">Email:</span>
            <span className="text-[7px] text-slate-700">{staff.email_id}</span>
          </div>
        )}
        {/* DOB */}
        {staff.dob && (
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[6px] w-14 flex-shrink-0">DOB:</span>
            <span className="text-[7px] text-slate-700">{fmt(staff.dob)}</span>
          </div>
        )}
        {/* Mobile */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 text-[6px] w-14 flex-shrink-0">Mobile:</span>
          <span className="text-[7px] text-slate-700">{staff.mobile_number}</span>
        </div>
        {/* Address */}
        {staff.current_residential_address && (
          <div className="flex items-start gap-1 mt-2">
            <span className="text-slate-400 text-[6px] w-14 flex-shrink-0 mt-0.5">Address:</span>
            <span className="text-[7px] text-slate-600 leading-tight line-clamp-3">{staff.current_residential_address}</span>
          </div>
        )}
      </div>

      {/* Validity */}
      <div className="mx-2.5 mt-1.5 flex items-center justify-between bg-slate-50 border border-slate-200 px-1.5 py-1" style={{ borderRadius: '4px' }}>
        <div>
          <p className="text-[5.5px] text-slate-400 uppercase tracking-wider">Valid From — Till</p>
          <p className="text-[7px] font-bold text-slate-700">{fmt(validFrom)} — {validTill(validFrom)}</p>
        </div>
        <div className="text-right">
          <p className="text-[5.5px] text-slate-400">ID No.</p>
          <p className="text-[6.5px] font-mono font-bold text-emerald-800">{cardId}</p>
        </div>
      </div>

      {/* Signature */}
      <div className="mx-2.5 mt-3 flex items-end justify-between border-t border-dashed border-slate-200 pt-4">
        <div>
          <div className="w-14 border-b border-slate-400 mb-0.5" />
          <p className="text-[6px] text-slate-400">Employee Sign</p>
        </div>
        <div className="text-right">
          {signatureUrl ? (
            <img src={signatureUrl} alt="Sign" className="h-5 object-contain ml-auto mb-0.5" />
          ) : (
            <div className="w-16 border-b border-slate-400 mb-0.5" />
          )}
          <p className="text-[6px] text-slate-500">Authorized Signatory</p>
          {request?.approved_by && <p className="text-[6px] font-bold text-emerald-800 leading-tight">{request.approved_by}</p>}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-emerald-800 px-2.5 py-1 flex justify-between items-center mt-1">
        <p className="text-emerald-200 text-[5.5px]">If found, return to nearest Govt. AYUSH facility</p>
        <p className="text-emerald-300 text-[6px] font-mono">e-AYUSH</p>
      </div>
    </div>
  );
}

// ── Staff View (Request + Download) ──────────────────────────────────────────
function StaffView({ session }: { session: any }) {
  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const [request, setRequest] = useState<IDCardRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [toast, setToast] = useState('');
  const [showCard, setShowCard] = useState(false);

  const staffId = session?.id;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: staff } = await supabase
        .from('staff')
        .select('id, full_name, father_name, role, dob, employee_id, mobile_number, blood_group, email_id, current_residential_address, permanent_address, photograph_url, employment_class, present_district, present_hospital')
        .eq('id', staffId)
        .maybeSingle();
      setStaffData(staff);

      const { data: req } = await supabase
        .from('id_card_requests')
        .select('*')
        .eq('staff_id', staffId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setRequest(req);
      setLoading(false);
    };
    load();
  }, [staffId]);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await supabase.from('id_card_requests').insert({
        staff_id: staffId,
        hospital_id: session?.activeHospitalId || session?.hospitalId,
        district: staffData?.present_district || session?.district,
        status: 'pending',
      });
      const { data: req } = await supabase.from('id_card_requests').select('*').eq('staff_id', staffId).order('requested_at', { ascending: false }).limit(1).maybeSingle();
      setRequest(req);
      setToast('ID Card request submitted!');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setToast('Error: ' + err.message);
    } finally {
      setRequesting(false);
    }
  };

  const handleDownload = async () => {
    if (!request || request.status !== 'approved') return;
    setShowCard(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-emerald-500 animate-spin" /></div>;
  if (!staffData) return <div className="text-center py-20 text-slate-400">Staff data not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
          <Shield size={20} className="text-emerald-600" /> My ID Card
        </h2>

        {!request ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield size={24} className="text-emerald-400" />
            </div>
            <p className="text-slate-500 text-sm mb-4">You haven't requested an ID card yet.</p>
            <button onClick={handleRequest} disabled={requesting}
              className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200 disabled:opacity-50 flex items-center gap-2 mx-auto">
              {requesting ? <><Loader2 size={16} className="animate-spin" />Requesting...</> : <><Shield size={16} />Request ID Card</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${statusColor(request.status)}`}>
              {statusIcon(request.status)}
              <div className="flex-1">
                <p className="font-bold text-sm capitalize">{request.status}</p>
                <p className="text-xs opacity-70">
                  Requested {fmt(request.requested_at)}
                  {request.approved_at && ` • Approved ${fmt(request.approved_at)}`}
                </p>
              </div>
              {request.status === 'approved' && (
                <button onClick={handleDownload}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors">
                  <Download size={15} />Download
                </button>
              )}
            </div>

            {request.status === 'approved' && (
              <div className="flex justify-center">
                <IDCardPreview staff={staffData} request={request} signatureUrl={request.signature_url} />
              </div>
            )}

            {request.status === 'rejected' && request.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                <strong>Reason:</strong> {request.rejection_reason}
              </div>
            )}

            {request.status === 'pending' && (
              <p className="text-center text-slate-400 text-xs">Your request is pending approval from District Admin.</p>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      {request?.status !== 'approved' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-bold text-slate-600 mb-4">ID Card Preview</p>
          <div className="flex justify-center opacity-60">
            <div className="relative">
              <IDCardPreview staff={staffData} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-slate-800/70 text-white text-xs font-bold px-4 py-2 rounded-full">
                  Pending Approval
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-card-wrapper {
            display: flex !important;
            position: fixed !important;
            inset: 0 !important;
            align-items: center !important;
            justify-content: center !important;
          }
          @page {
            size: 54mm 86mm;
            margin: 0;
          }
        }
      `}</style>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Admin View ────────────────────────────────────────────────────────────────
function AdminView({ session }: { session: any }) {
  const [requests, setRequests] = useState<IDCardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [selectedReq, setSelectedReq] = useState<IDCardRequest | null>(null);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [mySignature, setMySignature] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState('');
  const [uploadingSign, setUploadingSign] = useState(false);
  const signatureRef = useRef<HTMLInputElement>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('id_card_requests')
      .select('*, staff:staff_id(id, full_name, father_name, role, dob, employee_id, mobile_number, blood_group, email_id, current_residential_address, permanent_address, photograph_url, employment_class, present_district, present_hospital)')
      .order('requested_at', { ascending: false });

    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (isDistrictAdmin(session) && session?.district) query = query.eq('district', session.district);
    if (filterDistrict !== 'all') query = query.eq('district', filterDistrict);

    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  }, [filterStatus, filterDistrict, session]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Load my signature
  useEffect(() => {
    const loadSig = async () => {
      const { data } = await supabase
        .from('admin_signatures')
        .select('signature_url')
        .eq('admin_id', session?.id)
        .maybeSingle();
      if (data?.signature_url) setMySignature(data.signature_url);
    };
    loadSig();
  }, [session?.id]);

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSign(true);
    try {
      const path = `signatures/${session?.id}_${Date.now()}.png`;
      const { error } = await supabase.storage.from('staff-photos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('staff-photos').getPublicUrl(path);
      const url = urlData.publicUrl;

      // Save to admin_signatures
      const { data: existing } = await supabase.from('admin_signatures').select('id').eq('admin_id', session?.id).maybeSingle();
      if (existing) {
        await supabase.from('admin_signatures').update({ signature_url: url, uploaded_at: new Date().toISOString() }).eq('admin_id', session?.id);
      } else {
        await supabase.from('admin_signatures').insert({ admin_id: session?.id, admin_name: session?.name, admin_role: session?.role, district: session?.district, signature_url: url });
      }
      setMySignature(url);
      setToast('Signature uploaded successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setToast('Error: ' + err.message);
    } finally {
      setUploadingSign(false);
    }
  };

  const handleApprove = async (req: IDCardRequest) => {
    if (!mySignature) {
      setToast('Please upload your signature first!');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    setProcessing(true);
    try {
      await supabase.from('id_card_requests').update({
        status: 'approved',
        approved_by: session?.name,
        approved_by_id: session?.id,
        approved_at: new Date().toISOString(),
        approver_role: session?.role,
        signature_url: mySignature,
        valid_from: new Date().toISOString().split('T')[0],
      }).eq('id', req.id);
      setToast('ID Card approved!');
      setTimeout(() => setToast(''), 3000);
      setSelectedReq(null);
      fetchRequests();
    } catch (err: any) {
      setToast('Error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (req: IDCardRequest) => {
    if (!rejectionReason.trim()) { setToast('Please enter rejection reason'); return; }
    setProcessing(true);
    try {
      await supabase.from('id_card_requests').update({
        status: 'rejected',
        approved_by: session?.name,
        approved_by_id: session?.id,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      }).eq('id', req.id);
      setToast('Request rejected.');
      setTimeout(() => setToast(''), 3000);
      setSelectedReq(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err: any) {
      setToast('Error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const districts = [...new Set(requests.map(r => r.district).filter(Boolean))].sort();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Signature Upload */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Your Authorized Signature</h3>
            <p className="text-slate-400 text-xs mt-0.5">This will appear on all approved ID cards</p>
          </div>
          <div className="flex items-center gap-3">
            {mySignature && (
              <div className="border border-slate-200 rounded-xl p-2 bg-slate-50">
                <img src={mySignature} alt="My Signature" className="h-10 object-contain" />
              </div>
            )}
            <button onClick={() => signatureRef.current?.click()} disabled={uploadingSign}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
              {uploadingSign ? <><Loader2 size={15} className="animate-spin" />Uploading...</> : <><Upload size={15} />{mySignature ? 'Update Signature' : 'Upload Signature'}</>}
            </button>
            <input ref={signatureRef} type="file" accept="image/*" className="hidden" onChange={handleUploadSignature} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {['pending', 'approved', 'rejected', 'all'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${filterStatus === s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {s}
              </button>
            ))}
          </div>
          {isSuperOrState(session) && districts.length > 0 && (
            <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none ml-auto">
              <option value="all">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          <p className="text-xs text-slate-400 ml-auto">{requests.length} requests</p>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="text-emerald-500 animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <Shield size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">No {filterStatus} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-4">
                {/* Photo */}
                <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                  {(req.staff as any)?.photograph_url
                    ? <img src={(req.staff as any).photograph_url} alt="" className="w-full h-full object-cover" />
                    : <User size={20} className="text-slate-300" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{(req.staff as any)?.full_name}</p>
                  <p className="text-xs text-slate-400">
                    {(req.staff as any)?.employee_id && `EMP: ${(req.staff as any).employee_id} • `}
                    {(req.staff as any)?.role?.replace(/_/g, ' ')} • {req.district || '—'}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">Requested {fmt(req.requested_at)}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold ${statusColor(req.status)}`}>
                    {statusIcon(req.status)} {req.status}
                  </span>
                  <button onClick={() => setSelectedReq(req)}
                    className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors font-medium">
                    <Eye size={13} />Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {selectedReq && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

              <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">Review ID Card Request</h2>
                  <p className="text-emerald-200 text-xs">{(selectedReq.staff as any)?.full_name}</p>
                </div>
                <button onClick={() => { setSelectedReq(null); setRejectionReason(''); }}
                  className="text-emerald-200 hover:text-white p-1">✕</button>
              </div>

              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* ID Card Preview */}
                  <div className="flex-shrink-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Card Preview</p>
                    <IDCardPreview
                      staff={selectedReq.staff as StaffData}
                      request={selectedReq}
                      signatureUrl={selectedReq.status === 'approved' ? selectedReq.signature_url : mySignature}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex-1 space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Staff Details</p>
                      {[
                        ['Employee ID', (selectedReq.staff as any)?.employee_id],
                        ['Role', (selectedReq.staff as any)?.role?.replace(/_/g, ' ')],
                        ['DOB', fmt((selectedReq.staff as any)?.dob)],
                        ['Mobile', (selectedReq.staff as any)?.mobile_number],
                        ['Blood Group', (selectedReq.staff as any)?.blood_group],
                        ['District', selectedReq.district],
                        ['Hospital', (selectedReq.staff as any)?.present_hospital],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-xs">
                          <span className="text-slate-400">{label}</span>
                          <span className="font-semibold text-slate-700">{value || '—'}</span>
                        </div>
                      ))}
                    </div>

                    {selectedReq.status === 'pending' && (
                      <>
                        {!mySignature && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                            <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700">Upload your signature first to approve ID cards.</p>
                          </div>
                        )}

                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Rejection Reason (if rejecting)</label>
                          <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                            rows={2} placeholder="Enter reason for rejection..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none" />
                        </div>

                        <div className="flex gap-3">
                          <button onClick={() => handleReject(selectedReq)} disabled={processing}
                            className="flex-1 py-3 border-2 border-red-300 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-50 transition-colors disabled:opacity-50">
                            {processing ? 'Processing...' : 'Reject'}
                          </button>
                          <button onClick={() => handleApprove(selectedReq)} disabled={processing || !mySignature}
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-200">
                            {processing ? <><Loader2 size={16} className="animate-spin inline mr-1" />Processing...</> : '✓ Approve & Issue'}
                          </button>
                        </div>
                      </>
                    )}

                    {selectedReq.status === 'approved' && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                        <CheckCircle size={20} className="text-green-600 mx-auto mb-1" />
                        <p className="text-green-700 font-bold text-sm">Approved</p>
                        <p className="text-green-600 text-xs">By {selectedReq.approved_by} on {fmt(selectedReq.approved_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-xl z-[200]">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EmployeeIDCard({ session }: { session: any }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/20 p-4 md:p-6">
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-700 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Employee ID Card</h1>
            <p className="text-slate-400 text-sm">AYUSH Department — Uttarakhand</p>
          </div>
        </div>
      </div>

      {isAdmin(session) ? (
        <AdminView session={session} />
      ) : (
        <StaffView session={session} />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';
import {
  ShieldCheck, Plus, Trash2, Edit2, Save, X, Loader2,
  ChevronDown, ChevronUp, Eye, EyeOff, CheckCircle2, XCircle
} from 'lucide-react';

interface AdminCreatorProps {
  session: UserSession;
}

const UTTARAKHAND_DISTRICTS = [
  "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar",
  "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal",
  "Udham Singh Nagar", "Uttarkashi"
];

const SYSTEMS = ["Ayurvedic", "Unani", "Homeopathic", "Naturopathy", "Siddha"];

// All pages/tabs that can be assigned to a district admin
const ALL_PAGES = [
  { id: 'dashboard',          label: 'Dashboard' },
  { id: 'hospitals',          label: 'Hospitals' },
  { id: 'employees',          label: 'Employees' },
  { id: 'patients',           label: 'Patients' },
  { id: 'demands',            label: 'Medicine Demands' },
  { id: 'district_supply',    label: 'District Supply' },
  { id: 'requests',           label: 'Requests' },
  { id: 'sthanantaran',       label: 'Sthananataran' },
  { id: 'incharge',           label: 'Incharge Management' },
  { id: 'registrations',      label: 'Registrations' },
  { id: 'disease_management', label: 'Disease Management' },
  { id: 'rapid_tests',        label: 'Rapid Tests' },
  { id: 'panchakarma',        label: 'Panchakarma' },
  { id: 'password_reset',     label: 'Password Reset' },
  { id: 'staff_distribution', label: 'Staff Distribution' },
  { id: 'rate',               label: 'Rate Finder' },
  { id: 'nearby',             label: 'Nearby Hospitals' },
  { id: 'stats',              label: 'Statistics' },
];

const ADMIN_ROLES = [
  { value: 'DISTRICT_ADMIN',             label: 'District Admin' },
  { value: 'STATE_ADMIN',               label: 'State Admin' },
  { value: 'DISTRICT_MEDICINE_INCHARGE', label: 'District Medicine Incharge' },
  { value: 'PHARMACY_MANAGER',           label: 'Pharmacy Manager' },
];

const COMMON_PASSWORDS = [
  'ayush@123','ayush123','admin','admin@123','admin123','password','password@123',
  '12345678','uttarakhand','uttarakhand@123','doctor@123','health@123',
];
function hasSequentialChars(pwd: string) {
  for (let i = 0; i < pwd.length - 3; i++) {
    const a=pwd.charCodeAt(i),b=pwd.charCodeAt(i+1),c=pwd.charCodeAt(i+2),d=pwd.charCodeAt(i+3);
    if((b-a===1&&c-b===1&&d-c===1)||(a-b===1&&b-c===1&&c-d===1)) return true;
    if(pwd[i]===pwd[i+1]&&pwd[i]===pwd[i+2]&&pwd[i]===pwd[i+3]) return true;
  }
  return false;
}
function hasCommonWord(pwd: string) {
  return ['ayush','admin','doctor','health','hospital','staff','password','welcome',
    'uttarakhand','dehradun','india','user','district','state'].some(w=>pwd.toLowerCase().includes(w));
}
function pwdStrength(pwd: string) {
  return {
    len:   pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    num:   /[0-9]/.test(pwd),
    spec:  /[^A-Za-z0-9]/.test(pwd),
    noCommon: !COMMON_PASSWORDS.includes(pwd.toLowerCase()),
    noSeq:    pwd.length>0 && !hasSequentialChars(pwd),
    noWord:   pwd.length>0 && !hasCommonWord(pwd),
  };
}

interface AdminForm {
  name: string;
  admin_userid: string;
  admin_password: string;
  admin_access: string;
  access_districts: string[];
  access_systems: string[];
  access_pages: string[];
  mobile_number: string;
  email_id: string;
}

const emptyForm = (): AdminForm => ({
  name: '', admin_userid: '', admin_password: '', admin_access: 'DISTRICT_ADMIN',
  access_districts: [], access_systems: [], access_pages: [],
  mobile_number: '', email_id: '',
});

export default function AdminCreator({ session }: AdminCreatorProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const canAccess = session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN';
  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShieldCheck size={48} className="text-slate-300" />
        <p className="text-slate-400 font-medium">Only Super Admin or State Admin can manage admin accounts.</p>
      </div>
    );
  }

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_logins')
      .select('id, name, admin_userid, admin_access, access_districts, access_systems, access_pages, mobile_number, email_id')
      .order('admin_userid');
    if (error) {
      console.error('AdminCreator fetch error:', error.message);
      alert('Could not load admins: ' + error.message);
    }
    setAdmins(data || []);
    setLoading(false);
  };

  const toggleItem = (field: 'access_districts' | 'access_systems' | 'access_pages', val: string) => {
    setForm(f => {
      const arr = f[field] as string[];
      return { ...f, [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  };

  const selectAllDistricts = () => setForm(f => ({ ...f, access_districts: [...UTTARAKHAND_DISTRICTS] }));
  const clearDistricts = () => setForm(f => ({ ...f, access_districts: [] }));
  const selectAllPages = () => setForm(f => ({ ...f, access_pages: ALL_PAGES.map(p => p.id) }));
  const clearPages = () => setForm(f => ({ ...f, access_pages: [] }));

  const startEdit = (admin: any) => {
    setEditingId(admin.id?.toString());
    setForm({
      name: admin.name || '',
      admin_userid: admin.admin_userid || '',
      admin_password: '',
      admin_access: admin.admin_access || 'DISTRICT_ADMIN',
      access_districts: admin.access_districts || [],
      access_systems: admin.access_systems || [],
      access_pages: admin.access_pages || [],
      mobile_number: admin.mobile_number || '',
      email_id: admin.email_id || '',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.admin_userid.trim()) { setError('Username (User ID) is required'); return; }
    if (!editingId && !form.admin_password) { setError('Password is required for new admin'); return; }
    if (form.admin_password) {
      const s = pwdStrength(form.admin_password);
      if (!s.len||!s.upper||!s.lower||!s.num||!s.spec||!s.noCommon||!s.noSeq||!s.noWord) {
        setError('Password does not meet security requirements'); return;
      }
    }
    if (form.access_districts.length === 0 && form.admin_access !== 'STATE_ADMIN' && form.admin_access !== 'SUPER_ADMIN') {
      setError('Please select at least one district'); return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        admin_name: form.name.trim(),
        admin_userid: form.admin_userid.trim(),
        admin_access: form.admin_access,
        access_districts: form.admin_access === 'STATE_ADMIN' ? ['All'] : form.access_districts,
        access_systems: form.access_systems,
        access_pages: form.access_pages,
        mobile_number: form.mobile_number.trim(),
        email_id: form.email_id.trim(),
      };
      if (form.admin_password) payload.admin_password = form.admin_password;

      if (editingId) {
        const { error: e } = await supabase.from('admin_logins').update(payload).eq('id', editingId);
        if (e) throw e;
        setSuccess('Admin updated successfully!');
      } else {
        payload.admin_password = form.admin_password;
        const { error: e } = await supabase.from('admin_logins').insert([payload]);
        if (e) throw e;
        setSuccess('Admin created successfully!');
      }
      await fetchAdmins();
      cancelForm();
    } catch (e: any) {
      setError(e.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error: e } = await supabase.from('admin_logins').delete().eq('id', deleteTarget.id);
    if (!e) { fetchAdmins(); setDeleteTarget(null); }
    else alert('Delete failed: ' + e.message);
  };

  const pwd = pwdStrength(form.admin_password);
  const pwdRules = [
    { label: 'At least 8 characters',            ok: pwd.len },
    { label: 'Uppercase letter (A-Z)',            ok: pwd.upper },
    { label: 'Lowercase letter (a-z)',            ok: pwd.lower },
    { label: 'Number (0-9)',                      ok: pwd.num },
    { label: 'Special character (@, #, ! etc.)',  ok: pwd.spec },
    { label: 'Not a common password',             ok: pwd.noCommon },
    { label: 'No sequential characters (1234)',   ok: pwd.noSeq },
    { label: 'No common words (ayush, admin…)',   ok: pwd.noWord },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              Admin <span className="text-emerald-600">Management</span>
            </h1>
            <p className="text-slate-500 mt-2">Create and manage admin accounts with district and page-level access.</p>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); }}
              className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200"
            >
              <Plus size={18} /> New Admin
            </button>
          )}
        </div>

        {/* Create / Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm mb-10 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? 'Edit Admin Account' : 'Create New Admin Account'}
                </h2>
                <button onClick={cancelForm} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name *</label>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                    placeholder="e.g. Dr. Ramesh Kumar"
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Username / Login ID *</label>
                  <input value={form.admin_userid} onChange={e=>setForm({...form,admin_userid:e.target.value})}
                    placeholder="e.g. ramesh.almora"
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Mobile Number</label>
                  <input value={form.mobile_number} onChange={e=>setForm({...form,mobile_number:e.target.value})}
                    placeholder="10-digit mobile"
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email ID</label>
                  <input value={form.email_id} onChange={e=>setForm({...form,email_id:e.target.value})}
                    type="email" placeholder="official email"
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Admin Role *</label>
                <div className="flex flex-wrap gap-3">
                  {ADMIN_ROLES.map(r => (
                    <button key={r.value} type="button"
                      onClick={()=>setForm({...form,admin_access:r.value})}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${
                        form.admin_access===r.value
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-gray-200 hover:border-emerald-400'
                      }`}
                    >{r.label}</button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  {editingId ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPwd?'text':'password'}
                    value={form.admin_password}
                    onChange={e=>setForm({...form,admin_password:e.target.value})}
                    placeholder="Strong password"
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button type="button" onClick={()=>setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPwd?<EyeOff size={18}/>:<Eye size={18}/>}
                  </button>
                </div>
                {form.admin_password.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 px-1 mt-2">
                    {pwdRules.map(r=>(
                      <div key={r.label} className="flex items-center gap-1.5">
                        {r.ok?<CheckCircle2 size={13} className="text-emerald-500 shrink-0"/>:<XCircle size={13} className="text-red-400 shrink-0"/>}
                        <span className={`text-[11px] ${r.ok?'text-emerald-700':'text-red-500'}`}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* District Access */}
              {form.admin_access !== 'STATE_ADMIN' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">District Access *</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAllDistricts} className="text-xs text-emerald-600 font-bold hover:underline">Select All</button>
                      <span className="text-slate-300">|</span>
                      <button type="button" onClick={clearDistricts} className="text-xs text-red-500 font-bold hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {UTTARAKHAND_DISTRICTS.map(d=>(
                      <button key={d} type="button" onClick={()=>toggleItem('access_districts',d)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          form.access_districts.includes(d)
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-gray-200 hover:border-emerald-400'
                        }`}
                      >{d}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* System Access */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Access</label>
                <div className="flex flex-wrap gap-2">
                  {SYSTEMS.map(s=>(
                    <button key={s} type="button" onClick={()=>toggleItem('access_systems',s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        form.access_systems.includes(s)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-gray-200 hover:border-blue-400'
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Page Access */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Page / Module Access</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAllPages} className="text-xs text-emerald-600 font-bold hover:underline">Select All</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={clearPages} className="text-xs text-red-500 font-bold hover:underline">Clear</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_PAGES.map(p=>(
                    <button key={p.id} type="button" onClick={()=>toggleItem('access_pages',p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        form.access_pages.includes(p.id)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-600 border-gray-200 hover:border-purple-400'
                      }`}
                    >{p.label}</button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
              {success && <p className="text-emerald-600 text-sm font-medium">{success}</p>}

              <div className="flex gap-4 justify-end pt-2">
                <button onClick={cancelForm} className="px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving?<Loader2 className="animate-spin" size={18}/>:<Save size={18}/>}
                  {editingId ? 'Update Admin' : 'Create Admin'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin List */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={40}/></div>
        ) : admins.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No admin accounts found. Create one above.</div>
        ) : (
          <div className="space-y-4">
            {admins.map(admin => (
              <motion.div key={admin.id} layout
                className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                    <ShieldCheck size={24}/>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg">{admin.name || admin.admin_userid}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-bold text-emerald-700">{admin.admin_access?.replace(/_/g,' ')}</span>
                      {' · '}ID: {admin.admin_userid}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(admin.access_districts || []).slice(0,5).map((d:string)=>(
                        <span key={d} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{d}</span>
                      ))}
                      {(admin.access_districts || []).length > 5 && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">+{admin.access_districts.length-5} more</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(admin.access_pages || []).slice(0,4).map((p:string)=>{
                        const pg = ALL_PAGES.find(x=>x.id===p);
                        return <span key={p} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">{pg?.label||p}</span>;
                      })}
                      {(admin.access_pages||[]).length>4 && (
                        <span className="text-[10px] bg-purple-50 text-purple-500 px-2 py-0.5 rounded-full">+{admin.access_pages.length-4} pages</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={()=>startEdit(admin)}
                    className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                    <Edit2 size={18}/>
                  </button>
                  <button onClick={()=>setDeleteTarget(admin)}
                    className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Delete Admin?</h3>
            <p className="text-slate-600 mb-6">Are you sure you want to delete <span className="font-bold">{deleteTarget.name}</span>? This cannot be undone.</p>
            <div className="flex gap-4 justify-end">
              <button onClick={()=>setDeleteTarget(null)} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

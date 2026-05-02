import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Key, CheckCircle2, XCircle, Eye, EyeOff, Loader2, ShieldAlert, User, Building2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';

interface AdminPasswordResetProps {
  session: UserSession;
}

const COMMON_PASSWORDS = [
  'ayush@123','ayush123','ayush1234','ayush@1234','ayush@12345','ayush','ayush1','ayush12',
  'doctor@123','doctor123','health@123','health123','hospital@123','hospital123','staff@123','staff123',
  'admin','admin@123','admin123','admin1234','admin@1234','district@123','state@123','incharge@123',
  'uttarakhand','uttarakhand@123','dehradun','dehradun@123','india','india@123',
  'password','password1','password@1','password@123','welcome','welcome@1','welcome123','welcome@123',
  'changeme','changeme@1','letmein','letmein@1','qwerty','qwerty123','qwerty@123',
  '12345678','123456789','1234567890','87654321','11111111','00000000','abcd1234','abc@1234','abcd@123',
  'pass@2024','pass@2025','pass@2026','user@2024','user@2025','user@2026',
];

function hasSequentialChars(pwd: string): boolean {
  for (let i = 0; i < pwd.length - 3; i++) {
    const a = pwd.charCodeAt(i), b = pwd.charCodeAt(i+1), c = pwd.charCodeAt(i+2), d = pwd.charCodeAt(i+3);
    if ((b-a===1&&c-b===1&&d-c===1)||(a-b===1&&b-c===1&&c-d===1)) return true;
  }
  for (let i = 0; i < pwd.length - 3; i++) {
    if (pwd[i]===pwd[i+1]&&pwd[i]===pwd[i+2]&&pwd[i]===pwd[i+3]) return true;
  }
  return false;
}

function hasCommonWord(pwd: string): boolean {
  const lower = pwd.toLowerCase();
  return ['ayush','admin','doctor','health','hospital','staff','password','welcome',
    'uttarakhand','dehradun','india','user','login','district','state','incharge','qwerty','letmein','master']
    .some(w => lower.includes(w));
}

function checkPasswordStrength(pwd: string): { ok: boolean } {
  return {
    ok: pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd) &&
      !COMMON_PASSWORDS.includes(pwd.toLowerCase()) &&
      !hasSequentialChars(pwd) &&
      !hasCommonWord(pwd)
  };
}

interface FoundUser {
  userType: 'admin' | 'staff' | 'hospital';
  userId: string;
  name: string;
  district?: string;
  system?: string;
  role?: string;
}

export default function AdminPasswordReset({ session }: AdminPasswordResetProps) {
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState('');

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState(false);

  const isAllowed = ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'].includes(session.role);

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-slate-500 font-medium">Access Denied. You do not have permission to reset passwords.</p>
      </div>
    );
  }

  const handleSearch = async () => {
    setSearchError('');
    setFoundUser(null);
    setSuccess(false);
    setNewPwd('');
    setConfirmPwd('');
    setSaveError('');
    if (!searchId.trim()) { setSearchError('Please enter a Username or ID to search'); return; }
    setSearching(true);

    try {
      const uid = searchId.trim();

      // Search admin_logins — only SUPER_ADMIN can reset other admins
      if (session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN') {
        const { data: adminData } = await supabase
          .from('admin_logins')
          .select('id, name, admin_name, admin_userid, access_districts, access_systems')
          .eq('admin_userid', uid)
          .maybeSingle();
        if (adminData) {
          // STATE_ADMIN can only reset admins in their systems
          if (session.role === 'STATE_ADMIN') {
            const hasAccess = adminData.access_systems?.some((s: string) =>
              session.access_systems?.includes(s)
            );
            if (!hasAccess) { setSearchError('You do not have permission to reset this admin account.'); setSearching(false); return; }
          }
          setFoundUser({ userType: 'admin', userId: adminData.id?.toString() || adminData.admin_userid, name: adminData.name || adminData.admin_name || adminData.admin_userid });
          setSearching(false);
          return;
        }
      }

      // Search staff
      const { data: staffList } = await supabase
        .from('staff')
        .select('id, full_name, mobile_number, employee_id, hospital_id, hospitals(district, system)')
        .or(`mobile_number.eq."${uid}",employee_id.eq."${uid}"`)
        .limit(1);
      if (staffList && staffList.length > 0) {
        const s = staffList[0];
        const staffDistrict = (s.hospitals as any)?.[0]?.district || s.hospitals?.district;
        const staffSystem = (s.hospitals as any)?.[0]?.system || s.hospitals?.system;

        // District Admin can only reset staff in their district
        if (session.role === 'DISTRICT_ADMIN') {
          if (!session.access_districts?.includes(staffDistrict)) {
            setSearchError('You can only reset passwords for users in your assigned district(s).');
            setSearching(false);
            return;
          }
        }
        // State Admin can only reset staff in their system
        if (session.role === 'STATE_ADMIN') {
          if (!session.access_systems?.includes(staffSystem)) {
            setSearchError('You can only reset passwords for users in your assigned system(s).');
            setSearching(false);
            return;
          }
        }

        setFoundUser({ userType: 'staff', userId: s.id.toString(), name: s.full_name, district: staffDistrict, system: staffSystem });
        setSearching(false);
        return;
      }

      // Search hospitals
      const { data: hosp } = await supabase
        .from('hospitals')
        .select('hospital_id, facility_name, district, system')
        .eq('hospital_id', uid)
        .maybeSingle();
      if (hosp) {
        // District Admin check
        if (session.role === 'DISTRICT_ADMIN') {
          if (!session.access_districts?.includes(hosp.district)) {
            setSearchError('You can only reset passwords for hospitals in your assigned district(s).');
            setSearching(false);
            return;
          }
        }
        // State Admin check
        if (session.role === 'STATE_ADMIN') {
          if (!session.access_systems?.includes(hosp.system)) {
            setSearchError('You can only reset passwords for hospitals in your assigned system(s).');
            setSearching(false);
            return;
          }
        }
        setFoundUser({ userType: 'hospital', userId: hosp.hospital_id, name: hosp.facility_name, district: hosp.district, system: hosp.system });
        setSearching(false);
        return;
      }

      setSearchError('No user found with this ID. Please check and try again.');
    } catch (e: any) {
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleReset = async () => {
    setSaveError('');
    if (!foundUser) return;
    if (!checkPasswordStrength(newPwd).ok) { setSaveError('Password does not meet all requirements'); return; }
    if (newPwd !== confirmPwd) { setSaveError('Passwords do not match'); return; }
    setSaving(true);
    try {
      let err = null;
      if (foundUser.userType === 'admin') {
        const { error: e } = await supabase.from('admin_logins').update({ admin_password: newPwd }).eq('id', foundUser.userId);
        err = e;
      } else if (foundUser.userType === 'staff') {
        const { error: e } = await supabase.from('staff').update({ login_password: newPwd }).eq('id', foundUser.userId);
        err = e;
      } else {
        const { error: e } = await supabase.from('hospitals').update({ hospital_password: newPwd }).eq('hospital_id', foundUser.userId);
        err = e;
      }
      if (err) throw err;
      setSuccess(true);
    } catch (e: any) {
      setSaveError('Could not reset password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const rules = [
    { label: 'At least 8 characters', ok: newPwd.length >= 8 },
    { label: 'Uppercase letter (A-Z)', ok: /[A-Z]/.test(newPwd) },
    { label: 'Lowercase letter (a-z)', ok: /[a-z]/.test(newPwd) },
    { label: 'Number (0-9)', ok: /[0-9]/.test(newPwd) },
    { label: 'Special character (@, #, ! etc.)', ok: /[^A-Za-z0-9]/.test(newPwd) },
    { label: 'Not a common password', ok: newPwd.length > 0 && !COMMON_PASSWORDS.includes(newPwd.toLowerCase()) },
    { label: 'No sequential/repeated characters', ok: newPwd.length > 0 && !hasSequentialChars(newPwd) },
    { label: 'No common words (ayush, admin etc.)', ok: newPwd.length > 0 && !hasCommonWord(newPwd) },
  ];

  const resetAll = () => {
    setSearchId(''); setFoundUser(null); setSearchError('');
    setNewPwd(''); setConfirmPwd(''); setSaveError(''); setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Password <span className="text-emerald-600">Reset</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Reset passwords for users within your access scope.
          </p>
          {session.role === 'DISTRICT_ADMIN' && (
            <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-bold px-4 py-2 rounded-full">
              <ShieldCheck size={14} />
              District Admin — can reset users in: {session.access_districts?.join(', ')}
            </div>
          )}
          {session.role === 'STATE_ADMIN' && (
            <div className="mt-3 inline-flex items-center gap-2 bg-purple-50 text-purple-700 text-xs font-bold px-4 py-2 rounded-full">
              <ShieldCheck size={14} />
              State Admin — system scope: {session.access_systems?.join(', ')}
            </div>
          )}
          {session.role === 'SUPER_ADMIN' && (
            <div className="mt-3 inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-4 py-2 rounded-full">
              <ShieldCheck size={14} />
              Super Admin — full access
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">

          {success ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={44} className="text-emerald-500" />
              </div>
              <p className="font-bold text-slate-900 text-xl">Password Reset Successfully!</p>
              <p className="text-slate-500 text-sm">
                Password for <span className="font-bold text-slate-700">{foundUser?.name}</span> has been updated.
              </p>
              <p className="text-slate-400 text-xs">Please inform the user of their new password securely.</p>
              <button
                onClick={resetAll}
                className="mt-4 bg-emerald-600 text-white font-bold py-3 px-8 rounded-2xl hover:bg-emerald-700 transition-all"
              >
                Reset Another User
              </button>
            </div>
          ) : (
            <>
              {/* Search */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 mb-2 block">
                  Search User by ID
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={searchId}
                    onChange={e => { setSearchId(e.target.value); setFoundUser(null); setSearchError(''); setSuccess(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Hospital ID, Mobile number, or Employee ID"
                    className="flex-1 bg-neutral-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="bg-emerald-600 text-white font-bold px-6 rounded-2xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    {searching ? <Loader2 className="animate-spin" size={18} /> : <><Search size={16} /> Search</>}
                  </button>
                </div>
                {searchError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs font-medium mt-2 ml-1">
                    {searchError}
                  </motion.p>
                )}
              </div>

              {/* Found user card */}
              {foundUser && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                    {foundUser.userType === 'hospital' ? <Building2 size={20} /> : foundUser.userType === 'admin' ? <ShieldCheck size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900">{foundUser.name}</p>
                    <p className="text-emerald-700 text-xs mt-0.5 capitalize">
                      {foundUser.userType}{foundUser.district ? ` • ${foundUser.district}` : ''}{foundUser.system ? ` • ${foundUser.system}` : ''}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Password fields — only after user found */}
              {foundUser && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="border-t border-gray-100 pt-5">
                    <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <Key size={16} className="text-emerald-600" />
                      Set New Password for {foundUser.name}
                    </p>

                    <div className="space-y-4">
                      {/* New password */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">New Password</label>
                        <div className="relative">
                          <input
                            type={showNew ? 'text' : 'password'}
                            value={newPwd}
                            onChange={e => setNewPwd(e.target.value)}
                            placeholder="Enter new strong password"
                            className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          />
                          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Strength indicators */}
                      {newPwd.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 px-1">
                          {rules.map(rule => (
                            <div key={rule.label} className="flex items-center gap-1.5">
                              {rule.ok ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> : <XCircle size={13} className="text-red-400 shrink-0" />}
                              <span className={`text-[11px] ${rule.ok ? 'text-emerald-700' : 'text-red-500'}`}>{rule.label}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Confirm password */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
                        <div className="relative">
                          <input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPwd}
                            onChange={e => setConfirmPwd(e.target.value)}
                            placeholder="Re-enter new password"
                            className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {confirmPwd.length > 0 && (
                          <p className={`text-xs ml-1 flex items-center gap-1 ${newPwd === confirmPwd ? 'text-emerald-600' : 'text-red-500'}`}>
                            {newPwd === confirmPwd ? <><CheckCircle2 size={12} /> Passwords match</> : <><XCircle size={12} /> Passwords do not match</>}
                          </p>
                        )}
                      </div>

                      {saveError && <p className="text-red-500 text-xs font-medium ml-1">{saveError}</p>}

                      <button
                        onClick={handleReset}
                        disabled={saving || !checkPasswordStrength(newPwd).ok || newPwd !== confirmPwd || confirmPwd.length === 0}
                        className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <><Key size={18} /> Reset Password</>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

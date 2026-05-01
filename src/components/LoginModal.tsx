import { X, Lock, User, ShieldCheck, Eye, EyeOff, Loader2, UserSearch, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import SearchEmployeeModal from './SearchEmployeeModal';

export interface UserSession {
  role: 'SUPER_ADMIN' | 'HOSPITAL' | 'DOCTOR' | 'DISTRICT_ADMIN' | 'STATE_ADMIN' | 'STAFF' | 'DISTRICT_MEDICINE_INCHARGE' | 'PHARMACY_MANAGER';
  id: string;
  hospitalId?: string;
  activeHospitalId?: string;
  activeModules?: string[];
  name?: string;
  modules?: string[];
  staffRole?: string;
  isIncharge?: boolean;
  access_districts?: string[];
  access_systems?: string[];
  district?: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (session: UserSession) => void;
}

// --- Password strength checker ---
const COMMON_PASSWORDS = ['ayush@123', 'ayush123', 'password', 'password1', '12345678', 'admin123', 'admin@123', '123456789', 'uttarakhand', 'ayush@1234', 'doctor@123', 'health@123'];

function checkPasswordStrength(pwd: string): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (pwd.length < 8) reasons.push('Kam se kam 8 characters hone chahiye');
  if (!/[A-Z]/.test(pwd)) reasons.push('Ek capital letter hona chahiye (A-Z)');
  if (!/[0-9]/.test(pwd)) reasons.push('Ek number hona chahiye (0-9)');
  if (!/[^A-Za-z0-9]/.test(pwd)) reasons.push('Ek special character hona chahiye (@, #, ! etc.)');
  if (COMMON_PASSWORDS.includes(pwd.toLowerCase())) reasons.push('Yeh password bahut common hai — koi bhi guess kar sakta hai');
  return { ok: reasons.length === 0, reasons };
}

// --- Force Password Change Screen ---
function ForcePasswordChange({
  userType, userId, onChanged
}: {
  userType: 'admin' | 'staff' | 'hospital';
  userId: string;
  onChanged: () => void;
}) {
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const strength = checkPasswordStrength(newPwd);

  const handleSave = async () => {
    setError('');
    if (!strength.ok) { setError('Pehle sabhi password conditions poori karein'); return; }
    if (newPwd !== confirmPwd) { setError('Dono passwords match nahi kar rahe'); return; }
    setSaving(true);
    try {
      let updateError = null;
      if (userType === 'admin') {
        const { error: e } = await supabase.from('admin_logins').update({ admin_password: newPwd }).eq('id', userId);
        updateError = e;
      } else if (userType === 'staff') {
        const { error: e } = await supabase.from('staff').update({ login_password: newPwd }).eq('id', userId);
        updateError = e;
      } else if (userType === 'hospital') {
        const { error: e } = await supabase.from('hospitals').update({ hospital_password: newPwd }).eq('hospital_id', userId);
        updateError = e;
      }
      if (updateError) throw updateError;
      onChanged();
    } catch (e: any) {
      setError('Password save nahi hua: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-bold text-amber-800 text-sm">Password badalna zaroori hai</p>
          <p className="text-amber-700 text-xs mt-1">Aapka current password kamzor ya common hai. Aage jaane ke liye naya strong password set karein.</p>
        </div>
      </div>

      {/* New password */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Naya Password</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            placeholder="Naya strong password"
            className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Strength indicators */}
      {newPwd.length > 0 && (
        <div className="space-y-1.5 px-1">
          {[
            { label: 'Kam se kam 8 characters', ok: newPwd.length >= 8 },
            { label: 'Ek capital letter (A-Z)', ok: /[A-Z]/.test(newPwd) },
            { label: 'Ek number (0-9)', ok: /[0-9]/.test(newPwd) },
            { label: 'Ek special character (@, #, ! etc.)', ok: /[^A-Za-z0-9]/.test(newPwd) },
            { label: 'Common password nahi', ok: !COMMON_PASSWORDS.includes(newPwd.toLowerCase()) },
          ].map(rule => (
            <div key={rule.label} className="flex items-center gap-2">
              {rule.ok
                ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                : <XCircle size={14} className="text-red-400 shrink-0" />}
              <span className={`text-xs ${rule.ok ? 'text-emerald-700' : 'text-red-500'}`}>{rule.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Confirm password */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Password Confirm Karein</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            placeholder="Dobara wahi password likhein"
            className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {confirmPwd.length > 0 && newPwd !== confirmPwd && (
          <p className="text-red-500 text-xs ml-4">Passwords match nahi kar rahe</p>
        )}
      </div>

      {error && <p className="text-red-500 text-xs font-medium ml-4">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !strength.ok || newPwd !== confirmPwd}
        className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Password Save Karein aur Login Karein'}
      </button>
    </div>
  );
}

// --- Main Login Modal ---
export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Password change state
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [pendingSession, setPendingSession] = useState<UserSession | null>(null);
  const [pendingUserType, setPendingUserType] = useState<'admin' | 'staff' | 'hospital'>('staff');
  const [pendingUserId, setPendingUserId] = useState('');

  // Called after successful login — checks if password needs changing
  const checkAndProceed = (session: UserSession, userType: 'admin' | 'staff' | 'hospital', userId: string, currentPassword: string) => {
    const { ok } = checkPasswordStrength(currentPassword);
    if (!ok) {
      setPendingSession(session);
      setPendingUserType(userType);
      setPendingUserId(userId);
      setNeedsPasswordChange(true);
    } else {
      onLogin(session);
      onClose();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedUsername = username.trim();

      // 1. Admin Login
      const { data: adminData } = await supabase
        .from('admin_logins')
        .select('*')
        .eq('admin_userid', trimmedUsername)
        .single();

      if (adminData) {
        if (adminData.admin_password === password) {
          let role: UserSession['role'] = 'DISTRICT_ADMIN';
          if (adminData.admin_access === 'PHARMACY_MANAGER') {
            role = 'PHARMACY_MANAGER';
          } else {
            const hasAllDistricts = adminData.access_districts?.includes('All');
            if (hasAllDistricts) {
              if (adminData.admin_access === 'SUPER_ADMIN') {
                role = 'SUPER_ADMIN';
              } else {
                role = 'STATE_ADMIN';
              }
            } else if (adminData.admin_access === 'DISTRICT_MEDICINE_INCHARGE') {
              role = 'DISTRICT_MEDICINE_INCHARGE';
            }
          }
          const session: UserSession = {
            role,
            id: adminData.id?.toString() || adminData.admin_userid,
            name: adminData.name || adminData.admin_name || adminData.admin_userid,
            access_districts: adminData.access_districts || [],
            access_systems: adminData.access_systems || [],
            district: adminData.district,
          };
          checkAndProceed(session, 'admin', adminData.id?.toString() || adminData.admin_userid, password);
          setLoading(false);
          return;
        } else {
          setError('Wrong Password');
          setLoading(false);
          return;
        }
      }

      // 2. Staff Login
      const { data: staffDataList } = await supabase
        .from('staff')
        .select('*')
        .or(`mobile_number.eq."${trimmedUsername}",employee_id.eq."${trimmedUsername}"`);

      if (staffDataList && staffDataList.length > 0) {
        const firstStaff = staffDataList[0];
        if (firstStaff.login_password !== password && firstStaff.password !== password) {
          setError('Wrong Password');
          setLoading(false);
          return;
        }

        const staffIds = staffDataList.map(s => s.id);
        const directLinks = staffDataList.map(s => {
          const links = [{ staffId: s.id, hospitalId: s.hospital_id, staffRecord: s }];
          if (s.secondary_hospitals && Array.isArray(s.secondary_hospitals)) {
            s.secondary_hospitals.forEach((h: any) => {
              links.push({ staffId: s.id, hospitalId: h.hospital_id, staffRecord: s });
            });
          }
          return links;
        }).flat().filter(l => l.hospitalId);

        const { data: inchargeHospitals } = await supabase
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
          if (!allLinksMap.has(key)) allLinksMap.set(key, link);
        });
        const allLinks = Array.from(allLinksMap.values());

        if (allLinks.length > 1) {
          const hospitalIds = allLinks.map(l => l.hospitalId);
          const { data: hospitals } = await supabase
            .from('hospitals')
            .select('hospital_id, facility_name, district, block')
            .in('hospital_id', hospitalIds);
          const options = allLinks.map(l => {
            const hosp = hospitals?.find(h => h.hospital_id === l.hospitalId);
            return {
              ...l.staffRecord,
              hospital_id: l.hospitalId,
              hospitalName: hosp?.facility_name || 'Unknown Hospital',
              location: hosp ? `${hosp.block}, ${hosp.district}` : 'Unknown Location'
            };
          });
          setStaffOptions(options);
          setLoading(false);
          return;
        } else if (allLinks.length === 1) {
          await completeStaffLogin({ ...allLinks[0].staffRecord, hospital_id: allLinks[0].hospitalId }, password);
          return;
        }
      }

      // 3. Hospital Login
      const { data: hospitalLoginData } = await supabase
        .from('hospitals')
        .select('hospital_id, facility_name, hospital_password, district')
        .eq('hospital_id', username)
        .maybeSingle();

      if (hospitalLoginData) {
        if (password === hospitalLoginData.hospital_password) {
          const session: UserSession = {
            role: 'HOSPITAL',
            id: hospitalLoginData.hospital_id,
            name: hospitalLoginData.facility_name,
            district: hospitalLoginData.district,
          };
          checkAndProceed(session, 'hospital', hospitalLoginData.hospital_id, password);
          setLoading(false);
          return;
        } else {
          setError('Wrong Password');
          setLoading(false);
          return;
        }
      }

      setError('Username nahi mila. Hospital ID, Mobile ya Employee ID check karein.');
    } catch (err: any) {
      setError('Login mein dikkat aayi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeStaffLogin = async (staffData: any, currentPassword?: string) => {
    let activeModules: string[] = staffData.assigned_modules || [];
    let isIncharge = false;
    const targetHospitalId = staffData.selectedHospitalId || staffData.hospital_id;

    if (staffData.selectedHospitalId) {
      const secondaryHospitals = staffData.secondary_hospitals || [];
      const secondary = secondaryHospitals.find((h: any) => h.hospital_id === staffData.selectedHospitalId);
      if (secondary) activeModules = secondary.modules || [];
    }

    if (targetHospitalId) {
      const { data: hospitalData } = await supabase
        .from('hospitals')
        .select('incharge_staff_id')
        .eq('hospital_id', targetHospitalId)
        .maybeSingle();
      if (hospitalData && hospitalData.incharge_staff_id?.toString() === staffData.id.toString()) {
        isIncharge = true;
      }
    }

    const session: UserSession = {
      role: 'STAFF',
      id: staffData.id.toString(),
      hospitalId: staffData.hospital_id,
      activeHospitalId: targetHospitalId,
      activeModules,
      name: staffData.full_name,
      modules: staffData.assigned_modules || [],
      staffRole: staffData.role,
      isIncharge,
    };

    const pwd = currentPassword || staffData.login_password || staffData.password || '';
    checkAndProceed(session, 'staff', staffData.id.toString(), pwd);
    setLoading(false);
  };

  const screenTitle = needsPasswordChange
    ? 'Password Badlein'
    : staffOptions.length > 0
      ? 'Facility Selection'
      : 'Portal Login';

  const screenSubtitle = needsPasswordChange
    ? 'Security ke liye naya strong password set karein'
    : staffOptions.length > 0
      ? 'Choose a facility to manage'
      : 'Access your administrative dashboard';

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="login-modal-wrapper" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            key="login-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={needsPasswordChange ? undefined : onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            key="login-modal-content"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">{screenTitle}</h2>
                  <p className="text-slate-500 text-sm mt-1">{screenSubtitle}</p>
                </div>
                {!needsPasswordChange && (
                  <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>

              {needsPasswordChange ? (
                <ForcePasswordChange
                  userType={pendingUserType}
                  userId={pendingUserId}
                  onChanged={() => {
                    setNeedsPasswordChange(false);
                    if (pendingSession) {
                      onLogin(pendingSession);
                      onClose();
                    }
                  }}
                />
              ) : staffOptions.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <h3 className="text-emerald-900 font-bold text-lg">Select Facility to Manage</h3>
                    <p className="text-emerald-700 text-xs mt-1">Multiple hospital links found for your account.</p>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {staffOptions.map(option => (
                      <button
                        key={`${option.id}-${option.hospital_id}`}
                        onClick={() => completeStaffLogin(option)}
                        className="w-full text-left p-4 bg-neutral-50 border border-gray-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-emerald-700">{option.hospitalName}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <ShieldCheck size={10} />{option.location}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {option.role}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStaffOptions([])} className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Hospital ID, Mobile, or Emp ID"
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-500 text-xs font-medium ml-4">
                      {error}
                    </motion.p>
                  )}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Sign In'}
                    </button>
                  </div>
                </form>
              )}

              {!needsPasswordChange && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-slate-400 text-xs justify-center">
                    <ShieldCheck size={14} />
                    <span>Secure access for authorized personnel only</span>
                  </div>
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setIsSearchModalOpen(true)}
                      className="flex items-center gap-2 mx-auto text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors"
                    >
                      <UserSearch size={16} />
                      Search Employee
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-neutral-50 p-6 text-center">
              <p className="text-xs text-slate-400">
                Supported Roles: Doctors, Hospitals, Staff, District Admin, State Admin, Super Admin
              </p>
            </div>
          </motion.div>
        </div>
      )}
      <AnimatePresence>
        {isSearchModalOpen && <SearchEmployeeModal key="search-employee-modal" onClose={() => setIsSearchModalOpen(false)} />}
      </AnimatePresence>
    </AnimatePresence>
  );
}

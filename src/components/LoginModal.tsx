import { X, Lock, User, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import RegistrationPage from './RegistrationPage';

export interface UserSession {
  role: 'SUPER_ADMIN' | 'HOSPITAL' | 'DOCTOR' | 'DISTRICT_ADMIN' | 'STATE_ADMIN' | 'STAFF' | 'DISTRICT_MEDICINE_INCHARGE' | 'PHARMACY_MANAGER';
  id: string; // For STAFF, this is their staff ID. For HOSPITAL, this is hospital_id.
  hospitalId?: string; // For STAFF, this is the hospital they belong to.
  activeHospitalId?: string; // The hospital the staff has currently 'Logged into'.
  activeModules?: string[]; // Modules for the active hospital.
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

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);

  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedUsername = username.trim();
      
      // 1. Admin Login check
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
              if (adminData.admin_userid === 'adc.uttarakhand') {
                role = 'SUPER_ADMIN';
              } else {
                role = 'STATE_ADMIN';
              }
            } else if (adminData.admin_userid?.toLowerCase().includes('medicine') || adminData.name?.toLowerCase().includes('medicine') || adminData.admin_name?.toLowerCase().includes('medicine')) {
              role = 'DISTRICT_MEDICINE_INCHARGE';
            }
          }

          onLogin({
            role: role,
            id: adminData.id?.toString() || adminData.admin_userid,
            name: adminData.name || adminData.admin_name || adminData.admin_userid,
            access_districts: adminData.access_districts || [],
            access_systems: adminData.access_systems || [],
            district: adminData.district,
          });
          onClose();
          return;
        } else {
          setError('Wrong Password');
          setLoading(false);
          return;
        }
      }

      // 2. Staff Login check
      const { data: staffDataList, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .or(`mobile_number.eq."${trimmedUsername}",employee_id.eq."${trimmedUsername}"`);

      if (staffDataList && staffDataList.length > 0) {
        // Check password for the first one (assuming same password for all records of same person)
        const firstStaff = staffDataList[0];
        if (firstStaff.login_password !== password && firstStaff.password !== password) {
          setError('Wrong Password');
          setLoading(false);
          return;
        }

        // Find all hospital associations for this person
        const staffIds = staffDataList.map(s => s.id);
        
        // 1. Direct links in staff table
        const directLinks = staffDataList.map(s => {
          const links = [{
            staffId: s.id,
            hospitalId: s.hospital_id,
            staffRecord: s
          }];
          
          // Add secondary hospitals
          if (s.secondary_hospitals && Array.isArray(s.secondary_hospitals)) {
            s.secondary_hospitals.forEach((h: any) => {
              links.push({
                staffId: s.id,
                hospitalId: h.hospital_id,
                staffRecord: s
              });
            });
          }
          return links;
        }).flat().filter(l => l.hospitalId);

        // 2. Incharge links in hospitals table
        const { data: inchargeHospitals } = await supabase
          .from('hospitals')
          .select('hospital_id, incharge_staff_id')
          .in('incharge_staff_id', staffIds);
        
        const inchargeLinks = inchargeHospitals?.map(h => ({
          staffId: h.incharge_staff_id,
          hospitalId: h.hospital_id,
          staffRecord: staffDataList.find(s => s.id === h.incharge_staff_id)
        })) || [];

        // Combine all unique hospital associations
        const allLinksMap = new Map();
        
        [...directLinks, ...inchargeLinks].forEach(link => {
          const key = `${link.staffId}-${link.hospitalId}`;
          if (!allLinksMap.has(key)) {
            allLinksMap.set(key, link);
          }
        });

        const allLinks = Array.from(allLinksMap.values());

        if (allLinks.length > 1) {
          // Multiple hospitals found - need selection
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
          // Only one hospital found - Go directly to dashboard
          const singleLink = allLinks[0];
          await completeStaffLogin({
            ...singleLink.staffRecord,
            hospital_id: singleLink.hospitalId
          });
          return;
        }
      }

      // 3. Hospital Login check
      const { data: hospitalLoginData } = await supabase
        .from('hospitals')
        .select('hospital_id, facility_name, hospital_password, district')
        .eq('hospital_id', username)
        .maybeSingle();

      if (hospitalLoginData) {
        if (password === hospitalLoginData.hospital_password) {
          onLogin({
            role: 'HOSPITAL',
            id: hospitalLoginData.hospital_id,
            name: hospitalLoginData.facility_name,
            district: hospitalLoginData.district,
          });
          onClose();
          return;
        } else {
          setError('Wrong Password');
          setLoading(false);
          return;
        }
      }

      setError('User Not Found');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const completeStaffLogin = async (staffData: any) => {
    if (!staffData.is_active) {
      setError('Account Deactivated');
      return;
    }

    let isIncharge = !!staffData.is_incharge;
    let activeModules = staffData.assigned_modules || [];
    const targetHospitalId = staffData.selectedHospitalId || staffData.hospital_id;
    
    // Check if selected hospital is secondary
    if (staffData.hospital_id !== staffData.selectedHospitalId && staffData.selectedHospitalId) {
      const secondaryHospitals = staffData.secondary_hospitals || [];
      const secondary = secondaryHospitals.find((h: any) => h.hospital_id === staffData.selectedHospitalId);
      if (secondary) {
        activeModules = secondary.modules || [];
      }
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

    onLogin({
      role: 'STAFF',
      id: staffData.id.toString(),
      hospitalId: staffData.hospital_id,
      activeHospitalId: targetHospitalId,
      activeModules: activeModules,
      name: staffData.full_name,
      modules: staffData.assigned_modules || [],
      staffRole: staffData.role,
      isIncharge: isIncharge
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    {staffOptions.length > 0 ? 'Facility Selection' : 'Portal Login'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    {staffOptions.length > 0 ? 'Choose a facility to manage' : 'Access your administrative dashboard'}
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {staffOptions.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <h3 className="text-emerald-900 font-bold text-lg">Select Facility to Manage</h3>
                    <p className="text-emerald-700 text-xs mt-1">Multiple hospital links found for your account.</p>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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
                              <ShieldCheck size={10} />
                              {option.location}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {option.role}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setStaffOptions([])}
                    className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Username</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Hospital ID, Mobile, or Emp ID"
                        className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-red-500 text-xs font-medium ml-4"
                    >
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

              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-slate-400 text-xs justify-center">
                  <ShieldCheck size={14} />
                  <span>Secure access for authorized personnel only</span>
                </div>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setIsRegistrationOpen(true)}
                    className="text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors"
                  >
                    Register
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-50 p-6 text-center">
              <p className="text-xs text-slate-400">
                Supported Roles: Doctors, Hospitals, Staff, District Admin, State Admin, Super Admin
              </p>
            </div>
          </motion.div>
        </div>
      )}
      {isRegistrationOpen && <RegistrationPage onClose={() => setIsRegistrationOpen(false)} />}
    </AnimatePresence>
  );
}


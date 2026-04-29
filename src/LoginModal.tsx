import { X, Lock, User, ShieldCheck, Eye, EyeOff, Loader2, UserSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { supabase, setSupabaseToken } from '../lib/supabase';
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
  requiresPasswordChange?: boolean;
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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedUsername = username.trim();

      const { data, error: functionError } = await supabase.functions.invoke('login', {
        body: { username: trimmedUsername, password }
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data?.type === 'admin') {
        if (data.token) setSupabaseToken(data.token);
        onLogin(data.session);
        onClose();
        return;
      }

      if (data?.type === 'hospital') {
        if (data.token) setSupabaseToken(data.token);
        onLogin(data.session);
        onClose();
        return;
      }

      if (data?.type === 'staff_multiple') {
        // Store options token for when user selects hospital
        if (data.token) setSupabaseToken(data.token);
        setStaffOptions(data.options);
        setLoading(false);
        return;
      }

      if (data?.type === 'staff_single') {
        if (data.token) setSupabaseToken(data.token);
        await completeStaffLogin(data.record);
        return;
      }

      setError('User Not Found');
    } catch (err: any) {
      console.error('Login error:', err);
      // Supabase Edge Function error might be mapped to err.message or in a custom shape
      if (err instanceof Error) {
        if (err.message.includes('Function not found') || err.message.includes('404')) {
           setError('Server edge function not configured. Please deploy it.');
        } else {
           setError(err.message || 'An error occurred during login.');
        }
      } else {
         setError('An error occurred during login.');
      }
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
        <div key="login-modal-wrapper" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            key="login-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                    onClick={() => setIsSearchModalOpen(true)}
                    className="flex items-center gap-2 mx-auto text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors"
                  >
                    <UserSearch size={16} />
                    Search Employee
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
      <AnimatePresence>
        {isSearchModalOpen && <SearchEmployeeModal key="search-employee-modal" onClose={() => setIsSearchModalOpen(false)} />}
      </AnimatePresence>
    </AnimatePresence>
  );
}


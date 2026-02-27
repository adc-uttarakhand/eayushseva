import { X, Lock, User, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UserSession {
  role: 'SUPER_ADMIN' | 'HOSPITAL' | 'DOCTOR' | 'DISTRICT_ADMIN' | 'STATE_ADMIN' | 'STAFF';
  id: string; // For STAFF, this is their staff ID. For HOSPITAL, this is hospital_id.
  hospitalId?: string; // For STAFF, this is the hospital they belong to.
  name?: string;
  modules?: string[];
  staffRole?: string;
  isIncharge?: boolean;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (session: UserSession) => void;
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Super Admin check
      if (username === 'adc.uttarakhand' && password === 'Shutup@99') {
        onLogin({ role: 'SUPER_ADMIN', id: 'admin' });
        onClose();
        return;
      }

      // 2. Staff Login check
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .or(`mobile_number.eq.${username},employee_id.eq.${username}`)
        .maybeSingle();

      if (staffData) {
        if (!staffData.is_active) {
          setError('Account Deactivated');
          return;
        }
        if (staffData.login_password !== password && staffData.password !== password) {
          setError('Wrong Password');
          return;
        }
        // Fetch incharge_staff_id from hospitals table
        let isIncharge = false;
        if (staffData.hospital_id) {
          const { data: hospitalData } = await supabase
            .from('hospitals')
            .select('incharge_staff_id')
            .eq('hospital_id', staffData.hospital_id)
            .maybeSingle();
          
          if (hospitalData && hospitalData.incharge_staff_id?.toString() === staffData.id.toString()) {
            isIncharge = true;
          }
        }

        onLogin({
          role: 'STAFF',
          id: staffData.id.toString(),
          hospitalId: staffData.hospital_id,
          name: staffData.full_name,
          modules: staffData.assigned_modules || [],
          staffRole: staffData.role,
          isIncharge: isIncharge
        });
        onClose();
        return;
      }

      // 3. Hospital Login check
      // We query the hospitals table to find a matching hospital_id
      const { data, error: fetchError } = await supabase
        .from('hospitals')
        .select('hospital_id, facility_name, password')
        .eq('hospital_id', username)
        .maybeSingle();

      if (data) {
        // Check password (using default if not set in DB yet)
        const storedPassword = data.password || 'Abcd@1234';
        
        if (password === storedPassword) {
          onLogin({ 
            role: 'HOSPITAL', 
            id: data.hospital_id, 
            name: data.facility_name 
          });
          onClose();
          return;
        } else {
          setError('Wrong Password');
          return;
        }
      }

      setError('User Not Found');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);

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
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">Portal Login</h2>
                  <p className="text-slate-500 text-sm mt-1">Access your administrative dashboard</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Hospital ID, Mobile, or Emp ID"
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
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
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98]"
                  >
                    Sign In
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-slate-400 text-xs justify-center">
                  <ShieldCheck size={14} />
                  <span>Secure access for authorized personnel only</span>
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
    </AnimatePresence>
  );
}

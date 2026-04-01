import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Check, Loader2, Building2, User, Phone, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RegistrationPageProps {
  onClose: () => void;
}

export default function RegistrationPage({ onClose }: RegistrationPageProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'Staff',
    mobile_number: '',
    hospital_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [inchargeName, setInchargeName] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');
  const [selectedHospitalName, setSelectedHospitalName] = useState('');
  const [roles, setRoles] = useState<any[]>([]);

  React.useEffect(() => {
    fetchRoles();
  }, []);

  React.useEffect(() => {
    if (hospitalSearchQuery.length > 2) {
      fetchHospitals(hospitalSearchQuery);
    } else {
      setHospitals([]);
    }
  }, [hospitalSearchQuery]);

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('role_name');
    if (data) setRoles(data);
  };

  const checkIdentity = async () => {
    setLoading(true);
    setError('');
    
    const { data: foundStaff, error: fetchError } = await supabase
      .from('staff')
      .select('full_name, hospital_id')
      .eq('mobile_number', formData.mobile_number)
      .maybeSingle();

    if (foundStaff) {
      const { data: inchargeData } = await supabase
        .from('staff')
        .select('full_name')
        .eq('hospital_id', foundStaff.hospital_id)
        .eq('is_incharge', true)
        .maybeSingle();
      
      const name = inchargeData?.full_name || 'District Admin';
      setInchargeName(name);
      setMessage(`User already exists. Please contact Incharge ${name} for login details.`);
    } else {
      setStep(2);
      fetchHospitals('');
    }
    setLoading(false);
  };

  const fetchHospitals = async (query: string) => {
    const { data } = await supabase
      .from('hospitals')
      .select('hospital_id, facility_name')
      .ilike('facility_name', `%${query}%`)
      .limit(5);
    if (data) setHospitals(data);
  };

  const submitRegistration = async () => {
    if (!formData.full_name || !formData.role || !formData.hospital_id) {
      setError('Please enter your Full Name, Role, and select a Hospital.');
      return;
    }

    setLoading(true);
    setError('');
    const { error } = await supabase
      .from('registration_requests')
      .insert([{ ...formData, status: 'PENDING' }]);

    if (error) {
      setError('Failed to submit request: ' + error.message);
    } else {
      setMessage('Please contact your Incharge/District Admin to approve your request.');
      sendRegistrationNotification();
    }
    setLoading(false);
  };

  const sendRegistrationNotification = async () => {
    // Logic to notify Incharge, District Admin, State Admin
    console.log('Notification sent to Incharge, District Admin, State Admin');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">New Employee Registration</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Full Name</label>
                  <input 
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select a role...</option>
                    {roles.map((r, index) => (
                      <option key={`role-${index}`} value={r.role_name}>{r.role_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Mobile Number</label>
                  <input 
                    type="tel"
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({...formData, mobile_number: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                {message && <p className="text-emerald-600 font-bold">{message}</p>}
                <button 
                  onClick={checkIdentity}
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Next <ArrowRight size={20} /></>}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Search Hospital</label>
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      value={hospitalSearchQuery}
                      onChange={(e) => setHospitalSearchQuery(e.target.value)}
                      placeholder="Search hospitals..."
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  {hospitals.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-lg max-h-40 overflow-y-auto mb-4">
                      {hospitals.map((h) => (
                        <div 
                          key={h.hospital_id}
                          onClick={() => {
                            setFormData({...formData, hospital_id: h.hospital_id});
                            setHospitalSearchQuery(h.facility_name);
                            setHospitals([]);
                          }}
                          className="p-4 hover:bg-slate-50 cursor-pointer border-b border-gray-100 last:border-none"
                        >
                          {h.facility_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {message && <p className="text-emerald-600 font-bold">{message}</p>}
                {error && <p className="text-red-500 font-bold">{error}</p>}
                {formData.hospital_id && !message && (
                  <button 
                    onClick={submitRegistration}
                    disabled={loading}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <>Submit <Check size={20} /></>}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

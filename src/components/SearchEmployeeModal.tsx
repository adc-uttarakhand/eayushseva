import { X, Search, Loader2, User, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface SearchEmployeeModalProps {
  onClose: () => void;
  key?: string;
}

export default function SearchEmployeeModal({ onClose }: SearchEmployeeModalProps) {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!mobile) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('full_name, hospital_id')
        .eq('mobile_number', mobile)
        .single();
      
      if (staffError || !staff) {
        setError('Employee not found');
        return;
      }

      const { data: hospital, error: hospitalError } = await supabase
        .from('hospitals')
        .select('facility_name, incharge_staff_id')
        .eq('hospital_id', staff.hospital_id)
        .single();

      let inchargeName = 'Not assigned';
      if (hospital && hospital.incharge_staff_id) {
        const { data: incharge } = await supabase
          .from('staff')
          .select('full_name')
          .eq('id', hospital.incharge_staff_id)
          .single();
        if (incharge) inchargeName = incharge.full_name;
      }

      setResult({
        name: staff.full_name,
        hospital: hospital?.facility_name || 'Not linked',
        incharge: inchargeName
      });
    } catch (e) {
      setError('An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Search Employee</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Enter mobile number"
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !mobile}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-2xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex justify-center"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} className="mr-2" /> Search</>}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
        {result && (
          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-3"><User size={18} className="text-emerald-600" /> <span className="font-bold">{result.name}</span></div>
            <div className="flex items-center gap-3"><Building2 size={18} className="text-emerald-600" /> <span className="text-sm">{result.hospital}</span></div>
            <div className="text-xs text-slate-500 italic">In-charge: {result.incharge}</div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

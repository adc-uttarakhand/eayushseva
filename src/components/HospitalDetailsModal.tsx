import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Phone, Mail, Activity, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HospitalChangeModal from './HospitalChangeModal';
import { supabase } from '../lib/supabase';

interface Hospital {
  hospital_id: string;
  facility_name: string;
  district: string;
  system: string;
  type?: string;
  location?: string;
  taluka?: string;
  block?: string;
  incharge_name?: string;
  mobile?: string;
  email?: string;
}

interface HospitalDetailsModalProps {
  hospital: Hospital | null;
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
}

export default function HospitalDetailsModal({ hospital, isOpen, onClose, staffId }: HospitalDetailsModalProps) {
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);

  const fetchHospitals = async () => {
    const { data, error } = await supabase
      .from('hospitals')
      .select('hospital_id, facility_name, district, system')
      .order('facility_name');
    if (data) setHospitals(data);
  };

  useEffect(() => {
    if (isChangeModalOpen) {
      fetchHospitals();
    }
  }, [isChangeModalOpen]);

  if (!hospital || !isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && !isChangeModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <Building2 size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{hospital.facility_name}</h2>
                    <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mt-1">
                      {hospital.system} {hospital.type ? `• ${hospital.type}` : ''}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <MapPin size={12} /> District
                      </div>
                      <div className="font-medium text-slate-900">{hospital.district || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <MapPin size={12} /> Block/Taluka
                      </div>
                      <div className="font-medium text-slate-900">{hospital.block || hospital.taluka || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Activity size={12} /> Incharge
                      </div>
                      <div className="font-medium text-slate-900">{hospital.incharge_name || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Phone size={12} /> Contact
                      </div>
                      <div className="font-medium text-slate-900">{hospital.mobile || 'N/A'}</div>
                    </div>
                  </div>

                  {hospital.location && (
                    <div className="space-y-1 pt-4 border-t border-gray-100">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <MapPin size={12} /> Full Address
                      </div>
                      <div className="font-medium text-slate-900 text-sm leading-relaxed">{hospital.location}</div>
                    </div>
                  )}
                  
                  {hospital.email && (
                    <div className="space-y-1 pt-4 border-t border-gray-100">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Mail size={12} /> Email
                      </div>
                      <div className="font-medium text-slate-900 text-sm">{hospital.email}</div>
                    </div>
                  )}

                  <div className="pt-8 flex gap-4">
                    <button
                      onClick={() => setIsChangeModalOpen(true)}
                      className="w-full bg-emerald-50 text-emerald-700 font-bold py-4 rounded-2xl hover:bg-emerald-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-emerald-200"
                    >
                      <Edit3 size={18} />
                      Change Hospital
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <HospitalChangeModal
        isOpen={isChangeModalOpen}
        onClose={() => {
          setIsChangeModalOpen(false);
          onClose(); // Close both modals after successful submission
        }}
        onConfirm={(newHospitalId: string, newHospitalName: string) => {
          console.log('Hospital changed to:', newHospitalName, newHospitalId);
          setIsChangeModalOpen(false);
          onClose();
        }}
        hospitals={hospitals}
        currentHospitalId={hospital.hospital_id}
        staffId={staffId}
      />
    </>
  );
}

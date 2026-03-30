import { X, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Hospital {
  sr_no: number;
  facility_name: string;
  type: string;
  system: string;
  location: string;
  district: string;
  taluka: string;
  pincode: string;
  block: string;
  latitude: number;
  longitude: number;
  region_indicator: string;
  operational_status: string;
  ipd_services: string;
  incharge_name: string;
  mobile: string;
  email: string;
  status: string;
  hospital_id: string;
  doctor_id: string;
  password?: string;
  altitude?: number;
  above_7000_feet?: string;
}

interface EditHospitalModalProps {
  hospital: Hospital | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
}

const UTTARAKHAND_DISTRICTS = [
  "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
  "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", 
  "Udham Singh Nagar", "Uttarkashi"
];

export default function EditHospitalModal({ hospital, isOpen, onClose, onUpdate, onLogout, isAdmin }: EditHospitalModalProps) {
  const [formData, setFormData] = useState<Hospital | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hospital) {
      setFormData({ 
        ...hospital,
        altitude: hospital.altitude || 0,
        above_7000_feet: hospital.above_7000_feet || 'No'
      });
      setNewPassword('');
    }
  }, [hospital]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!formData) return;
    let { name, value } = e.target;
    
    if (name === 'altitude') {
      // Strip "ft" or "feet"
      const numericValue = value.replace(/ft|feet/gi, '').trim();
      // Ensure only numbers
      if (!/^\d*$/.test(numericValue)) return;
      
      const altitude = parseInt(numericValue, 10) || 0;
      setFormData({ 
        ...formData, 
        altitude: altitude,
        above_7000_feet: altitude >= 7000 ? 'Yes' : 'No'
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    try {
      setSaving(true);
      setError('');

      const updatePayload: any = {
        facility_name: formData.facility_name,
        system: formData.system,
        district: formData.district,
        location: formData.location,
        incharge_name: formData.incharge_name,
        mobile: formData.mobile,
        email: formData.email,
        operational_status: formData.operational_status,
        altitude: formData.altitude,
        above_7000_feet: formData.above_7000_feet,
      };

      // Only update password if a new one is provided
      if (newPassword.trim()) {
        updatePayload.password = newPassword.trim();
      }

      const tableNames = ['hospitals', 'hospital'];
      let updateSuccess = false;

      for (const tableName of tableNames) {
        let targetId = formData.hospital_id;
        let targetSr = formData.sr_no;

        // Try to find correct identifiers first
        const { data: searchData } = await supabase
          .from(tableName)
          .select('hospital_id, sr_no')
          .eq('facility_name', formData.facility_name)
          .eq('district', formData.district)
          .limit(1);

        if (searchData && searchData.length > 0) {
          targetId = searchData[0].hospital_id;
          targetSr = searchData[0].sr_no;
        }

        // Try hospital_id
        let { data, error: updateError } = await supabase
          .from(tableName)
          .update(updatePayload)
          .eq('hospital_id', targetId)
          .select();

        if (!updateError && data && data.length > 0) {
          updateSuccess = true;
          break;
        }

        // Try sr_no
        const { data: retryData, error: retryError } = await supabase
          .from(tableName)
          .update(updatePayload)
          .eq('sr_no', targetSr)
          .select();
        
        if (!retryError && retryData && retryData.length > 0) {
          updateSuccess = true;
          break;
        }

        // Try id
        if ((formData as any).id) {
          const { data: idData, error: idError } = await supabase
            .from(tableName)
            .update(updatePayload)
            .eq('id', (formData as any).id)
            .select();
          if (!idError && idData && idData.length > 0) {
            updateSuccess = true;
            break;
          }
        }
      }

      if (!updateSuccess) {
        throw new Error('Hospital record not found for update in any table.');
      }

      onUpdate();
      onLogout();
      onClose();
    } catch (err: any) {
      console.error('Error updating hospital:', err);
      setError(err.message || 'Failed to update hospital');
    } finally {
      setSaving(false);
    }
  };

  if (!formData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">Edit Facility</h2>
                  <p className="text-slate-500 text-sm mt-1">Update hospital information in the registry</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Facility Name</label>
                    <input
                      name="facility_name"
                      value={formData.facility_name || ''}
                      onChange={handleChange}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">System</label>
                    <select
                      name="system"
                      value={formData.system || ''}
                      onChange={handleChange}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                    >
                      <option>Ayurveda</option>
                      <option>Yoga</option>
                      <option>Unani</option>
                      <option>Siddha</option>
                      <option>Homeopathy</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">District</label>
                    <select
                      name="district"
                      value={formData.district || ''}
                      onChange={handleChange}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                    >
                      <option value="">Select District</option>
                      {UTTARAKHAND_DISTRICTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Altitude (in Feet)</label>
                    <input
                      name="altitude"
                      value={formData.altitude || ''}
                      onChange={handleChange}
                      placeholder="e.g. 7500"
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Above 7000 ft</label>
                    <select
                      name="above_7000_feet"
                      value={formData.above_7000_feet || 'No'}
                      onChange={handleChange}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Incharge Name</label>
                    <input
                      name="incharge_name"
                      value={formData.incharge_name || ''}
                      onChange={handleChange}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Mobile</label>
                    <input
                      name="mobile"
                      value={formData.mobile || ''}
                      onChange={handleChange}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Email</label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={handleChange}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">
                      {isAdmin ? 'Reset Password (Admin)' : 'Change Password'}
                    </label>
                    <input
                      type="text"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-xs font-medium ml-4">{error}</p>
                )}

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-neutral-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-neutral-200 transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

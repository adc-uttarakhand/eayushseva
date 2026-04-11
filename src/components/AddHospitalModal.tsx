import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Loader2, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddHospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const HOSPITAL_TYPES = [
  'AYUSH 50 Bed',
  'AYUSH Educational Institute',
  'AYUSH WING - PHC',
  'AYUSH Wing - CHC',
  'AYUSH Wing at District Hospital',
  'AYUSHMAN AROGYA MANDIR (AYUSH)',
  'Ayurveda 10 Bed',
  'Government AYUSH Dispensary',
  'Government AYUSH Hospital',
  'MOCH - PHC',
  'MOCH - CHC'
];

const FACILITY_TYPE_CODES: Record<string, string> = {
  'AYUSHMAN AROGYA MANDIR (AYUSH)': 'AAM',
  'AYUSH WING - PHC': 'AWP',
  'AYUSH Wing - CHC': 'AWC',
  'AYUSH Wing at District Hospital': 'AWD',
  'Government AYUSH Dispensary': 'GAD',
  'Government AYUSH Hospital': 'GAH',
  'MOCH - PHC': 'MOCH',
  'MOCH - CHC': 'MOCH',
  'AYUSH Educational Institute': 'EDU',
  'Ayurveda 10 Bed': '10B',
  'AYUSH 50 Bed': '50B'
};

const SYSTEMS = ['Ayurveda', 'Homeopathy', 'Unani', 'AYUSH'];
const SYSTEM_CODES: Record<string, string> = {
  'Ayurveda': 'AYU',
  'Homeopathy': 'HOM',
  'Unani': 'UNA',
  'AYUSH': 'AYUSH'
};

const DISTRICTS = [
  "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
  "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", 
  "Udham Singh Nagar", "Uttarkashi"
];
const DISTRICT_CODES: Record<string, string> = {
  'Almora': 'ALM',
  'Bageshwar': 'BAG',
  'Chamoli': 'CHM',
  'Champawat': 'CHM',
  'Dehradun': 'DDN',
  'Haridwar': 'HDW',
  'Nainital': 'NTL',
  'Pauri Garhwal': 'PAU',
  'Pithoragarh': 'PTH',
  'Rudraprayag': 'RDP',
  'Tehri Garhwal': 'TGH',
  'Udham Singh Nagar': 'USN',
  'Uttarkashi': 'UKU'
};

export default function AddHospitalModal({ isOpen, onClose, onSuccess }: AddHospitalModalProps) {
  const [loading, setLoading] = useState(false);
  const [nextSrNo, setNextSrNo] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    hospital_id: '',
    facility_name: '',
    type: '',
    system: '',
    location: '',
    district: '',
    taluka: '',
    pincode: '',
    block: '',
    latitude: '',
    longitude: '',
    region_indicator: '',
    above_7000_feet: 'No',
    email: '',
    status: '',
    hospital_password: 'ABCD_1234'
  });

  // Fetch max sr_no when opened
  useEffect(() => {
    if (isOpen) {
      const fetchMaxSrNo = async () => {
        const { data, error } = await supabase
          .from('hospitals')
          .select('sr_no')
          .order('sr_no', { ascending: false })
          .limit(1);
        
        if (!error && data && data.length > 0) {
          setNextSrNo(data[0].sr_no + 1);
        } else {
          setNextSrNo(1);
        }
      };
      fetchMaxSrNo();

      setFormData({
        hospital_id: '',
        facility_name: '',
        type: '',
        system: '',
        location: '',
        district: '',
        taluka: '',
        pincode: '',
        block: '',
        latitude: '',
        longitude: '',
        region_indicator: '',
        above_7000_feet: 'No',
        email: '',
        status: '',
        hospital_password: 'ABCD_1234'
      });
    }
  }, [isOpen]);

  // Auto-generate hospital_id
  useEffect(() => {
    if (formData.type && formData.system && formData.district && nextSrNo !== null) {
      const typeCode = FACILITY_TYPE_CODES[formData.type] || 'UNK';
      const systemCode = SYSTEM_CODES[formData.system] || 'UNK';
      const districtCode = DISTRICT_CODES[formData.district] || 'UNK';
      const serialStr = nextSrNo.toString().padStart(5, '0');
      
      const generatedId = `${typeCode}-${systemCode}-${districtCode}-${serialStr}`;
      setFormData(prev => ({ ...prev, hospital_id: generatedId }));
    } else {
      setFormData(prev => ({ ...prev, hospital_id: '' }));
    }
  }, [formData.type, formData.system, formData.district, nextSrNo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Get the max sr_no again to be safe against race conditions
      const { data: maxSrNoData, error: maxSrNoError } = await supabase
        .from('hospitals')
        .select('sr_no')
        .order('sr_no', { ascending: false })
        .limit(1);

      if (maxSrNoError) throw maxSrNoError;

      const finalSrNo = maxSrNoData && maxSrNoData.length > 0 ? maxSrNoData[0].sr_no + 1 : 1;

      const typeCode = FACILITY_TYPE_CODES[formData.type] || 'UNK';
      const systemCode = SYSTEM_CODES[formData.system] || 'UNK';
      const districtCode = DISTRICT_CODES[formData.district] || 'UNK';
      const serialStr = finalSrNo.toString().padStart(5, '0');
      const finalHospitalId = `${typeCode}-${systemCode}-${districtCode}-${serialStr}`;

      // 2. Prepare payload
      const payload = {
        ...formData,
        hospital_id: finalHospitalId,
        sr_no: finalSrNo,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      // 3. Insert into hospitals table
      const { error: insertError } = await supabase
        .from('hospitals')
        .insert([payload]);

      if (insertError) throw insertError;

      alert('Hospital added successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding hospital:', error);
      alert('Error adding hospital: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add New Hospital</h2>
                <p className="text-sm text-slate-500 font-medium">Enter details to register a new facility</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto">
            <form id="add-hospital-form" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Hospital ID *</label>
                  <input 
                    required
                    readOnly
                    value={formData.hospital_id}
                    className="w-full bg-slate-100 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-500 cursor-not-allowed"
                    placeholder="Auto-generated on selection"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Facility Name *</label>
                  <input 
                    required
                    value={formData.facility_name}
                    onChange={e => setFormData({...formData, facility_name: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    placeholder="e.g. District Hospital Dehradun"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Type *</label>
                  <select 
                    required
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  >
                    <option value="">Select Type</option>
                    {HOSPITAL_TYPES.map((t, index) => <option key={`${t}-${index}`} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">System *</label>
                  <select 
                    required
                    value={formData.system}
                    onChange={e => setFormData({...formData, system: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  >
                    <option value="">Select System</option>
                    {SYSTEMS.map((s, index) => <option key={`${s}-${index}`} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Location / Address *</label>
                  <input 
                    required
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    placeholder="Full address"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">District *</label>
                  <select 
                    required
                    value={formData.district}
                    onChange={e => setFormData({...formData, district: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  >
                    <option value="">Select District</option>
                    {DISTRICTS.map((d, index) => <option key={`${d}-${index}`} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Taluka</label>
                  <input 
                    value={formData.taluka}
                    onChange={e => setFormData({...formData, taluka: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Block</label>
                  <input 
                    value={formData.block}
                    onChange={e => setFormData({...formData, block: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Pincode</label>
                  <input 
                    value={formData.pincode}
                    onChange={e => setFormData({...formData, pincode: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Latitude</label>
                  <input 
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={e => setFormData({...formData, latitude: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Longitude</label>
                  <input 
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={e => setFormData({...formData, longitude: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Region Indicator</label>
                  <select 
                    value={formData.region_indicator}
                    onChange={e => setFormData({...formData, region_indicator: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  >
                    <option value="">Select Region</option>
                    <option value="Rural">Rural</option>
                    <option value="Urban">Urban</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Terrain Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  >
                    <option value="">Select Status</option>
                    <option value="Sugam">Sugam</option>
                    <option value="Durgam">Durgam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Above 7000 ft</label>
                  <select 
                    value={formData.above_7000_feet}
                    onChange={e => setFormData({...formData, above_7000_feet: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Email</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Hospital Password *</label>
                  <input 
                    required
                    value={formData.hospital_password}
                    onChange={e => setFormData({...formData, hospital_password: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

              </div>
            </form>
          </div>

          <div className="p-6 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-hospital-form"
              disabled={loading}
              className="px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              Save Hospital
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

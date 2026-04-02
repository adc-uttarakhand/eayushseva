import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Hospital {
  hospital_id: string;
  facility_name: string;
  district: string;
}

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  hospitals: Hospital[];
}

export default function AddEmployeeModal({ isOpen, onClose, onAdd, hospitals }: AddEmployeeModalProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    employee_id: '',
    role: '',
    posting_place_id: ''
  });
  
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  
  const [roleSearch, setRoleSearch] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const hospitalDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
      if (hospitalDropdownRef.current && !hospitalDropdownRef.current.contains(event.target as Node)) {
        setShowHospitalDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      setFormData({
        full_name: '',
        mobile_number: '',
        employee_id: '',
        role: '',
        posting_place_id: ''
      });
      setHospitalSearch('');
      setRoleSearch('');
      setError('');
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('role_name');
    if (data) setRoles(data.map(r => r.role_name).sort());
  };

  const filteredHospitals = (hospitals || []).filter(h => 
    h.facility_name.toLowerCase().includes(hospitalSearch.toLowerCase()) || 
    h.district.toLowerCase().includes(hospitalSearch.toLowerCase())
  );

  const filteredRoles = roles.filter(r => 
    r.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.mobile_number && !formData.employee_id) {
      setError('Please provide either Mobile Number or Employee ID.');
      return;
    }

    if (!formData.role) {
      setError('Please select a role.');
      return;
    }

      if (!formData.posting_place_id) {
        setError('Please select a hospital.');
        return;
      }

      setLoading(true);

      try {
        // Check if employee already exists
        let query = supabase.from('staff').select('id');
        
        if (formData.mobile_number && formData.employee_id) {
          query = query.or(`mobile_number.eq."${formData.mobile_number}",employee_id.eq."${formData.employee_id}"`);
        } else if (formData.mobile_number) {
          query = query.eq('mobile_number', formData.mobile_number);
        } else if (formData.employee_id) {
          query = query.eq('employee_id', formData.employee_id);
        }

        const { data: existingStaff, error: checkError } = await query;

        if (checkError) throw checkError;

        if (existingStaff && existingStaff.length > 0) {
          setError('Employee already in the portal.');
          setLoading(false);
          return;
        }

        // Insert new employee
        const selectedHospital = hospitals.find(h => h.hospital_id === formData.posting_place_id);
        const postingPlaceName = selectedHospital?.facility_name || '';
      
      const { error: insertError } = await supabase.from('staff').insert([{
        full_name: formData.full_name,
        mobile_number: formData.mobile_number.trim(),
        employee_id: formData.employee_id.trim(),
        role: formData.role,
        hospital_id: formData.posting_place_id,
        first_posting_place: postingPlaceName,
        login_password: 'ayush@123',
        is_active: true
      }]);

      if (insertError) throw insertError;

      onAdd();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while adding the employee.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full h-full md:h-auto md:max-w-2xl md:rounded-3xl shadow-xl overflow-hidden flex flex-col md:max-h-[90vh]"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-2xl font-bold text-slate-900">Add Employee</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={24} className="text-slate-500" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <form id="add-employee-form" onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Enter full name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit mobile number"
                    value={formData.mobile_number}
                    onChange={e => setFormData({ ...formData, mobile_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Enter 10-digit mobile number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Employee ID</label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Enter employee ID"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 -mt-4">Please provide either Mobile Number or Employee ID.</p>

              <div className="relative" ref={roleDropdownRef}>
                <label className="block text-sm font-bold text-slate-700 mb-2">Role *</label>
                <div 
                  className="relative"
                  onClick={() => setShowRoleDropdown(true)}
                >
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={roleSearch}
                    onChange={e => {
                      setRoleSearch(e.target.value);
                      setShowRoleDropdown(true);
                      setFormData({ ...formData, role: '' });
                    }}
                    onFocus={() => setShowRoleDropdown(true)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Search and select role..."
                  />
                </div>
                
                {showRoleDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredRoles.length > 0 ? (
                      filteredRoles.map(role => (
                        <div
                          key={role}
                          className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-sm"
                          onClick={() => {
                            setFormData({ ...formData, role });
                            setRoleSearch(role);
                            setShowRoleDropdown(false);
                          }}
                        >
                          {role}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">No roles found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative" ref={hospitalDropdownRef}>
                <label className="block text-sm font-bold text-slate-700 mb-2">Hospital *</label>
                <div 
                  className="relative"
                  onClick={() => setShowHospitalDropdown(true)}
                >
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={hospitalSearch}
                    onChange={e => {
                      setHospitalSearch(e.target.value);
                      setShowHospitalDropdown(true);
                      setFormData({ ...formData, posting_place_id: '' });
                    }}
                    onFocus={() => setShowHospitalDropdown(true)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Search and select hospital..."
                  />
                </div>
                
                {showHospitalDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredHospitals.length > 0 ? (
                      filteredHospitals.map(hospital => (
                        <div
                          key={hospital.hospital_id}
                          className="px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0"
                          onClick={() => {
                            setFormData({ ...formData, posting_place_id: hospital.hospital_id });
                            setHospitalSearch(`${hospital.facility_name} (${hospital.district})`);
                            setShowHospitalDropdown(false);
                          }}
                        >
                          <div className="font-medium text-slate-900">{hospital.facility_name}</div>
                          <div className="text-xs text-slate-500">{hospital.district}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">No hospitals found</div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-gray-100 bg-slate-50 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-employee-form"
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin" /> Adding...</>
              ) : (
                <><Save size={20} /> Add Employee</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

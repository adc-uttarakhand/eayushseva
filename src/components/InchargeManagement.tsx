import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Building2, User, Edit2, Trash2, Loader2, ShieldCheck, MapPin, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';
import ChangeInchargeModal from './ChangeInchargeModal';
import * as XLSX from 'xlsx';

interface Hospital {
  hospital_id: string;
  facility_name: string;
  district: string;
  incharge_name: string;
  incharge_staff_id?: string;
  mobile?: string;
}

interface InchargeManagementProps {
  session: UserSession;
}

export default function InchargeManagement({ session }: InchargeManagementProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setLoading(true);
    let query = supabase.from('hospitals').select('hospital_id, facility_name, district, incharge_name, incharge_staff_id, mobile');
    
    if (session.access_districts && !session.access_districts.includes('All')) {
      query = query.in('district', session.access_districts);
    }

    const { data, error } = await query.order('facility_name');
    if (data) setHospitals(data);
    setLoading(false);
  };

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [hospitalToRemove, setHospitalToRemove] = useState<Hospital | null>(null);

  const confirmRemoveIncharge = (hospital: Hospital) => {
    setHospitalToRemove(hospital);
    setIsConfirmModalOpen(true);
  };

  const handleRemoveIncharge = async () => {
    if (!hospitalToRemove) return;

    try {
      // 1. Update old staff
      if (hospitalToRemove.incharge_staff_id) {
        const { error: staffError } = await supabase
          .from('staff')
          .update({ is_incharge: false })
          .eq('id', hospitalToRemove.incharge_staff_id);
        
        if (staffError) throw staffError;
      }

      // 2. Update hospital
      const { error: hospitalError } = await supabase
        .from('hospitals')
        .update({ 
          incharge_name: null, 
          incharge_staff_id: null,
          mobile: null
        })
        .eq('hospital_id', hospitalToRemove.hospital_id);

      if (hospitalError) throw hospitalError;

      setIsConfirmModalOpen(false);
      setHospitalToRemove(null);
      fetchHospitals();
    } catch (error: any) {
      console.error('Error removing incharge:', error);
      alert('Error removing incharge: ' + error.message);
    }
  };

  const handleAssignIncharge = async (staff: any) => {
    if (!selectedHospital) return;

    // 1. Update old staff
    if (selectedHospital.incharge_staff_id) {
      await supabase
        .from('staff')
        .update({ is_incharge: false })
        .eq('id', selectedHospital.incharge_staff_id);
    }

    // 2. Update new staff
    await supabase
      .from('staff')
      .update({ is_incharge: true })
      .eq('id', staff.id);

    // 3. Update hospital
    const { error } = await supabase
      .from('hospitals')
      .update({ 
        incharge_name: staff.full_name, 
        incharge_staff_id: staff.id,
        mobile: staff.mobile_number
      })
      .eq('hospital_id', selectedHospital.hospital_id);

    if (error) {
      alert('Error assigning incharge: ' + error.message);
    } else {
      setIsModalOpen(false);
      fetchHospitals();
    }
  };

  const districts = Array.from(new Set(hospitals.map(h => h.district))).sort();
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Hospital; direction: 'asc' | 'desc' } | null>(null);

  const requestSort = (key: keyof Hospital) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredHospitals = hospitals.filter(h => 
    (selectedDistrict === 'All' || h.district === selectedDistrict) &&
    ((h.facility_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (h.district || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (h.incharge_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()))
  ).sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredHospitals.map(h => ({
      'Hospital': h.facility_name,
      'District': h.district,
      'Incharge': h.incharge_name || 'No incharge assigned',
      'Mobile Number': h.mobile || 'N/A'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Incharges');
    XLSX.writeFile(workbook, 'Incharges_List.xlsx');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Incharge <span className="text-emerald-600">Management</span></h1>
            <p className="text-slate-500 mt-2 font-medium">Assign and manage hospital incharges across the state.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button 
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 bg-white border border-gray-100 text-slate-700 py-4 px-6 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download size={20} />
              Export Excel
            </button>
            <select 
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-white border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium shadow-sm"
            >
              <option value="All">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Search by hospital, district, or incharge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium shadow-sm"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-slate-400 font-medium">Loading records...</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-4">
              <div className="p-4 border-b border-gray-100">
                <button className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-sm">
                  Incharges: {filteredHospitals.filter(h => h.incharge_name).length} / {filteredHospitals.length} Hospitals
                </button>
              </div>
            </div>
            
            <table className="hidden md:table w-full text-left border-collapse bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/50">
                  <th className="py-4 px-6 font-bold text-slate-900 cursor-pointer hover:text-emerald-600" onClick={() => requestSort('facility_name')}>Hospital</th>
                  <th className="py-4 px-6 font-bold text-slate-900 cursor-pointer hover:text-emerald-600" onClick={() => requestSort('district')}>District</th>
                  <th className="py-4 px-6 font-bold text-slate-900 cursor-pointer hover:text-emerald-600" onClick={() => requestSort('incharge_name')}>Incharge</th>
                  <th className="py-4 px-6 font-bold text-slate-900 cursor-pointer hover:text-emerald-600" onClick={() => requestSort('mobile')}>Mobile Number</th>
                  <th className="py-4 px-6 font-bold text-slate-900 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHospitals.map(h => (
                  <tr key={h.hospital_id} className="border-b border-gray-100 hover:bg-emerald-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">{h.facility_name}</td>
                    <td className="py-4 px-6 text-slate-600">{h.district}</td>
                    <td className="py-4 px-6 text-slate-600">
                      {h.incharge_name ? (
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-700">{h.incharge_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No incharge assigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-mono">
                      {h.mobile || <span className="text-slate-400 italic">N/A</span>}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedHospital(h);
                            setIsModalOpen(true);
                          }}
                          className="bg-slate-900 text-white py-2 px-4 rounded-xl font-bold hover:bg-black transition-all text-sm"
                        >
                          {h.incharge_name ? 'Change' : 'Assign'}
                        </button>
                        {h.incharge_name && (
                          <button 
                            onClick={() => confirmRemoveIncharge(h)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove Incharge"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="md:hidden space-y-4">
              {filteredHospitals.map(h => (
                <div key={h.hospital_id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="font-bold text-slate-900">{h.facility_name}</div>
                  <div className="text-slate-600 text-sm">{h.district}</div>
                  <div className="text-slate-600 text-sm mt-2">Incharge: {h.incharge_name || 'No incharge assigned'}</div>
                  <div className="text-slate-600 text-sm">Mobile: {h.mobile || 'N/A'}</div>
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button 
                      onClick={() => {
                        setSelectedHospital(h);
                        setIsModalOpen(true);
                      }}
                      className="bg-slate-900 text-white py-2 px-4 rounded-xl font-bold hover:bg-black transition-all text-sm"
                    >
                      {h.incharge_name ? 'Change' : 'Assign'}
                    </button>
                    {h.incharge_name && (
                      <button 
                        onClick={() => confirmRemoveIncharge(h)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Remove Incharge"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && filteredHospitals.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
              <Building2 size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No hospitals found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your search query.</p>
          </div>
        )}
      </div>

      <ChangeInchargeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAssign={handleAssignIncharge}
        userRole={session.role}
      />

      <AnimatePresence>
        {isConfirmModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Remove Incharge</h2>
              <p className="text-slate-600 mb-8">
                Are you sure you want to remove <span className="font-bold text-slate-900">{hospitalToRemove?.incharge_name}</span> as the incharge for <span className="font-bold text-slate-900">{hospitalToRemove?.facility_name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRemoveIncharge}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

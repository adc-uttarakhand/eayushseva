import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Building2, MapPin, Edit2, Save, X, Loader2, ShieldCheck, Phone, Mail, User, Globe, Activity, CheckCircle2, AlertCircle, Download, Plus, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';
import HospitalProfile from './HospitalProfile';
import EmployeeDirectory from './EmployeeDirectory';
import ServiceRecordTab from './ServiceRecordTab';
import InchargeManagement from './InchargeManagement';
import AddHospitalModal from './AddHospitalModal';
import * as XLSX from 'xlsx';

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
  incharge_staff_id?: string;
  photo_url?: string;
  special_services?: string[];
  centre_of_excellence?: string;
  supraja_centre?: boolean;
  panchakarma_centre?: boolean;
  is_verified?: boolean;
  above_7000ft?: boolean;
  last_edited_on?: string;
  verified_by?: string;
  verified_at?: string;
}

const UTTARAKHAND_DISTRICTS = [
  "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
  "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", 
  "Udham Singh Nagar", "Uttarkashi"
];

interface HospitalDirectoryProps {
  session?: UserSession | null;
}

export default function HospitalDirectory({ session }: HospitalDirectoryProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hospitals' | 'employees' | 'incharges'>('hospitals');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    district: 'All',
    type: 'All',
    system: 'All',
    region: 'All',
    status: 'All'
  });
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddHospitalOpen, setIsAddHospitalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setLoading(true);
    let query = supabase.from('hospitals').select('*').limit(10000);

    if (session) {
      if (session.access_districts && !session.access_districts.includes('All')) {
        query = query.in('district', session.access_districts);
      }
      
      if (session.access_systems && session.access_systems.length > 0 && !session.access_systems.includes('All')) {
        query = query.in('system', session.access_systems);
      }
    }

    const { data, error } = await query.order('facility_name');
    
    if (data && data.length > 0) {
      setHospitals(data);
      setLoading(false);
      return data;
    }
    setLoading(false);
    return [];
  };

  const handleUpdate = async () => {
    const updatedData = await fetchHospitals();
    if (selectedHospital) {
      const updated = updatedData.find(h => h.sr_no === selectedHospital.sr_no);
      if (updated) {
        setSelectedHospital(updated);
      }
    }
  };

  const handleUpdateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospital) return;

    setIsSubmitting(true);
    const { sr_no, hospital_id, doctor_id, ...updateData } = selectedHospital;
    
    try {
      const tableNames = ['hospitals', 'hospital'];
      let updateSuccess = false;
      let updatedRecord = null;

      for (const tableName of tableNames) {
        let targetId = hospital_id;
        let targetSr = sr_no;

        const { data: searchData } = await supabase
          .from(tableName)
          .select('hospital_id, sr_no')
          .eq('facility_name', selectedHospital.facility_name)
          .eq('district', selectedHospital.district)
          .limit(1);

        if (searchData && searchData.length > 0) {
          targetId = searchData[0].hospital_id;
          targetSr = searchData[0].sr_no;
        }

        let { data, error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('hospital_id', targetId)
          .select();

        if (!error && data && data.length > 0) {
          updateSuccess = true;
          updatedRecord = data[0];
          break;
        }

        const { data: retryData, error: retryError } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('sr_no', targetSr)
          .select();
        
        if (!retryError && retryData && retryData.length > 0) {
          updateSuccess = true;
          updatedRecord = retryData[0];
          break;
        }

        if ((selectedHospital as any).id) {
          const { data: idData, error: idError } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', (selectedHospital as any).id)
            .select();
          if (!idError && idData && idData.length > 0) {
            updateSuccess = true;
            updatedRecord = idData[0];
            break;
          }
        }
      }

      if (!updateSuccess) {
        throw new Error('Hospital record not found for update in any table.');
      }

      setHospitals(prev => prev.map(h => h.sr_no === sr_no ? { ...selectedHospital, ...updatedRecord } : h));
      alert('Hospital updated successfully!');
      setIsDossierOpen(false);
    } catch (error: any) {
      alert("Error updating hospital: " + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const districts = ['All', ...Array.from(new Set(hospitals.map(h => h.district).filter(Boolean)))].sort();
  const types = ['All', ...Array.from(new Set(hospitals.map(h => h.type).filter(Boolean)))].sort();
  const systems = ['All', ...Array.from(new Set(hospitals.map(h => h.system).filter(Boolean)))].sort();
  const regions = ['All', ...Array.from(new Set(hospitals.map(h => h.region_indicator).filter(Boolean)))].sort();
  const statuses = ['All', ...Array.from(new Set(hospitals.map(h => h.status).filter(Boolean)))].sort();

  const filteredHospitals = hospitals.filter(h => {
    const matchesSearch = (h.facility_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
                         (h.district || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesDistrict = filters.district === 'All' || h.district === filters.district;
    const matchesType = filters.type === 'All' || h.type === filters.type;
    const matchesSystem = filters.system === 'All' || h.system === filters.system;
    const matchesRegion = filters.region === 'All' || h.region_indicator === filters.region;
    const matchesStatus = filters.status === 'All' || h.status === filters.status;
    
    return matchesSearch && matchesDistrict && matchesType && matchesSystem && matchesRegion && matchesStatus;
  });

  const handleDownloadExcel = () => {
    const dataToExport = filteredHospitals.map(h => {
      const row: any = { ...h };
      
      // Format arrays and objects for Excel compatibility
      Object.keys(row).forEach(key => {
        if (Array.isArray(row[key])) {
          row[key] = row[key].join(', ');
        } else if (typeof row[key] === 'object' && row[key] !== null) {
          row[key] = JSON.stringify(row[key]);
        }
      });
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hospitals");
    XLSX.writeFile(workbook, "Hospital_Directory.xlsx");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Hospital <span className="text-emerald-600">Directory</span></h1>
            <p className="text-slate-500 mt-2 font-medium">State-wide registry of all AYUSH healthcare facilities.</p>
          </div>
          
          {/* Tabs with Glass Effect */}
          <div className="flex items-center gap-2 p-1 bg-white/50 backdrop-blur-md border border-white/50 rounded-2xl shadow-sm">
            {(['hospitals', 'employees', 'incharges'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl font-bold capitalize transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'hospitals' && (
          <>
            <div className="w-full lg:w-auto space-y-4 mb-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text"
                    placeholder="Search by facility name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium shadow-sm"
                  />
                </div>
                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
                >
                  <Download size={20} />
                  Download Excel
                </button>
                {session?.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => setIsAddHospitalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Plus size={20} />
                    Add Hospital
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <select 
                  value={filters.district}
                  onChange={(e) => setFilters({...filters, district: e.target.value})}
                  className="bg-white border border-gray-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="All">All Districts</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select 
                  value={filters.type}
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                  className="bg-white border border-gray-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="All">All Types</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select 
                  value={filters.system}
                  onChange={(e) => setFilters({...filters, system: e.target.value})}
                  className="bg-white border border-gray-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="All">All Systems</option>
                  {systems.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select 
                  value={filters.region}
                  onChange={(e) => setFilters({...filters, region: e.target.value})}
                  className="bg-white border border-gray-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="All">All Regions</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select 
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="bg-white border border-gray-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="All">All Status</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-emerald-600" size={40} />
                <p className="text-slate-400 font-medium">Loading hospital registry...</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <button className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-sm">
                    Total Hospitals: {filteredHospitals.length}
                  </button>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50/50">
                      <th className="py-4 px-6 font-bold text-slate-900">Facility Name</th>
                      <th className="py-4 px-6 font-bold text-slate-900">District</th>
                      <th className="py-4 px-6 font-bold text-slate-900">Type</th>
                      <th className="py-4 px-6 font-bold text-slate-900">Above 7000ft</th>
                      <th className="py-4 px-6 font-bold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHospitals.map(h => (
                      <tr 
                        key={h.sr_no} 
                        className="border-b border-gray-100 hover:bg-emerald-50/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedHospital(h);
                          setIsDossierOpen(true);
                        }}
                      >
                        <td className="py-4 px-6 font-bold text-slate-900">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-2">
                              {h.is_verified ? (
                                <CheckCircle2 size={16} className="text-emerald-500" title="Verified" />
                              ) : (
                                <HelpCircle size={16} className="text-slate-400" title="Not Verified" />
                              )}
                              <span>{h.facility_name}</span>
                            </div>
                            {h.is_verified && (
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-6">
                                Verified
                              </span>
                            )}
                            {!!h.centre_of_excellence && h.centre_of_excellence !== 'False' && h.centre_of_excellence !== 'false' && (
                              <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-widest rounded-full ml-6">
                                CoE: {h.centre_of_excellence === 'True' ? 'Yes' : h.centre_of_excellence}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600">{h.district}</td>
                        <td className="py-4 px-6 text-slate-600">{h.type}</td>
                        <td className="py-4 px-6 text-slate-600">{h.above_7000ft ? 'Yes' : 'No'}</td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${h.status === 'Active' || h.status === 'Sugam' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
                            {h.status || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredHospitals.length === 0 && !loading && (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
                  <Building2 size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No facilities found</h3>
                <p className="text-slate-500 mt-2">Try adjusting your search or filters.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'employees' && session && (
          selectedStaffId ? (
            <ServiceRecordTab targetStaffId={selectedStaffId} isAdminMode={true} onBack={() => setSelectedStaffId(null)} />
          ) : (
            <EmployeeDirectory hospitals={hospitals} session={session} onStaffClick={setSelectedStaffId} />
          )
        )}

        {activeTab === 'incharges' && session && (
          <InchargeManagement session={session} />
        )}
      </div>

      {/* Hospital Dossier Modal */}
      <AnimatePresence>
        {isDossierOpen && selectedHospital && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDossierOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-6 right-6 z-10">
                <button 
                  onClick={() => setIsDossierOpen(false)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 sm:p-10">
                <HospitalProfile 
                  hospitalDetails={selectedHospital} 
                  onUpdate={handleUpdate} 
                  session={session} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AddHospitalModal 
        isOpen={isAddHospitalOpen} 
        onClose={() => setIsAddHospitalOpen(false)} 
        onSuccess={fetchHospitals} 
      />
    </div>
  );
}

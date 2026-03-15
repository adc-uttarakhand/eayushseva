import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Building2, MapPin, Edit2, Save, X, Loader2, ShieldCheck, Phone, Mail, User, Globe, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';
import HospitalProfile from './HospitalProfile';

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

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setLoading(true);
    console.log('Active Filters:', session?.access_districts, session?.access_systems);
    
    let query = supabase.from('hospitals').select('*');

    if (session) {
      // State Admin Bypass: If access_districts contains 'All', remove district filter
      if (session.access_districts && !session.access_districts.includes('All')) {
        query = query.in('district', session.access_districts);
      }
      
      if (session.access_systems && session.access_systems.length > 0 && !session.access_systems.includes('All')) {
        query = query.in('system', session.access_systems);
      }
    }

    const { data, error } = await query.order('facility_name');
    
    if (data && data.length > 0) {
      console.log('Sample Hospital from DB:', data[0]);
      console.log('Columns in hospitals table:', Object.keys(data[0]));
      setHospitals(data);
      setLoading(false);
      return data;
    }
    setLoading(false);
    return [];
  };

  const handleUpdate = async () => {
    console.log('Refreshing hospitals list...');
    const updatedData = await fetchHospitals();
    if (selectedHospital) {
      const updated = updatedData.find(h => h.sr_no === selectedHospital.sr_no);
      console.log('Found updated hospital in list:', updated);
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

        // Try to find correct identifiers first
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

        // Try hospital_id
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

        // Try sr_no
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

        // Try id
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
    const matchesSearch = h.facility_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         h.district.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDistrict = filters.district === 'All' || h.district === filters.district;
    const matchesType = filters.type === 'All' || h.type === filters.type;
    const matchesSystem = filters.system === 'All' || h.system === filters.system;
    const matchesRegion = filters.region === 'All' || h.region_indicator === filters.region;
    const matchesStatus = filters.status === 'All' || h.status === filters.status;
    
    return matchesSearch && matchesDistrict && matchesType && matchesSystem && matchesRegion && matchesStatus;
  });

  const getHospitalImage = (id: number) => `https://via.placeholder.com/800x600?text=Hospital`;

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Hospital <span className="text-emerald-600">Directory</span></h1>
            <p className="text-slate-500 mt-2 font-medium">State-wide registry of all AYUSH healthcare facilities.</p>
          </div>
          
          <div className="w-full lg:w-auto space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Search by facility name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-96 bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium shadow-sm"
              />
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
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-slate-400 font-medium">Loading hospital registry...</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/50">
                  <th className="py-4 px-6 font-bold text-slate-900">Facility Name</th>
                  <th className="py-4 px-6 font-bold text-slate-900">District</th>
                  <th className="py-4 px-6 font-bold text-slate-900">Type</th>
                  <th className="py-4 px-6 font-bold text-slate-900">System</th>
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
                    <td className="py-4 px-6 font-bold text-slate-900">{h.facility_name}</td>
                    <td className="py-4 px-6 text-slate-600">{h.district}</td>
                    <td className="py-4 px-6 text-slate-600">{h.type}</td>
                    <td className="py-4 px-6 text-slate-600">{h.system}</td>
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
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, User, Building2, MapPin, Edit2, Save, X, Loader2, ShieldCheck, Phone, Mail, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';

interface Staff {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
  is_active: boolean;
  hospital_id: string;
  photograph_url?: string;
  doctor_id?: string;
  assigned_modules?: string[];
  service_dossier?: string;
  email?: string;
}

interface Hospital {
  hospital_id: string;
  facility_name: string;
  district: string;
}

interface EmployeeDirectoryProps {
  hospitals: Hospital[];
  session?: UserSession | null;
}

export default function EmployeeDirectory({ hospitals, session }: EmployeeDirectoryProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('role_name');
    if (data) setRoles(['All', ...data.map(r => r.role_name)].sort());
  };

  const fetchStaff = async () => {
    setLoading(true);
    console.log('Active Filters:', session?.access_districts, session?.access_systems);
    
    // Join staff with hospitals to filter by district and system
    let query = supabase
      .from('staff')
      .select('*, hospitals!inner(district, system)');

    if (session) {
      // State Admin Bypass: If access_districts contains 'All', remove district filter
      if (session.access_districts && !session.access_districts.includes('All')) {
        query = query.in('hospitals.district', session.access_districts);
      }
      
      if (session.access_systems && session.access_systems.length > 0 && !session.access_systems.includes('All')) {
        query = query.in('hospitals.system', session.access_systems);
      }
    }

    const { data, error } = await query;
    
    if (data) {
      setStaff(data);
    }
    setLoading(false);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setIsSubmitting(true);
    const { id, hospital_id, ...updateData } = editingStaff;
    
    const { error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', id);

    if (!error) {
      setStaff(prev => prev.map(s => s.id === id ? editingStaff : s));
      setEditingStaff(null);
    } else {
      alert("Error updating staff: " + error.message);
    }
    setIsSubmitting(false);
  };

  const districts = ['All', ...Array.from(new Set(hospitals.map(h => h.district)))].sort();

  const filteredStaff = staff.filter(s => {
    const hospital = hospitals.find(h => h.hospital_id === s.hospital_id);
    const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.mobile_number.includes(searchQuery);
    const matchesDistrict = selectedDistrict === 'All' || hospital?.district === selectedDistrict;
    const matchesRole = selectedRole === 'All' || s.role === selectedRole;
    
    return matchesSearch && matchesDistrict && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Employee <span className="text-emerald-600">Directory</span></h1>
            <p className="text-slate-500 mt-2 font-medium">Manage all AYUSH healthcare staff across the state.</p>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search by name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium shadow-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <select 
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-white border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium shadow-sm text-sm"
              >
                {districts.map(d => <option key={d} value={d}>{d === 'All' ? 'All Districts' : d}</option>)}
              </select>
              
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-white border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium shadow-sm text-sm"
              >
                {roles.map(r => <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-slate-400 font-medium">Fetching staff records...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map(s => {
              const hospital = hospitals.find(h => h.hospital_id === s.hospital_id);
              return (
                <motion.div 
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="relative">
                      {s.photograph_url ? (
                        <img src={s.photograph_url} alt={s.full_name} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <User size={24} />
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${s.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">{s.full_name}</h3>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">{s.role}</p>
                    </div>
                    <button 
                      onClick={() => setEditingStaff(s)}
                      className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Building2 size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{hospital?.facility_name || 'Unknown Hospital'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <MapPin size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{hospital?.district || 'Unknown District'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <Phone size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{s.mobile_number}</span>
                    </div>
                    {s.service_dossier && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase size={14} className="text-emerald-600" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Service Dossier</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 italic">"{s.service_dossier}"</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {filteredStaff.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
              <User size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No staff found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingStaff && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingStaff(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Staff Details</h2>
                  <p className="text-sm text-slate-500 font-medium">Update profile for {editingStaff.full_name}</p>
                </div>
                <button onClick={() => setEditingStaff(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateStaff} className="p-8 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Full Name</label>
                    <input 
                      required
                      type="text"
                      value={editingStaff.full_name || ''}
                      onChange={e => setEditingStaff({...editingStaff, full_name: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Role</label>
                    <input 
                      required
                      type="text"
                      value={editingStaff.role || ''}
                      onChange={e => setEditingStaff({...editingStaff, role: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Mobile Number</label>
                    <input 
                      required
                      type="tel"
                      value={editingStaff.mobile_number || ''}
                      onChange={e => setEditingStaff({...editingStaff, mobile_number: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Email Address</label>
                    <input 
                      type="email"
                      value={editingStaff.email || ''}
                      onChange={e => setEditingStaff({...editingStaff, email: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Photograph URL</label>
                    <input 
                      type="url"
                      value={editingStaff.photograph_url || ''}
                      onChange={e => setEditingStaff({...editingStaff, photograph_url: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Service Dossier</label>
                    <textarea 
                      value={editingStaff.service_dossier || ''}
                      onChange={e => setEditingStaff({...editingStaff, service_dossier: e.target.value})}
                      rows={4}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium resize-none"
                      placeholder="Enter service history, awards, or other important details..."
                    />
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-gray-100">
                    <input 
                      type="checkbox"
                      id="is_active"
                      checked={editingStaff.is_active}
                      onChange={e => setEditingStaff({...editingStaff, is_active: e.target.checked})}
                      className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="is_active" className="text-sm font-bold text-slate-700">Active Status</label>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isSubmitting}
                    type="submit"
                    className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

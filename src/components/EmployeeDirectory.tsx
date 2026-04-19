import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, User, Building2, MapPin, Edit2, Save, X, Loader2, ShieldCheck, Phone, Mail, Briefcase, Plus, Download, Lock, Unlock, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';
import AddEmployeeModal from './AddEmployeeModal';
import * as XLSX from 'xlsx';

interface Staff {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
  employee_id?: string;
  is_active: boolean;
  hospital_id: string;
  photograph_url?: string;
  doctor_id?: string;
  assigned_modules?: string[];
  service_dossier?: string;
  email?: string;
  employment_type?: string;
  is_verified?: boolean;
  is_locked?: boolean;
  last_verified_on?: string;
  last_edited_on?: string;
}

interface Hospital {
  hospital_id: string;
  facility_name: string;
  district: string;
  system: string;
  type: string;
}

interface EmployeeDirectoryProps {
  hospitals: Hospital[];
  session?: UserSession | null;
  onStaffClick: (staffId: string) => void;
}

export default function EmployeeDirectory({ hospitals, session, onStaffClick }: EmployeeDirectoryProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('All');
  const [statusSort, setStatusSort] = useState<'none' | 'verified_first' | 'unverified_first'>('none');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
    let allStaff: Staff[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .range(from, to);

      if (error) {
        console.error('Supabase fetch error:', error);
        break;
      }

      if (data && data.length > 0) {
        allStaff = [...allStaff, ...data];
        if (data.length < 1000) {
          hasMore = false;
        } else {
          from += 1000;
          to += 1000;
        }
      } else {
        hasMore = false;
      }
    }
    
    setStaff(allStaff);
    setLoading(false);
  };

  const toggleStatusSort = () => {
    if (statusSort === 'none') setStatusSort('verified_first');
    else if (statusSort === 'verified_first') setStatusSort('unverified_first');
    else setStatusSort('none');
  };

  const handleToggleLock = async (staffMember: Staff) => {
    const newLockedStatus = !staffMember.is_locked;
    
    toast((t) => (
      <div className="flex flex-col gap-2 p-2">
        <span>Are you sure you want to {newLockedStatus ? 'lock' : 'unlock'} this profile?</span>
        <div className="flex gap-2 justify-end">
          <button 
            className="bg-emerald-600 text-white px-3 py-1 rounded text-sm font-bold"
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase
                .from('staff')
                .update({ is_locked: newLockedStatus })
                .eq('id', staffMember.id);
              
              if (!error) {
                toast.success(newLockedStatus ? 'Profile locked' : 'Profile unlocked');
                setStaff(prev => prev.map(s => s.id === staffMember.id ? { ...s, is_locked: newLockedStatus } : s));
              } else {
                toast.error('Failed to update lock status: ' + error.message);
              }
            }}
          >
            Confirm
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-200 px-3 py-1 rounded text-sm font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: 5000 });
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

  const filteredStaff = (staff || []).filter(s => {
    const hospital = hospitals.find(h => h.hospital_id === s.hospital_id);
    
    // Access Control
    const hasAccess = !session || (
      (!session.access_districts || session.access_districts.includes('All') || (hospital && session.access_districts.includes(hospital.district))) &&
      (!session.access_systems || session.access_systems.includes('All') || (hospital && (session.access_systems.includes(hospital.system) || hospital.type === 'Office')))
    );

    const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.mobile_number.includes(searchQuery);
    const matchesDistrict = selectedDistrict === 'All' || hospital?.district === selectedDistrict;
    const matchesRole = selectedRole === 'All' || s.role === selectedRole;
    const matchesEmploymentType = selectedEmploymentType === 'All' || s.employment_type === selectedEmploymentType;
    
    return hasAccess && matchesSearch && matchesDistrict && matchesRole && matchesEmploymentType;
  }).sort((a,b) => {
    if (statusSort === 'none') return 0;
    if (statusSort === 'verified_first') return (a.is_verified === b.is_verified) ? 0 : a.is_verified ? -1 : 1;
    return (a.is_verified === b.is_verified) ? 0 : a.is_verified ? 1 : -1;
  });

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredStaff.map(s => {
      const hospital = hospitals.find(h => h.hospital_id === s.hospital_id);
      return {
        'Name': s.full_name,
        'Role': s.role,
        'Hospital': hospital?.facility_name || 'N/A',
        'District': hospital?.district || 'N/A',
        'Mobile': s.mobile_number,
        'Verification Status': s.is_verified ? 'Verified' : 'Not verified'
      };
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, 'Employee_Directory.xlsx');
  };

  const canAddEmployee = ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'].includes(session?.role || '');
  const canBulkLock = ['SUPER_ADMIN', 'STATE_ADMIN'].includes(session?.role || '');

  const handleBulkToggleLock = async (shouldLock: boolean) => {
    const verifiedStaffIds = filteredStaff.filter(s => s.is_verified && s.is_locked !== shouldLock).map(s => s.id);
    if (verifiedStaffIds.length === 0) return toast.error('No verified employees to change status');
    
    toast((t) => (
      <div className="flex flex-col gap-2 p-2">
        <span>Are you sure you want to {shouldLock ? 'lock' : 'unlock'} all {verifiedStaffIds.length} verified profiles?</span>
        <div className="flex gap-2 justify-end">
          <button 
            className="bg-emerald-600 text-white px-3 py-1 rounded text-sm font-bold"
            onClick={async () => {
              toast.dismiss(t.id);
              const updates = verifiedStaffIds.map(id => 
                supabase.from('staff').update({ is_locked: shouldLock }).eq('id', id)
              );
              const results = await Promise.all(updates);
              const error = results.find(r => r.error)?.error;
              
              if (!error) {
                toast.success('Profiles updated');
                setStaff(prev => prev.map(s => verifiedStaffIds.includes(s.id) ? { ...s, is_locked: shouldLock } : s));
              } else {
                console.error('Bulk update error details:', error);
                toast.error(`Failed to update: ${error.message || 'Unknown error'}`);
              }
            }}
          >
            Confirm
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-200 px-3 py-1 rounded text-sm font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pt-8 pb-40 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Employee <span className="text-emerald-600">Directory</span></h1>
            <p className="text-slate-500 mt-2 font-medium">Manage all AYUSH healthcare staff across the state.</p>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
            <button 
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 bg-white border border-gray-100 text-slate-700 py-3 px-6 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download size={20} />
              Export Excel
            </button>
            {canAddEmployee && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Plus size={20} />
                Add Employee
              </button>
            )}
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

              <select 
                value={selectedEmploymentType}
                onChange={(e) => setSelectedEmploymentType(e.target.value)}
                className="bg-white border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium shadow-sm text-sm"
              >
                <option value="All">All Employment Types</option>
                <option value="Permanent">Permanent</option>
                <option value="Contractual">Contractual</option>
                <option value="Outsourced">Outsourced</option>
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
          <>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-4">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex gap-2">
                  <button className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-sm">
                    Total Employees: {filteredStaff.length}
                  </button>
                  <button className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-bold text-sm">
                    Verified: {filteredStaff.filter(s => s.is_verified).length}
                  </button>
                  <button className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-bold text-sm">
                    Locked: {filteredStaff.filter(s => s.is_locked).length}
                  </button>
                </div>
                {canBulkLock && (
                  <div className="flex gap-2">
                    <button onClick={() => handleBulkToggleLock(true)} className="bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1 hover:bg-red-100">
                      <Lock size={14} /> Lock All Verified
                    </button>
                    <button onClick={() => handleBulkToggleLock(false)} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1 hover:bg-emerald-100">
                      <Unlock size={14} /> Unlock All Verified
                    </button>
                  </div>
                )}
              </div>
            </div>
            <table className="hidden md:table w-full text-left border-collapse bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/50">
                  <th className="py-4 px-6 font-bold text-slate-900">Name</th>
                  <th className="py-4 px-6 font-bold text-slate-900">Hospital</th>
                  <th className="py-4 px-6 font-bold text-slate-900">Mobile</th>
                  <th className="py-4 px-6 font-bold text-slate-900 cursor-pointer" onClick={toggleStatusSort}>
                    <div className="flex items-center gap-1">
                      Status
                      {statusSort === 'verified_first' && <ChevronUp size={14} />}
                      {statusSort === 'unverified_first' && <ChevronDown size={14} />}
                      {statusSort === 'none' && <div className="w-[14px]"></div>}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(s => {
                  const hospital = hospitals.find(h => h.hospital_id === s.hospital_id);
                  return (
                      <tr key={s.id} className="border-b border-gray-100 hover:bg-emerald-50/50 transition-colors cursor-pointer" onClick={() => onStaffClick(s.id)}>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          {s.photograph_url ? (
                            <img src={s.photograph_url} alt={s.full_name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                              <User size={14} />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              {s.full_name}
                              {s.is_verified && (
                                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                                  Verified
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {hospital?.district || 'N/A'} • {s.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">{hospital?.facility_name || 'N/A'}</td>
                      <td className="py-4 px-6 text-slate-600">{s.mobile_number}</td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          {s.is_locked ? (
                            <div className="flex items-center gap-1 text-red-600 font-bold text-xs cursor-pointer hover:underline" onClick={() => handleToggleLock(s)}>
                              <Lock size={14} /> Locked
                            </div>
                          ) : s.is_verified ? (
                            <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                              <CheckCircle size={14} /> Verified
                            </div>
                          ) : (
                            <div className="text-slate-400 font-bold text-xs">Not verified</div>
                          )}
                          {s.last_verified_on && (
                            <span className="text-[10px] text-slate-500">
                              Verified: {new Date(s.last_verified_on).toLocaleDateString('en-IN')}
                            </span>
                          )}
                          {s.last_edited_on && (
                            <span className="text-[10px] text-yellow-700">
                              Edited: {new Date(s.last_edited_on).toLocaleDateString('en-IN')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="md:hidden space-y-4">
              {filteredStaff.map(s => {
                const hospital = hospitals.find(h => h.hospital_id === s.hospital_id);
                return (
                  <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm" onClick={() => onStaffClick(s.id)}>
                    <div className="flex items-center gap-3">
                      {s.photograph_url ? (
                        <img src={s.photograph_url} alt={s.full_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <User size={20} />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900">{s.full_name}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-slate-600">Role: {s.role}</div>
                    <div className="text-sm text-slate-600">Hospital: {hospital?.facility_name || 'N/A'}</div>
                    <div className="text-sm text-slate-600">District: {hospital?.district || 'N/A'}</div>
                    <div className="text-sm text-slate-600">Mobile: {s.mobile_number}</div>
                    {s.is_verified && (
                      <div className="mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full inline-block">
                        Verified
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
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

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={() => {
          fetchStaff();
        }}
        hospitals={hospitals}
      />
    </div>
  );
}

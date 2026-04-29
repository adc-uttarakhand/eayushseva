import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, User, Building2, Briefcase, Key, Loader2, ShieldCheck, MapPin, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HospitalLogin {
  type: 'hospital';
  id: string;
  name: string;
  username: string;
  district: string;
}

interface StaffLogin {
  type: 'staff';
  id: string;
  name: string;
  username: string;
  role: string;
  hospitalName: string;
}

interface AdminLogin {
  type: 'admin';
  id: string;
  name: string;
  username: string;
  email: string; // Assuming admin_userid is email for display
  access_districts?: string[];
  access_systems?: string[];
}

type Login = HospitalLogin | StaffLogin | AdminLogin;

export default function LoginDirectory({ accessDistricts, accessSystems }: { accessDistricts?: string[], accessSystems?: string[] }) {
  const [logins, setLogins] = useState<Login[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); // 'All', 'hospital', 'staff', 'admin'

  useEffect(() => {
    fetchLogins();
  }, []);

  const fetchLogins = async () => {
    setLoading(true);
    try {
      let adminData: any[] = [];
      let adminError: any = null;
      const adminTableNames = ['admin_logins']; // Only query the new table

      for (const tableName of adminTableNames) {
        const { data, error } = await supabase.from(tableName).select('id, name, admin_name, admin_userid, access_districts, access_systems');
        if (!error && data && data.length > 0) {
          adminData = data;
          break;
        } else if (error) {
          adminError = error;
        }
      }

      if (adminError && !adminData.length) throw adminError;

      let hospitalQuery = supabase.from('hospitals')
        .select('hospital_id, facility_name, district, system');

      if (accessDistricts && accessDistricts.length > 0 && !accessDistricts.includes('All')) {
        hospitalQuery = hospitalQuery.in('district', accessDistricts);
      }
      if (accessSystems && accessSystems.length > 0) {
        hospitalQuery = hospitalQuery.in('system', accessSystems);
      }

      let staffQuery = supabase.from('staff')
        .select('id, full_name, role, mobile_number, hospital_id, hospitals(facility_name, district, system)');

      if (accessDistricts && accessDistricts.length > 0 && !accessDistricts.includes('All')) {
        staffQuery = staffQuery.in('hospitals.district', accessDistricts);
      }
      if (accessSystems && accessSystems.length > 0) {
        staffQuery = staffQuery.in('hospitals.system', accessSystems);
      }

      const [hospitalsRes, staffRes] = await Promise.all([
        hospitalQuery,
        staffQuery,
      ]);

      if (hospitalsRes.error) throw hospitalsRes.error;
      if (staffRes.error) throw staffRes.error;

      const hospitalLogins: HospitalLogin[] = hospitalsRes.data.map(h => ({
        type: 'hospital',
        id: h.hospital_id,
        name: h.facility_name,
        username: h.hospital_id, // Assuming hospital_id is the username
        district: h.district,
      }));

      const staffLogins: StaffLogin[] = staffRes.data.map(s => ({
        type: 'staff',
        id: s.id,
        name: s.full_name,
        username: s.mobile_number, // Assuming mobile_number is the username
        role: s.role,
        hospitalName: s.hospitals?.[0]?.facility_name || s.hospital_id, // Use joined hospital name
      }));

      const adminLogins: AdminLogin[] = adminData.map((a: any) => ({
        type: 'admin',
        id: a.id,
        name: a.name || a.admin_name,
        username: a.admin_userid,
        email: a.admin_userid, // Using admin_userid as email for display consistency
        access_districts: a.access_districts,
        access_systems: a.access_systems,
      }));

      setLogins([...hospitalLogins, ...staffLogins, ...adminLogins]);
    } catch (error: any) {
      console.error('Error fetching logins:', error.message);
      // Handle error display
    } finally {
      setLoading(false);
    }
  };

  const filteredLogins = logins.filter(login => {
    const matchesSearch = (login.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (login.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'All' || login.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Login <span className="text-emerald-600">Directory</span></h1>
            <p className="text-slate-500 mt-2 font-medium">Centralized management of all user logins.</p>
          </div>
          
          <div className="w-full lg:w-auto space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-96 bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium shadow-sm"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-gray-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="All">All Logins</option>
                <option value="hospital">Hospital Logins</option>
                <option value="staff">Staff Logins</option>
                <option value="admin">Admin Logins</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-slate-400 font-medium">Fetching login records...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredLogins.map(login => (
              <motion.div 
                key={login.type + login.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    {login.type === 'hospital' && <Building2 size={24} />}
                    {login.type === 'staff' && <User size={24} />}
                    {login.type === 'admin' && <ShieldCheck size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{login.name}</h3>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">{login.type} Login</p>
                  </div>
                </div>

                <div className="space-y-3 text-slate-700">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-slate-400" />
                    <span className="text-sm font-medium">Username: {login.username}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Key size={16} className="text-slate-400" />
                    <span className="text-sm font-medium">Password: ********</span>
                  </div>
                  {login.type === 'hospital' && (
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">District: {login.district}</span>
                    </div>
                  )}
                  {login.type === 'staff' && (
                    <div className="flex items-center gap-3">
                      <Briefcase size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">Role: {login.role} ({login.hospitalName})</span>
                    </div>
                  )}
                  {login.type === 'admin' && (
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">Email: {login.email}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredLogins.length === 0 && !loading && ( 
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
              <Key size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No logins found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

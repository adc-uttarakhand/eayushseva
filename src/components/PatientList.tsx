import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Calendar, Users, UserPlus, UserCheck, Phone, CreditCard, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PatientRecord {
  id: string;
  name: string;
  age: string;
  gender: string;
  mobile: string;
  aadhar: string;
  global_serial: string;
  hospital_yearly_serial: string;
  daily_opd_number: string;
  created_at: string;
  is_new: boolean;
}

interface PatientListProps {
  hospitalId: string;
}

type TimeRange = 'today' | 'month' | 'quarter' | 'year' | 'custom';

export default function PatientList({ hospitalId }: PatientListProps) {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const maskDate = (value: string) => {
    const v = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length <= 2) return v;
    if (v.length <= 5) return `${v.slice(0, 2)}-${v.slice(2)}`;
    return `${v.slice(0, 2)}-${v.slice(2, 5)}-${v.slice(5, 9)}`;
  };

  const [stats, setStats] = useState({
    totalOPD: 0,
    newPatients: 0,
    femalePatients: 0,
    aadharSeeded: 0,
    mobileSeeded: 0
  });

  useEffect(() => {
    fetchPatients();
  }, [hospitalId, timeRange, startDate, endDate]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      const now = new Date();
      let start = new Date();
      let end = new Date();

      if (timeRange === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (timeRange === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === 'quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
      } else if (timeRange === 'year') {
        start = new Date(now.getFullYear(), 0, 1);
      } else if (timeRange === 'custom' && startDate && endDate) {
        const parseDate = (d: string) => {
          if (/^\d{2}-[A-Z]{3}-\d{4}$/i.test(d)) {
            const months: { [key: string]: string } = {
              'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
              'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
            };
            const [day, month, year] = d.split('-');
            const monthNum = months[month.toUpperCase()];
            return new Date(`${year}-${monthNum}-${day}`);
          }
          if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
            const [day, month, year] = d.split('-');
            return new Date(`${year}-${month}-${day}`);
          }
          return new Date(d);
        };
        start = parseDate(startDate);
        end = parseDate(endDate);
        end.setHours(23, 59, 59, 999);
      }

      if (timeRange !== 'custom' || (startDate && endDate)) {
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const records = data || [];
      setPatients(records);

      // Calculate stats
      setStats({
        totalOPD: records.length,
        newPatients: records.filter(p => !p.global_serial.includes('revisit')).length, // Simplified logic for demo
        femalePatients: records.filter(p => p.gender === 'Female').length,
        aadharSeeded: records.filter(p => p.aadhar && p.aadhar.length === 12).length,
        mobileSeeded: records.filter(p => p.mobile && p.mobile.length === 10).length
      });

    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mobile.includes(searchQuery) ||
    p.global_serial.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Patient Registry</h1>
          <p className="text-slate-500 mt-1">Manage and track patient visits</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            {(['today', 'month', 'quarter', 'year', 'custom'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  timeRange === range ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          
          {timeRange === 'custom' && (
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="DD-MMM-YYYY"
                value={startDate}
                onChange={(e) => setStartDate(maskDate(e.target.value))}
                className="bg-neutral-50 border border-gray-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-32"
              />
              <input 
                type="text" 
                placeholder="DD-MMM-YYYY"
                value={endDate}
                onChange={(e) => setEndDate(maskDate(e.target.value))}
                className="bg-neutral-50 border border-gray-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-32"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total OPD', value: stats.totalOPD, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'New Patients', value: stats.newPatients, icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Female Patients', value: stats.femalePatients, icon: UserCheck, color: 'text-pink-600', bg: 'bg-pink-50' },
          { label: 'Aadhar Seeded', value: stats.aadharSeeded, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Mobile Seeded', value: stats.mobileSeeded, icon: Phone, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm"
          >
            <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 mb-8 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name, mobile, or serial number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <p className="text-slate-400 font-medium">Fetching patient records...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-400 text-lg">No patient records found for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50 border-b border-gray-100">
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date/Time</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Patient Details</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Serial Numbers</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-900">{new Date(patient.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400">{new Date(patient.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-900">{patient.name}</p>
                      <p className="text-xs text-slate-500">{patient.age}Y • {patient.gender}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md w-fit">G: {patient.global_serial}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md w-fit">Y: {patient.hospital_yearly_serial}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md w-fit">D: {patient.daily_opd_number}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-medium text-slate-700">{patient.mobile || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400">Aadhar: {patient.aadhar ? `****${patient.aadhar.slice(-4)}` : 'Not Seeded'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                        patient.is_new ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {patient.is_new ? 'NEW VISIT' : 'REVISIT'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, IndianRupee, Download, Loader2, Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface PanchakarmaLog {
  id: string;
  created_at: string;
  patient_id: string | null;
  patient_name: string;
  hospital_id: string | null;
  staff_id: string | null;
  therapies: { name: string; charges: number }[];
  total_charges: number;
  staff?: { full_name: string; role: string };
  hospital?: { facility_name: string; district: string };
}

export default function PanchakarmaAdminDashboard() {
  const [logs, setLogs] = useState<PanchakarmaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'year' | 'custom'>('today');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [districts, setDistricts] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>([]);
  
  const [districtFilter, setDistrictFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [hospitalFilter, setHospitalFilter] = useState('All');
  const [therapyFilter, setTherapyFilter] = useState('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    console.log('Fetching panchakarma_logs and related data...');
    
    // Fetch logs
    const { data: logsData, error: logsError } = await supabase
      .from('panchakarma_logs')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (logsError) {
      console.error('Fetch error:', logsError);
      toast.error('Failed to fetch logs: ' + logsError.message);
      setLoading(false);
      return;
    }

    // Fetch related data
    const { data: staffData } = await supabase.from('staff').select('id, full_name, role');
    const { data: patientsData } = await supabase.from('patients').select('id, name');
    const { data: hospData } = await supabase.from('hospitals').select('*'); // Select all to find correct ID field

    console.log('Fetched hospitals data:', hospData);

    const staffMap = new Map((staffData || []).map(s => [s.id, s]));
    const patientMap = new Map((patientsData || []).map(p => [p.id, p.name]));
    // Try to find the correct ID field in hospData
    const hospitalIdField = hospData && hospData.length > 0 ? (
      Object.keys(hospData[0]).find(k => k === 'hospital_id' || k === 'id') || 'id'
    ) : 'id';
    
    const hospMap = new Map((hospData || []).map(h => [h[hospitalIdField as keyof typeof h], h]));
    
    console.log('Hospital Map:', hospMap);

    const fetchedLogs: PanchakarmaLog[] = (logsData || []).map((log: any) => ({
      ...log,
      patient_name: log.legacy_name || patientMap.get(log.patient_id) || 'Unknown',
      therapies: (log.therapy_name || '').split(',').filter(Boolean).map((name: string) => ({ name: name.trim(), charges: 0 })),
      total_charges: Number(log.charges) || 0,
      staff: staffMap.get(log.staff_id),
      hospital: hospMap.get(log.hospital_id),
    }));

    setLogs(fetchedLogs);
    
    // Extract filters
    const dists = Array.from(new Set(fetchedLogs.map(l => l.hospital?.district).filter(Boolean)));
    setDistricts(dists as string[]);

    const staffMap2 = new Map<string, { id: string; name: string }>();
    fetchedLogs.forEach(l => {
      if (l.staff_id && l.staff?.full_name) staffMap2.set(l.staff_id, { id: l.staff_id, name: l.staff.full_name });
    });
    setStaffList(Array.from(staffMap2.values()));

    const hospMap2 = new Map<string, { id: string; name: string }>();
    fetchedLogs.forEach(l => {
      if (l.hospital_id && l.hospital?.facility_name) hospMap2.set(l.hospital_id, { id: l.hospital_id, name: l.hospital.facility_name });
    });
    setHospitals(Array.from(hospMap2.values()));
    
    setLoading(false);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Date filter
      let dateMatch = true;
      const logDate = parseISO(log.created_at);
      const now = new Date();
      if (dateFilter === 'today') dateMatch = format(logDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      else if (dateFilter === 'month') dateMatch = isWithinInterval(logDate, { start: startOfMonth(now), end: endOfMonth(now) });
      else if (dateFilter === 'year') dateMatch = isWithinInterval(logDate, { start: startOfYear(now), end: endOfYear(now) });
      
      const districtMatch = districtFilter === 'All' || log.hospital?.district === districtFilter;
      const staffMatch = staffFilter === 'All' || log.staff_id === staffFilter;
      const hospitalMatch = hospitalFilter === 'All' || log.hospital_id === hospitalFilter;
      const therapyMatch = therapyFilter === 'All' || log.therapies.some(t => t.name === therapyFilter);
      
      return dateMatch && districtMatch && staffMatch && hospitalMatch && therapyMatch;
    });
  }, [logs, dateFilter, districtFilter, staffFilter, hospitalFilter, therapyFilter]);

  const stats = useMemo(() => {
    return {
      totalTherapies: filteredLogs.reduce((acc, log) => acc + log.therapies.length, 0),
      totalPatients: new Set(filteredLogs.map(l => l.patient_id)).size,
      revenue: filteredLogs.reduce((acc, log) => acc + log.total_charges, 0)
    };
  }, [filteredLogs]);

  const downloadCSV = () => {
    const tableData = filteredLogs.map(log => ({
      Date: format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm'),
      Patient: log.patient_name,
      Hospital: log.hospital?.facility_name,
      Staff: log.staff?.full_name,
      Role: log.staff?.role,
      Therapies: log.therapies.map(t => t.name).join(', '),
      TherapiesCount: log.therapies.length,
      Charges: log.total_charges
    }));
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PanchakarmaLogs");
    XLSX.writeFile(workbook, "PanchakarmaLogs.csv");
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>;

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-orange-50/30 min-h-screen">
      <h1 className="text-3xl font-bold text-orange-900">Panchakarma Admin Dashboard</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Total Sessions</p>
            <p className="text-3xl font-black text-orange-900 mt-2">{filteredLogs.length}</p>
          </div>
          <Activity size={32} className="text-orange-500" />
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Therapies Done</p>
            <p className="text-3xl font-black text-orange-900 mt-2">{stats.totalTherapies}</p>
          </div>
          <Activity size={32} className="text-orange-500" />
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Patients</p>
            <p className="text-3xl font-black text-orange-900 mt-2">{stats.totalPatients}</p>
          </div>
          <Activity size={32} className="text-orange-500" />
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Revenue</p>
            <p className="text-3xl font-black text-orange-900 mt-2">₹{stats.revenue.toLocaleString()}</p>
          </div>
          <IndianRupee size={32} className="text-orange-500" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 grid grid-cols-2 lg:grid-cols-6 gap-4">
        <select className="p-3 bg-orange-50 rounded-xl text-sm font-bold" value={dateFilter} onChange={e => setDateFilter(e.target.value as any)}>
          <option value="today">Today</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
        <select className="p-3 bg-orange-50 rounded-xl text-sm font-bold" value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}>
          <option value="All">All Districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="p-3 bg-orange-50 rounded-xl text-sm font-bold" value={hospitalFilter} onChange={e => setHospitalFilter(e.target.value)}>
          <option value="All">All Hospitals</option>
          {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select className="p-3 bg-orange-50 rounded-xl text-sm font-bold" value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
          <option value="All">All Staff</option>
          {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={downloadCSV} className="col-span-2 lg:col-span-1 bg-orange-600 text-white p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
          <Download size={16} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-orange-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-orange-50">
            <tr>
              <th className="p-4 text-left text-xs font-bold text-orange-900 uppercase">Date</th>
              <th className="p-4 text-left text-xs font-bold text-orange-900 uppercase">Patient</th>
              <th className="p-4 text-left text-xs font-bold text-orange-900 uppercase">Hospital</th>
              <th className="p-4 text-left text-xs font-bold text-orange-900 uppercase">Staff</th>
              <th className="p-4 text-left text-xs font-bold text-orange-900 uppercase">Therapies</th>
              <th className="p-4 text-left text-xs font-bold text-orange-900 uppercase">Charges</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} className="border-b border-orange-50">
                <td className="p-4 text-sm text-slate-700">{format(parseISO(log.created_at), 'yyyy-MM-dd')}</td>
                <td className="p-4 text-sm font-bold">{log.patient_name}</td>
                <td className="p-4 text-sm text-slate-700">{log.hospital?.facility_name}</td>
                <td className="p-4 text-sm">
                  {log.staff?.full_name}
                  <p className="text-[10px] text-orange-600 font-bold uppercase">{log.staff?.role}</p>
                </td>
                <td className="p-4 text-sm font-bold text-orange-900">
                  {log.therapies.map(t => t.name).join(', ')}
                  <p className="text-xs text-slate-500 font-normal">{log.therapies.length} sessions</p>
                </td>
                <td className="p-4 text-sm font-bold">₹{log.total_charges}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

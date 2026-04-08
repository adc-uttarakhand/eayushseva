import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Hospital } from '../types/hospital';
import { Search, Loader2, ToggleLeft, ToggleRight, CheckCircle, ArrowLeft, Download } from 'lucide-react';
import { UserSession } from './LoginModal';
import EmployeeDetailsPanel from './EmployeeDetailsPanel';
import * as XLSX from 'xlsx';

interface TransferModuleProps {
  session: UserSession;
}

export default function TransferModule({ session, activeSubTab = 'hospitals' }: { session: UserSession; activeSubTab?: 'hospitals' | 'employees' }) {
  const [activeTab, setActiveTab] = useState<'hospitals' | 'employees'>('hospitals');

  useEffect(() => {
    if (activeSubTab) {
      setActiveTab(activeSubTab);
    }
  }, [activeSubTab]);
  const [hospitals, setHospitals] = useState<(Hospital & { staff_count: number })[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [districtFilter, setDistrictFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  if (!session) return null;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchHospitals(), fetchEmployees()]);
    setLoading(false);
  };

  const fetchHospitals = async () => {
    // 1. Fetch all hospitals
    let query = supabase.from('hospitals').select('*');
    
    if (session.role === 'DISTRICT_ADMIN') {
      if (session.access_districts && session.access_districts.length > 0) {
        console.log('Filtering by access_districts:', session.access_districts);
        query = query.in('district', session.access_districts);
      } else if (session.district) {
        console.log('Filtering by district:', session.district);
        query = query.eq('district', session.district);
      } else {
        console.warn('DISTRICT_ADMIN logged in but no district access found');
        query = query.eq('district', '___NONE___');
      }
    }
    
    const { data: hospitalsData, error: hospitalsError } = await query.order('facility_name');
    console.log('Fetched hospitals:', hospitalsData);
    
    // 2. Fetch all staff
    const { data: staffData, error: staffError } = await supabase.from('staff').select('hospital_id');

    if (hospitalsError) {
      console.error('Error fetching hospitals:', hospitalsError);
    }
    if (staffError) {
      console.error('Error fetching staff:', staffError);
    }

    if (hospitalsData) {
      // 3. Count staff per hospital
      const staffCounts: Record<string, number> = {};
      staffData?.forEach((s: any) => {
        if (s.hospital_id) {
          staffCounts[s.hospital_id] = (staffCounts[s.hospital_id] || 0) + 1;
        }
      });

      setHospitals(hospitalsData.map((h: any) => {
        console.log('Hospital:', h.facility_name, 'above_7000_feet:', h.above_7000_feet);
        return {
          ...h,
          staff_count: staffCounts[h.hospital_id] || 0
        };
      }));
    }
  };

  const fetchEmployees = async () => {
    let query = supabase.from('staff').select('*');
    
    if (session.role === 'DISTRICT_ADMIN') {
      if (session.access_districts && session.access_districts.length > 0) {
        query = query.in('present_district', session.access_districts);
      } else if (session.district) {
        query = query.eq('present_district', session.district);
      } else {
        query = query.eq('present_district', '___NONE___');
      }
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching employees:', error);
    } else {
      setEmployees(data || []);
    }
  };

  const handleSync = async (employee: any) => {
    // 1. Fetch necessary data for calculation
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('postings, attachments, long_leaves, current_posting_joining_date, hospital_id')
      .eq('id', employee.id)
      .single();

    if (staffError || !staffData) {
      console.error('Error fetching staff data for sync:', staffError);
      alert('Failed to fetch employee data for sync.');
      return;
    }

    const { data: hospitalData } = await supabase
      .from('hospitals')
      .select('status, above_7000_feet, region_indicator')
      .eq('hospital_id', staffData.hospital_id)
      .single();

    // 2. Calculate service days
    const parseDateStr = (dateStr: string) => {
        if (!dateStr) return new Date(NaN);
        const [d, m, y] = dateStr.split('-');
        const months: any = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        return new Date(parseInt(y), months[m], parseInt(d));
    };

    const calculateServiceDays = (postings: any[], attachments: any[] = [], longLeaves: any[] = [], currentJoiningDate: string = '', hDetails: any = null) => {
        let sugam = 0;
        let durgamNoAbove7000 = 0;
        let durgamAbove7000 = 0;
        
        let attachmentSugam = 0;
        let attachmentDurgamNoAbove7000 = 0;
        let attachmentDurgamAbove7000 = 0;
    
        let totalLeaves = 0;
    
        const overlaps = (s1: Date, e1: Date, s2: Date, e2: Date) => s1 <= e2 && s2 <= e1;
    
        const allPostings = [...postings];
        if (currentJoiningDate) {
          allPostings.push({
            isAuto: true,
            fromDate: currentJoiningDate,
            toDate: new Date().toISOString().split('T')[0],
            status: hDetails?.status || 'Sugam',
            above7000: (hDetails?.region_indicator === 'Above 7000' || hDetails?.above_7000_feet === 'Yes') ? 'Yes' : 'No'
          });
        }
    
        allPostings.forEach(p => {
          const start = parseDateStr(p.fromDate);
          const end = parseDateStr(p.toDate);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    
          let days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + (p.isAuto ? 0 : 1);
          let pSugam = 0, pDurgamNoAbove7000 = 0, pDurgamAbove7000 = 0;
    
          if (p.status === 'Sugam') pSugam = days;
          else {
            if (p.above7000 === 'Yes') pDurgamAbove7000 = days;
            else pDurgamNoAbove7000 = days;
          }
    
          longLeaves.forEach(l => {
            if (l.totalDays > 30) {
              const lStart = parseDateStr(l.fromDate);
              const lEnd = parseDateStr(l.toDate);
              if (overlaps(start, end, lStart, lEnd)) {
                const overlapStart = new Date(Math.max(start.getTime(), lStart.getTime()));
                const overlapEnd = new Date(Math.min(end.getTime(), lEnd.getTime()));
                const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                
                if (overlapDays > 0) {
                  totalLeaves += overlapDays;
                  if (p.status !== 'Sugam') {
                    if (p.above7000 === 'Yes') pDurgamAbove7000 -= overlapDays;
                    else pDurgamNoAbove7000 -= overlapDays;
                    pSugam += overlapDays;
                  }
                }
              }
            }
          });
    
          attachments.forEach(a => {
            const aStart = parseDateStr(a.from);
            const aEnd = parseDateStr(a.to);
            if (overlaps(start, end, aStart, aEnd)) {
              const overlapStart = new Date(Math.max(start.getTime(), aStart.getTime()));
              const overlapEnd = new Date(Math.min(end.getTime(), aEnd.getTime()));
              const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              
              if (overlapDays > 0) {
                const aAbove7000 = a.above7000 === 'Yes';
                let pCategory = p.status === 'Sugam' ? 'Sugam' : (p.above7000 === 'Yes' ? 'DurgamAbove7000' : 'DurgamNoAbove7000');
                let aCategory = a.status === 'Sugam' ? 'Sugam' : (aAbove7000 ? 'DurgamAbove7000' : 'DurgamNoAbove7000');
    
                if (pCategory === 'Sugam') pSugam -= overlapDays;
                else if (pCategory === 'DurgamAbove7000') pDurgamAbove7000 -= overlapDays;
                else pDurgamNoAbove7000 -= overlapDays;
    
                if (aCategory === 'Sugam') attachmentSugam += overlapDays;
                else if (aCategory === 'DurgamAbove7000') attachmentDurgamAbove7000 += overlapDays;
                else attachmentDurgamNoAbove7000 += overlapDays;
              }
            }
          });
    
          sugam += pSugam;
          durgamNoAbove7000 += pDurgamNoAbove7000;
          durgamAbove7000 += pDurgamAbove7000;
        });
    
        return { 
            totalSugam: sugam + attachmentSugam, 
            totalDurgam: durgamNoAbove7000 + attachmentDurgamNoAbove7000, 
            totalDurgamAbove7000: durgamAbove7000 + attachmentDurgamAbove7000,
            attachmentSugam,
            attachmentDurgam: attachmentDurgamNoAbove7000,
            attachmentDurgamAbove7000,
            totalLeaves
        };
    };

    const serviceDays = calculateServiceDays(staffData.postings || [], staffData.attachments || [], staffData.long_leaves || [], staffData.current_posting_joining_date, hospitalData);

    // 3. Update staff table
    const nowISO = new Date().toISOString();
    const nowUI = new Date().toLocaleString('en-IN');
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        long_leaves_count: serviceDays.totalLeaves,
        attachment_sugam_days: serviceDays.attachmentSugam,
        attachment_durgam_days: serviceDays.attachmentDurgam,
        attachment_durgam_above_7000_days: serviceDays.attachmentDurgamAbove7000,
        total_sugam_days: serviceDays.totalSugam,
        total_durgam_below_7000_days: serviceDays.totalDurgam,
        total_durgam_above_7000_days: serviceDays.totalDurgamAbove7000,
        data_last_fetched_at: nowISO
      })
      .eq('id', employee.id);

    if (updateError) {
      console.error('Error syncing service data:', updateError);
      alert('Failed to sync service data.');
    } else {
      alert(`Service data successfully fetched and updated on ${nowUI}`);
      fetchEmployees(); // Refresh data
    }
  };

  const uniqueDistricts = Array.from(new Set(hospitals.map(h => h.district).filter(Boolean))).sort();
  const districts = ['All', ...uniqueDistricts];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getHospitalName = (hospitalId: string) => {
    const hospital = hospitals.find(h => h.hospital_id === hospitalId);
    return hospital ? hospital.facility_name : 'N/A';
  };

  const filteredHospitals = hospitals.filter(h => 
    (districtFilter === 'All' || h.district === districtFilter) &&
    (searchQuery === '' || (h.facility_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const verifyHospital = async (hospital_id: string) => {
    const now = new Date().toISOString();
    await supabase.from('hospitals').update({ is_verified: true, verified_at: now }).eq('hospital_id', hospital_id);
    setHospitals(hospitals.map(h => h.hospital_id === hospital_id ? { ...h, is_verified: true, verified_at: now } : h));
  };

  const exportEmployeesToExcel = () => {
    const filteredEmployees = employees.filter(e => 
      (districtFilter === 'All' || e.present_district === districtFilter) &&
      (roleFilter === 'All' || e.role === roleFilter) &&
      (employmentTypeFilter === 'All' || e.employment_type === employmentTypeFilter) &&
      (searchQuery === '' || (e.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const worksheet = XLSX.utils.json_to_sheet(filteredEmployees.map(e => ({
      'Full Name': e.full_name,
      'Role': e.role,
      'Employment Type': e.employment_type || 'N/A',
      'Present Posting Hospital': e.present_hospital,
      'District': e.present_district,
      'Present Posting (Sugam / Durgam)': e.present_posting_status,
      'Date of Birth': formatDate(e.dob),
      'Home District': e.home_district,
      'Date of 1st Joining': formatDate(e.first_joining_date),
      'Total Long Leaves': e.long_leaves_count,
      'Total Sugam Attachment Days': e.attachment_sugam_days,
      'Total Durgam (Below 7000ft) attachment days': e.attachment_durgam_days,
      'Total Durgam (Above 7000ft) attachment days': e.attachment_durgam_above_7000_days,
      'Total Sugam Days': e.total_sugam_days,
      'Total Durgam (Below 7000 Feet) Days': e.total_durgam_below_7000_days,
      'Total Durgam (Above 7000 Feet) Days': e.total_durgam_above_7000_days,
      'Last Edited On': formatDate(e.last_edited_on)
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees_Transfer_Module');
    XLSX.writeFile(workbook, 'Employees_Transfer_Module.xlsx');
  };

  const canEdit = session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN';

  return (
    <div className="pt-24 px-4 sm:px-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Transfer Module</h1>
      
      {activeTab === 'hospitals' && (
        <div>
          <div className="flex gap-4 mb-4">
            <select 
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-white border border-gray-100 rounded-xl py-2 px-3 font-bold text-slate-600"
            >
              <option value="All">All Districts</option>
              {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hospital by name..."
                className="w-full bg-white border border-gray-100 rounded-xl py-2 pl-10 pr-4 font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {loading ? (
            <Loader2 className="animate-spin text-emerald-600" />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-4 px-6">Facility Name</th>
                      <th className="py-4 px-6">District</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Above 7000 feet</th>
                      <th className="py-4 px-6">Verify</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHospitals.map((h, index) => (
                      <tr key={h.hospital_id || index} className="border-b border-gray-100">
                        <td className="py-4 px-6">
                          <div className="font-bold">{h.facility_name}</div>
                          <div className="text-xs font-bold text-slate-500">{h.type} | Staff: {h.staff_count}</div>
                        </td>
                        <td className="py-4 px-6">{h.district}</td>
                        <td className="py-4 px-6">
                          <div className="flex bg-slate-100 rounded-full p-1 w-32">
                            <button 
                              onClick={() => {
                                if (!canEdit) return;
                                const newStatus = 'Sugam';
                                supabase.from('hospitals').update({ status: newStatus }).eq('hospital_id', h.hospital_id).then(() => {
                                  setHospitals(hospitals.map(hospital => hospital.hospital_id === h.hospital_id ? { ...hospital, status: newStatus } : hospital));
                                });
                              }}
                              disabled={!canEdit}
                              className={`flex-1 text-[10px] font-bold py-1 rounded-full transition-all ${h.status === 'Sugam' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'} ${!canEdit ? 'cursor-not-allowed opacity-70' : ''}`}
                            >Sugam</button>
                            <button 
                              onClick={() => {
                                if (!canEdit) return;
                                const newStatus = 'Durgam';
                                supabase.from('hospitals').update({ status: newStatus }).eq('hospital_id', h.hospital_id).then(() => {
                                  setHospitals(hospitals.map(hospital => hospital.hospital_id === h.hospital_id ? { ...hospital, status: newStatus } : hospital));
                                });
                              }}
                              disabled={!canEdit}
                              className={`flex-1 text-[10px] font-bold py-1 rounded-full transition-all ${h.status === 'Durgam' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-400'} ${!canEdit ? 'cursor-not-allowed opacity-70' : ''}`}
                            >Durgam</button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex bg-slate-100 rounded-full p-1 w-24">
                            <button 
                              onClick={() => {
                                if (!canEdit) return;
                                const newValue = true;
                                supabase.from('hospitals').update({ above_7000_feet: newValue }).eq('hospital_id', h.hospital_id).then(({ error }) => {
                                  if (!error) {
                                    setHospitals(hospitals.map(hospital => hospital.hospital_id === h.hospital_id ? { ...hospital, above_7000_feet: newValue } : hospital));
                                  }
                                });
                              }}
                              disabled={!canEdit}
                              className={`flex-1 text-[10px] font-bold py-1 rounded-full transition-all ${h.above_7000_feet === true ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'} ${!canEdit ? 'cursor-not-allowed opacity-70' : ''}`}
                            >Yes</button>
                            <button 
                              onClick={() => {
                                if (!canEdit) return;
                                const newValue = false;
                                supabase.from('hospitals').update({ above_7000_feet: newValue }).eq('hospital_id', h.hospital_id).then(({ error }) => {
                                  if (!error) {
                                    setHospitals(hospitals.map(hospital => hospital.hospital_id === h.hospital_id ? { ...hospital, above_7000_feet: newValue } : hospital));
                                  }
                                });
                              }}
                              disabled={!canEdit}
                              className={`flex-1 text-[10px] font-bold py-1 rounded-full transition-all ${h.above_7000_feet !== true ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400'} ${!canEdit ? 'cursor-not-allowed opacity-70' : ''}`}
                            >No</button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <button 
                            onClick={() => verifyHospital(h.hospital_id)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${h.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}
                          >
                            {h.is_verified ? <CheckCircle size={16} /> : 'Verify'}
                          </button>
                          {h.verified_at && <div className="text-[10px] text-slate-400 mt-1">{new Date(h.verified_at).toLocaleDateString()}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {filteredHospitals.map((h, index) => (
                  <div key={h.hospital_id || index} className="bg-slate-50 p-4 rounded-2xl border border-gray-100">
                    <div className="font-bold text-slate-900 mb-1">{h.facility_name}</div>
                    <div className="text-xs font-bold text-slate-500 mb-2">{h.type} | Staff: {h.staff_count}</div>
                    <div className="text-xs text-slate-600 mb-1">District: {h.district}</div>
                    <div className="text-xs text-slate-600 mb-1">Status: {h.status || 'N/A'}</div>
                    <div className="text-xs text-slate-600">Above 7000ft: {h.above_7000_feet ? 'Yes' : 'No'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'employees' && (
        <div>
          <div className="flex flex-wrap gap-4 mb-4 items-center">
            <button 
              onClick={exportEmployeesToExcel}
              className="flex items-center justify-center gap-2 bg-white border border-gray-100 text-slate-700 py-2 px-4 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download size={18} />
              Export Excel
            </button>
            <select 
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-white border border-gray-100 rounded-xl py-2 px-3 font-bold text-slate-600"
            >
              <option value="All">All Districts</option>
              {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-gray-100 rounded-xl py-2 px-3 font-bold text-slate-600"
            >
              <option value="All">All Roles</option>
              {Array.from(new Set(employees.map(e => e.role).filter(Boolean))).sort().map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select 
              value={employmentTypeFilter}
              onChange={(e) => setEmploymentTypeFilter(e.target.value)}
              className="bg-white border border-gray-100 rounded-xl py-2 px-3 font-bold text-slate-600"
            >
              <option value="All">All Employment Types</option>
              <option value="Permanent">Permanent</option>
              <option value="Contractual">Contractual</option>
              <option value="Outsourced">Outsourced</option>
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee by name..."
                className="w-full bg-white border border-gray-100 rounded-xl py-2 pl-10 pr-4 font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {loading ? (
            <Loader2 className="animate-spin text-emerald-600" />
          ) : selectedEmployee ? (
            <EmployeeDetailsPanel employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse bg-white rounded-2xl shadow-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs">
                      <th className="py-4 px-6">Full Name</th>
                      <th className="py-4 px-6">Role</th>
                      <th className="py-4 px-6">Employment Type</th>
                      <th className="py-4 px-6">Present Posting Hospital</th>
                      <th className="py-4 px-6">District</th>
                      <th className="py-4 px-6">Present Posting (Sugam / Durgam)</th>
                      <th className="py-4 px-6">Date of Birth</th>
                      <th className="py-4 px-6">Home District</th>
                      <th className="py-4 px-6">Date of 1st Joining</th>
                      <th className="py-4 px-6">Total Long Leaves</th>
                      <th className="py-4 px-6">Total Sugam Attachment Days</th>
                      <th className="py-4 px-6">Total Durgam (Below 7000ft) attachment days</th>
                      <th className="py-4 px-6">Total Durgam (Above 7000ft) attachment days</th>
                      <th className="py-4 px-6">Total Sugam Days</th>
                      <th className="py-4 px-6">Total Durgam (Below 7000 Feet) Days</th>
                      <th className="py-4 px-6">Total Durgam (Above 7000 Feet) Days</th>
                      <th className="py-4 px-6">Last Edited On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees
                      .filter(e => 
                        (districtFilter === 'All' || e.present_district === districtFilter) &&
                        (roleFilter === 'All' || e.role === roleFilter) &&
                        (employmentTypeFilter === 'All' || e.employment_type === employmentTypeFilter) &&
                        (searchQuery === '' || (e.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((e, index) => (
                          <tr key={e.id || index} onClick={() => setSelectedEmployee(e)} className="border-b border-gray-100 text-xs cursor-pointer hover:bg-gray-50">
                            <td className="py-4 px-6 font-bold">{e.full_name}</td>
                            <td className="py-4 px-6">{e.role}</td>
                            <td className="py-4 px-6">{e.employment_type || 'N/A'}</td>
                            <td className="py-4 px-6">{e.present_hospital}</td>
                            <td className="py-4 px-6">{e.present_district}</td>
                            <td className="py-4 px-6">{e.present_posting_status}</td>
                            <td className="py-4 px-6">{formatDate(e.dob)}</td>
                            <td className="py-4 px-6">{e.home_district}</td>
                            <td className="py-4 px-6">{formatDate(e.first_joining_date)}</td>
                            <td className="py-4 px-6">{e.long_leaves_count}</td>
                            <td className="py-4 px-6">{e.attachment_sugam_days}</td>
                            <td className="py-4 px-6">{e.attachment_durgam_days}</td>
                            <td className="py-4 px-6">{e.attachment_durgam_above_7000_days}</td>
                            <td className="py-4 px-6">{e.total_sugam_days}</td>
                            <td className="py-4 px-6">{e.total_durgam_below_7000_days}</td>
                            <td className="py-4 px-6">{e.total_durgam_above_7000_days}</td>
                            <td className="py-4 px-6">{formatDate(e.last_edited_on)}</td>
                          </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {employees
                  .filter(e => 
                    (districtFilter === 'All' || e.present_district === districtFilter) &&
                    (roleFilter === 'All' || e.role === roleFilter) &&
                    (employmentTypeFilter === 'All' || e.employment_type === employmentTypeFilter) &&
                    (searchQuery === '' || (e.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((e, index) => (
                    <div key={e.id || index} onClick={() => setSelectedEmployee(e)} className="bg-slate-50 p-4 rounded-2xl border border-gray-100">
                      <div className="font-bold text-slate-900 mb-1">{e.full_name}</div>
                      <div className="text-xs font-bold text-slate-500 mb-2">{e.role}</div>
                      <div className="text-xs text-slate-600 mb-1">Hospital: {e.present_hospital}</div>
                      <div className="text-xs text-slate-600 mb-1">District: {e.present_district}</div>
                      <div className="text-xs text-slate-600">Status: {e.present_posting_status}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

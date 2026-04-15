import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, MapPin, Plus, ChevronLeft, IndianRupee, ClipboardList, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function YogaInstructorModule({ session, onSwitchToControl }: { session: any, onSwitchToControl: () => void }) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'log'>('calendar');
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [staff, setStaff] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    fetchStaff();
    fetchRoster();
  }, [session.id]);

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('id', session.id)
      .single();
    
    if (data) setStaff(data);
  };

  const fetchRoster = async () => {
    console.log('Fetching roster for:', session.id, currentMonth);
    const { data, error } = await supabase
      .from('yoga_roster')
      .select('*')
      .eq('staff_id', session.id)
      .eq('is_active', true)
      .eq('month_year', currentMonth);
    
    if (error) {
      console.error('Error fetching roster:', error);
    } else {
      console.log('Roster fetched:', data);
      if (data) setRoster(data);
    }
  };

  const totals = roster.reduce((acc, item) => {
    const type = item.planned_location as 'Hospital' | 'School' | 'Community';
    if (type && acc.hasOwnProperty(type)) {
      acc[type] += (item.sessions_count || 0);
    }
    acc.Total += (item.sessions_count || 0);
    return acc;
  }, { Hospital: 0, School: 0, Community: 0, Total: 0 } as Record<string, number>);

  const role = staff?.role || session.role;
  const targetSessions = role?.includes('(Male)') ? 32 : 20;
  const [doneSessions, setDoneSessions] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);

  const [isGpsFetched, setIsGpsFetched] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [locationDetails, setLocationDetails] = useState('');
  const [maleParticipants, setMaleParticipants] = useState(0);
  const [femaleParticipants, setFemaleParticipants] = useState(0);
  const [submittedSessions, setSubmittedSessions] = useState<any[]>([]);

  useEffect(() => {
    fetchStaff();
    fetchRoster();
    fetchSubmittedSessions();
  }, [session.id, selectedMonth, selectedYear]);

  const fetchSubmittedSessions = async () => {
    const { data } = await supabase
      .from('yoga_sessions')
      .select('*')
      .eq('staff_id', session.id);
    
    if (data) {
      const filtered = data.filter(s => {
        const date = new Date(s.session_date);
        return date.toLocaleString('default', { month: 'long' }) === selectedMonth &&
               date.getFullYear() === selectedYear;
      });
      setSubmittedSessions(filtered);
      setTotalSessions(filtered.length);
      const totalP = filtered.reduce((acc, s) => acc + (s.participants_male || 0) + (s.participants_female || 0), 0);
      setTotalParticipants(totalP);
      setDoneSessions(filtered.length);
      setEarnings(filtered.length * (role?.includes('(Male)') ? 250 : 250)); // Assuming 250 per session
    }
  };

  const exportToExcel = () => {
    if (submittedSessions.length === 0) {
      toast.error('No sessions to export for this month');
      return;
    }

    const headers = ["Date", "Location", "Details", "Male Count", "Female Count", "Total", "GPS"];
    const csvRows = submittedSessions.map(s => {
      const total = (s.participants_male || 0) + (s.participants_female || 0);
      // Clean Location and Details: remove quotes and handle nulls
      const location = (s.location_type || '').replace(/"/g, '""');
      const details = (s.location_details || '').replace(/"/g, '""');
      const gps = (s.gps_coordinates || 'N/A').replace(/"/g, '""');
      
      return [
        s.session_date,
        `"${location}"`,
        `"${details}"`,
        s.participants_male || 0,
        s.participants_female || 0,
        total,
        `"${gps}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Yoga_Report_${staff?.full_name || 'Instructor'}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report downloaded');
  };

  const fetchGps = () => {
    // Simulate GPS fetch
    setGpsCoordinates('28.6139, 77.2090');
    setIsGpsFetched(true);
  };

  const handleSubmit = async () => {
    const { error } = await supabase
      .from('yoga_sessions')
      .insert({
        staff_id: session.id,
        hospital_id: staff?.hospital_id,
        session_date: sessionDate,
        location_type: selectedLocation?.type,
        location_details: locationDetails,
        participants_male: maleParticipants,
        participants_female: femaleParticipants,
        gps_coordinates: gpsCoordinates,
        is_verified_by_gps: isGpsFetched
      });

    if (error) {
      console.error('Error logging session:', error);
      toast.error('Failed to submit session');
    } else {
      toast.success('Session submitted successfully');
      setIsAddSessionModalOpen(false);
      fetchSubmittedSessions();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">Yoga Instructor</h2>
        </div>
        {session.isIncharge && (
          <button onClick={onSwitchToControl} className="text-xs font-bold text-emerald-600">
            Switch to Control
          </button>
        )}
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Instructor</p>
          <p className="text-sm font-bold text-slate-900">{staff?.full_name || session.full_name || 'Staff Name'}</p>
          <p className="text-[10px] text-slate-500">{staff?.hospital_name || session.hospitalName || 'Hospital Name'} | {staff?.role || role || 'Role'}</p>
        </div>

        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex gap-1">
          {(['calendar', 'log'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                activeTab === tab 
                  ? 'bg-emerald-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4">
        <Toaster />
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">{currentMonth}</h3>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries({
                Hospital: submittedSessions.filter(s => s.location_type === 'Hospital').length,
                School: submittedSessions.filter(s => s.location_type === 'School').length,
                Community: submittedSessions.filter(s => s.location_type === 'Community').length,
                Total: submittedSessions.length
              }).map(([key, value]) => (
                <div key={key} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{key}</p>
                  <p className="text-sm font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Monthly Duty Chart</h4>
              {roster.map((item, index) => (
                <div key={index} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-900">{item.planned_location}: {item.location_details}</p>
                    <p className="text-xs font-bold text-emerald-600">{item.sessions_count} Sessions</p>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '25%' }} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">1/{item.sessions_count} Done</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900">Target Progress</h3>
                <p className="text-xs font-bold text-emerald-600">{doneSessions} / {targetSessions} Done</p>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(doneSessions / targetSessions) * 100}%` }} />
              </div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-800">Earnings (This Month)</p>
              <p className="text-2xl font-black text-emerald-900">₹{earnings} <span className="text-xs font-medium text-emerald-600">/ ₹{role?.includes('(Male)') ? '8,000' : '5,000'}</span></p>
            </div>
            <button onClick={() => setIsAddSessionModalOpen(true)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
              <Plus size={20} /> Log Activity
            </button>
          </div>
        )}
        {activeTab === 'log' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Session Logs</h3>
              <div className="flex gap-2">
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-1 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Download size={14} /> CSV
                </button>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  {[2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Sessions</p>
                <p className="text-xl font-black text-slate-900">{totalSessions}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Participants</p>
                <p className="text-xl font-black text-slate-900">{totalParticipants}</p>
              </div>
            </div>
            <div className="space-y-3">
              {submittedSessions.map((s) => (
                <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-900">{s.session_date}</p>
                    <p className="text-xs font-bold text-emerald-600">{s.location_type}</p>
                  </div>
                  <p className="text-xs text-slate-500">GPS: {s.gps_coordinates || 'N/A'}</p>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Male: {s.participants_male}</span>
                    <span>Female: {s.participants_female}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">Staff: {staff?.full_name || 'N/A'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isAddSessionModalOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-lg rounded-3xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Log Session</h3>
              <input 
                type="date" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm" 
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
              <select 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm"
                onChange={(e) => {
                  const type = e.target.value;
                  setSelectedLocation({ ...selectedLocation, type });
                }}
              >
                <option value="">Location Type</option>
                <option value="Hospital">Hospital</option>
                <option value="School">School</option>
                <option value="Community">Community</option>
              </select>

              {(selectedLocation?.type === 'School' || selectedLocation?.type === 'Community') && (
                <input 
                  type="text" 
                  placeholder="Location Details" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" 
                  placeholder="Male Participants" 
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm"
                  value={maleParticipants}
                  onChange={(e) => setMaleParticipants(parseInt(e.target.value) || 0)}
                />
                <input 
                  type="number" 
                  placeholder="Female Participants" 
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm"
                  value={femaleParticipants}
                  onChange={(e) => setFemaleParticipants(parseInt(e.target.value) || 0)}
                />
              </div>

              <button onClick={fetchGps} className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl font-bold text-xs">
                <MapPin size={16} className="inline mr-2" /> Auto Fetch GPS Coordinates
              </button>

              <input 
                type="text" 
                placeholder="Latitude, Longitude" 
                value={gpsCoordinates}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm"
                readOnly
              />

              <div className="flex gap-2">
                <button onClick={() => setIsAddSessionModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-700">Cancel</button>
                <button 
                  onClick={handleSubmit}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

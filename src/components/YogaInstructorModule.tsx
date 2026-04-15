import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, MapPin, Plus, ChevronLeft, IndianRupee, ClipboardList, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function YogaInstructorModule({ session, onSwitchToControl }: { session: any, onSwitchToControl: () => void }) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'log'>('calendar');
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [staff, setStaff] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
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
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const fetchGps = () => {
    // Simulate GPS fetch
    setIsGpsFetched(true);
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
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">{currentMonth}</h3>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(totals).map(([key, value]) => (
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
              <p className="text-2xl font-black text-emerald-900">₹{earnings} <span className="text-xs font-medium text-emerald-600">/ ₹{role === 'Male' ? '8,000' : '5,000'}</span></p>
            </div>
            <button onClick={() => setIsAddSessionModalOpen(true)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
              <Plus size={20} /> Log Activity
            </button>
          </div>
        )}
        {activeTab === 'log' && (
          <div className="space-y-4">
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
            <button className="w-full bg-white border border-slate-200 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-slate-900">
              <Download size={18} /> Download Report
            </button>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isAddSessionModalOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-lg rounded-3xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Log Session</h3>
              <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm" defaultValue={new Date().toISOString().split('T')[0]} />
              <select 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm"
                onChange={(e) => setSelectedLocation(roster.find(r => r.id === e.target.value))}
              >
                <option value="">Select Location</option>
                {roster.map(r => (
                  <option key={r.id} value={r.id}>{r.planned_location}: {r.location_details}</option>
                ))}
              </select>
              {selectedLocation && (
                <div className="text-xs font-bold text-slate-500">
                  Target: {selectedLocation.sessions_count} sessions
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Male Participants" className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm" />
                <input type="number" placeholder="Female Participants" className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm" />
              </div>
              {selectedLocation?.gps_mandatory && !isGpsFetched && (
                <button onClick={fetchGps} className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl font-bold text-xs">
                  <MapPin size={16} className="inline mr-2" /> Fetch GPS
                </button>
              )}
              <div className="flex gap-2">
                <button onClick={() => setIsAddSessionModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-700">Cancel</button>
                <button 
                  disabled={selectedLocation?.gps_mandatory && !isGpsFetched}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50"
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

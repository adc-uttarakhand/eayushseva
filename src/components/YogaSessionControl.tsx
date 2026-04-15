import React, { useState, useEffect } from 'react';
import { Calendar, Users, BarChart3, Settings, ChevronLeft, Plus, Trash2, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function YogaSessionControl({ session, onSwitchToInstructor }: { session: any, onSwitchToInstructor: () => void }) {
  const [activeTab, setActiveTab] = useState<'plan' | 'roster' | 'monitoring'>('plan');
  const [instructorType, setInstructorType] = useState<'male' | 'female'>('male');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [gpsMandatory, setGpsMandatory] = useState(true);
  const [sessionRows, setSessionRows] = useState<{ locationType: 'Hospital' | 'School' | 'Community', name: string, sessions: number }[]>([]);
  const [existingRosters, setExistingRosters] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSession, setNewSession] = useState<{ locationType: 'Hospital' | 'School' | 'Community', name: string, sessions: number }>({ locationType: 'Hospital', name: '', sessions: 0 });
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);

  useEffect(() => {
    fetchStaff();
  }, [session.hospitalId]);

  useEffect(() => {
    if (selectedInstructor) {
      fetchExistingRosters();
    }
  }, [selectedInstructor, selectedMonth, selectedYear]);

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('hospital_id', session.hospitalId)
      .ilike('role', '%Yoga Instructor%');
    
    if (data) setStaff(data);
  };

  const fetchExistingRosters = async () => {
    const { data } = await supabase
      .from('yoga_roster')
      .select('*')
      .eq('staff_id', selectedInstructor.id)
      .eq('month_year', `${selectedMonth}-${selectedYear}`);
    
    if (data) setExistingRosters(data);
  };

  const filteredStaff = staff.filter(s => 
    instructorType === 'male' ? s.role.includes('(Male)') : s.role.includes('(Female)')
  );

  useEffect(() => {
    if (filteredStaff.length > 0) {
      setSelectedInstructor(filteredStaff[0]);
    } else {
      setSelectedInstructor(null);
    }
  }, [instructorType, staff]);

  const totalSessions = instructorType === 'male' ? 32 : 20;
  const targetHospital = instructorType === 'male' ? 20 : 20;

  const handleSave = async () => {
    if (!selectedInstructor) {
      toast.error('Please select an instructor');
      return;
    }

    const rosterData = sessionRows.map(row => ({
      staff_id: selectedInstructor.id,
      hospital_id: session.hospitalId,
      month_year: `${selectedMonth}-${selectedYear}`,
      planned_location: row.locationType,
      location_details: row.name,
      sessions_count: row.sessions,
      gps_mandatory: gpsMandatory,
      status: 'Scheduled',
      is_active: true
    }));

    const { error } = await supabase
      .from('yoga_roster')
      .insert(rosterData);

    if (error) {
      console.error('Error saving roster:', error);
      toast.error('Failed to save roster');
    } else {
      toast.success('Roster saved successfully');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onSwitchToInstructor} className="p-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-slate-900">Yoga Session Control</h2>
        </div>
        <button onClick={handleSave} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
          <Save size={16} /> Save
        </button>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {instructorType === 'male' ? 'Male Instructor' : 'Female Instructor'}
              </p>
              <p className="text-sm font-bold text-slate-900">{selectedInstructor?.full_name || 'Select Instructor'}</p>
              <p className="text-[10px] text-slate-500">{session.hospital_name || session.hospitalName || 'Hospital Name'}</p>
            </div>
            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {selectedInstructor?.role || 'Role'}
            </div>
          </div>
        </div>

        <select 
          value={instructorType}
          onChange={(e) => setInstructorType(e.target.value as 'male' | 'female')}
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900"
        >
          <option value="male">Male Instructor</option>
          <option value="female">Female Instructor</option>
        </select>

        <select 
          onChange={(e) => setSelectedInstructor(staff.find(s => s.id === e.target.value))}
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900"
        >
          {filteredStaff.map(s => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>

        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
          <span className="text-sm font-bold text-slate-900">Make GPS Mandatory</span>
          <button 
            onClick={() => setGpsMandatory(!gpsMandatory)}
            className={`w-12 h-6 rounded-full transition-colors ${gpsMandatory ? 'bg-emerald-600' : 'bg-slate-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${gpsMandatory ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex gap-1">
          {(['plan', 'roster', 'monitoring'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                activeTab === tab 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4">
        {activeTab === 'plan' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Monthly Roster Planning</h3>
              <div className="flex gap-2">
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
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-2xl font-black text-slate-900">{totalSessions}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Target</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-2xl font-black text-slate-900">{sessionRows.reduce((sum, row) => sum + row.sessions, 0)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Planned Sessions</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-900">Planned Sessions</p>
              {sessionRows.map((row, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="w-20 text-[10px] font-bold text-slate-500 uppercase">{row.locationType}</span>
                  <input 
                    type="text" 
                    value={row.name}
                    readOnly
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs"
                  />
                  <input 
                    type="number" 
                    value={row.sessions}
                    readOnly
                    className="w-16 bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 text-xs"
                  />
                  <button onClick={() => setSessionRows(sessionRows.filter((_, i) => i !== index))} className="p-2 text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
              {isAdding ? (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <select 
                    value={newSession.locationType}
                    onChange={(e) => setNewSession({...newSession, locationType: e.target.value as 'Hospital' | 'School' | 'Community'})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="Hospital">Hospital</option>
                    <option value="School">School</option>
                    <option value="Community">Community</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Location Details" 
                    value={newSession.name}
                    onChange={(e) => setNewSession({...newSession, name: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <input 
                    type="number" 
                    placeholder="Number of Sessions" 
                    value={newSession.sessions}
                    onChange={(e) => setNewSession({...newSession, sessions: parseInt(e.target.value) || 0})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-slate-200 rounded-xl text-xs font-bold text-slate-700">Cancel</button>
                    <button 
                      onClick={() => {
                        setSessionRows([...sessionRows, newSession]);
                        setNewSession({ locationType: 'Hospital', name: '', sessions: 0 });
                        setIsAdding(false);
                      }}
                      className="flex-1 py-2 bg-emerald-600 rounded-xl text-xs font-bold text-white"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAdding(true)} 
                  disabled={sessionRows.reduce((sum, row) => sum + row.sessions, 0) >= totalSessions}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={16} /> Add Session
                </button>
              )}
            </div>
          </div>
        )}
        {activeTab === 'roster' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Existing Roster</h3>
            {existingRosters.length > 0 ? (
              <div className="space-y-3">
                {existingRosters.map((roster, index) => (
                  <div key={index} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{roster.planned_location}: {roster.location_details}</p>
                      <p className="text-[10px] text-slate-500">Sessions: {roster.sessions_count}</p>
                    </div>
                    <div className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg text-[10px] font-bold">
                      {roster.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">No roster planned for this month.</p>
            )}
          </div>
        )}
        {activeTab === 'monitoring' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Monitoring</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Progress</span>
                <span>0/{totalSessions}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[0%]" />
              </div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-800">Earnings</p>
              <p className="text-2xl font-black text-emerald-900">₹0 <span className="text-xs font-medium text-emerald-600">/ ₹{instructorType === 'male' ? '8,000' : '5,000'}</span></p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

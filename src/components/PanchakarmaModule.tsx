import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Calendar, 
  ClipboardList, 
  User, 
  Activity, 
  CreditCard, 
  CheckCircle2, 
  ChevronRight, 
  Trash2, 
  Clock, 
  ArrowLeft,
  Loader2,
  IndianRupee,
  Stethoscope,
  ChevronLeft,
  Filter,
  MoreVertical,
  X,
  Bell,
  Save,
  Pencil
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { format, addDays, startOfDay, isSameDay, parseISO, isSameMonth, isSameQuarter, isSameYear } from 'date-fns';

interface Patient {
  id: string;
  name: string;
  age: string;
  gender: string;
  hospital_yearly_serial: string;
  created_at: string;
}

interface Therapy {
  id: string;
  therapy_name: string;
  charges: number;
  module_name: string;
}

interface Consumable {
  name: string;
  quantity: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  therapies: string[];
  start_date: string;
  end_date: string;
  start_time: string;
  duration_minutes: number;
  total_days: number;
  staff_id: string;
  hospital_id: string;
  status: 'booked' | 'completed' | 'cancelled';
  patients?: { name: string };
}

interface Log {
  id: string;
  patient_name: string;
  patient_id: string;
  therapies: any[];
  consumables: any[];
  total_amount: number;
  payment_collected: boolean;
  created_at: string;
  staff_name: string;
}

export default function PanchakarmaModule({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState<'conduct' | 'appointments' | 'register'>('conduct');
  const [loading, setLoading] = useState(false);
  
  // Conduct Therapy State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [masterTherapies, setMasterTherapies] = useState<Therapy[]>([]);
  const [selectedTherapies, setSelectedTherapies] = useState<Therapy[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([{ name: '', quantity: '' }]);
  const [paymentCollected, setPaymentCollected] = useState(false);
  const [isTherapySearchOpen, setIsTherapySearchOpen] = useState(false);
  const [therapyQuery, setTherapyQuery] = useState('');

  const resetNewAppointmentData = () => {
    setNewAppointmentData({
      patient: null,
      therapies: [],
      start_date: format(new Date(), 'dd-MM-yyyy'),
      start_time: '09:00 AM',
      duration_minutes: 30,
      total_days: 1
    });
    setAppointmentTherapyQuery('');
  };

  // Appointments State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyLogs, setDailyLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState({ totalTherapies: 0, totalRevenue: 0 });
  const [isCreateAppointmentModalOpen, setIsCreateAppointmentModalOpen] = useState(false);
  const [appointmentTherapyQuery, setAppointmentTherapyQuery] = useState('');
  const [newAppointmentData, setNewAppointmentData] = useState<{
    patient: Patient | null;
    therapies: string[];
    start_date: string;
    start_time: string;
    duration_minutes: number;
    total_days: number;
  }>({
    patient: null,
    therapies: [],
    start_date: format(new Date(), 'dd-MM-yyyy'),
    start_time: '09:00 AM',
    duration_minutes: 30,
    total_days: 1
  });

  const [registerFilter, setRegisterFilter] = useState<'today' | 'month' | 'quarter' | 'year' | 'custom'>('today');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (activeTab === 'register') {
      let filtered = [...dailyLogs];
      const now = new Date();
      
      if (registerFilter === 'today') {
        filtered = dailyLogs.filter(log => isSameDay(parseISO(log.created_at), now));
      } else if (registerFilter === 'month') {
        filtered = dailyLogs.filter(log => isSameMonth(parseISO(log.created_at), now));
      } else if (registerFilter === 'quarter') {
        filtered = dailyLogs.filter(log => isSameQuarter(parseISO(log.created_at), now));
      } else if (registerFilter === 'year') {
        filtered = dailyLogs.filter(log => isSameYear(parseISO(log.created_at), now));
      } else if (registerFilter === 'custom' && customDateRange.start && customDateRange.end) {
        filtered = dailyLogs.filter(log => {
          const createdAt = parseISO(log.created_at);
          return createdAt >= parseISO(customDateRange.start) && createdAt <= parseISO(customDateRange.end);
        });
      }
      setFilteredLogs(filtered);
    }
  }, [activeTab, dailyLogs, registerFilter, customDateRange]);

  const exportToExcel = () => {
    import('xlsx').then(XLSX => {
      const worksheet = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
        Date: format(parseISO(log.created_at), 'yyyy-MM-dd'),
        Patient: log.patient_name,
        Therapy: log.therapy_name,
        Charges: log.charges,
        Status: log.payment_status
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Panchakarma Report');
      XLSX.writeFile(workbook, `Panchakarma_Report_${registerFilter}.xlsx`);
    });
  };

  const hospitalName = session?.hospitalName || 'AYUSH Hospital';
  const staffName = session?.full_name || 'Staff Member';
  const staffRole = session?.role || 'Staff';
  const hospitalId = session?.activeHospitalId || session?.hospitalId || session?.id;

  useEffect(() => {
    fetchMasterTherapies();
    if (activeTab === 'appointments') fetchAppointments();
    if (activeTab === 'register') fetchDailyLogs();
  }, [activeTab, selectedDate, hospitalId]);

  const fetchMasterTherapies = async () => {
    const { data, error } = await supabase
      .from('master_therapies')
      .select('*')
      .eq('module_name', 'Panchakarma');
    if (data) setMasterTherapies(data);
  };

  const fetchAppointments = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('panchakarma_appointments')
      .select('*, patients(full_name)')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr)
      .eq('hospital_id', hospitalId);
    if (data) {
      const appointmentsWithPatientName = data.map(appt => ({
        ...appt,
        patient_name: appt.patients?.full_name || 'Unknown'
      }));
      setAppointments(appointmentsWithPatientName);
    }
    setLoading(false);
    setLoading(false);
  };

  const fetchDailyLogs = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('panchakarma_logs')
      .select('*, patients(name)')
      .eq('hospital_id', hospitalId)
      .gte('created_at', `${today}T00:00:00Z`)
      .order('created_at', { ascending: false });
    
    if (data) {
      const logsWithPatientName = data.map(log => ({
        ...log,
        patient_name: log.patients?.name || 'Unknown'
      }));
      setDailyLogs(logsWithPatientName);
      const total = logsWithPatientName.length;
      const revenue = logsWithPatientName.reduce((acc, log) => acc + (log.charges || 0), 0);
      setStats({ totalTherapies: total, totalRevenue: revenue });
    }
    setLoading(false);
  };

  const handlePatientSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    // Search by name OR hospital_yearly_serial
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('hospital_id', hospitalId)
      .gte('created_at', fifteenDaysAgo.toISOString())
      .or(`name.ilike.%${query}%,hospital_yearly_serial.ilike.%${query}%`)
      .limit(5);
    
    if (data) setSearchResults(data);
  };

  const addConsumableRow = () => {
    setConsumables([...consumables, { name: '', quantity: '' }]);
  };

  const updateConsumable = (index: number, field: keyof Consumable, value: string) => {
    const newConsumables = [...consumables];
    newConsumables[index][field] = value;
    setConsumables(newConsumables);
  };

  const removeConsumable = (index: number) => {
    setConsumables(consumables.filter((_, i) => i !== index));
  };

  const totalAmount = selectedTherapies.reduce((acc, t) => acc + (t.charges || 0), 0);

  const saveSession = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    if (selectedTherapies.length === 0) {
      toast.error('Please add at least one therapy');
      return;
    }
    if (!paymentCollected) {
      toast.error('Please mark the total session fee as paid');
      return;
    }

    setLoading(true);
    const logData = {
      patient_id: selectedPatient.id,
      staff_id: session.user?.id || session.id,
      hospital_id: hospitalId,
      therapy_name: selectedTherapies.map(t => t.therapy_name).join(', '),
      charges: totalAmount,
      payment_status: paymentCollected ? 'Paid' : 'Pending',
      consumables: consumables.filter(c => c.name),
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('panchakarma_logs')
      .insert([logData]);

    if (!error) {
      toast.success('Therapy Logged Successfully');
      setSelectedPatient(null);
      setSelectedTherapies([]);
      setConsumables([{ name: '', quantity: '' }]);
      setPaymentCollected(false);
      setSearchQuery('');
    } else {
      toast.error('Error saving session: ' + error.message);
    }
    setLoading(false);
  };

  const filteredTherapies = masterTherapies.filter(t => 
    t.therapy_name.toLowerCase().includes(therapyQuery.toLowerCase())
  );

  console.log("Modal state:", isCreateAppointmentModalOpen);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <Stethoscope size={24} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-none">{staffName}</h2>
            <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-wider">{staffRole} • {hospitalName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
            <Bell size={20} />
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="px-4 py-4">
        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex gap-1">
          {(['conduct', 'appointments', 'register'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                activeTab === tab 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.replace(/([A-Z])/g, ' $1')}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'conduct' && (
            <motion.div
              key="conduct"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Smart Search */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Find Patient (Last 15 Days)</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by name or serial..."
                    value={searchQuery}
                    onChange={(e) => handlePatientSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-medium transition-all"
                  />
                  {searchResults.length > 0 && !selectedPatient && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20">
                      {searchResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setSearchResults([]);
                            setSearchQuery('');
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900">{p.name}</p>
                            <p className="text-[10px] text-slate-500">OPD: {p.hospital_yearly_serial} • {p.age}y/{p.gender}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-300" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Card */}
              {selectedPatient && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-600 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-100 relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold">{selectedPatient.name}</h3>
                        <p className="text-emerald-100 text-xs font-medium mt-1">
                          {selectedPatient.age} Years • {selectedPatient.gender}
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedPatient(null)}
                        className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="bg-white/20 px-4 py-2 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">OPD Number</p>
                        <p className="text-sm font-bold">{selectedPatient.hospital_yearly_serial}</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                </motion.div>
              )}

              {/* Therapy Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Therapies</label>
                  <button 
                    onClick={() => setIsTherapySearchOpen(true)}
                    className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Therapy
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {selectedTherapies.map((t, i) => (
                    <div key={i} className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{t.therapy_name}</p>
                        <p className="text-[10px] font-bold text-emerald-600">₹{t.charges}</p>
                      </div>
                      <button onClick={() => setSelectedTherapies(selectedTherapies.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {selectedTherapies.length === 0 && (
                    <p className="text-xs text-slate-400 italic px-2">No therapies selected yet...</p>
                  )}
                </div>
              </div>

              {/* Consumables Section */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardList size={18} className="text-emerald-600" />
                    Consumables
                  </h3>
                  <button 
                    onClick={addConsumableRow}
                    className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {consumables.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Item Name"
                        value={c.name}
                        onChange={(e) => updateConsumable(i, 'name', e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                      />
                      <input
                        type="text"
                        placeholder="Qty"
                        value={c.quantity}
                        onChange={(e) => updateConsumable(i, 'quantity', e.target.value)}
                        className="w-20 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                      />
                      {consumables.length > 1 && (
                        <button onClick={() => removeConsumable(i)} className="text-slate-300 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Financials */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Session Fee</p>
                  <div className="flex items-center gap-1 mt-1">
                    <IndianRupee size={20} className="text-slate-900" />
                    <span className="text-2xl font-black text-slate-900">{totalAmount}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setPaymentCollected(!paymentCollected)}
                  className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                    paymentCollected 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                      : 'bg-red-100 text-red-700 border border-red-200'
                  }`}
                >
                  {paymentCollected ? <CheckCircle2 size={16} /> : <X size={16} />}
                  {paymentCollected ? 'Paid' : 'Unpaid'}
                </button>
              </div>

              {/* Action Button */}
              <button 
                onClick={saveSession}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-bold text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                Confirm & Save Session
              </button>
            </motion.div>
          )}

          {activeTab === 'appointments' && (
            <>
            <motion.div
              key="appointments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Date Picker */}
              <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                <div className="flex gap-3">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const date = addDays(new Date(), i);
                    const isSelected = isSameDay(date, selectedDate);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`flex-shrink-0 w-16 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                            : 'bg-white text-slate-500 border border-slate-100'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{format(date, 'EEE')}</span>
                        <span className="text-xl font-black">{format(date, 'dd')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timeline View */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock size={18} className="text-emerald-600" />
                    Timeline for {format(selectedDate, 'MMMM dd')}
                  </h3>
                </div>
                <div className="relative divide-y divide-slate-100">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const hour = Math.floor(i / 4) + 8;
                    const minute = (i % 4) * 15;
                    const toMinutes = (time: string) => {
                      if (!time) return 0;
                      const [hours, minutes] = time.toString().split(':').map(Number);
                      return hours * 60 + minutes;
                    };

                    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    const slotMinutes = hour * 60 + minute;
                    const displayTime = `${hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
                    
                    const appt = appointments.find(a => {
                      const startMins = toMinutes(a.start_time);
                      const endMins = startMins + a.duration_minutes;
                      return slotMinutes >= startMins && slotMinutes < endMins;
                    });

                    return (
                      <div key={timeStr} className="flex items-start h-16">
                        <span className="text-[10px] font-bold text-slate-400 w-16 p-2 sticky left-0 bg-white">{displayTime}</span>
                        <div className="flex-1 relative">
                          {appt && (
                            <div 
                              className={`absolute left-0 right-2 ${appt.start_time === timeStr ? 'bg-emerald-100 border border-emerald-200' : 'bg-emerald-50'} p-3 rounded-xl flex items-start justify-between z-10`}
                              style={{ height: `${(appt.duration_minutes / 15) * 64 - 4}px` }}
                            >
                              {appt.start_time === timeStr && (
                                <>
                                  <div>
                                    <p className="text-xs font-bold text-emerald-900">{appt.patient_name}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {appt.therapies.map(t => (
                                        <span key={t} className="text-[9px] font-medium text-emerald-700 uppercase tracking-widest bg-emerald-200 px-1.5 py-0.5 rounded-md">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      setNewAppointmentData({
                                        patient: { id: appt.patient_id, name: appt.patient_name },
                                        therapies: appt.therapies,
                                        start_date: format(new Date(appt.start_date), 'dd-MM-yyyy'),
                                        start_time: appt.start_time,
                                        duration_minutes: appt.duration_minutes,
                                        total_days: appt.total_days
                                      });
                                      setIsCreateAppointmentModalOpen(true);
                                    }}
                                    className="p-1 hover:bg-emerald-200 rounded-lg text-emerald-700"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FAB */}
              <button 
                onClick={() => {
                  resetNewAppointmentData();
                  setIsCreateAppointmentModalOpen(true);
                }}
                className="fixed bottom-28 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all active:scale-95 z-40 pointer-events-auto"
              >
                <Plus size={32} />
              </button>

              <button 
                onClick={() => {
                  resetNewAppointmentData();
                  setIsCreateAppointmentModalOpen(true);
                }}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 mt-6 pointer-events-auto"
              >
                <Plus size={20} />
                Create Appointment
              </button>
            </motion.div>
          </>
          )}

          {activeTab === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <Activity size={20} />
                  </div>
                  <p className="text-2xl font-black text-slate-900">{filteredLogs.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Procedures</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                    <User size={20} />
                  </div>
                  <p className="text-2xl font-black text-slate-900">{new Set(filteredLogs.map(l => l.patient_id)).size}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Patients</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                    <IndianRupee size={20} />
                  </div>
                  <p className="text-2xl font-black text-slate-900">₹{filteredLogs.reduce((acc, l) => acc + (l.charges || 0), 0)}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Revenue</p>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="space-y-4">
                <div className="flex flex-col gap-4 ml-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent Activity</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                      {(['today', 'month', 'quarter', 'year'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setRegisterFilter(f)}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${registerFilter === f ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          {f}
                        </button>
                      ))}
                      <button
                        onClick={() => setRegisterFilter('custom')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${registerFilter === 'custom' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        Custom
                      </button>
                    </div>
                    {registerFilter === 'custom' && (
                      <div className="flex gap-2">
                        <input type="date" className="bg-white border border-slate-200 rounded-xl px-2 text-[10px]" onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})} />
                        <input type="date" className="bg-white border border-slate-200 rounded-xl px-2 text-[10px]" onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})} />
                      </div>
                    )}
                    <button 
                      onClick={exportToExcel}
                      className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
                    >
                      Download XLS
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                          <User size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{log.patient_name}</h4>
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                            {log.therapy_name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">{format(parseISO(log.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">₹{log.charges}</p>
                        <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full mt-1 inline-block ${
                          log.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {log.payment_status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredLogs.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                      <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-medium">No activity found for selected period</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Therapy Selection Modal */}
      <AnimatePresence>
        {isTherapySearchOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Select Therapy</h3>
                <button onClick={() => setIsTherapySearchOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 bg-slate-50">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search therapy..."
                    value={therapyQuery}
                    onChange={(e) => setTherapyQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredTherapies.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (!selectedTherapies.find(st => st.id === t.id)) {
                        setSelectedTherapies([...selectedTherapies, t]);
                      }
                      setIsTherapySearchOpen(false);
                      setTherapyQuery('');
                    }}
                    className="w-full p-4 text-left bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all flex justify-between items-center group"
                  >
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-emerald-700">{t.therapy_name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{t.module_name}</p>
                    </div>
                    <div className="bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-black text-slate-900">
                      ₹{t.charges}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Appointment Modal */}
      <AnimatePresence>
        {isCreateAppointmentModalOpen && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Create Appointment</h3>
                <button onClick={() => setIsCreateAppointmentModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Patient Search */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Patient</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search patient..."
                      value={searchQuery}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-medium"
                    />
                    {searchResults.length > 0 && !newAppointmentData.patient && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20">
                        {searchResults.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setNewAppointmentData({...newAppointmentData, patient: p});
                              setSearchResults([]);
                              setSearchQuery('');
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0"
                          >
                            <p className="text-sm font-bold text-slate-900">{p.name}</p>
                            <p className="text-[10px] text-slate-500">OPD: {p.hospital_yearly_serial}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {newAppointmentData.patient && (
                      <div className="mt-2 p-3 bg-emerald-50 rounded-xl flex justify-between items-center">
                        <p className="text-sm font-bold text-emerald-900">{newAppointmentData.patient.name}</p>
                        <button onClick={() => setNewAppointmentData({...newAppointmentData, patient: null})} className="text-emerald-600"><X size={16}/></button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Therapies Multi-select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Therapies</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search therapies..."
                      value={appointmentTherapyQuery}
                      onChange={(e) => setAppointmentTherapyQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-medium"
                    />
                    {appointmentTherapyQuery && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20 max-h-48 overflow-y-auto">
                        {masterTherapies
                          .filter(t => t.therapy_name.toLowerCase().includes(appointmentTherapyQuery.toLowerCase()))
                          .map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                if (!newAppointmentData.therapies.includes(t.therapy_name)) {
                                  setNewAppointmentData({
                                    ...newAppointmentData,
                                    therapies: [...newAppointmentData.therapies, t.therapy_name]
                                  });
                                }
                                setAppointmentTherapyQuery('');
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center"
                            >
                              <p className="text-sm font-bold text-slate-900">{t.therapy_name}</p>
                              <p className="text-[10px] text-slate-500 font-bold">₹{t.charges}</p>
                            </button>
                          ))}
                        {masterTherapies.filter(t => t.therapy_name.toLowerCase().includes(appointmentTherapyQuery.toLowerCase())).length === 0 && (
                          <div className="p-4 text-center text-slate-500 text-sm">No therapies found</div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Therapies */}
                  {newAppointmentData.therapies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {newAppointmentData.therapies.map(therapyName => (
                        <div key={therapyName} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-100">
                          {therapyName}
                          <button 
                            onClick={() => setNewAppointmentData({
                              ...newAppointmentData,
                              therapies: newAppointmentData.therapies.filter(st => st !== therapyName)
                            })}
                            className="hover:text-emerald-900 transition-colors bg-emerald-100 p-0.5 rounded-full"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Start Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Start Date</label>
                    <input
                      type="text"
                      placeholder="dd-mm-yyyy"
                      maxLength={10}
                      value={newAppointmentData.start_date}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length > 8) value = value.slice(0, 8);
                        
                        let formatted = value;
                        if (value.length > 4) {
                          formatted = `${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4)}`;
                        } else if (value.length > 2) {
                          formatted = `${value.slice(0, 2)}-${value.slice(2)}`;
                        }
                        
                        setNewAppointmentData({...newAppointmentData, start_date: formatted});
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Start Time</label>
                    <input
                      type="time"
                      value={newAppointmentData.start_time}
                      onChange={(e) => setNewAppointmentData({...newAppointmentData, start_time: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Duration & Days */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Duration (mins)</label>
                    <div className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl p-1">
                      <button onClick={() => setNewAppointmentData({...newAppointmentData, duration_minutes: Math.max(5, newAppointmentData.duration_minutes - 5)})} className="p-3 bg-white rounded-xl shadow-sm text-slate-600">-</button>
                      <span className="flex-1 text-center text-sm font-bold">{newAppointmentData.duration_minutes}</span>
                      <button onClick={() => setNewAppointmentData({...newAppointmentData, duration_minutes: newAppointmentData.duration_minutes + 5})} className="p-3 bg-white rounded-xl shadow-sm text-slate-600">+</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Total Days (1-15)</label>
                    <div className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl p-1">
                      <button onClick={() => setNewAppointmentData({...newAppointmentData, total_days: Math.max(1, newAppointmentData.total_days - 1)})} className="p-3 bg-white rounded-xl shadow-sm text-slate-600">-</button>
                      <span className="flex-1 text-center text-sm font-bold">{newAppointmentData.total_days}</span>
                      <button onClick={() => setNewAppointmentData({...newAppointmentData, total_days: Math.min(15, newAppointmentData.total_days + 1)})} className="p-3 bg-white rounded-xl shadow-sm text-slate-600">+</button>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (!newAppointmentData.patient || newAppointmentData.therapies.length === 0) {
                    toast.error('Please select patient and therapies');
                    return;
                  }
                  if (newAppointmentData.total_days < 1 || newAppointmentData.total_days > 15) {
                    toast.error('Days must be between 1 and 15');
                    return;
                  }
                  
                  setLoading(true);
                  // Book appointments for the specified number of days
                  const [day, month, year] = newAppointmentData.start_date.split('-').map(Number);
                  const startDate = new Date(year, month - 1, day);
                  const endDate = addDays(startDate, newAppointmentData.total_days - 1);
                  const startDateTime = new Date(year, month - 1, day, parseInt(newAppointmentData.start_time.split(':')[0]), parseInt(newAppointmentData.start_time.split(':')[1]));
                  const endDateTime = new Date(startDateTime.getTime() + newAppointmentData.duration_minutes * 60000);

                  // Conflict Check
                  const { data: conflicts } = await supabase
                    .from('panchakarma_appointments')
                    .select('*, patients(full_name)')
                    .eq('start_date', format(startDate, 'yyyy-MM-dd'))
                    .eq('hospital_id', hospitalId);
                  
                  const overlap = conflicts?.find(c => {
                    const [startH, startM] = c.start_time.split(':').map(Number);
                    const cStart = new Date(c.start_date);
                    cStart.setHours(startH, startM, 0, 0);
                    const cEnd = new Date(cStart.getTime() + c.duration_minutes * 60000);
                    return (startDateTime < cEnd && endDateTime > cStart);
                  });

                  if (overlap) {
                    toast.error(`Slot occupied by ${overlap.patients?.full_name || 'someone'}`);
                    setLoading(false);
                    return;
                  }
                  
                  const appointment = {
                    patient_id: newAppointmentData.patient.id,
                    therapies: newAppointmentData.therapies,
                    start_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    start_time: newAppointmentData.start_time,
                    duration_minutes: newAppointmentData.duration_minutes,
                    total_days: newAppointmentData.total_days,
                    staff_id: session.user?.id || session.id,
                    hospital_id: hospitalId,
                    status: 'booked'
                  };

                  const { error } = await supabase
                    .from('panchakarma_appointments')
                    .insert([appointment]);

                  if (!error) {
                    toast.success('Appointment Booked');
                    setIsCreateAppointmentModalOpen(false);
                    fetchAppointments();
                  } else {
                    toast.error('Error booking: ' + error.message);
                  }
                  setLoading(false);
                }}
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Calendar size={20} />}
                Book Appointments
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

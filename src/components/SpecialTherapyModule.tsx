import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, ClipboardList, User, Activity, IndianRupee, Bell, Stethoscope, Trash2, X, Save, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { format, parseISO, isSameDay, isSameMonth, isSameYear } from 'date-fns';

interface Patient { id: string; name: string; age: string; gender: string; hospital_yearly_serial: string; created_at: string; }
interface Therapy { id: string; therapy_name: string; charges: number; }
interface Consumable { name: string; quantity: string; }
interface Log { id: string; patient_name: string; patient_id: string; treatment_name: string; charges: number; payment_status: string; created_at: string; patient_details: Patient; staff_id: string, staff_name?: string; staff_role?: string; }

export default function SpecialTherapyModule({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState<'conduct' | 'register'>('conduct');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [masterTherapies, setMasterTherapies] = useState<Therapy[]>([]);
  const [showTherapyPicker, setShowTherapyPicker] = useState(false);
  const [selectedTherapies, setSelectedTherapies] = useState<Therapy[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [paymentCollected, setPaymentCollected] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [registerLogs, setRegisterLogs] = useState<Log[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [registerFilter, setRegisterFilter] = useState<'today' | 'month' | 'year'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [therapyFilter, setTherapyFilter] = useState('');

  const hospitalId = session?.activeHospitalId || session?.hospitalId || session?.id;
  const totalCharges = selectedTherapies.reduce((acc, t) => acc + t.charges, 0);

  useEffect(() => {
    fetchMasterTherapies();
  }, [hospitalId]);

  useEffect(() => {
    if (activeTab === 'register') {
      fetchLogs();
    }
  }, [activeTab, hospitalId]);

  useEffect(() => {
    if (activeTab === 'register') {
      let filtered = [...registerLogs];
      const now = new Date();
      if (startDate) filtered = filtered.filter(l => parseISO(l.created_at) >= parseISO(startDate));
      if (endDate) filtered = filtered.filter(l => parseISO(l.created_at) <= parseISO(endDate));
      if (therapyFilter) filtered = filtered.filter(l => l.treatment_name.split(',').map(t => t.trim()).includes(therapyFilter));
      
      if (!startDate && !endDate && !therapyFilter) {
          if (registerFilter === 'today') filtered = registerLogs.filter(l => isSameDay(parseISO(l.created_at), now));
          else if (registerFilter === 'month') filtered = registerLogs.filter(l => isSameMonth(parseISO(l.created_at), now));
          else if (registerFilter === 'year') filtered = registerLogs.filter(l => isSameYear(parseISO(l.created_at), now));
      }
      setFilteredLogs(filtered);
    }
  }, [registerLogs, registerFilter, startDate, endDate, therapyFilter, activeTab]);

  const downloadCSV = () => {
    const headers = ['Date', 'Patient', 'Serial', 'Charges', 'Therapies', 'Staff'];
    const rows = filteredLogs.map(l => [
      format(parseISO(l.created_at), 'yyyy-MM-dd'),
      `"${l.patient_name}"`,
      l.patient_details?.hospital_yearly_serial,
      l.charges,
      `"${l.treatment_name.replace(/"/g, '""')}"`,
      l.staff_name
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `therapy_logs_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  const fetchMasterTherapies = async () => {
    const { data } = await supabase
      .from('master_therapies')
      .select('*')
      .eq('module_name', 'Special Therapy');
    if (data) setMasterTherapies(data);
  };

   const fetchLogs = async () => {
    if (!hospitalId) return;
    const { data, error } = await supabase
      .from('special_treatment_logs')
      .select('*, patients(name, age, gender, hospital_yearly_serial), staff(full_name)') 
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching logs:', error);
    if (data) {
      console.log('Fetched logs data:', data);
      setRegisterLogs(data.map(l => ({ 
        ...l, 
        patient_name: l.patients?.name || 'Unknown', 
        patient_details: l.patients,
        staff_name: (l.staff as any)?.full_name || 'N/A',
        staff_role: 'Staff' // Assuming role is not in staff table or not requested? User did not explicitly say.
      })));
    }
  };

  const performPatientSearch = async () => {
    if (searchQuery.length < 2) {
      toast.error('Enter at least 2 characters');
      return;
    }
    const fifteenDaysAgo = new Date(); fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('hospital_id', hospitalId)
      .gte('created_at', fifteenDaysAgo.toISOString())
      .or(`name.ilike.%${searchQuery}%,hospital_yearly_serial.ilike.%${searchQuery}%`)
      .limit(5);
    if (data) setSearchResults(data);
  };

  const saveSession = async () => {
    if (!selectedPatient || selectedTherapies.length === 0 || (!paymentCollected && totalCharges > 0)) {
      toast.error('Please select patient, therapies, and ensure payment is marked as paid.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('special_treatment_logs').insert([{
      patient_id: selectedPatient.id, staff_id: session.user?.id || session.id, hospital_id: hospitalId,
      treatment_name: selectedTherapies.map(t => t.therapy_name).join(', '),
      charges: totalCharges,
      payment_status: paymentCollected ? 'Paid' : 'Unpaid', consumables, remarks
    }]);
    if (!error) {
      toast.success('Session Saved');
      setSelectedPatient(null); setSelectedTherapies([]); setConsumables([]); setPaymentCollected(false); setRemarks('');
      if (activeTab === 'register') fetchLogs();
    } else {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const totalRevenue = registerLogs.reduce((acc, l) => acc + (l.charges || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <header className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
         <div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600"><Stethoscope size={24}/></div><h2 className="font-bold">Special Therapy</h2></div>
         <div className="bg-slate-50 p-1 rounded-xl flex gap-1">
           {(['conduct', 'register'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize ${activeTab === tab ? 'bg-white shadow' : ''}`}>{tab}</button>
           ))}
         </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'conduct' && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
             {/* ... Search ... */}
             <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Search patient..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm" />
                </div>
                <button onClick={performPatientSearch} className="px-6 bg-emerald-600 text-white rounded-2xl font-bold text-sm">Search</button>
                {searchResults.length > 0 && !selectedPatient && <div className="absolute w-full top-16 bg-white shadow-xl mt-2 rounded-2xl overflow-hidden z-20">{searchResults.map(p => <button key={p.id} onClick={() => { setSelectedPatient(p); setSearchResults([]); setSearchQuery(''); }} className="w-full p-4 text-left hover:bg-slate-50">{p.name}</button>)}</div>}
             </div>
             
             {selectedPatient && (
               <div className="bg-emerald-600 text-white p-6 rounded-2xl flex justify-between items-center">
                 <div><h3 className="font-bold">{selectedPatient.name}</h3><p className="text-emerald-100 text-xs">{selectedPatient.age}y/{selectedPatient.gender} | {selectedPatient.hospital_yearly_serial}</p></div>
                 <button onClick={() => setSelectedPatient(null)}><X /></button>
               </div>
             )}

             <button onClick={() => setShowTherapyPicker(true)} className="w-full bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center font-bold text-slate-600">Add Therapy <ChevronDown size={18}/></button>
             {selectedTherapies.length > 0 && (
               <div className="flex flex-wrap gap-2 mt-2">
                 {selectedTherapies.map(t => (
                   <div key={t.id} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                     {t.therapy_name} (₹{t.charges})
                     <button onClick={() => setSelectedTherapies(selectedTherapies.filter(st => st.id !== t.id))}><X size={14}/></button>
                   </div>
                 ))}
               </div>
             )}
             {showTherapyPicker && (
               <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                 <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
                   <div className="flex justify-between items-center"><h3 className="font-bold">Select Therapies</h3><button onClick={() => setShowTherapyPicker(false)}><X /></button></div>
                   <div className="max-h-80 overflow-y-auto space-y-2">
                     {masterTherapies.map(t => (
                       <button key={t.id} onClick={() => setSelectedTherapies(selectedTherapies.includes(t) ? selectedTherapies.filter(st => st.id !== t.id) : [...selectedTherapies, t])} className={`w-full p-3 rounded-xl flex justify-between items-center text-xs ${selectedTherapies.includes(t) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50'}`}>
                         <span>{t.therapy_name} (₹{t.charges})</span>
                         {selectedTherapies.includes(t) && <CheckCircle2 size={16}/>}
                       </button>
                     ))}
                   </div>
                   <button onClick={() => setShowTherapyPicker(false)} className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold">Confirm</button>
                 </div>
               </div>
             )}

             <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase">Consumables</label>
                {consumables.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input placeholder="Name" value={c.name} onChange={e => { const n = [...consumables]; n[i].name = e.target.value; setConsumables(n); }} className="flex-1 p-2 bg-slate-50 rounded-lg text-xs"/>
                    <input placeholder="Qty" value={c.quantity} onChange={e => { const n = [...consumables]; n[i].quantity = e.target.value; setConsumables(n); }} className="w-20 p-2 bg-slate-50 rounded-lg text-xs"/>
                    <button onClick={() => setConsumables(consumables.filter((_, idx) => idx !== i))}><Trash2 size={16} className="text-red-500"/></button>
                  </div>
                ))}
                <button onClick={() => setConsumables([...consumables, { name: '', quantity: '' }])} className="text-xs font-bold text-emerald-600">+ Add consumable</button>
             </div>

             <div className="bg-white p-6 rounded-2xl border border-slate-200 flex justify-between items-center">
               <span className="font-bold">Total: ₹{totalCharges}</span>
               <button onClick={() => setPaymentCollected(!paymentCollected)} className={`px-4 py-2 rounded-lg font-bold text-xs ${paymentCollected ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>{paymentCollected ? 'Paid' : 'Unpaid'}</button>
             </div>

             <div className="bg-white p-6 rounded-2xl border border-slate-200">
               <button onClick={saveSession} disabled={loading || (!paymentCollected && totalCharges > 0)} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold flex justify-center items-center gap-2 disabled:bg-slate-300">{loading ? <Loader2 className="animate-spin"/> : <Save/>} Save</button>
             </div>
          </motion.div>
        )}
        {activeTab === 'register' && (
           <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 flex flex-wrap gap-2 items-center">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-lg text-xs" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-lg text-xs" />
              <select value={therapyFilter} onChange={e => setTherapyFilter(e.target.value)} className="p-2 border rounded-lg text-xs flex-1">
                <option value="">All Therapies</option>
                {masterTherapies.map(t => <option key={t.id} value={t.therapy_name}>{t.therapy_name}</option>)}
              </select>
              <button onClick={downloadCSV} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">Download CSV</button>
            </div>
            <div className="flex bg-white rounded-xl border border-slate-200 p-1 mb-4">
              {(['today', 'month', 'year'] as const).map(f => (
                <button key={f} onClick={() => setRegisterFilter(f)} className={`px-4 py-2 text-xs font-bold capitalize rounded-lg ${registerFilter === f ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>{f}</button>
              ))}
            </div>
             <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-2xl font-black text-slate-900">{filteredLogs.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Sessions</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-2xl font-black text-slate-900">₹{filteredLogs.reduce((acc, l) => acc + (l.charges || 0), 0)}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Revenue</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-2xl font-black text-slate-900">
                    {filteredLogs.reduce((acc, log) => acc + (log.treatment_name ? log.treatment_name.split(',').filter(t => t.trim() !== "").length : 0), 0)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Therapies</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Therapies Breakdown</p>
                  <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
                    {Object.entries(
                      filteredLogs.reduce((acc, log) => {
                        log.treatment_name.split(',').forEach(t => {
                          const n = t.trim();
                          if (n) acc[n] = (acc[n] || 0) + 1;
                        });
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([name, count]) => (
                      <p key={name} className="text-xs font-bold text-slate-700">{name} <span className="text-slate-400">({count})</span></p>
                    ))}
                  </div>
                </div>
            </div>
             <div className="grid grid-cols-6 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
               <div>Date</div>
               <div>Patient</div>
               <div className="text-center">Count</div>
               <div>Charges</div>
               <div>Staff</div>
               <div>Therapies</div>
             </div>
             {filteredLogs.map(l => (
               <div key={l.id} className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-6 gap-2 items-center text-xs">
                 <div className="font-bold text-slate-500">{format(parseISO(l.created_at), 'dd MMM yyyy')}</div>
                 <div>
                    <h4 className="font-bold text-slate-800">{l.patient_name}</h4>
                    <p className="text-[10px] text-slate-500">{l.patient_details?.hospital_yearly_serial} | {l.patient_details?.age}y / {l.patient_details?.gender}</p>
                 </div>
                 <div className="text-center font-bold text-slate-700">{l.treatment_name.split(',').length}</div>
                 <div className="font-bold text-emerald-600">₹{l.charges}</div>
                 <div className="text-slate-600 font-medium">{l.staff_name || 'N/A'}<br/><span className="text-[10px] text-slate-400">{l.staff_role || '-'}</span></div>
                 <div className="text-slate-600 break-words">{l.treatment_name}</div>
               </div>
             ))}
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

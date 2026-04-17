import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Trash2, CheckCircle, FileSpreadsheet, Calendar, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface RapidTestLog {
  id: string;
  created_at: string;
  test_name: string;
  test_result: string | null;
  payment_status: string;
  charges: number;
  patients: { name: string; hospital_yearly_serial: string };
}

interface SelectedTest {
  test: any;
  consumables: { name: string, qnty: number }[];
}

export default function RapidTests({ hospitalId, staffId }: { hospitalId: string, staffId: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'conduct' | 'report' | 'register'>('conduct');
  const [loading, setLoading] = useState(false);
  
  // Conduct State
  const [searchQuery, setSearchQuery] = useState('');
  const [foundPatients, setFoundPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [masterTests, setMasterTests] = useState<any[]>([]);
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Report & Register State
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [logs, setLogs] = useState<RapidTestLog[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchMasterTests();
    if (activeSubTab === 'report') fetchPendingReports();
    if (activeSubTab === 'register') fetchLogs();
  }, [activeSubTab, filterDate]);

  const fetchMasterTests = async () => {
    const { data } = await supabase.from('rapid_tests').select('*');
    if (data) setMasterTests(data);
  };

  const fetchPendingReports = async () => {
    const { data } = await supabase
      .from('rapid_test_logs')
      .select('*, patients(name, hospital_yearly_serial)')
      .is('test_result', null)
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });
    if (data) setPendingReports(data);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('rapid_test_logs')
      .select('*, patients(name, hospital_yearly_serial)')
      .eq('hospital_id', hospitalId)
      .gte('created_at', `${filterDate}T00:00:00Z`)
      .lte('created_at', `${filterDate}T23:59:59Z`);
    if (data) setLogs(data);
  };

  const findPatients = async () => {
    setLoading(true);
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('hospital_id', hospitalId)
      .gte('created_at', fifteenDaysAgo)
      .or(`name.ilike.%${searchQuery}%,mobile.ilike.%${searchQuery}%,hospital_yearly_serial.ilike.%${searchQuery}%`);
    setFoundPatients(data || []);
    setLoading(false);
  };

  const handleSelectPatient = (p: any) => {
    setSelectedPatient(p);
    setFoundPatients([]);
  };

  const toggleTest = (test: any) => {
    if (selectedTests.find(st => st.test.id === test.id)) {
      setSelectedTests(selectedTests.filter(st => st.test.id !== test.id));
    } else {
      setSelectedTests([...selectedTests, { test, consumables: [] }]);
    }
  };

  const addConsumableForTest = (testId: string) => {
    setSelectedTests(selectedTests.map(st => st.test.id === testId ? { ...st, consumables: [...st.consumables, { name: '', qnty: 1 }] } : st));
  };

  const updateConsumable = (testId: string, consumableIdx: number, field: 'name' | 'qnty', value: string | number) => {
    setSelectedTests(selectedTests.map(st => st.test.id === testId ? { 
      ...st, 
      consumables: st.consumables.map((c, i) => i === consumableIdx ? { ...c, [field]: value } : c)
    } : st));
  };
  
  const handleConductTest = async () => {
    if (!selectedPatient || selectedTests.length === 0) return toast.error('Select patient and tests');
    const totalCharges = selectedTests.reduce((sum, st) => sum + (Number(st.test.charges) || 0), 0);
    if (!isPaid && totalCharges > 0) return toast.error('Payment required for paid tests');
    
    for (const st of selectedTests) {
      const { error } = await supabase.from('rapid_test_logs').insert({
        patient_id: selectedPatient.id,
        staff_id: staffId,
        hospital_id: hospitalId,
        test_name: st.test.test_name,
        charges: Number(st.test.charges),
        payment_status: totalCharges > 0 ? (isPaid ? 'Paid' : 'Pending') : 'Paid',
        consumables: st.consumables,
      });
      if (error) return toast.error(`Error saving test ${st.test.test_name}`);
    }

    toast.success('Tests recorded successfully');
    setSelectedPatient(null);
    setSelectedTests([]);
    setActiveSubTab('report');
  };

  const submitReport = async (logId: string, result: string) => {
    const { error } = await supabase
      .from('rapid_test_logs')
      .update({ test_result: result })
      .eq('id', logId);
    
    if (error) return toast.error('Submit failed');
    toast.success('Test Reported');
    setPendingReports(pendingReports.filter(r => r.id !== logId));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Rapid Test Desk</h1>
        <div className="flex bg-slate-100 p-1 rounded-full">
          {(['conduct', 'report', 'register'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-6 py-2 rounded-full text-sm font-bold capitalize transition-all ${activeSubTab === tab ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              {tab === 'conduct' ? 'New Test' : tab}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'conduct' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Find Patient (Name/Mob/Serial)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Patient Name/Mob/Serial..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2"
                />
                <button onClick={findPatients} className="bg-slate-900 text-white px-4 py-2 rounded-xl">
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search size={18} />}
                </button>
              </div>
              <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                {foundPatients.map(p => (
                  <button key={p.id} onClick={() => handleSelectPatient(p)} className={`w-full text-left p-3 rounded-xl border ${selectedPatient?.id === p.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50'}`}>
                    <p className="font-bold text-sm">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.hospital_yearly_serial} • {p.mobile}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedPatient && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{selectedPatient.name}</h3>
                    <p className="text-[10px] text-slate-500">Serial: {selectedPatient.hospital_yearly_serial} • Mob: {selectedPatient.mobile}</p>
                  </div>
                  <button onClick={() => { setSelectedPatient(null); setSelectedTests([]); }} className="text-red-500 p-2"><X size={20}/></button>
                </div>
                
                {isTestModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white p-6 rounded-3xl w-full max-w-sm flex flex-col max-h-[80vh]">
                      <h3 className="font-bold text-lg mb-4">Select Tests</h3>
                      <div className="overflow-y-auto flex-1 mb-4 border rounded-xl divide-y">
                        {masterTests.map(t => {
                           const isSelected = selectedTests.find(st => st.test.id === t.id);
                           return (
                             <button 
                                key={t.id} 
                                onClick={() => { toggleTest(t); }}
                                className={`w-full text-left p-4 hover:bg-emerald-50 flex justify-between items-center ${isSelected ? 'bg-emerald-50' : ''}`}
                              >
                                <span>{t.test_name} (₹{t.charges})</span>
                                {isSelected && <CheckCircle className="text-emerald-600" size={18}/>}
                              </button>
                           );
                        })}
                      </div>
                      <button onClick={() => setIsTestModalOpen(false)} className="w-full p-3 bg-emerald-600 text-white rounded-xl font-bold">Done</button>
                    </div>
                  </div>
                )}
                
                <button onClick={() => setIsTestModalOpen(true)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">Add Test</button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {selectedTests.map(st => (
              <div key={st.test.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">{st.test.test_name}</h3>
                  <button onClick={() => toggleTest(st.test)} className="text-red-500 font-bold text-xs p-2">Remove</button>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-slate-500">Consumables</span>
                  <button onClick={() => addConsumableForTest(st.test.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Plus size={16}/></button>
                </div>
                {st.consumables.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <input placeholder="Name" value={item.name} onChange={e => updateConsumable(st.test.id, idx, 'name', e.target.value)} className="flex-1 bg-slate-50 border-none rounded-lg px-3 py-1 text-sm"/>
                    <input type="number" value={item.qnty} onChange={e => updateConsumable(st.test.id, idx, 'qnty', parseInt(e.target.value))} className="w-16 bg-slate-50 border-none rounded-lg px-3 py-1 text-sm text-center"/>
                  </div>
                ))}
              </div>
            ))}

            <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Total Test Fee</span>
                <span className="text-2xl font-bold">₹{selectedTests.reduce((sum, st) => sum + (Number(st.test.charges) || 0), 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Payment Status</span>
                <button 
                  disabled={selectedTests.reduce((sum, st) => sum + (Number(st.test.charges) || 0), 0) === 0}
                  onClick={() => setIsPaid(!isPaid)}
                  className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedTests.reduce((sum, st) => sum + (Number(st.test.charges) || 0), 0) === 0 ? 'bg-slate-500 text-slate-300' : (isPaid ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')}`}
                >
                  {selectedTests.reduce((sum, st) => sum + (Number(st.test.charges) || 0), 0) === 0 ? 'N/A' : (isPaid ? 'Paid' : 'Pending')}
                </button>
              </div>
              <button 
                onClick={handleConductTest}
                className="w-full bg-emerald-500 hover:bg-emerald-600 py-4 rounded-2xl font-bold transition-all"
              >
                Confirm Test Conducted
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'report' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingReports.map(r => (
            <div key={r.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="border-b border-slate-50 pb-2">
                <p className="font-bold text-slate-900">{r.patients?.name}</p>
                <p className="text-xs text-slate-400">{r.patients?.hospital_yearly_serial}</p>
              </div>
              <p className="text-xs font-bold text-emerald-600">{r.test_name}</p>
              <input 
                type="text" 
                placeholder="Enter Test Result..." 
                id={`res-${r.id}`}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
              <button 
                onClick={() => submitReport(r.id, (document.getElementById(`res-${r.id}`) as HTMLInputElement).value)}
                className="w-full bg-slate-900 text-white py-2 rounded-xl font-bold hover:bg-slate-800 transition-all"
              >
                Submit Report
              </button>
            </div>
          ))}
          {pendingReports.length === 0 && <p className="col-span-full text-center py-20 text-slate-400 italic">No pending reports found.</p>}
        </div>
      )}

      {activeSubTab === 'register' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold">Test Register</h3>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-slate-50 border-none rounded-lg px-4 py-2 text-sm" />
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Tests</th>
                <th className="px-6 py-4">Result</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {logs.map(l => (
                <tr key={l.id}>
                  <td className="px-6 py-4 font-bold">{l.patients?.name}</td>
                  <td className="px-6 py-4">{l.test_name}</td>
                  <td className="px-6 py-4 text-emerald-600 font-medium">{l.test_result || 'Pending'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${l.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {l.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
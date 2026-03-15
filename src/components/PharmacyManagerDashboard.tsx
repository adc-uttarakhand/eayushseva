import React, { useState, useEffect, useMemo } from 'react';
import { Package, Truck, History, User, Search, Loader2, Save, Plus, Database, FileText, Download, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import RequestMedicineModal from './RequestMedicineModal';
import StateSupplyMonitor from './StateSupplyMonitor';
import MedicineCombobox from './MedicineCombobox';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Medicine {
  id: string;
  medicine_name: string;
  packing_size: number;
  unit_type: string;
  category: string;
  source_type: string;
}

interface Order {
  id: string;
  medicine_id: string;
  medicine_name: string;
  order_no: string;
  firm_name: string;
  batch_number: string;
  mfg_date: string;
  expiry_date: string;
  district_name: string;
  allocated_qty: number;
  status: string;
  created_at: string;
  dispatch_time?: string;
  receive_time?: string;
}

const DISTRICTS = [
  "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
  "Nainital", "Pauri", "Pithoragarh", "Rudraprayag", "Tehri", "Udham Singh Nagar", "Uttarkashi"
];

interface DispatchRow {
  medicine: Medicine | null;
  batch_number: string;
  mfg_date: string;
  expiry_date: string;
  quantity: number;
}

export default function PharmacyManagerDashboard({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState('medicine_list');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchRows, setDispatchRows] = useState<DispatchRow[]>([{
    medicine: null,
    batch_number: '',
    mfg_date: '',
    expiry_date: '',
    quantity: 0
  }]);
  const [districtSearch, setDistrictSearch] = useState('');
  const [showDistrictResults, setShowDistrictResults] = useState(false);
  const [medicineSearches, setMedicineSearches] = useState<string[]>(['']);
  const [logs, setLogs] = useState<Order[]>([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const getFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    return now.getMonth() >= 3 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
  };
  useEffect(() => {
    const finYear = getFinancialYear();
    let maxSeq = 0;
    
    // Extract unique order numbers to find the highest sequence for the current financial year
    const uniqueOrders = new Set<string>(logs.map(l => l.order_no));
    
    uniqueOrders.forEach(orderNo => {
      if (orderNo && orderNo.endsWith(`/${finYear}`)) {
        const seqStr = orderNo.split('/')[0];
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
    
    setInvoiceNo(`${(maxSeq + 1).toString().padStart(4, '0')}/${finYear}`);
  }, [logs]);
  const [isRequestMedicineOpen, setIsRequestMedicineOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('dispatch_form');
  const [medicineSubTab, setMedicineSubTab] = useState('list');
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: Order[] } = {};
    logs.forEach(log => {
      if (!groups[log.order_no]) {
        groups[log.order_no] = [];
      }
      groups[log.order_no].push(log);
    });
    return Object.entries(groups).map(([order_no, items]) => ({
      order_no,
      district_name: items[0]?.district_name || '-',
      created_at: items[0]?.created_at || '-',
      status: items[0]?.status || '-',
      dispatch_time: items[0]?.dispatch_time || '-',
      receive_time: items[0]?.receive_time || '-',
      items
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logs]);

  useEffect(() => {
    fetchMedicines();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (showProfile) {
      fetchProfile();
    }
  }, [showProfile]);

  const fetchProfile = async () => {
    console.log("Fetching profile for:", session?.user?.email);
    const { data, error } = await supabase
      .from('admin_logins')
      .select('*')
      .eq('email', session?.user?.email)
      .single();
    
    if (error) {
      console.error("Error fetching profile by email:", error);
      // Try fallback to id if email fails
      const { data: idData, error: idError } = await supabase
        .from('admin_logins')
        .select('*')
        .eq('id', session?.user?.id)
        .single();
      
      if (idError) {
        console.error("Error fetching profile by id:", idError);
        // Last resort: fetch first row to see structure
        const { data: firstData, error: firstError } = await supabase
          .from('admin_logins')
          .select('*')
          .limit(1)
          .single();
        if (!firstError && firstData) {
          console.log("First row data structure:", firstData);
          setProfileData(firstData);
        }
      } else {
        setProfileData(idData);
      }
    } else {
      setProfileData(data);
    }
  };

  const fetchMedicines = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('medicine_master')
      .select('*')
      .eq('source_type', 'Rishikul Pharmacy');
    if (!error) setMedicines(data || []);
    setLoading(false);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('state_supply_orders')
      .select('*')
      .eq('uploaded_by', 'Manager Rishikul Pharmacy');
    if (!error) setLogs(data || []);
  };

  const handleDispatch = async () => {
    if (!districtSearch || dispatchRows.some(r => !r.medicine || r.quantity <= 0)) {
      alert('Please fill all required fields');
      return;
    }

    const parseDateForDb = (mmYyyy: string) => {
      if (!mmYyyy) return null;
      const parts = mmYyyy.split('/');
      if (parts.length === 2) {
        let year = parts[1];
        if (year.length === 2) year = `20${year}`;
        // Ensure month is 2 digits
        const month = parts[0].padStart(2, '0');
        return `${year}-${month}-01`;
      }
      return null;
    };

    const orders = dispatchRows.map(row => ({
      medicine_id: row.medicine!.id,
      medicine_name: row.medicine!.medicine_name,
      order_no: invoiceNo,
      firm_name: 'Rishikul Pharmacy',
      batch_number: row.batch_number,
      mfg_date: parseDateForDb(row.mfg_date),
      expiry_date: parseDateForDb(row.expiry_date),
      district_name: districtSearch,
      allocated_qty: row.quantity,
      status: 'Dispatched',
      uploaded_by: 'Manager Rishikul Pharmacy'
    }));

    const { error } = await supabase
      .from('state_supply_orders')
      .insert(orders);

    if (error) {
      console.error('Error dispatching medicine:', error);
      alert('Error dispatching medicine: ' + error.message);
    } else {
      alert('Medicine dispatched successfully. Invoice: ' + invoiceNo);
      fetchLogs();
      setDispatchRows([{ medicine: null, batch_number: '', mfg_date: '', expiry_date: '', quantity: 0 }]);
      setMedicineSearches(['']);
      setDistrictSearch('');
      setShowConfirmation(false);
    }
  };

  const smartSearch = (query: string, items: string[]) => {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, '');
    return items.filter(item => {
      const normalizedItem = item.toLowerCase().replace(/\s+/g, '');
      return normalizedItem.includes(normalizedQuery);
    });
  };

  const formatMonthYear = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 2) {
      v = v.slice(0, 2) + '/' + v.slice(2, 6);
    }
    return v;
  };

  const exportToPdf = (invoice: any) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Invoice: ${invoice.order_no}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`District: ${invoice.district_name}`, 14, 30);
    doc.text(`Dispatch Time: ${new Date(invoice.created_at).toLocaleString()}`, 14, 40);

    const tableData = invoice.items.map((item: any) => [
      item.medicine_name,
      item.batch_number,
      item.mfg_date,
      item.expiry_date,
      item.allocated_qty
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Medicine', 'Batch', 'Mfg Date', 'Expiry Date', 'Quantity']],
      body: tableData,
    });

    doc.save(`Invoice_${invoice.order_no.replace('/', '_')}.pdf`);
  };

  const exportToExcel = (invoice: any) => {
    const worksheet = XLSX.utils.json_to_sheet(invoice.items.map((item: any) => ({
      'Invoice No': item.order_no,
      'Medicine': item.medicine_name,
      'District': item.district_name,
      'Batch': item.batch_number,
      'Mfg Date': item.mfg_date,
      'Expiry Date': item.expiry_date,
      'Quantity': item.allocated_qty,
      'Status': item.status,
      'Dispatch Time': item.dispatch_time || '-',
      'Receive Time': item.receive_time || '-'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice Details');
    XLSX.writeFile(workbook, `Invoice_${invoice.order_no.replace('/', '_')}.xlsx`);
  };

  const tabs = [
    { id: 'medicine_list', label: 'Master Medicine List', icon: Package },
    { id: 'dispatch', label: 'Medicine Dispatch', icon: Truck },
    { id: 'supply_monitor', label: 'Supply Monitor', icon: Database },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="pt-24 px-8 max-w-7xl mx-auto pb-20">
      <h1 className="text-4xl font-bold mb-8">Pharmacy Manager Dashboard</h1>
      
      <div className="flex gap-4 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold ${activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'medicine_list' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex gap-4 mb-6">
            <button onClick={() => setMedicineSubTab('list')} className={`px-6 py-2 rounded-xl font-bold ${medicineSubTab === 'list' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Medicine List</button>
            <button onClick={() => setMedicineSubTab('logs')} className={`px-6 py-2 rounded-xl font-bold ${medicineSubTab === 'logs' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Logs</button>
          </div>

          {medicineSubTab === 'list' ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Rishikul Pharmacy Medicines</h2>
                <button 
                  onClick={() => setIsRequestMedicineOpen(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700"
                >
                  <Plus size={18} /> Request New Medicine
                </button>
              </div>
              {loading ? <Loader2 className="animate-spin" /> : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 text-xs uppercase tracking-widest">
                      <th className="pb-4">Name</th>
                      <th className="pb-4">Packing Size</th>
                      <th className="pb-4">Unit</th>
                      <th className="pb-4">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map(m => (
                      <tr key={m.id} className="border-t border-slate-100">
                        <td className="py-4 font-bold">{m.medicine_name}</td>
                        <td className="py-4">{m.packing_size}</td>
                        <td className="py-4">{m.unit_type}</td>
                        <td className="py-4">{m.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <RequestMedicineModal isOpen={isRequestMedicineOpen} onClose={() => setIsRequestMedicineOpen(false)} onSuccess={() => alert('Medicine request submitted for approval')} />
            </>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Dispatch Logs</h2>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs uppercase tracking-widest">
                    <th className="pb-4">Medicine</th>
                    <th className="pb-4">Order No</th>
                    <th className="pb-4">District</th>
                    <th className="pb-4">Quantity</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="py-4 font-bold">{l.medicine_name}</td>
                      <td className="py-4">{l.order_no}</td>
                      <td className="py-4">{l.district_name}</td>
                      <td className="py-4">{l.allocated_qty}</td>
                      <td className="py-4"><span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-bold">{l.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'dispatch' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex gap-4 mb-6">
            <button onClick={() => setActiveSubTab('dispatch_form')} className={`px-6 py-2 rounded-xl font-bold ${activeSubTab === 'dispatch_form' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Dispatch Form</button>
            <button onClick={() => setActiveSubTab('dispatch_register')} className={`px-6 py-2 rounded-xl font-bold ${activeSubTab === 'dispatch_register' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Dispatch Register</button>
          </div>
          
          {activeSubTab === 'dispatch_form' ? (
            <>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Invoice Number</label>
                  <input className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" value={invoiceNo} readOnly />
                </div>
                <div className="relative">
                  <label className="block text-sm font-bold mb-2">Search District</label>
                  <input 
                    className="w-full p-3 border border-slate-200 rounded-xl" 
                    value={districtSearch} 
                    onChange={e => { setDistrictSearch(e.target.value); setShowDistrictResults(true); }} 
                    placeholder="Search district..."
                  />
                  {showDistrictResults && districtSearch && (
                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl mt-1 max-h-40 overflow-y-auto shadow-lg">
                      {smartSearch(districtSearch, DISTRICTS).map(d => (
                        <div key={d} className="p-3 hover:bg-emerald-50 cursor-pointer" onClick={() => { setDistrictSearch(d); setShowDistrictResults(false); }}>{d}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {dispatchRows.map((row, index) => (
                <div key={index} className="mb-4 p-4 border border-slate-100 rounded-xl">
                  <div className="grid grid-cols-7 gap-4 mb-4 items-end">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold mb-1 text-slate-400 uppercase">Search Medicine</label>
                      <MedicineCombobox 
                        options={medicines}
                        value={row.medicine?.id || null}
                        onChange={(id) => {
                          const newRows = [...dispatchRows];
                          newRows[index].medicine = medicines.find(m => m.id === id) || null;
                          setDispatchRows(newRows);
                        }}
                        onSearchChange={(term) => {
                          const newSearches = [...medicineSearches];
                          newSearches[index] = term;
                          setMedicineSearches(newSearches);
                        }}
                        placeholder="Search medicine..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-400 uppercase">Manufacturer</label>
                      <input type="text" className="w-full p-2 border rounded-xl text-sm bg-slate-50" value="Rishikul Pharmacy" readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-400 uppercase">Batch No</label>
                      <input type="text" className="w-full p-2 border rounded-xl text-sm" value={row.batch_number} onChange={e => {
                        const newRows = [...dispatchRows];
                        newRows[index].batch_number = e.target.value;
                        setDispatchRows(newRows);
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-400 uppercase">Mfg Date</label>
                      <input type="text" placeholder="mm/yyyy" className="w-full p-2 border rounded-xl text-sm" value={row.mfg_date} onChange={e => {
                        const newRows = [...dispatchRows];
                        newRows[index].mfg_date = formatMonthYear(e.target.value);
                        setDispatchRows(newRows);
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-400 uppercase">Expiry Date</label>
                      <input type="text" placeholder="mm/yyyy" className="w-full p-2 border rounded-xl text-sm" value={row.expiry_date} onChange={e => {
                        const newRows = [...dispatchRows];
                        newRows[index].expiry_date = formatMonthYear(e.target.value);
                        setDispatchRows(newRows);
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-400 uppercase">Quantity</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" className="w-full p-2 border rounded-xl text-sm" value={row.quantity || ''} onChange={e => {
                          const newRows = [...dispatchRows];
                          newRows[index].quantity = parseInt(e.target.value);
                          setDispatchRows(newRows);
                        }} />
                        <button onClick={() => {
                          setDispatchRows(dispatchRows.filter((_, i) => i !== index));
                          setMedicineSearches(medicineSearches.filter((_, i) => i !== index));
                        }} className="text-red-500 hover:text-red-700 font-bold text-lg">×</button>
                      </div>
                    </div>
                  </div>
                  
                  {row.medicine && (
                    <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded-xl text-xs">
                      <div><span className="font-bold text-slate-400">Packing:</span> {row.medicine.packing_size}</div>
                      <div><span className="font-bold text-slate-400">Unit:</span> {row.medicine.unit_type}</div>
                      <div><span className="font-bold text-slate-400">Category:</span> {row.medicine.category}</div>
                      <div><span className="font-bold text-slate-400">Source:</span> {row.medicine.source_type}</div>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={() => {
                setDispatchRows([...dispatchRows, { medicine: null, batch_number: '', mfg_date: '', expiry_date: '', quantity: 0 }]);
                setMedicineSearches([...medicineSearches, '']);
              }} className="mb-6 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                <Plus size={20} /> Add Medicine
              </button>

              <button onClick={() => setShowConfirmation(true)} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">
                Dispatch
              </button>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Dispatch Register</h2>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs uppercase tracking-widest">
                    <th className="pb-4">Invoice No</th>
                    <th className="pb-4">District</th>
                    <th className="pb-4">Dispatch Time</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLogs.map(invoice => (
                    <React.Fragment key={invoice.order_no}>
                      <tr 
                        className="border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setExpandedInvoice(expandedInvoice === invoice.order_no ? null : invoice.order_no)}
                      >
                        <td className="py-4 font-bold text-emerald-600">{invoice.order_no}</td>
                        <td className="py-4 font-medium">{invoice.district_name}</td>
                        <td className="py-4 text-slate-500">{new Date(invoice.created_at).toLocaleString()}</td>
                        <td className="py-4">
                          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                      {expandedInvoice === invoice.order_no && (
                        <tr>
                          <td colSpan={4} className="p-0">
                            <div className="bg-slate-50 p-6 border-b border-slate-100">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">Invoice Details: {invoice.order_no}</h3>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => exportToPdf(invoice)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                                  >
                                    <FileText size={16} className="text-red-500" />
                                    Print PDF
                                  </button>
                                  <button 
                                    onClick={() => exportToExcel(invoice)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                                  >
                                    <Download size={16} className="text-emerald-500" />
                                    Download XLS
                                  </button>
                                </div>
                              </div>
                              <table className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
                                <thead className="bg-slate-100">
                                  <tr className="text-left text-slate-500 text-xs uppercase tracking-widest">
                                    <th className="p-4 font-semibold">Medicine</th>
                                    <th className="p-4 font-semibold">Batch</th>
                                    <th className="p-4 font-semibold">Mfg Date</th>
                                    <th className="p-4 font-semibold">Expiry Date</th>
                                    <th className="p-4 font-semibold text-right">Quantity</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoice.items.map((item: any) => (
                                    <tr key={item.id} className="border-t border-slate-50">
                                      <td className="p-4 font-medium">{item.medicine_name}</td>
                                      <td className="p-4 text-slate-600">{item.batch_number}</td>
                                      <td className="p-4 text-slate-600">{item.mfg_date}</td>
                                      <td className="p-4 text-slate-600">{item.expiry_date}</td>
                                      <td className="p-4 text-right font-bold">{item.allocated_qty}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'supply_monitor' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold mb-6">Rishikul Pharmacy Supply Monitor</h2>
          <StateSupplyMonitor filterBy="Manager Rishikul Pharmacy" />
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Profile & Admin Management</h2>
          
          {profileData ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-emerald-600">Personal Information</h3>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Full Name</label>
                  <input className="w-full p-2 border rounded-xl" value={profileData.admin_name || profileData.name || ''} onChange={e => setProfileData({...profileData, admin_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Email Address</label>
                  <input className="w-full p-2 border rounded-xl" value={profileData.email_id || ''} onChange={e => setProfileData({...profileData, email_id: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Mobile Number</label>
                  <input className="w-full p-2 border rounded-xl" value={profileData.mobile_number || ''} onChange={e => setProfileData({...profileData, mobile_number: e.target.value})} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-emerald-600">Security & System</h3>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">User ID</label>
                  <input className="w-full p-2 border rounded-xl bg-slate-50" value={profileData.admin_userid || ''} readOnly />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Change Password</label>
                  <input type="password" className="w-full p-2 border rounded-xl" placeholder="New Password" onChange={e => setProfileData({...profileData, admin_password: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">System / Access</label>
                  <input className="w-full p-2 border rounded-xl" value={profileData.admin_access || ''} onChange={e => setProfileData({...profileData, admin_access: e.target.value})} />
                </div>
              </div>
            </div>
          ) : <Loader2 className="animate-spin mx-auto" />}

          <div className="flex gap-4 mt-8">
            <button onClick={async () => {
              const { error } = await supabase.from('admin_logins').update({
                admin_name: profileData.admin_name,
                email_id: profileData.email_id,
                mobile_number: profileData.mobile_number,
                admin_password: profileData.admin_password,
                admin_access: profileData.admin_access
              }).eq('id', profileData.id);
              if (error) alert('Error updating profile: ' + error.message);
              else { alert('Profile updated'); }
            }} className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2">
              <Save size={18} /> Save Changes
            </button>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl w-96">
            <h2 className="text-xl font-bold mb-4">Confirm Dispatch</h2>
            <p className="mb-6">Are you sure you want to dispatch these medicines?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowConfirmation(false)} className="flex-1 py-2 rounded-xl bg-slate-100">Cancel</button>
              <button onClick={handleDispatch} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white">Confirm</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

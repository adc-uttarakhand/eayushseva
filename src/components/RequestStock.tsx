import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Search, AlertCircle, History, Package } from 'lucide-react';

interface RequestStockProps {
  hospitalId: string;
  district: string;
}

interface DistrictInventory {
  id: string;
  medicine_id: string;
  batch_no: string;
  remaining_qty: number;
  order_number: string;
  manufacturer_name: string;
  mfg_date: string;
  expiry_date: string;
  uncleared_qty?: number;
  quality_report?: string | null;
  medicine_master: {
    medicine_name: string;
  };
}

export default function RequestStock({ hospitalId, district }: RequestStockProps) {
  const [activeSubTab, setActiveSubTab] = useState<'available' | 'history'>('available');
  const [stock, setStock] = useState<DistrictInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [demandQty, setDemandQty] = useState<Record<string, number>>({});
  const [processing, setProcessing] = useState(false);
  const [pendingReceipts, setPendingReceipts] = useState<any[]>([]);
  const [hasPendingReceipts, setHasPendingReceipts] = useState(false);
  const [previousRequests, setPreviousRequests] = useState<any[]>([]);
  const [requestType, setRequestType] = useState<Record<string, 'pull' | 'demand'>>({});

  useEffect(() => {
    fetchData();
  }, [district, hospitalId, activeSubTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'available') {
        // 1. Fetch District Stock with details
        const { data: stockData, error: stockError } = await supabase
          .from('district_inventory')
          .select('*, medicine_master(*)')
          .eq('district', district.toUpperCase())
          .gt('remaining_qty', 0);
        
        if (stockError) throw stockError;
        
        // Fetch sample requests to get quality reports and uncleared sampling
        const [samplesRes, dispatchesRes] = await Promise.all([
          supabase
            .from('sample_requests')
            .select('inventory_id, medicine_name, batch_number, order_no, quality_report, requested_amount, status')
            .ilike('district', district.toUpperCase()),
          supabase
            .from('hospital_dispatches')
            .select('medicine_id, batch_no, order_number, quantity')
            .ilike('district', district.toUpperCase())
            .eq('status', 'Dispatched')
        ]);

        const samples = samplesRes.data;
        const dispatches = dispatchesRes.data;

        const mergedStock = (stockData || []).map(item => {
          const unclearedHospital = dispatches
            ?.filter(d => d.medicine_id === item.medicine_id && d.batch_no === item.batch_no && d.order_number === item.order_number)
            .reduce((sum, d) => sum + d.quantity, 0) || 0;

          const unclearedSampling = samples
            ?.filter(s => (s.inventory_id === item.id || (s.medicine_name === item.medicine_master?.medicine_name && s.batch_number === item.batch_no && s.order_no === item.order_number)) && s.status === 'Sent')
            .reduce((sum, s) => sum + (s.requested_amount || 0), 0) || 0;

          const unclearedQty = unclearedHospital + unclearedSampling;

          const sample = samples?.find(s => 
            (s.inventory_id === item.id || 
            (s.medicine_name === item.medicine_master?.medicine_name && 
             s.batch_number === item.batch_no &&
             s.order_no === item.order_number)) &&
            s.quality_report
          );
          return { ...item, quality_report: sample?.quality_report || item.quality_report, uncleared_qty: unclearedQty };
        });

        setStock((mergedStock as unknown as DistrictInventory[]) || []);

        // 2. Check for pending receipts (status = 'Dispatched')
        const { data: pendingData } = await supabase
          .from('hospital_dispatches')
          .select('*')
          .eq('hospital_id', hospitalId)
          .eq('status', 'Dispatched');
        
        setPendingReceipts(pendingData || []);
        setHasPendingReceipts((pendingData?.length || 0) > 0);
      } else {
        // Fetch previous requests
        const { data: historyData, error: historyError } = await supabase
          .from('hospital_dispatches')
          .select('*, medicine_master(*)')
          .eq('hospital_id', hospitalId)
          .eq('action_type', 'Pull_by_Hospital')
          .order('request_date', { ascending: false });
        
        if (historyError) throw historyError;
        setPreviousRequests(historyData || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    if (hasPendingReceipts) {
      alert('Action Blocked: You must confirm receipt of pending stock from the "Receive Stock" tab before placing new orders.');
      return;
    }

    const requests = Object.entries(demandQty).filter(([_, qty]) => (qty as number) > 0);
    if (requests.length === 0) {
      alert('Please enter quantities');
      return;
    }

    setProcessing(true);
    try {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
      const istDate = new Date(now.getTime() + istOffset);
      const istTimestamp = istDate.toISOString().replace('Z', '+05:30');
      
      // Validation: Ensure request_date is present
      if (!istTimestamp) {
        alert('Error: Request date is missing.');
        setProcessing(false);
        return;
      }

      const inserts = requests.map(([id, qty]) => {
        const item = stock.find(s => s.id === id);
        const type = requestType[id] || 'demand';
        
        return {
          district: district.toUpperCase(),
          hospital_id: hospitalId,
          medicine_id: item.medicine_id,
          batch_no: item.batch_no,
          mfg_date: item.mfg_date,
          expiry_date: item.expiry_date,
          quantity: qty,
          order_number: item.order_number,
          manufacturer_name: item.manufacturer_name,
          quality_report: item.quality_report,
          status: 'Pending Approval',
          action_type: 'Pull_by_Hospital',
          request_type: type === 'pull' ? 'Instant_Pull' : 'Manual_Request',
          request_date: istTimestamp
        };
      });

      const { error } = await supabase.from('hospital_dispatches').insert(inserts);
      if (error) throw error;

      alert('Request submitted successfully.');
      setDemandQty({});
      setRequestType({});
      fetchData();
    } catch (err) {
      console.error('Error requesting stock:', err);
      alert('Failed to request stock');
    } finally {
      setProcessing(false);
    }
  };

  const formatMonthYear = (dateStr: string | undefined): string => {
    if (!dateStr) return 'N/A';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const [year, month] = parts;
        return `${month}/${year}`;
      }
    }
    return dateStr;
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {activeSubTab === 'available' ? 'Available District Stock' : 'Request History'}
          </h3>
          <p className="text-sm text-slate-500">
            {activeSubTab === 'available' 
              ? `View and request stock from ${district} district inventory.`
              : 'Track your previous stock requests and their current status.'}
          </p>
        </div>

        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button
            onClick={() => setActiveSubTab('available')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'available'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Package size={14} />
            Available Stock
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History size={14} />
            Request History
          </button>
        </div>

        {activeSubTab === 'available' && pendingReceipts.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-2xl flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-tight">
              {pendingReceipts.length} Pending Receipts - Receive them first!
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" /></div>
      ) : activeSubTab === 'available' ? (
        <div className="space-y-6">
          {hasPendingReceipts ? (
            <div className="bg-slate-50 rounded-[2rem] p-12 text-center border border-dashed border-slate-200">
              <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
              <h3 className="text-xl font-bold text-slate-900">Action Required: Pending Receipts</h3>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                You have medicines waiting to be received from the district. 
                For data integrity, you must confirm receipt of these items in the 
                <span className="font-bold text-slate-900"> "Receive Stock" </span> 
                tab before you can place any new requests or demands.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Medicine Details</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Batch & Order</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Dates</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Available</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Quantity</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Action Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stock.map((item: DistrictInventory) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{item.medicine_master?.medicine_name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{item.manufacturer_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">Batch: {item.batch_no}</span>
                          <span className="text-[10px] text-emerald-600 font-bold">Order: #{item.order_number}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500">Mfg: {formatMonthYear(item.mfg_date)}</span>
                          <span className="text-[10px] text-red-500 font-bold">Exp: {formatMonthYear(item.expiry_date)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-black text-emerald-600">
                            {item.remaining_qty}
                          </span>
                          {item.uncleared_qty > 0 && (
                            <span className="text-[10px] font-bold text-red-500">
                              (-{item.uncleared_qty})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <input 
                          type="number"
                          min="0"
                          max={item.remaining_qty}
                          value={demandQty[item.id] || ''}
                          onChange={e => setDemandQty(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                          className="w-24 p-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold"
                          placeholder="Qty"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-2">
                          <label className={`flex items-center gap-2 cursor-pointer p-2 rounded-xl border transition-all ${requestType[item.id] === 'pull' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}>
                            <input 
                              type="radio" 
                              name={`type-${item.id}`}
                              checked={requestType[item.id] === 'pull'}
                              onChange={() => setRequestType(prev => ({ ...prev, [item.id]: 'pull' }))}
                              className="text-emerald-600"
                            />
                            <span className="text-[10px] font-bold text-slate-700">Request to add Received medicine</span>
                          </label>
                          <label className={`flex items-center gap-2 cursor-pointer p-2 rounded-xl border transition-all ${requestType[item.id] === 'demand' || !requestType[item.id] ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
                            <input 
                              type="radio" 
                              name={`type-${item.id}`}
                              checked={requestType[item.id] === 'demand' || !requestType[item.id]}
                              onChange={() => setRequestType(prev => ({ ...prev, [item.id]: 'demand' }))}
                              className="text-blue-600"
                            />
                            <span className="text-[10px] font-bold text-slate-700">Request to Provide Medicines from Store</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button 
            onClick={handleRequest}
            disabled={processing || stock.length === 0 || hasPendingReceipts}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center justify-center gap-2 ${
              hasPendingReceipts 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
            }`}
          >
            {processing ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
            {processing ? 'Processing...' : 'Submit Request / Demand'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Request Date</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Medicine Details</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Batch & Order</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Quantity</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Type</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {previousRequests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 text-xs font-medium text-slate-500">
                      {req.request_date ? new Date(req.request_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{req.medicine_master?.medicine_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{req.manufacturer_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">Batch: {req.batch_no}</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Order: #{req.order_number}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-black text-slate-900">{req.quantity}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                        req.request_type === 'Instant_Pull' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {req.request_type === 'Instant_Pull' ? 'Request to add Received medicine' : 
                         req.request_type === 'Manual_Request' ? 'Request to Provide Medicines from Store' : 
                         req.request_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-xs font-bold ${
                        req.status === 'Received' ? 'text-emerald-600' : 
                        req.status === 'Dispatched' ? 'text-blue-600' : 
                        'text-amber-600'
                      }`}>
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {previousRequests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium italic">
                      No previous requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowDownLeft,
  ArrowUpRight,
  Database,
  Building2,
  Check,
  X,
  Plus,
  Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HospitalSupplyPullProps {
  hospitalId: string;
  district: string;
}

export default function HospitalSupplyPull({ hospitalId, district }: HospitalSupplyPullProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [incomingDispatches, setIncomingDispatches] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [hospitalId, district]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch incoming dispatches for this hospital
      const { data: dispatches } = await supabase
        .from('hospital_dispatches')
        .select('*, medicine_master(*)')
        .eq('hospital_id', hospitalId)
        .in('status', ['Dispatched', 'Confirmed_by_District', 'Pending Approval', 'Received']);
      setIncomingDispatches(dispatches || []);
    } catch (err) {
      console.error('Error fetching supply data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToInventory = async (dispatch: any) => {
    setProcessing(dispatch.id);
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const istTimestamp = istDate.toISOString().replace('Z', '+05:30');
    try {
      // Step 1: The Stock Merge - Fetch existing and then upsert
      const { data: existingBatch } = await supabase
        .from('medicine_inventory')
        .select('quantity')
        .eq('hospital_id', hospitalId)
        .eq('medicine_id', dispatch.medicine_id)
        .eq('batch_number', dispatch.batch_no)
        .eq('manufacturer_name', dispatch.manufacturer_name)
        .maybeSingle();

      const newQuantity = (existingBatch?.quantity || 0) + dispatch.quantity;

      const { error: invError } = await supabase
        .from('medicine_inventory')
        .upsert({
          hospital_id: hospitalId,
          medicine_id: dispatch.medicine_id,
          batch_number: dispatch.batch_no,
          manufacturer_name: dispatch.manufacturer_name,
          expiry_date: dispatch.expiry_date,
          mfg_date: dispatch.mfg_date,
          quantity: newQuantity,
          order_number: dispatch.order_number,
          district: dispatch.district,
          receiving_date: istTimestamp
        }, {
          onConflict: 'hospital_id,medicine_id,batch_number,manufacturer_name'
        });

      if (invError) throw invError;
      
      // Step 1.5: Deduct from District Inventory
      // Find the district inventory record
      const { data: distInv, error: distInvFetchErr } = await supabase
        .from('district_inventory')
        .select('id, remaining_qty')
        .ilike('district', dispatch.district || district)
        .eq('medicine_id', dispatch.medicine_id)
        .eq('batch_no', dispatch.batch_no)
        .eq('order_number', dispatch.order_number)
        .maybeSingle();
      
      if (distInv) {
        const { error: distInvUpdateErr } = await supabase
          .from('district_inventory')
          .update({ remaining_qty: distInv.remaining_qty - dispatch.quantity })
          .eq('id', distInv.id);
        
        if (distInvUpdateErr) {
          console.error('Failed to deduct from district inventory:', distInvUpdateErr);
        }
      }

      // Step 2: The Audit Log - Update hospital_dispatches ONLY after inventory success
      const { error: updateError } = await supabase
        .from('hospital_dispatches')
        .update({ 
          status: 'Received',
          receiving_date: istTimestamp
        })
        .eq('id', dispatch.id);

      if (updateError) throw updateError;

      alert('Stock received and inventory updated successfully');

      // 3. Update state_supply_orders to 'Delivered to Hospital'
      const { error: stateOrderError } = await supabase
        .from('state_supply_orders')
        .update({ status: 'Delivered to Hospital' })
        .eq('medicine_id', dispatch.medicine_id)
        .ilike('district_name', dispatch.district || district);
      
      if (stateOrderError) {
        console.error('Failed to update state supply order status', stateOrderError);
      }

      fetchData();
    } catch (err) {
      console.error('Error adding to inventory:', err);
      alert('Failed to add to inventory');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        <motion.section
          key="pending"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Truck size={20} className="text-blue-600" />
                Pending Digital Receipts
              </h3>
              <p className="text-slate-500 text-sm font-medium">Items dispatched by District. Click receive to add to your inventory.</p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine & Order</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Manufacturer</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Dispatch Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Qty</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {incomingDispatches.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{d.medicine_master?.medicine_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Batch: {d.batch_no || 'TBD'}</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Order: #{d.order_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600">{d.manufacturer_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-500">{d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString() : 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900">{d.quantity}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                        d.request_type === 'Instant_Pull' ? 'bg-amber-100 text-amber-700' : 
                        d.request_type === 'Manual_Request' ? 'bg-blue-100 text-blue-700' : 
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {d.request_type === 'Instant_Pull' ? 'Request to add Received medicine' : 
                         d.request_type === 'Manual_Request' ? 'Request to Provide Medicines from Store' : 
                         d.request_type?.replace('_', ' ') || 'Push'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${
                        d.status === 'Dispatched' || d.status === 'Confirmed_by_District' ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(d.status === 'Dispatched' || d.status === 'Confirmed_by_District') && (
                        <button 
                          onClick={() => handleAddToInventory(d)}
                          disabled={processing === d.id}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] flex items-center gap-1 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                        >
                          {processing === d.id ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle2 size={12} />}
                          Confirm Receipt
                        </button>
                      )}
                      {d.status === 'Pending Approval' && (
                        <span className="text-[10px] font-bold text-amber-600 italic">Pending District Approval</span>
                      )}
                      {d.status === 'Received' && (
                        <span className="text-[10px] font-bold text-emerald-600 italic">Received</span>
                      )}
                    </td>
                  </tr>
                ))}
                {incomingDispatches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No pending shipments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

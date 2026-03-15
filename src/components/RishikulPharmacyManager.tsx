import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, ClipboardList, Truck, History } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Approval {
  id: string;
  medicine_name: string;
  packing_size: number;
  unit_type: string;
  category: string;
  source_type: string;
  status: string;
  requested_by: string;
}

interface Supply {
  id: string;
  medicine_name: string;
  order_no: string;
  batch_number: string;
  district: string;
  quantity: number;
  status: string;
}

export default function RishikulPharmacyManager() {
  const [activeSubTab, setActiveSubTab] = useState('approvals');
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeSubTab === 'approvals') {
      const { data } = await supabase.from('medicine_approvals').select('*').eq('status', 'Pending');
      setApprovals(data || []);
    } else if (activeSubTab === 'supply') {
      const { data } = await supabase.from('state_supply_orders').select('*').eq('uploaded_by', 'Manager Rishikul Pharmacy');
      setSupplies(data || []);
    } else if (activeSubTab === 'logs') {
      const { data } = await supabase.from('state_supply_orders').select('*').eq('uploaded_by', 'Manager Rishikul Pharmacy').eq('status', 'Received');
      setSupplies(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string, medicine: Approval) => {
    const { error: insertError } = await supabase.from('medicine_master').insert([{
      medicine_name: medicine.medicine_name,
      packing_size: medicine.packing_size,
      unit_type: medicine.unit_type,
      category: medicine.category,
      source_type: medicine.source_type,
      added_by_role: 'SUPER_ADMIN'
    }]);
    if (insertError) {
      alert('Error approving medicine');
      return;
    }
    await supabase.from('medicine_approvals').update({ status: 'Approved' }).eq('id', id);
    fetchData();
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveSubTab('approvals')} className={`px-4 py-2 rounded-lg font-bold ${activeSubTab === 'approvals' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Approvals</button>
        <button onClick={() => setActiveSubTab('supply')} className={`px-4 py-2 rounded-lg font-bold ${activeSubTab === 'supply' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Supply</button>
        <button onClick={() => setActiveSubTab('logs')} className={`px-4 py-2 rounded-lg font-bold ${activeSubTab === 'logs' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Logs</button>
      </div>

      {loading ? <Loader2 className="animate-spin" /> : (
        <>
          {activeSubTab === 'approvals' && (
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-widest">
                  <th className="pb-4">Medicine</th>
                  <th className="pb-4">Packing</th>
                  <th className="pb-4">Requested By</th>
                  <th className="pb-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map(a => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="py-4 font-bold">{a.medicine_name}</td>
                    <td className="py-4">{a.packing_size} {a.unit_type}</td>
                    <td className="py-4">{a.requested_by}</td>
                    <td className="py-4">
                      <button onClick={() => handleApprove(a.id, a)} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Approve</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(activeSubTab === 'supply' || activeSubTab === 'logs') && (
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
                {supplies.map(s => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-4 font-bold">{s.medicine_name}</td>
                    <td className="py-4">{s.order_no}</td>
                    <td className="py-4">{s.district}</td>
                    <td className="py-4">{s.quantity}</td>
                    <td className="py-4">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

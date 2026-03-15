import React, { useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RequestMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestMedicineModal({ isOpen, onClose, onSuccess }: RequestMedicineModalProps) {
  const [medicineName, setMedicineName] = useState('');
  const [packingSize, setPackingSize] = useState('');
  const [unitType, setUnitType] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('medicine_approvals')
        .insert([
          {
            medicine_name: medicineName,
            packing_size: parseFloat(packingSize),
            unit_type: unitType,
            category: 'Classical',
            source_type: 'Rishikul Pharmacy',
            status: 'Pending',
            requested_by: 'Manager Rishikul Pharmacy'
          }
        ]);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error requesting medicine:', error);
      alert('Failed to request medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Request New Medicine</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Medicine Name</label>
            <input type="text" required value={medicineName} onChange={e => setMedicineName(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Packing Size</label>
            <input type="number" step="0.01" required value={packingSize} onChange={e => setPackingSize(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Unit Type</label>
            <select required value={unitType} onChange={e => setUnitType(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none">
              <option value="">Select Unit Type</option>
              <option value="Gm">Gm</option>
              <option value="Ml">Ml</option>
              <option value="Capsule">Capsule</option>
              <option value="Tablet">Tablet</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Category (Locked)</label>
            <input type="text" value="Classical" readOnly className="w-full bg-slate-100 border border-gray-100 rounded-xl p-3 text-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Source Type (Locked)</label>
            <input type="text" value="Rishikul Pharmacy" readOnly className="w-full bg-slate-100 border border-gray-100 rounded-xl p-3 text-slate-500" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            Request Approval
          </button>
        </form>
      </div>
    </div>
  );
}

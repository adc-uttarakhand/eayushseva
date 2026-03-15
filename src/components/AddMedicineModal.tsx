import React, { useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddMedicineModal({ isOpen, onClose, onSuccess }: AddMedicineModalProps) {
  const [medicineName, setMedicineName] = useState('');
  const [packingSize, setPackingSize] = useState('');
  const [unitType, setUnitType] = useState('');
  const [type, setType] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('medicine_master')
        .insert([
          {
            medicine_name: medicineName,
            packing_size: parseFloat(packingSize),
            unit_type: unitType,
            category: type,
            source_type: sourceType,
            added_by_role: 'SUPER_ADMIN',
          }
        ]);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding medicine:', error);
      alert('Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Medicine</h2>
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
            <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
            <select required value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none">
              <option value="">Select Type</option>
              <option value="Classical">Classical</option>
              <option value="Patent">Patent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Source Type</label>
            <select required value={sourceType} onChange={e => setSourceType(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none">
              <option value="">Select Source Type</option>
              <option value="Tender">Tender</option>
              <option value="Rishikul Pharmacy">Rishikul Pharmacy</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            Add Medicine
          </button>
        </form>
      </div>
    </div>
  );
}

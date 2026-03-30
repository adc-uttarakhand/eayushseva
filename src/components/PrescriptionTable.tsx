import React, { useState, useEffect } from 'react';
import { Search, Plus, X, AlertCircle, CheckCircle2, Loader2, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Medicine {
  id: string;
  medicine_name: string;
  bulk_unit_type: string;
  bulk_quantity: number;
  conversion_value: number;
  retail_unit_type: string;
  current_loose_quantity?: number;
}

interface PrescriptionRow {
  id: string;
  medicine_id: string;
  medicine_name: string;
  dosage: number;
  frequency: string;
  days: number;
  unit: string;
  total_quantity: number;
  status: 'In Stock' | 'Request Pharmacist to Issue Bulk Unit' | 'Out of Stock' | 'Checking...';
}

interface PrescriptionTableProps {
  hospitalId: string;
  onPrescriptionChange: (prescription: PrescriptionRow[]) => void;
  initialPrescription?: string; // For backward compatibility or loading existing
}

const FREQUENCY_OPTIONS = [
  { label: 'OD (Once a day)', value: 1 },
  { label: 'BD (Twice a day)', value: 2 },
  { label: 'TDS (Thrice a day)', value: 3 },
  { label: 'QID (Four times a day)', value: 4 },
  { label: 'HS (At bedtime)', value: 1 },
  { label: 'SOS (As needed)', value: 1 },
];

export default function PrescriptionTable({ hospitalId, onPrescriptionChange, initialPrescription }: PrescriptionTableProps) {
  const [rows, setRows] = useState<PrescriptionRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  useEffect(() => {
    onPrescriptionChange(rows);
  }, [rows]);

  const searchMedicines = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // Fetch from medicine_inventory and join with daily_indent
      const { data, error } = await supabase
        .from('medicine_inventory')
        .select(`
          *,
          daily_indent (
            current_loose_quantity
          )
        `)
        .eq('hospital_id', hospitalId)
        .ilike('medicine_name', `%${query}%`)
        .limit(5);

      if (error) throw error;
      
      const formattedResults = data.map((m: any) => ({
        ...m,
        current_loose_quantity: m.daily_indent?.[0]?.current_loose_quantity || 0
      }));
      
      setSearchResults(formattedResults);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const addRow = (medicine: Medicine) => {
    const newRow: PrescriptionRow = {
      id: Math.random().toString(36).substr(2, 9),
      medicine_id: medicine.id,
      medicine_name: medicine.medicine_name,
      dosage: 1,
      frequency: 'OD (Once a day)',
      days: 5,
      unit: medicine.retail_unit_type,
      total_quantity: 5,
      status: 'Checking...'
    };
    
    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
    checkStock(medicine.id, 5, updatedRows.length - 1);
    setSearchQuery('');
    setSearchResults([]);
    setActiveRowIndex(null);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (index: number, field: keyof PrescriptionRow, value: any) => {
    const updatedRows = [...rows];
    const row = { ...updatedRows[index], [field]: value };
    
    // Recalculate total quantity
    if (field === 'dosage' || field === 'frequency' || field === 'days') {
      const freqValue = FREQUENCY_OPTIONS.find(f => f.label === (field === 'frequency' ? value : row.frequency))?.value || 1;
      const dosage = field === 'dosage' ? value : row.dosage;
      const days = field === 'days' ? value : row.days;
      row.total_quantity = dosage * freqValue * days;
      
      // Re-check stock
      checkStock(row.medicine_id, row.total_quantity, index);
    }
    
    updatedRows[index] = row;
    setRows(updatedRows);
  };

  const checkStock = async (medicineId: string, requiredQty: number, index: number) => {
    try {
      const { data: inventory, error: invError } = await supabase
        .from('medicine_inventory')
        .select('bulk_quantity')
        .eq('id', medicineId)
        .single();

      const { data: indent, error: indentError } = await supabase
        .from('daily_indent')
        .select('current_loose_quantity')
        .eq('medicine_id', medicineId)
        .single();

      let status: PrescriptionRow['status'] = 'In Stock';
      const looseQty = indent?.current_loose_quantity || 0;
      const bulkQty = inventory?.bulk_quantity || 0;

      if (looseQty < requiredQty) {
        if (bulkQty > 0) {
          status = 'Request Pharmacist to Issue Bulk Unit';
        } else {
          status = 'Out of Stock';
        }
      }

      setRows(prev => {
        const newRows = [...prev];
        if (newRows[index]) {
          newRows[index].status = status;
        }
        return newRows;
      });
    } catch (err) {
      console.error('Stock check error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Search Medicine / दवा खोजें</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Type medicine name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchMedicines(e.target.value);
            }}
            className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="animate-spin text-emerald-600" size={18} />
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="absolute z-[100] left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {searchResults.map(medicine => (
              <button
                key={medicine.id}
                onClick={() => addRow(medicine)}
                className="w-full flex items-center justify-between p-4 hover:bg-emerald-50 transition-all text-left border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="font-bold text-slate-900">{medicine.medicine_name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    Bulk: {medicine.bulk_quantity} {medicine.bulk_unit_type}s • Loose: {medicine.current_loose_quantity} {medicine.retail_unit_type}
                  </p>
                </div>
                <Plus size={16} className="text-emerald-600" />
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Medicine</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Dosage</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Frequency</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Days</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{row.medicine_name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{row.unit}</p>
                  </td>
                  <td className="px-4 py-4">
                    <input 
                      type="number"
                      value={row.dosage}
                      onChange={(e) => updateRow(index, 'dosage', parseFloat(e.target.value))}
                      className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <select 
                      value={row.frequency}
                      onChange={(e) => updateRow(index, 'frequency', e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {FREQUENCY_OPTIONS.map(opt => (
                        <option key={opt.label} value={opt.label}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <input 
                      type="number"
                      value={row.days}
                      onChange={(e) => updateRow(index, 'days', parseInt(e.target.value))}
                      className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-black text-emerald-700">{row.total_quantity}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">{row.unit}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                      row.status === 'In Stock' ? 'text-emerald-600' : 
                      row.status === 'Out of Stock' ? 'text-red-500' : 'text-amber-600'
                    }`}>
                      {row.status === 'In Stock' ? <CheckCircle2 size={14} /> : 
                       row.status === 'Out of Stock' ? <AlertCircle size={14} /> : <Package size={14} />}
                      {row.status}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button 
                      onClick={() => removeRow(row.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <X size={18} />
                    </button>
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

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
  hospital_indent?: { remaining_loose_quantity: number; unit_type: string }[];
  medicine_inventory?: { quantity: number }[];
}

interface PrescriptionRow {
  id: string;
  medicine_id: string;
  medicine_name: string;
  unit: string;
  loose_quantity: number;
  available_quantity: number;
  status: 'In Stock' | 'In Inventory/Indent Required' | 'Out of Stock' | 'Checking...';
  warning?: string;
  dispensed?: boolean;
}

interface PrescriptionTableProps {
  hospitalId: string;
  patientId?: string;
  patientName?: string;
  onPrescriptionChange: (prescription: PrescriptionRow[]) => void;
  initialPrescription?: string; // For backward compatibility or loading existing
  onNavigateToIndent?: () => void;
}

const FREQUENCY_OPTIONS = [
  { label: 'OD (Once a day)', value: 1 },
  { label: 'BD (Twice a day)', value: 2 },
  { label: 'TDS (Thrice a day)', value: 3 },
  { label: 'QID (Four times a day)', value: 4 },
  { label: 'HS (At bedtime)', value: 1 },
  { label: 'SOS (As needed)', value: 1 },
];

export default function PrescriptionTable({ hospitalId, patientId, patientName, onPrescriptionChange, initialPrescription, onNavigateToIndent }: PrescriptionTableProps) {
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
      const { data, error } = await supabase
        .from('medicine_master')
        .select(`
          *,
          hospital_indent!inner(remaining_loose_quantity, unit_type),
          medicine_inventory(quantity)
        `)
        .eq('hospital_indent.hospital_id', hospitalId)
        .ilike('medicine_name', `%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter: Only show medicines with quantity > 0 in hospital_indent
      const filteredResults = (data || []).filter(m => 
        (m.hospital_indent?.[0]?.remaining_loose_quantity || 0) > 0 ||
        (m.medicine_inventory?.[0]?.quantity || 0) > 0
      );
      
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const addRow = async (medicine: Medicine) => {
    let warning: string | undefined;
    if (patientId) {
      const { data, error } = await supabase
        .from('daily_consumption')
        .select('created_at')
        .eq('patient_id', patientId)
        .eq('medicine_id', medicine.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const lastDate = new Date(data.created_at);
        const diff = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 15) {
          warning = `Warning: Received ${diff} days ago`;
        }
      }
    }

    const newRow: PrescriptionRow = {
      id: Math.random().toString(36).substr(2, 9),
      medicine_id: medicine.id,
      medicine_name: medicine.medicine_name,
      unit: medicine.hospital_indent?.[0]?.unit_type || medicine.retail_unit_type,
      loose_quantity: 0,
      available_quantity: medicine.hospital_indent?.[0]?.remaining_loose_quantity || 0,
      status: 'Checking...',
      warning
    };
    
    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
    setSearchQuery('');
    setSearchResults([]);
    setActiveRowIndex(null);
  };

  const dispenseMedicine = async (row: PrescriptionRow, index: number) => {
    try {
      // 1. Fetch batches from hospital_indent for this medicine
      const { data: batches, error: indentError } = await supabase
        .from('hospital_indent')
        .select('*')
        .eq('medicine_id', row.medicine_id)
        .eq('hospital_id', hospitalId)
        .gt('remaining_loose_quantity', 0)
        .order('expiry_date', { ascending: true });

      if (indentError) throw indentError;
      if (!batches || batches.length === 0) {
        alert('Insufficient stock in Dispensary.');
        return;
      }

      const totalAvailable = batches.reduce((sum, b) => sum + Number(b.remaining_loose_quantity), 0);
      if (totalAvailable < row.loose_quantity) {
        alert(`Insufficient stock. Available: ${totalAvailable}`);
        return;
      }

      let remainingToDispense = row.loose_quantity;
      
      for (const batch of batches) {
        if (remainingToDispense <= 0) break;
        
        const batchQty = Number(batch.remaining_loose_quantity);
        const dispenseFromBatch = Math.min(remainingToDispense, batchQty);
        
        // 2. Record Daily Consumption
        const { error: consError } = await supabase
          .from('daily_consumption')
          .insert([{
            hospital_id: hospitalId,
            patient_id: patientId,
            patient_name: patientName,
            medicine_id: batch.medicine_id,
            medicine_name: batch.medicine_name,
            batch_number: batch.batch_number,
            unit_type: batch.unit_type,
            quantity_dispensed: dispenseFromBatch,
            dispensed_at: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
          }]);

        if (consError) throw consError;

        // 3. Update Indent Stock
        const { error: updateIndentError } = await supabase
          .from('hospital_indent')
          .update({ remaining_loose_quantity: batchQty - dispenseFromBatch })
          .eq('id', batch.id);

        if (updateIndentError) throw updateIndentError;
        
        remainingToDispense -= dispenseFromBatch;
      }

      setRows(prev => {
        const newRows = [...prev];
        newRows[index].dispensed = true;
        return newRows;
      });
    } catch (err) {
      console.error('Dispense error:', err);
      alert('Error processing dispensing.');
    }
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const checkStock = async (medicineId: string, requiredQty: number, index: number) => {
    try {
      const { data: indent, error: indentError } = await supabase
        .from('hospital_indent')
        .select('remaining_loose_quantity, unit_type')
        .eq('medicine_id', medicineId)
        .eq('hospital_id', hospitalId)
        .single();

      const { data: inventory, error: invError } = await supabase
        .from('medicine_inventory')
        .select('quantity')
        .eq('medicine_id', medicineId)
        .single();

      const looseQty = indent?.remaining_loose_quantity || 0;
      const unitType = indent?.unit_type || '';
      const invQty = inventory?.quantity || 0;

      let status: PrescriptionRow['status'] = 'Out of Stock';
      let warning: string | undefined;

      if (looseQty >= requiredQty && requiredQty > 0) {
        status = 'In Stock';
      } else if (invQty > 0) {
        status = 'In Inventory/Indent Required';
      } else {
        status = 'Out of Stock';
      }

      if (requiredQty > looseQty) {
        warning = `Insufficient Stock. Available: ${looseQty}`;
      }

      setRows(prev => {
        const newRows = [...prev];
        if (newRows[index]) {
          newRows[index].status = status;
          newRows[index].available_quantity = looseQty;
          newRows[index].unit = unitType || newRows[index].unit;
          newRows[index].warning = warning;
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
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Loose Qty</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{row.medicine_name}</p>
                    <p className="text-[10px] font-bold text-slate-500">Available: {row.available_quantity} {row.unit}</p>
                  </td>
                  <td className="px-4 py-4">
                    <input 
                      type="number"
                      value={row.loose_quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const updatedRows = [...rows];
                        updatedRows[index].loose_quantity = val;
                        setRows(updatedRows);
                        if (val > 0) {
                          checkStock(row.medicine_id, val, index);
                        } else {
                          updatedRows[index].status = 'Checking...';
                          updatedRows[index].warning = undefined;
                          setRows(updatedRows);
                        }
                      }}
                      className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-slate-600">{row.unit}</span>
                  </td>
                  <td className="px-4 py-4">
                    {row.status !== 'Checking...' && (
                      <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                        row.status === 'In Stock' ? 'text-emerald-600' : 
                        row.status === 'Out of Stock' ? 'text-red-500' : 'text-amber-600'
                      }`}>
                        {row.status === 'In Stock' ? <CheckCircle2 size={14} /> : 
                         row.status === 'Out of Stock' ? <AlertCircle size={14} /> : <Package size={14} />}
                        {row.status}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {row.loose_quantity > row.available_quantity ? (
                      <button 
                        onClick={() => onNavigateToIndent?.()}
                        className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-700"
                      >
                        Indent
                      </button>
                    ) : row.dispensed ? (
                      <button 
                        disabled
                        className="bg-gray-300 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold cursor-not-allowed"
                      >
                        Dispensed
                      </button>
                    ) : (
                      <button 
                        onClick={() => dispenseMedicine(row, index)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700"
                      >
                        Dispense
                      </button>
                    )}
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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { 
  Loader2, Package, History, Minus, Plus, Check, AlertCircle, 
  ArrowRight, Database, Info
} from 'lucide-react';

interface HospitalIndentProps {
  hospitalId: string;
}

export default function HospitalIndent({ hospitalId }: HospitalIndentProps) {
  const [indentItems, setIndentItems] = useState<any[]>([]);
  const [mainInventoryCount, setMainInventoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
    
    // Subscribe to changes in daily_consumption to auto-update
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'daily_consumption' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospitalId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Indent Items and group by medicine_id
      const { data: indentData, error: indentError } = await supabase
        .from('hospital_indent')
        .select('*')
        .eq('hospital_id', hospitalId)
        .gt('remaining_loose_quantity', 0);

      if (indentError) throw indentError;

      // Grouping logic: medicine_id + unit_type
      const groupedItems: Record<string, any> = {};
      indentData?.forEach(item => {
        const key = `${item.medicine_id}-${item.unit_type}`;
        if (!groupedItems[key]) {
          groupedItems[key] = { ...item };
        } else {
          groupedItems[key].remaining_loose_quantity += item.remaining_loose_quantity;
          groupedItems[key].total_loose_quantity = (groupedItems[key].total_loose_quantity || 0) + (item.total_loose_quantity || 0);
          // Use largest packing size
          if (item.packing_size > groupedItems[key].packing_size) {
            groupedItems[key].packing_size = item.packing_size;
          }
        }
      });
      setIndentItems(Object.values(groupedItems));

      // Check Main Inventory for notification
      const { count, error: mainError } = await supabase
        .from('medicine_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .gt('quantity', 0);

      if (mainError) throw mainError;
      setMainInventoryCount(count || 0);
    } catch (err) {
      console.error('Error fetching indent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatStock = (looseQty: number, packingSize: number, unit: string) => {
    if (!packingSize || packingSize <= 0) return `${looseQty} ${unit}s`;
    
    const boxes = Math.floor(looseQty / packingSize);
    const loose = looseQty % packingSize;
    
    return `${boxes} Box of ${packingSize}${unit} + ${loose}${unit} Loose`;
  };

  const normalizeForSearch = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/ph/g, 'f')
      .replace(/ee/g, 'i')
      .replace(/oo/g, 'u')
      .replace(/sh/g, 's')
      .replace(/c/g, 's')
      .replace(/q/g, 'k')
      .replace(/y/g, 'i')
      .replace(/z/g, 's');
  };

  const handleReturnQuantityChange = (id: string, value: string) => {
    const qty = parseInt(value);
    setReturnQuantities(prev => ({
      ...prev,
      [id]: isNaN(qty) ? 0 : qty
    }));
  };

  const handleReturnToMain = async (item: any) => {
    const qtyToReturn = returnQuantities[item.id] || 0;
    if (qtyToReturn <= 0) {
      alert('Please enter a valid whole number quantity to return');
      return;
    }

    const packingSize = item.packing_size || 1;
    const totalLooseToReturn = qtyToReturn * packingSize;

    if (totalLooseToReturn > item.remaining_loose_quantity) {
      alert('Cannot return more than the available stock in indent');
      return;
    }

    setProcessing(item.id);
    try {
      // 1. Deduct from Indent
      const newRemainingQty = item.remaining_loose_quantity - totalLooseToReturn;
      const newTotalQty = Math.max(0, (item.total_loose_quantity || 0) - totalLooseToReturn);
      
      const { error: indentError } = await supabase
        .from('hospital_indent')
        .update({ 
          remaining_loose_quantity: newRemainingQty,
          total_loose_quantity: newTotalQty
        })
        .eq('id', item.id);

      if (indentError) throw indentError;

      // 2. Add back to Main Inventory
      // We need to find the corresponding main inventory record
      const { data: mainInvData, error: mainInvFetchError } = await supabase
        .from('medicine_inventory')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('medicine_id', item.medicine_id)
        .maybeSingle();

      if (mainInvFetchError) throw mainInvFetchError;

      if (mainInvData) {
        // Update existing
        const { error: updateError } = await supabase
          .from('medicine_inventory')
          .update({ quantity: mainInvData.quantity + qtyToReturn })
          .eq('id', mainInvData.id);
        if (updateError) throw updateError;
      } else {
        // Insert new (unlikely but possible if it was completely deleted)
        const { error: insertError } = await supabase
          .from('medicine_inventory')
          .insert([{
            hospital_id: hospitalId,
            medicine_id: item.medicine_id,
            quantity: qtyToReturn,
            batch_number: 'RETURNED', // Default batch for returned items if original is lost
            expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // Default expiry
            status: 'Available'
          }]);
        if (insertError) throw insertError;
      }

      // 3. Log to indent_logs
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      // Fetch hospital name
      const { data: hospitalData } = await supabase
        .from('hospitals')
        .select('name')
        .eq('id', hospitalId)
        .single();

      const { error: logError } = await supabase
        .from('indent_logs')
        .insert([{
          medicine_inventory_id: mainInvData?.id || null,
          hospital_id: hospitalId,
          hospital_name: hospitalData?.name,
          medicine_name: item.medicine_name,
          batch_number: mainInvData?.batch_number || 'RETURNED',
          mfg_date: mainInvData?.mfg_date || null,
          expiry_date: mainInvData?.expiry_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          manufacturer_name: mainInvData?.manufacturer_name || null,
          order_number: mainInvData?.order_number || null,
          packing_size: packingSize.toString(),
          units_indented: qtyToReturn,
          indent_type: 'RETURN',
          performed_by: userId
        }]);

      if (logError) console.error('Error logging return to indent_logs:', logError);

      alert(`Successfully returned ${qtyToReturn} units (${totalLooseToReturn} ${item.unit_type}s) to Main Inventory`);
      setReturnQuantities(prev => ({ ...prev, [item.id]: 0 }));
      fetchData();
    } catch (err: any) {
      console.error('Error returning to main inventory:', err);
      alert('Failed to return to main inventory: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const filteredItems = indentItems.filter(item => {
    const normalizedQuery = normalizeForSearch(searchTerm);
    const normalizedMedName = normalizeForSearch(item.medicine_name);
    return normalizedMedName.includes(normalizedQuery);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Hospital Indent Monitor</h3>
        <input 
          type="text"
          placeholder="Search medicine..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-xl text-sm w-64"
        />
      </div>

      {/* Notification for Main Inventory Stock */}
      {indentItems.length === 0 && mainInventoryCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-amber-900 font-bold text-sm">Stock available in Main Inventory</p>
            <p className="text-amber-700 text-xs mt-1">Move items from the "Main Inventory" tab to Indent first to start dispensing.</p>
          </div>
        </motion.div>
      )}

      {indentItems.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="text-slate-300" size={32} />
          </div>
          <h4 className="text-lg font-bold text-slate-900">No items in Indent</h4>
          <p className="text-slate-500 text-sm mt-1">Your indent is currently empty. Transfer stock from Main Inventory to begin.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine Name</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Unit Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Stock (Loose)</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Indent Time</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Return to Main</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map(item => {
                const isLowStock = item.remaining_loose_quantity < (item.packing_size / 2);
                const maxReturnBoxes = Math.floor(item.remaining_loose_quantity / (item.packing_size || 1));
                
                return (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">{item.medicine_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase">
                      {item.unit_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`font-black ${isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                        {item.remaining_loose_quantity} {item.unit_type}s
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold mt-1">
                        {formatStock(item.remaining_loose_quantity, item.packing_size, item.unit_type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">
                      {item.last_updated ? new Date(item.last_updated).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input 
                        type="number" 
                        min="0"
                        max={maxReturnBoxes}
                        value={returnQuantities[item.id] === undefined ? '' : returnQuantities[item.id]}
                        onChange={(e) => handleReturnQuantityChange(item.id, e.target.value)}
                        placeholder="Qty"
                        className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        onClick={() => handleReturnToMain(item)}
                        disabled={processing === item.id || !returnQuantities[item.id] || returnQuantities[item.id] <= 0 || returnQuantities[item.id] > maxReturnBoxes}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {processing === item.id ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                        Return
                      </button>
                    </div>
                    {maxReturnBoxes > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1 mr-2">Max: {maxReturnBoxes} (Whole units)</p>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

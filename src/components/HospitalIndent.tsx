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
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine Name</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Unit Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Stock (Loose)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map(item => {
                const isLowStock = item.remaining_loose_quantity < (item.packing_size / 2);
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
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

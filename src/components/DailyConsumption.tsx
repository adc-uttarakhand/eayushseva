import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Loader2, History, Package, TrendingUp, Calendar } from 'lucide-react';

interface DailyConsumptionProps {
  hospitalId: string;
}

export default function DailyConsumption({ hospitalId }: DailyConsumptionProps) {
  const [indentItems, setIndentItems] = useState<any[]>([]);
  const [consumptionHistory, setConsumptionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [hospitalId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current indent stock for the "Daily Consumption View"
      const { data: indentData, error: indentError } = await supabase
        .from('hospital_indent')
        .select('*')
        .eq('hospital_id', hospitalId)
        .gt('remaining_loose_quantity', 0);

      if (indentError) throw indentError;
      setIndentItems(indentData || []);

      // 2. Fetch recent consumption history
      const { data: historyData, error: historyError } = await supabase
        .from('daily_consumption')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('dispensed_at', { ascending: false })
        .limit(20);

      if (historyError) throw historyError;
      setConsumptionHistory(historyData || []);
    } catch (err) {
      console.error('Error fetching consumption data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCalculation = (looseQty: number, packingSize: number, unit: string) => {
    if (!packingSize || packingSize <= 0) return `${looseQty} ${unit}s`;
    
    const boxes = Math.floor(looseQty / packingSize);
    const loose = looseQty % packingSize;
    
    if (boxes === 0) return `${looseQty} ${unit}s`;
    if (loose === 0) return `Calculation: ${boxes} box${boxes > 1 ? 'es' : ''} of ${packingSize}`;
    
    return `Calculation: ${boxes} box${boxes > 1 ? 'es' : ''} of ${packingSize} + ${loose} loose`;
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Daily Consumption View</h3>
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">
          <TrendingUp size={14} />
          Live Stock Summary
        </div>
      </div>

      {/* Current Stock Summary (as requested) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indentItems.map(item => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                <Package className="text-slate-400" size={20} />
              </div>
              <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase">
                {item.unit_type}
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-900">{item.medicine_name}</h4>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {item.remaining_loose_quantity} <span className="text-sm font-bold text-slate-400">{item.unit_type}s</span>
            </p>
            <p className="text-xs text-slate-500 font-medium mt-3 italic">
              {formatCalculation(item.remaining_loose_quantity, item.packing_size, item.unit_type)}
            </p>
          </motion.div>
        ))}
        {indentItems.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
            <p className="text-slate-400 font-medium italic">No active stock in indent to display.</p>
          </div>
        )}
      </div>

      {/* Consumption History */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <History size={16} /> Recent Dispensing History
        </h3>
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Time</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {consumptionHistory.map((h, idx) => (
                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <Calendar size={12} />
                      {new Date(h.dispensed_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">{h.medicine_name}</td>
                  <td className="px-6 py-4 font-black text-emerald-600">
                    -{h.quantity_dispensed} <span className="text-[10px] font-bold text-slate-400 uppercase">{h.unit_type}</span>
                  </td>
                </tr>
              ))}
              {consumptionHistory.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No consumption records found.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}

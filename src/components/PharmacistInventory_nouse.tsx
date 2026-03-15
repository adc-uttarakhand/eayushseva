import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Package, Plus, Loader2, AlertCircle, CheckCircle2, RefreshCw, Layers, ShoppingBag } from 'lucide-react';
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

interface PharmacistInventoryProps {
  hospitalId: string;
}

export default function PharmacistInventory({ hospitalId }: PharmacistInventoryProps) {
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, [hospitalId]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medicine_inventory')
        .select(`
          *,
          daily_indent (
            current_loose_quantity
          )
        `)
        .eq('hospital_id', hospitalId)
        .order('medicine_name');

      if (error) throw error;
      
      const formatted = data.map((m: any) => ({
        ...m,
        current_loose_quantity: m.daily_indent?.[0]?.current_loose_quantity || 0
      }));
      
      setInventory(formatted);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBulkUnit = async (medicine: Medicine) => {
    if (medicine.bulk_quantity <= 0) {
      alert('No bulk units available to open!');
      return;
    }

    setProcessingId(medicine.id);
    try {
      const { error } = await supabase.rpc('open_bulk_unit', {
        p_hospital_id: hospitalId,
        p_medicine_id: medicine.id
      });

      if (error) throw error;
      
      alert(`Opened 1 ${medicine.bulk_unit_type} of ${medicine.medicine_name}. Added ${medicine.conversion_value} ${medicine.retail_unit_type} to retail stock.`);
      fetchInventory();
    } catch (err: any) {
      console.error('Conversion error:', err);
      alert('Error converting bulk to retail: ' + err.message);
    } finally {
      setProcessingId(null);
    }
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

  const filteredInventory = inventory.filter(m => {
    const normalizedQuery = normalizeForSearch(searchQuery);
    const normalizedMedName = normalizeForSearch(m.medicine_name);
    return normalizedMedName.includes(normalizedQuery);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Medicine <span className="text-emerald-600">Inventory</span></h1>
          <p className="text-slate-500 mt-2 font-medium">Manage bulk and retail stock levels.</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search medicines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching Inventory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredInventory.map(medicine => (
            <motion.div 
              key={medicine.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Package size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xl leading-tight">{medicine.medicine_name}</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">AYUSH Medicine</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-50">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                    <Layers size={12} /> Bulk Stock
                  </p>
                  <p className="text-2xl font-black text-slate-900">{medicine.bulk_quantity}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{medicine.bulk_unit_type}s</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60 mb-1 flex items-center gap-1">
                    <ShoppingBag size={12} /> Retail Stock
                  </p>
                  <p className="text-2xl font-black text-emerald-700">{medicine.current_loose_quantity}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">{medicine.retail_unit_type}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">
                  <span>Conversion Rule</span>
                  <span className="text-slate-900">1 {medicine.bulk_unit_type} = {medicine.conversion_value} {medicine.retail_unit_type}</span>
                </div>
                
                <button 
                  onClick={() => handleOpenBulkUnit(medicine)}
                  disabled={processingId === medicine.id || medicine.bulk_quantity <= 0}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200"
                >
                  {processingId === medicine.id ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                  Open Bulk Unit
                </button>
              </div>

              {medicine.bulk_quantity === 0 && medicine.current_loose_quantity === 0 && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="bg-red-500 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest text-xs shadow-xl">
                    Out of Stock
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredInventory.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
            <Package size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No medicines found</h3>
          <p className="text-slate-500 mt-2">Try adjusting your search query.</p>
        </div>
      )}
    </div>
  );
}

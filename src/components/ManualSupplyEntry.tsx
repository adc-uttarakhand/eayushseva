import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast, Toaster } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Database, 
  Building2, 
  Hash, 
  Tag, 
  Truck, 
  CheckCircle2, 
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import MedicineCombobox from './MedicineCombobox';

const DISTRICTS = [
  'ALMORA', 'BAGESHWAR', 'CHAMOLI', 'CHAMPAWAT', 'DEHRADUN', 
  'HARIDWAR', 'NAINITAL', 'PAURI', 'PITHORAGARH', 'RUDRAPRAYAG', 
  'TEHRI', 'UDHAM SINGH NAGAR', 'UTTARKASHI'
];

export default function ManualSupplyEntry() {
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    order_no: '',
    firm_name: '',
    source_type: 'Tender',
    category: 'Patent',
    medicine_id: '',
    packing_size: '',
    unit_type: 'Tablet'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [districtQuantities, setDistrictQuantities] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState(false);
  const [isAddingToMaster, setIsAddingToMaster] = useState(false);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    const { data } = await supabase
      .from('medicine_master')
      .select('*');
    setMasterData(data || []);
  };

  const selectedMedicine = masterData.find(m => m.id === formData.medicine_id);

  // Auto-lock and sync fields when a medicine is selected from master
  useEffect(() => {
    if (selectedMedicine) {
      setFormData(prev => ({
        ...prev,
        source_type: selectedMedicine.source_type || 'Tender',
        category: selectedMedicine.category || 'Patent',
        packing_size: selectedMedicine.packing_size?.toString() || '',
        unit_type: selectedMedicine.unit_type || 'Tablet'
      }));
    }
  }, [selectedMedicine]);

  const handleDistrictQtyChange = (district: string, qty: string) => {
    setDistrictQuantities(prev => ({
      ...prev,
      [district]: qty
    }));
  };

  const handleAddToMaster = async () => {
    if (!searchTerm) {
      alert('Please enter a medicine name');
      return;
    }
    setIsAddingToMaster(true);
    try {
      const { data, error } = await supabase
        .from('medicine_master')
        .insert([{
          medicine_name: searchTerm,
          source_type: formData.source_type,
          category: formData.category,
          packing_size: Number(formData.packing_size),
          unit_type: formData.unit_type
        }])
        .select()
        .single();

      if (error) throw error;
      
      setMasterData(prev => [...prev, data]);
      setFormData(prev => ({ ...prev, medicine_id: data.id }));
      alert('Medicine added to master successfully!');
    } catch (err: any) {
      console.error('Error adding to master:', err);
      alert('Failed to add to master: ' + err.message);
    } finally {
      setIsAddingToMaster(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let medicineId = formData.medicine_id;
    let medicineName = selectedMedicine?.medicine_name || searchTerm;

    if (!medicineName || !formData.order_no || !formData.firm_name) {
      alert('Please fill all required fields');
      return;
    }

    const validDistricts = Object.entries(districtQuantities).filter(([_, qty]) => Number(qty) > 0);
    if (validDistricts.length === 0) {
      alert('Please enter quantity for at least one district');
      return;
    }

    setLoading(true);
    try {
      const bulkData = validDistricts.map(([district, qty]) => ({
        order_no: formData.order_no,
        firm_name: formData.firm_name,
        medicine_id: medicineId || null,
        medicine_name: medicineName,
        district_name: district,
        allocated_qty: Number(qty),
        status: 'Dispatched',
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('state_supply_orders')
        .insert(bulkData);

      if (error) throw error;

      setSuccess(true);
      toast.success('Order Created Successfully');
      setFormData({
        order_no: '',
        firm_name: '',
        source_type: 'Tender',
        category: 'Patent',
        medicine_id: '',
        packing_size: '',
        unit_type: 'Tablet'
      });
      setSearchTerm('');
      setDistrictQuantities({});
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error submitting manual entry:', err);
      toast.error('Failed to submit: ' + err.message);
      alert('Failed to submit: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLocked = !!formData.medicine_id;

  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
      <Toaster position="top-right" />
      <div className="p-8 border-b border-slate-50">
        <h2 className="text-2xl font-bold text-slate-900">Manual Supply Entry</h2>
        <p className="text-slate-500 text-sm font-medium">Create new supply orders manually without Excel.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 font-bold"
          >
            <CheckCircle2 size={20} />
            Supply orders created successfully!
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Database size={14} /> Medicine Information
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Search Medicine</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <MedicineCombobox 
                    options={masterData}
                    value={formData.medicine_id}
                    onChange={(val) => setFormData({ ...formData, medicine_id: val })}
                    onSearchChange={setSearchTerm}
                  />
                </div>
                {!formData.medicine_id && searchTerm && (
                  <button
                    type="button"
                    onClick={handleAddToMaster}
                    disabled={isAddingToMaster}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isAddingToMaster ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                    Add to Master
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Source Type</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['Tender', 'Rishikul Pharmacy'].map(type => (
                    <button
                      key={type}
                      type="button"
                      disabled={isLocked}
                      onClick={() => setFormData({ ...formData, source_type: type })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        formData.source_type === type 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      } ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Category</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['Patent', 'Classical'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      disabled={isLocked}
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        formData.category === cat 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      } ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Packing Size</label>
                <input 
                  type="number"
                  disabled={isLocked}
                  placeholder="e.g. 10"
                  className={`w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${isLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                  value={formData.packing_size}
                  onChange={e => setFormData({ ...formData, packing_size: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Unit</label>
                <select
                  disabled={isLocked}
                  className={`w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${isLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                  value={formData.unit_type}
                  onChange={e => setFormData({ ...formData, unit_type: e.target.value })}
                >
                  {['ml', 'gm', 'Capsule', 'Tablet'].map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Building2 size={14} /> Order Details
            </h3>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Order Number</label>
              <input 
                type="text"
                placeholder="e.g. ORD-2024-001"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={formData.order_no}
                onChange={e => setFormData({ ...formData, order_no: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Firm Name</label>
              <input 
                type="text"
                placeholder="e.g. ABC Pharma"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={formData.firm_name}
                onChange={e => setFormData({ ...formData, firm_name: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Truck size={14} /> District Allocations
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {DISTRICTS.map(district => (
              <div key={district} className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 truncate">{district}</label>
                <input 
                  type="number"
                  placeholder="Qty"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={districtQuantities[district] || ''}
                  onChange={e => handleDistrictQtyChange(district, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-50 flex justify-end">
          <button 
            type="submit"
            disabled={loading}
            className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            Create Supply Orders
          </button>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { 
  Loader2, Plus, ArrowRight, Package, History, X, 
  AlertCircle, Check, Database, Building2, Hash, Tag, Calendar
} from 'lucide-react';
import MedicineCombobox from './MedicineCombobox';

interface MainInventoryProps {
  hospitalId: string;
  district: string;
}

export default function MainInventory({ hospitalId, district }: MainInventoryProps) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [indentQuantities, setIndentQuantities] = useState<Record<string, number>>({});
  const [historyMedicine, setHistoryMedicine] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Manual Stock Entry States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [masterData, setMasterData] = useState<any[]>([]);
  const [isAddingToMaster, setIsAddingToMaster] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    medicine_id: '',
    batch_number: '',
    mfg_date: '',
    expiry_date: '',
    manufacturer_name: '',
    quantity: '',
    order_number: '',
    category: 'Patent',
    source_type: 'Tender',
    packing_size: '',
    unit_type: 'Tablet'
  });

  const [newMedicine, setNewMedicine] = useState({
    medicine_name: '',
    category: 'Patent',
    source_type: 'Tender',
    packing_size: '',
    unit_type: 'Tablet'
  });

  const [hospitalName, setHospitalName] = useState<string>('');

  useEffect(() => {
    fetchInventory();
    fetchMasterData();
    fetchHospitalName();
  }, [hospitalId]);

  const fetchHospitalName = async () => {
    try {
      const { data } = await supabase
        .from('hospitals')
        .select('name')
        .eq('id', hospitalId)
        .single();
      if (data) {
        setHospitalName(data.name);
      }
    } catch (err) {
      console.error('Error fetching hospital name:', err);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medicine_inventory')
        .select('*, medicine_master(*)')
        .eq('hospital_id', hospitalId);
      
      if (error) throw error;
      setInventory(data || []);
      
      const initialQuantities: Record<string, number> = {};
      data?.forEach(item => {
        initialQuantities[item.id] = item.quantity || 0;
      });
      setIndentQuantities(initialQuantities);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    const { data } = await supabase
      .from('medicine_master')
      .select('*');
    setMasterData(data || []);
  };

  const selectedMedicineMaster = masterData.find(m => m.id === formData.medicine_id);

  useEffect(() => {
    if (selectedMedicineMaster) {
      setFormData(prev => ({
        ...prev,
        category: selectedMedicineMaster.category || 'Patent',
        source_type: selectedMedicineMaster.source_type || 'Tender',
        packing_size: selectedMedicineMaster.packing_size?.toString() || '',
        unit_type: selectedMedicineMaster.unit_type || 'Tablet'
      }));
    }
  }, [selectedMedicineMaster]);

  const handleAddToMaster = async () => {
    if (!searchTerm) {
      alert('Please enter a medicine name');
      return;
    }
    setNewMedicine(prev => ({ ...prev, medicine_name: searchTerm }));
    setIsAddModalOpen(true);
  };

  const handleAddMedicineSubmit = async () => {
    setIsAddingToMaster(true);
    try {
      const { data, error } = await supabase
        .from('medicine_master')
        .insert([{
          medicine_name: newMedicine.medicine_name,
          category: newMedicine.category,
          source_type: newMedicine.source_type,
          packing_size: Number(newMedicine.packing_size),
          unit_type: newMedicine.unit_type
        }])
        .select()
        .single();

      if (error) throw error;
      
      setMasterData(prev => [...prev, data]);
      setFormData(prev => ({ ...prev, medicine_id: data.id }));
      setIsAddModalOpen(false);
      alert('Medicine added to master successfully!');
    } catch (err: any) {
      console.error('Error adding to master:', err);
      alert('Failed to add to master: ' + err.message);
    } finally {
      setIsAddingToMaster(false);
    }
  };

  const handleDateChange = (field: 'mfg_date' | 'expiry_date', value: string) => {
    // Remove all non-digits
    let cleaned = value.replace(/\D/g, '');
    
    // Limit to 6 digits (MMYYYY)
    cleaned = cleaned.slice(0, 6);
    
    // Format as MM/YYYY
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  const handleManualEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicine_id || !formData.batch_number || !formData.quantity || !formData.order_number) {
      alert('Please fill all required fields (Medicine, Batch, Quantity, and Order Number)');
      return;
    }

    // Validate date format MM/YYYY
    const dateRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (formData.mfg_date && !dateRegex.test(formData.mfg_date)) {
      alert('Manufacturing Date must be in MM/YYYY format');
      return;
    }
    if (formData.expiry_date && !dateRegex.test(formData.expiry_date)) {
      alert('Expiry Date must be in MM/YYYY format');
      return;
    }

    const formatToDBDate = (val: string) => {
      if (!val) return null;
      const [month, year] = val.split('/');
      return `${year}-${month}-01`;
    };

    setSubmitting(true);
    try {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      const istTimestamp = istDate.toISOString().replace('Z', '+05:30');

      const qty = Number(formData.quantity);

      const { error } = await supabase
        .from('medicine_inventory')
        .upsert({
          hospital_id: hospitalId,
          medicine_id: formData.medicine_id,
          batch_number: formData.batch_number,
          manufacturer_name: formData.manufacturer_name,
          mfg_date: formatToDBDate(formData.mfg_date),
          expiry_date: formatToDBDate(formData.expiry_date),
          quantity: qty,
          order_number: formData.order_number,
          district: district,
          entry_type: 'Old',
          status: qty >= 1 ? 'Available' : 'Out of Stock',
          receiving_date: istTimestamp,
          created_at: istTimestamp
        }, {
          onConflict: 'hospital_id,medicine_id,batch_number,manufacturer_name'
        });

      if (error) throw error;

      alert('Old stock added successfully!');
      setShowEntryForm(false);
      setFormData({
        medicine_id: '',
        batch_number: '',
        mfg_date: '',
        expiry_date: '',
        manufacturer_name: '',
        quantity: '',
        order_number: '',
        category: 'Patent',
        source_type: 'Tender',
        packing_size: '',
        unit_type: 'Tablet'
      });
      fetchInventory();
    } catch (err: any) {
      console.error('Error adding manual stock:', err);
      alert('Failed to add stock: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistory = async (medicine: any) => {
    setHistoryMedicine(medicine);
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('hospital_dispatches')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('medicine_id', medicine.medicine_id)
        .eq('status', 'Received')
        .order('receiving_date', { ascending: false });
      
      if (error) throw error;
      setHistoryData(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleIndent = async (item: any, quantity: number) => {
    if (quantity <= 0) {
      alert('Please enter a valid quantity to indent');
      return;
    }

    if (quantity > item.quantity) {
      alert('Insufficient stock in Main Inventory');
      return;
    }

    const packingSize = item.medicine_master?.packing_size || 1;
    const totalLoose = quantity * packingSize;
    const medicineName = item.medicine_master?.medicine_name;
    const unitType = item.medicine_master?.unit_type;

    if (!medicineName || !unitType || !item.medicine_id || !packingSize) {
      alert('Invalid medicine details or packing size');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch current indent to sum up
      const { data: currentIndent } = await supabase
        .from('hospital_indent')
        .select('remaining_loose_quantity')
        .eq('hospital_id', hospitalId)
        .eq('medicine_id', item.medicine_id)
        .single();

      const newLooseQty = (currentIndent?.remaining_loose_quantity || 0) + totalLoose;

      // 2. Upsert into Hospital Indent
      const { error: indentError } = await supabase
        .from('hospital_indent')
        .upsert({
          hospital_id: hospitalId,
          medicine_id: item.medicine_id,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          medicine_name: medicineName,
          unit_type: unitType,
          packing_size: packingSize,
          total_loose_quantity: newLooseQty,
          remaining_loose_quantity: newLooseQty,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'hospital_id,medicine_id,batch_number,expiry_date'
        });

      if (indentError) throw indentError;

      // 3. Deduct from Main Inventory
      const { error: updateError } = await supabase
        .from('medicine_inventory')
        .update({ quantity: item.quantity - quantity })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // 4. Log to indent_logs
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      const { error: logError } = await supabase
        .from('indent_logs')
        .insert([{
          medicine_inventory_id: item.id,
          hospital_id: hospitalId,
          hospital_name: hospitalName,
          medicine_name: medicineName,
          batch_number: item.batch_number,
          mfg_date: item.mfg_date,
          expiry_date: item.expiry_date,
          manufacturer_name: item.manufacturer_name || item.medicine_master?.manufacturer_name,
          order_number: item.order_number,
          packing_size: packingSize.toString(),
          units_indented: quantity,
          indent_type: 'ISSUE',
          performed_by: userId
        }]);

      if (logError) console.error('Error logging indent:', logError);

      alert(`Successfully moved ${quantity} units (${totalLoose} ${unitType}s) to Indent`);
      fetchInventory();
    } catch (err: any) {
      console.error('Error during indent transfer:', err);
      alert('Failed to transfer to indent: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkIndent = async () => {
    setLoading(true);
    try {
      for (const id of selectedItems) {
        const item = inventory.find(i => i.id === id);
        const qty = indentQuantities[id];
        if (item && qty > 0) {
          const packingSize = item.medicine_master?.packing_size || 1;
          const totalLoose = qty * packingSize;
          const medicineName = item.medicine_master?.medicine_name;
          const unitType = item.medicine_master?.unit_type;

          if (medicineName && unitType && item.medicine_id && packingSize) {
            // Fetch current indent
            const { data: currentIndent } = await supabase
              .from('hospital_indent')
              .select('remaining_loose_quantity')
              .eq('hospital_id', hospitalId)
              .eq('medicine_id', item.medicine_id)
              .single();

            const newLooseQty = (currentIndent?.remaining_loose_quantity || 0) + totalLoose;

            // Upsert
            const { error: indentError } = await supabase
              .from('hospital_indent')
              .upsert({
                hospital_id: hospitalId,
                medicine_id: item.medicine_id,
                medicine_name: medicineName,
                unit_type: unitType,
                packing_size: packingSize,
                total_loose_quantity: newLooseQty,
                remaining_loose_quantity: newLooseQty,
                last_updated: new Date().toISOString()
              }, {
                onConflict: 'hospital_id,medicine_id'
              });

            if (indentError) throw indentError;

            // Deduct from inventory
            const { error: updateError } = await supabase
              .from('medicine_inventory')
              .update({ quantity: item.quantity - qty })
              .eq('id', item.id);
            
            if (updateError) throw updateError;

            // Log to indent_logs
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData.user?.id;

            const { error: logError } = await supabase
              .from('indent_logs')
              .insert([{
                medicine_inventory_id: item.id,
                hospital_id: hospitalId,
                hospital_name: hospitalName,
                medicine_name: medicineName,
                batch_number: item.batch_number,
                mfg_date: item.mfg_date,
                expiry_date: item.expiry_date,
                manufacturer_name: item.manufacturer_name || item.medicine_master?.manufacturer_name,
                order_number: item.order_number,
                packing_size: packingSize.toString(),
                units_indented: qty,
                indent_type: 'ISSUE',
                performed_by: userId
              }]);

            if (logError) console.error('Error logging bulk indent:', logError);
          }
        }
      }
      alert('Bulk indent completed successfully');
      setSelectedItems([]);
      fetchInventory();
    } catch (err: any) {
      console.error('Error during bulk indent:', err);
      alert('Failed bulk indent: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLocked = !!formData.medicine_id;

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Main Inventory</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowConfirmModal(true)}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-200"
          >
            <Plus size={16} /> Add Manual Stock
          </button>
          <button 
            onClick={handleBulkIndent}
            disabled={selectedItems.length === 0}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
          >
            <ArrowRight size={16} /> Bulk Indent
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/50">
              <th className="px-4 py-4 w-10"><input type="checkbox" onChange={(e) => setSelectedItems(e.target.checked ? inventory.map(i => i.id) : [])} /></th>
              <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine</th>
              <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Batch</th>
              <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Expiry</th>
              <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Manufacturer</th>
              <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Stock</th>
              <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Indent Qty</th>
              <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {inventory.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-4 py-4"><input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-sm">{item.medicine_master?.medicine_name || 'N/A'}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {item.medicine_master?.packing_size} {item.medicine_master?.unit_type}
                    </span>
                    <button 
                      onClick={() => fetchHistory(item)}
                      className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold hover:underline mt-1"
                    >
                      <History size={10} /> History
                    </button>
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-600 text-sm">{item.batch_number}</td>
                <td className="px-4 py-4 text-slate-600 text-sm">{item.expiry_date}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-900 text-sm font-medium">{item.manufacturer_name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Order: {item.order_number}</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-black text-slate-900 text-sm">{item.quantity}</td>
                <td className="px-4 py-4">
                  <input 
                    type="number"
                    min="1"
                    max={item.quantity}
                    value={indentQuantities[item.id] === undefined ? 1 : indentQuantities[item.id]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setIndentQuantities(prev => ({...prev, [item.id]: val}));
                    }}
                    className="w-16 px-2 py-1 border rounded-lg text-sm"
                  />
                </td>
                <td className="px-4 py-4">
                  <button 
                    onClick={() => handleIndent(item, indentQuantities[item.id])}
                    className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold text-[10px] hover:bg-emerald-100"
                  >
                    Indent
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="text-amber-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Add Manual Stock</h3>
              <p className="text-slate-500 mb-8 font-medium">Do you want to add old medicine available in your hospital?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Go Back
                </button>
                <button 
                  onClick={() => {
                    setShowConfirmModal(false);
                    setShowEntryForm(true);
                  }}
                  className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  Yes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Entry Form Modal */}
      <AnimatePresence>
        {showEntryForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden my-8"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Add Old Stock Entry</h2>
                  <p className="text-slate-500 text-sm font-medium">Manually enter existing hospital stock into the system.</p>
                </div>
                <button onClick={() => setShowEntryForm(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleManualEntrySubmit} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                          >
                            <Plus size={14} /> Add to Master
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Source Type</label>
                        <div className="flex bg-slate-100 p-1 rounded-2xl">
                          {['Tender', 'Rishikul Pharmacy'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              disabled={isLocked}
                              onClick={() => setFormData({ ...formData, source_type: option })}
                              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                                formData.source_type === option 
                                  ? 'bg-white text-emerald-600 shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-700'
                              } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Category</label>
                        <div className="flex bg-slate-100 p-1 rounded-2xl">
                          {['Classical', 'Patent'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              disabled={isLocked}
                              onClick={() => setFormData({ ...formData, category: option })}
                              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                                formData.category === option 
                                  ? 'bg-white text-emerald-600 shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-700'
                              } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              {option}
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
                          className={`w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${isLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                          value={formData.packing_size}
                          onChange={e => setFormData({ ...formData, packing_size: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Unit</label>
                        <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto">
                          {['Gm', 'Ml', 'Capsule', 'Tablet'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              disabled={isLocked}
                              onClick={() => setFormData({ ...formData, unit_type: option })}
                              className={`flex-1 py-2 px-2 text-[10px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                formData.unit_type === option 
                                  ? 'bg-white text-emerald-600 shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-700'
                              } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Building2 size={14} /> Batch & Stock Details
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Batch Number</label>
                        <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="text"
                            placeholder="e.g. B123"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={formData.batch_number}
                            onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Quantity</label>
                        <input 
                          type="number"
                          placeholder="0"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                          value={formData.quantity}
                          onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Mfg Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="text"
                            placeholder="MM/YYYY"
                            maxLength={7}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={formData.mfg_date}
                            onChange={e => handleDateChange('mfg_date', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Expiry Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="text"
                            placeholder="MM/YYYY"
                            maxLength={7}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={formData.expiry_date}
                            onChange={e => handleDateChange('expiry_date', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Manufacturer Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text"
                          placeholder="e.g. ABC Pharma"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={formData.manufacturer_name}
                          onChange={e => setFormData({ ...formData, manufacturer_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Order Number</label>
                      <div className="relative">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text"
                          placeholder="e.g. OLD-STOCK-001"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={formData.order_number}
                          onChange={e => setFormData({ ...formData, order_number: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowEntryForm(false)}
                    className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                    Save to Inventory
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add to Master Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Add to Master</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medicine Name</label>
                  <input 
                    type="text" 
                    value={newMedicine.medicine_name}
                    onChange={e => setNewMedicine({...newMedicine, medicine_name: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Category</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['Classical', 'Patent'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setNewMedicine({ ...newMedicine, category: option })}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                              newMedicine.category === option 
                                ? 'bg-white text-emerald-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Source Type</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['Tender', 'Rishikul Pharmacy'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setNewMedicine({ ...newMedicine, source_type: option })}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                              newMedicine.source_type === option 
                                ? 'bg-white text-emerald-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Packing Size</label>
                    <input 
                      type="number" 
                      value={newMedicine.packing_size}
                      onChange={e => setNewMedicine({...newMedicine, packing_size: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit Type</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto">
                      {['Gm', 'Ml', 'Capsule', 'Tablet'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setNewMedicine({ ...newMedicine, unit_type: option })}
                          className={`flex-1 py-1.5 px-1 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap ${
                            newMedicine.unit_type === option 
                              ? 'bg-white text-emerald-600 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddMedicineSubmit}
                  disabled={isAddingToMaster}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isAddingToMaster ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Add to Master
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {historyMedicine && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Transaction History</h4>
                  <p className="text-slate-500 font-medium">{historyMedicine.medicine_master?.medicine_name} - Batch: {historyMedicine.batch_number}</p>
                </div>
                <button 
                  onClick={() => setHistoryMedicine(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                {loadingHistory ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 font-medium italic">No transaction history found for this medicine.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-100">
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date Received</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Order No.</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Manufacturer</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quantity</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {historyData.map((h, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-4 text-sm font-medium text-slate-600">{h.receiving_date}</td>
                          <td className="py-4 text-sm font-bold text-slate-900">#{h.order_number}</td>
                          <td className="py-4 text-sm text-slate-600">{h.manufacturer_name}</td>
                          <td className="py-4 text-sm font-black text-slate-900">{h.quantity}</td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                              h.action_type === 'Push_by_District' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {h.action_type === 'Push_by_District' ? 'Push' : 'Pull'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

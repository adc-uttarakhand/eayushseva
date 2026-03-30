import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Building2, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Package,
  Filter,
  BarChart3,
  X,
  ToggleLeft,
  ToggleRight,
  Lock,
  Unlock,
  Edit,
  Trash,
  Check,
  Calendar,
  Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';

interface MedicineMaster {
  id: string; // Assuming id exists as primary key
  medicine_name: string;
  packing_size: string;
  unit_type: string;
  category: string;
  source_type?: string;
}

interface MedicineDemand {
  id: string;
  hospital_id: string;
  medicine_id: string;
  quantity_requested: number;
  quantity_forwarded?: number;
  quantity_approved?: number;
  status: string;
  created_at?: string;
  demand_date?: string;
  forwarding_date?: string;
  approval_date?: string;
  revert_comment?: string;
  is_fulfilled?: boolean;
  // Joined fields
  medicine_master?: MedicineMaster;
  hospitals?: {
    facility_name: string;
    district: string;
  };
}

interface MedicineDemandSystemProps {
  session: UserSession;
}

interface MedicineInventory {
  hospital_id: string;
  medicine_id: string;
  total_bulk_units: number;
  conversion_factor: number;
  medicine_master?: MedicineMaster;
}

export default function MedicineDemandSystem({ session }: MedicineDemandSystemProps) {
  const [view, setView] = useState<'hospital' | 'district' | 'state'>('hospital');
  const [medicineMaster, setMedicineMaster] = useState<MedicineMaster[]>([]);
  const [demands, setDemands] = useState<MedicineDemand[]>([]);
  const [inventory, setInventory] = useState<MedicineInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModuleActive, setIsModuleActive] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeDemandTab, setActiveDemandTab] = useState<'classical_rishikul' | 'classical_tender' | 'patent_tender'>('classical_rishikul');
  const [searchQueries, setSearchQueries] = useState({
    classical_rishikul: '',
    classical_tender: '',
    patent_tender: ''
  });
  
  const [draftDemands, setDraftDemands] = useState<Record<string, number>>({});
  const [hospitalTab, setHospitalTab] = useState<'current' | 'previous'>('current');
  const [inlineEditDemand, setInlineEditDemand] = useState<string | null>(null);
  const [inlineEditQty, setInlineEditQty] = useState<number>(0);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  
  const [adminViewMode, setAdminViewMode] = useState<'medicine' | 'hospital' | 'district'>('medicine');
  const [adminFilters, setAdminFilters] = useState({
    hospitalName: '',
    source: '',
    type: '',
    hospitalType: ''
  });
  
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);

  const [selectedMedicineDemands, setSelectedMedicineDemands] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingDemandId, setEditingDemandId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  // Filters for Hospital View
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterFinancialYear, setFilterFinancialYear] = useState('');
  const [filterSourceType, setFilterSourceType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedMedicines, setSelectedMedicines] = useState<string[]>([]);

  const getFinancialYearDates = (fy: string) => {
    if (!fy) return null;
    const [startYear, endYear] = fy.split('-').map(y => parseInt(y));
    // Assuming format "2023-24" or "2023-2024"
    // If "2023-24", startYear=2023, endYear=24 (need to fix)
    let y1 = startYear;
    let y2 = endYear;
    if (y2 < 100) y2 += 2000; // simple fix for 2-digit year

    return {
      start: new Date(`${y1}-04-01`),
      end: new Date(`${y2}-03-31`)
    };
  };

  const downloadCSV = (data: MedicineDemand[]) => {
    const headers = ['Hospital Name', 'Medicine Name', 'Packing', 'Unit', 'Category', 'Source', 'Requested', 'Forwarded', 'Approved', 'Status', 'Demand Date', 'Forwarding Date', 'Approval Date'];
    const rows = data.map(d => [
      d.hospitals?.facility_name || '',
      d.medicine_master?.medicine_name || '',
      d.medicine_master?.packing_size || '',
      d.medicine_master?.unit_type || '',
      d.medicine_master?.category || '',
      d.medicine_master?.source_type || '',
      d.quantity_requested,
      d.quantity_forwarded || 0,
      d.quantity_approved || 0,
      d.status,
      formatDate(d.demand_date || d.created_at),
      formatDate(d.forwarding_date),
      formatDate(d.approval_date)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `medicine_demands_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  useEffect(() => {
    // Determine initial view based on role
    if (session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN') {
      setView('state');
    } else if (session.role === 'DISTRICT_ADMIN' || session.role === 'DISTRICT_MEDICINE_INCHARGE') {
      setView('district');
    } else {
      setView('hospital');
    }
    
    fetchInitialData();
  }, [session]);

  useEffect(() => {
    if (isDetailsModalOpen && selectedMedicineDemands) {
      // Group demands by medicine
      const aggregatedDemands = demands.reduce((acc: any, curr) => {
        const medName = curr.medicine_master?.medicine_name || 'Unknown';
        if (!acc[medName]) {
          acc[medName] = {
            name: medName,
            total_requested: 0,
            total_forwarded: 0,
            total_approved: 0,
            pending: 0,
            hospitals: new Set(),
            details: curr.medicine_master,
            demands: []
          };
        }
        acc[medName].total_requested += curr.quantity_requested;
        acc[medName].total_forwarded += (curr.quantity_forwarded || 0);
        acc[medName].total_approved += (curr.quantity_approved || 0);
        if (curr.status === 'Pending') acc[medName].pending += curr.quantity_requested;
        acc[medName].hospitals.add(curr.hospital_id);
        acc[medName].demands.push(curr);
        return acc;
      }, {});
      
      const updated = aggregatedDemands[selectedMedicineDemands.name];
      if (updated) setSelectedMedicineDemands(updated);
    }
  }, [demands, isDetailsModalOpen]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
  };

  const forwardAllForMedicine = async (medicineName: string) => {
    try {
      const medicineDemands = demands.filter(d => d.medicine_master?.medicine_name === medicineName);
      const pendingDemands = medicineDemands.filter(d => d.status === 'Pending');
      
      if (pendingDemands.length === 0) return;

      const now = new Date().toISOString();
      const updates = pendingDemands.map(d => 
        supabase.from('medicine_demands').update({
          quantity_forwarded: d.quantity_requested,
          status: 'Forwarded',
          forwarding_date: now
        }).eq('id', d.id)
      );
      
      await Promise.all(updates);
      fetchDemands();
    } catch (err) {
      console.error('Error forwarding all:', err);
    }
  };

  const approveAllForMedicine = async (medicineName: string) => {
    try {
      const medicineDemands = demands.filter(d => d.medicine_master?.medicine_name === medicineName);
      const pendingDemands = medicineDemands.filter(d => d.status !== 'Approved');
      
      if (pendingDemands.length === 0) return;

      const now = new Date().toISOString();
      // Since we need to set quantity_approved = quantity_requested, 
      // and we can't easily do it in a single update with the JS SDK without raw SQL,
      // we'll do individual updates.
      const updates = pendingDemands.map(d => 
        supabase.from('medicine_demands').update({
          quantity_approved: d.quantity_forwarded || d.quantity_requested,
          status: 'Approved',
          approval_date: now
        }).eq('id', d.id)
      );
      
      await Promise.all(updates);
      fetchDemands();
    } catch (err) {
      console.error('Error approving all:', err);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Check auth status for debugging
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Supabase Auth User:', user ? user.id : 'NONE (Anonymous)');

      // Fetch medicine master for selection
      const { data: masterData, error: masterError, count } = await supabase
        .from('medicine_master')
        .select('*', { count: 'exact' });
      
      if (masterError) {
        console.error('Supabase error fetching medicine_master:', masterError);
        setFetchError(masterError.message);
      }

      if (masterData) {
        console.log('Medicine Master Data Fetched:', masterData.length, 'records. Total count:', count);
        if (masterData.length === 0) {
          // Try a simple select to see if anything comes back
          const { data: testData, error: testError } = await supabase.from('medicine_master').select('medicine_name').limit(1);
          console.log('Test fetch (medicine_name only):', testData, testError);
        }
        setMedicineMaster(masterData);
      }

      await Promise.all([
        fetchDemands(),
        fetchInventory(),
        fetchModuleStatus()
      ]);
    } catch (err) {
      console.error('Exception in fetchInitialData:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    if (session.role !== 'STAFF' && session.role !== 'HOSPITAL') return;
    
    const hId = session.hospitalId || session.id;
    const { data, error } = await supabase
      .from('medicine_inventory')
      .select(`
        *,
        medicine_master:medicine_id (
          medicine_name,
          packing_size,
          unit_type,
          category,
          source_type
        )
      `)
      .eq('hospital_id', hId);
    
    if (data) setInventory(data);
    if (error) console.error('Error fetching inventory:', error);
  };

  const fetchModuleStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('is_active')
        .eq('setting_key', 'medicine_demand_active')
        .single();
      
      if (data) {
        setIsModuleActive(data.is_active);
      } else if (error && error.code === 'PGRST116') {
        // Key not found, initialize it
        const { error: insertError } = await supabase.from('global_settings').insert([
          { setting_key: 'medicine_demand_active', is_active: true }
        ]);
        if (insertError) {
          console.error('Error initializing module status:', insertError);
        }
        setIsModuleActive(true);
      }
    } catch (err) {
      console.error('Error fetching module status:', err);
    }
  };

  const handleToggleClick = () => {
    setIsToggleModalOpen(true);
  };

  const performToggleModule = async () => {
    const newStatus = !isModuleActive;
    
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .update({ is_active: newStatus })
        .eq('setting_key', 'medicine_demand_active')
        .select();
      
      if (error) throw error;

      if (!data || data.length === 0) {
        // If no row was updated, it might not exist. Let's insert it.
        const { error: insertError } = await supabase
          .from('global_settings')
          .insert([{ setting_key: 'medicine_demand_active', is_active: newStatus }]);
        
        if (insertError) throw insertError;
      }

      setIsModuleActive(newStatus);
      setIsToggleModalOpen(false);
    } catch (err) {
      console.error('Error toggling module:', err);
      alert('Failed to update module status. Please check database permissions.');
    }
  };

  const fetchDemands = async () => {
    let query = supabase
      .from('medicine_demands')
      .select(`
        *,
        medicine_master:medicine_id (
          medicine_name,
          packing_size,
          unit_type,
          category,
          source_type
        ),
        hospitals:hospital_id (
          facility_name,
          district
        )
      `);

    if ((session.role === 'DISTRICT_ADMIN' || session.role === 'DISTRICT_MEDICINE_INCHARGE') && session.access_districts) {
      // Filter by district if district admin
      // Note: This requires a join filter which might be tricky in Supabase without a view
      // but we can filter the results in memory if needed, or use a RPC/View.
      // For now, let's try to filter by hospital_id if we have a list of hospitals in that district.
      const { data: districtHospitals } = await supabase
        .from('hospitals')
        .select('hospital_id')
        .in('district', session.access_districts);
      
      if (districtHospitals) {
        const hospitalIds = districtHospitals.map(h => h.hospital_id);
        query = query.in('hospital_id', hospitalIds);
      }
    } else if (session.role === 'STAFF' || session.role === 'HOSPITAL') {
      // Filter by hospital if hospital staff
      const hId = session.hospitalId || session.id;
      query = query.eq('hospital_id', hId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (data) setDemands(data);
    if (error) console.error('Error fetching demands:', error);
  };

  const updateDemand = async (demandId: string, field: 'quantity_forwarded' | 'quantity_approved', value: number) => {
    try {
      const now = new Date().toISOString();
      const updates: any = { [field]: value };
      
      // If Super Admin approves, also update status
      if (field === 'quantity_approved') {
        updates.status = 'Approved';
        updates.approval_date = now;
      } else if (field === 'quantity_forwarded') {
        updates.status = 'Forwarded';
        updates.forwarding_date = now;
      }

      const { error } = await supabase
        .from('medicine_demands')
        .update(updates)
        .eq('id', demandId);

      if (error) throw error;
      
      setEditingDemandId(null);
      fetchDemands();
    } catch (err) {
      console.error('Error updating demand:', err);
      alert('Failed to update demand');
    }
  };

  const handleUpdateDemandQty = async (id: string, qty: number) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('medicine_demands')
        .update({ quantity_requested: qty, demand_date: now })
        .eq('id', id);
      if (error) throw error;
      setInlineEditDemand(null);
      fetchDemands();
    } catch (err) {
      console.error('Error updating demand:', err);
      alert('Failed to update demand');
    }
  };

  const handleDeleteDemand = (id: string) => {
    setDeleteConfirmationId(id);
  };

  const confirmDeleteDemand = async () => {
    if (!deleteConfirmationId) return;
    try {
      const { error } = await supabase
        .from('medicine_demands')
        .delete()
        .eq('id', deleteConfirmationId);
      
      if (error) throw error;
      
      setToast({ show: true, message: 'Demand Deleted Successfully', type: 'success' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
      fetchDemands();
    } catch (err) {
      console.error('Error deleting demand:', err);
      setToast({ show: true, message: 'Failed to delete demand', type: 'error' });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    } finally {
      setDeleteConfirmationId(null);
    }
  };

  const handleMarkFulfilled = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medicine_demands')
        .update({ is_fulfilled: true })
        .eq('id', id);
      if (error) throw error;
      fetchDemands();
    } catch (err) {
      console.error('Error marking fulfilled:', err);
      alert('Failed to mark as fulfilled');
    }
  };

  const handleRevertDemand = async (id: string, comment: string) => {
    try {
      const { error } = await supabase
        .from('medicine_demands')
        .update({ 
          status: 'Reverted', 
          revert_comment: comment,
          quantity_forwarded: 0,
          quantity_approved: 0
        })
        .eq('id', id);
      if (error) throw error;
      setToast({ show: true, message: 'Demand reverted to hospital successfully', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      fetchDemands();
    } catch (err) {
      console.error('Error reverting demand:', err);
      alert('Failed to revert demand');
    }
  };

  const handleSelectAll = (medicines: string[]) => {
    if (selectedMedicines.length === medicines.length) {
      setSelectedMedicines([]);
    } else {
      setSelectedMedicines(medicines);
    }
  };

  const handleSelectMedicine = (medicineName: string) => {
    if (selectedMedicines.includes(medicineName)) {
      setSelectedMedicines(selectedMedicines.filter(m => m !== medicineName));
    } else {
      setSelectedMedicines([...selectedMedicines, medicineName]);
    }
  };

  const handleBulkForward = async () => {
    if (selectedMedicines.length === 0) return;
    if (!confirm(`Are you sure you want to forward demands for ${selectedMedicines.length} medicines?`)) return;

    try {
      const now = new Date().toISOString();
      
      // Find all demands associated with selected medicines
      const demandsToUpdate = demands.filter(d => 
        selectedMedicines.includes(d.medicine_master?.medicine_name || '') && 
        d.status === 'Pending'
      );

      if (demandsToUpdate.length === 0) {
        alert('No pending demands to forward for selected medicines.');
        return;
      }

      const updates = demandsToUpdate.map(d => 
        supabase.from('medicine_demands').update({
          quantity_forwarded: d.quantity_requested,
          status: 'Forwarded',
          forwarding_date: now
        }).eq('id', d.id)
      );

      await Promise.all(updates);

      setToast({ show: true, message: 'Bulk forward successful', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      setSelectedMedicines([]);
      fetchDemands();
    } catch (err) {
      console.error('Error bulk forwarding:', err);
      alert('Failed to bulk forward demands');
    }
  };

  const handleBulkRevert = async () => {
    if (selectedMedicines.length === 0) return;
    const comment = prompt("Enter reason for reverting selected demands:");
    if (!comment) return;

    try {
      // Find all demands associated with selected medicines
      const demandsToUpdate = demands.filter(d => 
        selectedMedicines.includes(d.medicine_master?.medicine_name || '') && 
        d.status === 'Pending'
      );

      if (demandsToUpdate.length === 0) {
        alert('No pending demands to revert for selected medicines.');
        return;
      }

      const updates = demandsToUpdate.map(d => 
        supabase.from('medicine_demands').update({
          status: 'Reverted',
          revert_comment: comment,
          quantity_forwarded: 0,
          quantity_approved: 0
        }).eq('id', d.id)
      );

      await Promise.all(updates);

      setToast({ show: true, message: 'Bulk revert successful', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      setSelectedMedicines([]);
      fetchDemands();
    } catch (err) {
      console.error('Error bulk reverting:', err);
      alert('Failed to bulk revert demands');
    }
  };

  const handleSubmitDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isModuleActive) {
      alert('Demand Module is currently INACTIVE.');
      return;
    }
    
    const selectedMeds = Object.entries(draftDemands).filter(([_, qty]) => typeof qty === 'number' && qty > 0);
    if (selectedMeds.length === 0) {
      alert('Please enter quantity for at least one medicine.');
      return;
    }

    try {
      const hId = session.hospitalId || session.id;
      const now = new Date().toISOString();
      
      const inserts = selectedMeds.map(([medId, qty]) => ({
        hospital_id: hId,
        medicine_id: medId,
        quantity_requested: qty,
        status: 'Pending',
        demand_date: now
      }));

      const { error } = await supabase
        .from('medicine_demands')
        .insert(inserts);

      if (error) {
        console.error('Supabase Insert Error:', error);
        alert(`Failed to submit demands: ${error.message}\n(Error Code: ${error.code})`);
        return;
      }
      
      setIsFormOpen(false);
      setDraftDemands({});
      fetchDemands();
    } catch (err: any) {
      console.error('Error submitting demand:', err);
      alert('Failed to submit demand: ' + (err.message || 'Unknown error'));
    }
  };

  const renderHospitalView = () => {
    const displayedDemands = demands.filter(d => {
      // 1. Tab Logic
      // Current: Status is NOT Approved
      // Previous: Status IS Approved
      const isApproved = d.status === 'Approved';
      if (hospitalTab === 'current' && isApproved) return false;
      if (hospitalTab === 'previous' && !isApproved) return false;

      // 2. Filter Logic
      const demandDate = new Date(d.demand_date || d.created_at || '');
      
      // Date Range
      if (filterStartDate && demandDate < new Date(filterStartDate)) return false;
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        if (demandDate > end) return false;
      }

      // Financial Year
      if (filterFinancialYear) {
        const fyDates = getFinancialYearDates(filterFinancialYear);
        if (fyDates) {
          if (demandDate < fyDates.start || demandDate > fyDates.end) return false;
        }
      }

      // Source Type
      if (filterSourceType && filterSourceType !== 'all' && (d.medicine_master?.source_type || '').toLowerCase() !== (filterSourceType || '').toLowerCase()) return false;

      // Category
      if (filterCategory && filterCategory !== 'all' && (d.medicine_master?.category || '').toLowerCase() !== (filterCategory || '').toLowerCase()) return false;

      return true;
    });

    const hasRevertedDemands = demands.some(d => d.status === 'Reverted');

    return (
      <div className="space-y-8">
        {hasRevertedDemands && (
          <div className="bg-orange-50 border-b border-orange-100 overflow-hidden py-2">
            <div className="animate-marquee whitespace-nowrap text-orange-600 font-bold text-sm flex items-center gap-4">
              <AlertCircle size={16} />
              <span>Demand reverted by District Admin. Please Update demand.</span>
              <span className="mx-8">•</span>
              <AlertCircle size={16} />
              <span>Demand reverted by District Admin. Please Update demand.</span>
              <span className="mx-8">•</span>
              <AlertCircle size={16} />
              <span>Demand reverted by District Admin. Please Update demand.</span>
            </div>
          </div>
        )}

        {!isModuleActive && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-4 text-red-600 shadow-sm"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <p className="font-bold text-sm">Demand Module is currently INACTIVE</p>
              <p className="text-xs opacity-80">Please wait for State Director's Activation before submitting new demands.</p>
            </div>
          </motion.div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">My Hospital Demands</h2>
            <p className="text-slate-500 text-sm">Request new stock from the central warehouse</p>
          </div>
          <button 
            disabled={!isModuleActive}
            onClick={() => setIsFormOpen(true)}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg ${
              isModuleActive 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Plus size={20} />
            New Demand
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Filter size={18} className="text-emerald-600" />
              Filters
            </h3>
            <button 
              onClick={() => downloadCSV(displayedDemands)}
              className="text-sm font-bold text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
            >
              <ClipboardList size={16} />
              Download CSV
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Start Date</label>
              <input 
                type="date" 
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">End Date</label>
              <input 
                type="date" 
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Financial Year</label>
              <select 
                value={filterFinancialYear}
                onChange={e => setFilterFinancialYear(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">All Years</option>
                <option value="2023-24">FY 2023-24</option>
                <option value="2024-25">FY 2024-25</option>
                <option value="2025-26">FY 2025-26</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Source Type</label>
              <select 
                value={filterSourceType}
                onChange={e => setFilterSourceType(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">All Sources</option>
                <option value="rishikul pharmacy">Rishikul Pharmacy</option>
                <option value="tender">Tender</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Category</label>
              <select 
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">All Categories</option>
                <option value="classical">Classical</option>
                <option value="patent">Patent</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
              <Clock size={24} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending Demands</p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {demands.filter(d => d.status === 'Pending').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
              <TrendingUp size={24} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Requested</p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {demands.reduce((acc, curr) => acc + curr.quantity_requested, 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-4">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Approved</p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {demands.filter(d => d.status === 'Approved').length}
            </p>
          </div>
        </div>

        {inventory.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 ml-2">
              <Package size={16} className="text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Current Inventory Stock</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {inventory.map(item => (
                <div key={item.medicine_id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.medicine_master?.medicine_name}</p>
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Bulk</p>
                      <p className="text-2xl font-black text-slate-900">{item.total_bulk_units}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Retail Units</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {item.total_bulk_units * item.conversion_factor}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex border-b border-gray-100 mb-6 mt-8">
          {[
            { id: 'current', label: 'Current Demands' },
            { id: 'previous', label: 'Previous Demands' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setHospitalTab(tab.id as any)}
              className={`px-6 py-4 text-sm font-bold transition-all relative ${
                hospitalTab === tab.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
              {hospitalTab === tab.id && (
                <motion.div layoutId="hospitalTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-100">
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[35%]">Medicine</th>
                <th className="text-center py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[10%]">Requested</th>
                <th className="text-center py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[10%]">Forwarded</th>
                <th className="text-center py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[10%]">Approved</th>
                <th className="text-center py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Status</th>
                <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[20%]">Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayedDemands.map(demand => (
                <tr key={demand.id} className="group hover:bg-slate-50/30 transition-all">
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{demand.medicine_master?.medicine_name || 'Unknown'}</p>
                      <p className="text-[11px] font-bold tracking-tight mt-0.5">
                        <span className="text-black">{demand.medicine_master?.packing_size}</span>{' '}
                        <span className="text-emerald-600">{demand.medicine_master?.unit_type}</span>
                      </p>
                      <div className="flex gap-2 mt-1.5">
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                          {demand.medicine_master?.category}
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                          {demand.medicine_master?.source_type}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center">
                    {demand.status === 'Pending' || demand.status === 'Reverted' ? (
                      <div className="flex items-center justify-center gap-2">
                        {inlineEditDemand === demand.id ? (
                          <>
                            <input 
                              type="number" 
                              value={inlineEditQty} 
                              onChange={e => setInlineEditQty(Number(e.target.value))} 
                              className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-center"
                            />
                            <button onClick={() => handleUpdateDemandQty(demand.id, inlineEditQty)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded-lg transition-colors"><CheckCircle2 size={16} /></button>
                            <button onClick={() => setInlineEditDemand(null)} className="text-slate-400 hover:bg-slate-50 p-1 rounded-lg transition-colors"><X size={16} /></button>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-slate-900">{demand.quantity_requested}</span>
                            <button onClick={() => { setInlineEditDemand(demand.id); setInlineEditQty(demand.quantity_requested); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg ml-1 transition-colors opacity-0 group-hover:opacity-100"><Edit size={14} /></button>
                          </>
                        )}
                        <button 
                          onClick={() => handleDeleteDemand(demand.id)} 
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Demand"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-slate-900">{demand.quantity_requested}</span>
                    )}
                  </td>
                  <td className="py-4 px-2 text-center">
                    <span className={`font-bold ${demand.quantity_forwarded ? 'text-blue-600' : 'text-slate-300'}`}>
                      {demand.quantity_forwarded !== undefined && demand.quantity_forwarded !== null ? demand.quantity_forwarded : '-'}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-center">
                    <span className={`font-bold ${demand.quantity_approved ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {demand.quantity_approved !== undefined && demand.quantity_approved !== null ? demand.quantity_approved : '-'}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-fit ${
                        demand.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 
                        demand.status === 'Rejected' ? 'bg-red-50 text-red-600' : 
                        demand.status === 'Reverted' ? 'bg-orange-50 text-orange-600' :
                        demand.status === 'Forwarded' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {demand.status}
                      </span>
                      {demand.status === 'Reverted' && demand.revert_comment && (
                        <span className="text-[10px] text-orange-600 font-medium italic max-w-[150px] truncate" title={demand.revert_comment}>
                          "{demand.revert_comment}"
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex flex-col items-end gap-1 text-[10px] font-medium text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 w-3 text-right">D:</span>
                        <span className="font-bold text-slate-700">{formatDate(demand.demand_date || demand.created_at)}</span>
                      </div>
                      {demand.forwarding_date && (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-400 w-3 text-right">F:</span>
                          <span className="font-bold text-blue-600">{formatDate(demand.forwarding_date)}</span>
                        </div>
                      )}
                      {demand.approval_date && (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400 w-3 text-right">A:</span>
                          <span className="font-bold text-emerald-600">{formatDate(demand.approval_date)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayedDemands.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400 font-medium">
                    No demands found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAdminView = (isState: boolean) => {
    // Filter demands based on admin filters
    const filteredDemands = demands.filter(d => {
      // Date Range Filter (Forwarding Date)
      if (filterStartDate && d.forwarding_date && new Date(d.forwarding_date) < new Date(filterStartDate)) return false;
      if (filterEndDate && d.forwarding_date && new Date(d.forwarding_date) > new Date(filterEndDate)) return false;
      
      // If date filter is active, exclude pending demands (no forwarding date)?
      // User said "date must be date of forwarding". If we filter by date, we likely want to see history.
      // But if we want to see Pending, they don't have a date.
      // Let's assume if date filter is set, we only show demands with forwarding_date in range.
      if ((filterStartDate || filterEndDate) && !d.forwarding_date) return false;

      // Financial Year Filter
      if (filterFinancialYear) {
        const date = new Date(d.demand_date || d.created_at);
        const month = date.getMonth(); // 0-11
        const year = date.getFullYear();
        const fyStart = month >= 3 ? year : year - 1;
        const fyString = `${fyStart}-${(fyStart + 1).toString().slice(-2)}`;
        if (fyString !== filterFinancialYear) return false;
      }

      // Source Type Filter
      if (filterSourceType !== 'all' && d.medicine_master?.source_type?.toLowerCase() !== filterSourceType) return false;

      // Category Filter
      if (filterCategory !== 'all' && d.medicine_master?.category?.toLowerCase() !== filterCategory) return false;

      return true;
    });

    // Group demands by medicine
    const aggregatedDemands = filteredDemands.reduce((acc: any, curr) => {
      const medName = curr.medicine_master?.medicine_name || 'Unknown';
      if (!acc[medName]) {
        acc[medName] = {
          name: medName,
          total_requested: 0,
          total_forwarded: 0,
          total_approved: 0,
          pending: 0,
          hospitals: new Set(),
          details: curr.medicine_master,
          demands: [],
          latest_demand_date: null,
          latest_forwarding_date: null,
          latest_approval_date: null
        };
      }
      acc[medName].total_requested += curr.quantity_requested;
      acc[medName].total_forwarded += (curr.quantity_forwarded || 0);
      acc[medName].total_approved += (curr.quantity_approved || 0);
      if (curr.status === 'Pending') acc[medName].pending += curr.quantity_requested;
      acc[medName].hospitals.add(curr.hospital_id);
      acc[medName].demands.push(curr);

      // Track latest dates
      const dDate = curr.demand_date || curr.created_at;
      if (dDate && (!acc[medName].latest_demand_date || new Date(dDate) > new Date(acc[medName].latest_demand_date))) {
        acc[medName].latest_demand_date = dDate;
      }
      if (curr.forwarding_date && (!acc[medName].latest_forwarding_date || new Date(curr.forwarding_date) > new Date(acc[medName].latest_forwarding_date))) {
        acc[medName].latest_forwarding_date = curr.forwarding_date;
      }
      if (curr.approval_date && (!acc[medName].latest_approval_date || new Date(curr.approval_date) > new Date(acc[medName].latest_approval_date))) {
        acc[medName].latest_approval_date = curr.approval_date;
      }

      return acc;
    }, {});

    const aggregatedList = Object.values(aggregatedDemands);

    const canPerformBulkAction = selectedMedicines.length > 0 && selectedMedicines.every(medName => {
      const item = aggregatedList.find((i: any) => i.name === medName) as any;
      return item && item.pending > 0;
    });

    const downloadAdminCSV = () => {
      const headers = ['Medicine Name', 'Packing', 'Unit', 'Category', 'Source', 'Hospital', 'Requested', 'Forwarded', 'Approved', 'Status', 'Demand Date', 'Forwarding Date', 'Approval Date'];
      const rows = filteredDemands.map(d => [
        d.medicine_master?.medicine_name,
        d.medicine_master?.packing_size,
        d.medicine_master?.unit_type,
        d.medicine_master?.category,
        d.medicine_master?.source_type,
        d.hospitals?.facility_name,
        d.quantity_requested,
        d.quantity_forwarded || 0,
        d.quantity_approved || 0,
        d.status,
        formatDate(d.demand_date || d.created_at),
        d.forwarding_date ? formatDate(d.forwarding_date) : '-',
        d.approval_date ? formatDate(d.approval_date) : '-'
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consolidated_demands_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    };

    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {isState ? 'State Director' : 'District Admin'} <span className="text-emerald-600">Dashboard</span>
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
              {isState ? 'Consolidated view of all medicine demands across the state.' : `Medicine demands for ${session.access_districts?.join(', ')} district.`}
            </p>
          </div>

          {isState && (
            <div className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isModuleActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {isModuleActive ? <Unlock size={20} /> : <Lock size={20} />}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Demand Module</span>
                <span className={`text-sm font-bold ${isModuleActive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isModuleActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <button 
                onClick={handleToggleClick}
                className={`p-1 rounded-full transition-colors ${isModuleActive ? 'text-emerald-600' : 'text-slate-300'}`}
              >
                {isModuleActive ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-gray-100">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date" 
                value={filterStartDate} 
                onChange={(e) => setFilterStartDate(e.target.value)} 
                className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none"
                placeholder="Start Date"
              />
              <span className="text-slate-300">-</span>
              <input 
                type="date" 
                value={filterEndDate} 
                onChange={(e) => setFilterEndDate(e.target.value)} 
                className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none"
                placeholder="End Date"
              />
            </div>

            <select 
              value={filterFinancialYear} 
              onChange={(e) => setFilterFinancialYear(e.target.value)}
              className="bg-slate-50 px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold text-slate-600 focus:outline-none"
            >
              <option value="">All Financial Years</option>
              <option value="2023-24">FY 2023-24</option>
              <option value="2024-25">FY 2024-25</option>
              <option value="2025-26">FY 2025-26</option>
            </select>

            <select 
              value={filterSourceType} 
              onChange={(e) => setFilterSourceType(e.target.value)}
              className="bg-slate-50 px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold text-slate-600 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="rishikul pharmacy">Rishikul Pharmacy</option>
              <option value="tender">Tender</option>
            </select>

            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-50 px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold text-slate-600 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="classical">Classical</option>
              <option value="patent">Patent</option>
            </select>

            <button 
              onClick={downloadAdminCSV}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Demands</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{filteredDemands.length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Quantity</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              {filteredDemands.reduce((acc, curr) => acc + curr.quantity_requested, 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hospitals Requesting</p>
            <p className="text-3xl font-black text-blue-600 mt-1">
              {new Set(filteredDemands.map(d => d.hospital_id)).size}
            </p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending Approval</p>
            <p className="text-3xl font-black text-amber-600 mt-1">
              {filteredDemands.filter(d => d.status === 'Pending').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-emerald-600" />
                Consolidated Demands
              </h3>
              {!isState && selectedMedicines.length > 0 && (
                <div className="flex gap-2">
                  <button 
                    onClick={handleBulkForward}
                    disabled={!canPerformBulkAction}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-lg flex items-center gap-2 ${
                      !canPerformBulkAction 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                    }`}
                  >
                    <ArrowRight size={14} /> Forward Selected ({selectedMedicines.length})
                  </button>
                  <button 
                    onClick={handleBulkRevert}
                    disabled={!canPerformBulkAction}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                      !canPerformBulkAction 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                    }`}
                  >
                    <AlertCircle size={14} /> Revert Selected
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search medicine..."
                className="bg-slate-50 border border-gray-100 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-100">
                {!isState && (
                  <th className="py-6 px-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedMedicines.length === aggregatedList.length && aggregatedList.length > 0}
                      onChange={() => handleSelectAll(aggregatedList.map((i: any) => i.name))}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="text-left py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Medicine Details</th>
                <th className="text-left py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Requested</th>
                <th className="text-left py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Forwarded</th>
                <th className="text-left py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Approved</th>
                <th className="text-left py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="text-left py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Hospitals</th>
                <th className="text-left py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {aggregatedList.map((item: any) => (
                <tr 
                  key={item.name} 
                  onClick={() => {
                    setSelectedMedicineDemands(item);
                    setIsDetailsModalOpen(true);
                  }}
                  className={`group hover:bg-slate-50/30 transition-all cursor-pointer ${selectedMedicines.includes(item.name) ? 'bg-emerald-50/30' : ''}`}
                >
                  {!isState && (
                    <td className="py-6 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedMedicines.includes(item.name)}
                        onChange={() => handleSelectMedicine(item.name)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="py-6 px-8">
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] font-bold tracking-tight mt-0.5">
                        <span className="text-black">{item.details?.packing_size}</span>{' '}
                        <span className="text-emerald-600">{item.details?.unit_type}</span>
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                          {item.details?.category}
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                          {item.details?.source_type}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-8">
                    <span className="font-black text-slate-900 text-lg">{item.total_requested}</span>
                  </td>
                  <td className="py-6 px-8">
                    <span className={`font-bold text-lg ${item.total_forwarded > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                      {item.total_forwarded || '0'}
                    </span>
                  </td>
                  <td className="py-6 px-8">
                    <span className={`font-bold text-lg ${item.total_approved > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {item.total_approved || '0'}
                    </span>
                  </td>
                  <td className="py-6 px-8">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      item.total_forwarded > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.total_forwarded > 0 ? 'Forwarded' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-6 px-8">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {item.hospitals.size}
                    </span>
                  </td>
                  <td className="py-6 px-8">
                    <div className="text-[10px] font-medium text-slate-500 space-y-1">
                      {item.latest_demand_date && (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="font-bold text-slate-400 w-3 text-right">D:</span>
                          <span className="font-bold text-slate-700">{formatDate(item.latest_demand_date)}</span>
                        </div>
                      )}
                      {item.latest_forwarding_date && (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="font-bold text-blue-400 w-3 text-right">F:</span>
                          <span className="font-bold text-blue-600">{formatDate(item.latest_forwarding_date)}</span>
                        </div>
                      )}
                      {item.latest_approval_date && (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="font-bold text-emerald-400 w-3 text-right">A:</span>
                          <span className="font-bold text-emerald-600">{formatDate(item.latest_approval_date)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-slate-400 font-medium">Loading demand system...</p>
          </div>
        ) : (
          <>
            {view === 'hospital' && renderHospitalView()}
            {view === 'district' && renderAdminView(false)}
            {view === 'state' && renderAdminView(true)}
          </>
        )}
      </div>

      {/* New Demand Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Demand</h2>
                  <p className="text-sm text-slate-500 font-medium">
                    Select medicine from master list ({medicineMaster.length} total)
                  </p>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Tabs Header */}
                <div className={`flex border-b border-gray-100 px-8 ${isModuleActive ? 'bg-slate-50/50' : 'bg-slate-100 opacity-50'}`}>
                  {[
                    { id: 'classical_rishikul', label: 'Classical (Rishikul)' },
                    { id: 'classical_tender', label: 'Classical (Tender)' },
                    { id: 'patent_tender', label: 'Patent (Tender)' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      disabled={!isModuleActive}
                      onClick={() => setActiveDemandTab(tab.id as any)}
                      className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                        activeDemandTab === tab.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                      } ${!isModuleActive ? 'cursor-not-allowed' : ''}`}
                    >
                      {tab.label}
                      {activeDemandTab === tab.id && isModuleActive && (
                        <motion.div layoutId="activeDemandTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Search Bar for Active Tab */}
                <div className="p-6 px-8 border-b border-gray-100 bg-white">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder={`Search in ${activeDemandTab.replace(/_/g, ' ')}...`}
                      value={searchQueries[activeDemandTab]}
                      onChange={(e) => setSearchQueries({ ...searchQueries, [activeDemandTab]: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                    />
                  </div>
                </div>

                {/* Medicine List */}
                <div className="flex-1 overflow-y-auto p-8 pt-4">
                  {loading ? (
                    <div className="py-20 text-center">
                      <Loader2 className="mx-auto text-emerald-600 animate-spin mb-4" size={40} />
                      <p className="text-slate-500 font-medium">Fetching medicine list...</p>
                    </div>
                  ) : fetchError ? (
                    <div className="py-20 text-center">
                      <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
                      <p className="text-slate-500 font-medium">Error fetching medicines</p>
                      <p className="text-xs text-red-400 mt-1 bg-red-50 p-4 rounded-2xl mx-auto max-w-md border border-red-100">
                        {fetchError}
                      </p>
                      <button 
                        onClick={fetchInitialData}
                        className="mt-6 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : medicineMaster.length === 0 ? (
                    <div className="py-20 text-center">
                      <AlertCircle size={40} className="mx-auto text-amber-400 mb-4" />
                      <p className="text-slate-500 font-medium">Medicine master list is empty.</p>
                      <p className="text-xs text-slate-400 mt-1">Please contact Admin to populate the medicine_master table.</p>
                      <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-dashed border-gray-200 max-w-sm mx-auto">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Technical Debug Info</p>
                        <ul className="text-[10px] text-slate-500 text-left space-y-1">
                          <li>• Table: <span className="font-mono">medicine_master</span></li>
                          <li>• Records Fetched: 0</li>
                          <li>• <span className="text-amber-600 font-bold">Root Cause:</span> Your Supabase policy is set to 'authenticated', but the app uses a custom login. Supabase sees you as 'anon' (anonymous).</li>
                          <li>• <span className="text-emerald-600 font-bold">Fix:</span> Change the policy in Supabase to apply to <span className="font-bold underline">anon</span> or <span className="font-bold underline">public</span>.</li>
                          <li>• <span className="text-slate-400 font-bold italic">Technical Tip:</span> Select 'public' in the 'Applied to' dropdown in Supabase.</li>
                        </ul>
                      </div>
                      <button 
                        onClick={fetchInitialData}
                        className="mt-6 bg-white border border-gray-200 text-slate-600 px-6 py-2 rounded-xl font-bold hover:bg-slate-50 transition-all"
                      >
                        Refresh Data
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {medicineMaster
                        .filter(m => {
                          const query = (searchQueries[activeDemandTab] || '').toLowerCase();
                          const normalizedQuery = normalizeForSearch(query);
                          const normalizedMedName = normalizeForSearch(m.medicine_name);
                          const fullString = normalizeForSearch(`${m.medicine_name}${m.packing_size}${m.unit_type}`);
                          
                          const matchesSearch = !query || normalizedMedName.includes(normalizedQuery) || fullString.includes(normalizedQuery);
                          
                          const category = (m.category || '').toLowerCase();
                          const sourceType = (m.source_type || '').toLowerCase();

                          if (activeDemandTab === 'classical_rishikul') {
                            return matchesSearch && category === 'classical' && sourceType === 'rishikul pharmacy';
                          } else if (activeDemandTab === 'classical_tender') {
                            return matchesSearch && category === 'classical' && sourceType === 'tender';
                          } else {
                            return matchesSearch && category === 'patent';
                          }
                        })
                        .map(m => {
                          const existingDemand = demands.find(d => d.medicine_id === m.id && !d.is_fulfilled);
                          return (
                            <div
                              key={m.id}
                              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                                draftDemands[m.id] > 0 
                                  ? 'bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-100' 
                                  : 'bg-white border-gray-100 hover:border-emerald-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                draftDemands[m.id] > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                              }`}>
                                <Package size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 truncate">{m.medicine_name}</p>
                                <p className="text-[10px] uppercase font-bold tracking-tighter">
                                  <span className="text-black">{m.packing_size}</span>{' '}
                                  <span className="text-emerald-600">{m.unit_type}</span>
                                </p>
                              </div>
                              
                              {existingDemand ? (
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg block w-full text-center">
                                  Previous demand for this medicine is still active. Mark as Fulfilled to request again.
                                </span>
                              ) : (
                                <div className="w-32">
                                  <input 
                                    type="number"
                                    min="0"
                                    placeholder="Qty"
                                    value={draftDemands[m.id] || ''}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setDraftDemands(prev => ({ ...prev, [m.id]: val }));
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      
                      {medicineMaster.filter(m => {
                          const query = (searchQueries[activeDemandTab] || '').toLowerCase();
                          const matchesSearch = (m.medicine_name || '').toLowerCase().includes(query);
                          const category = (m.category || '').toLowerCase();
                          const sourceType = (m.source_type || '').toLowerCase();

                          if (activeDemandTab === 'classical_rishikul') {
                            return matchesSearch && category === 'classical' && sourceType === 'rishikul pharmacy';
                          } else if (activeDemandTab === 'classical_tender') {
                            return matchesSearch && category === 'classical' && sourceType === 'tender';
                          } else {
                            return matchesSearch && category === 'patent';
                          }
                        }).length === 0 && (
                        <div className="col-span-full py-20 text-center">
                          <Package size={40} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-slate-400 font-medium">No medicines found in this category.</p>
                          <p className="text-xs text-slate-300 mt-1">Try a different search term or check another tab.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmitDemand} className="p-8 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-end gap-6">
                <div className="flex gap-4 w-full sm:w-auto">
                  <button 
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={Object.values(draftDemands).every(v => typeof v !== 'number' || v <= 0)}
                    type="submit"
                    className="flex-1 sm:px-12 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Selected Demands
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedMedicineDemands && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Package size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedMedicineDemands.name}</h2>
                    <p className="text-sm text-slate-500 font-medium">
                      {selectedMedicineDemands.details?.category} • {selectedMedicineDemands.details?.source_type} • <span className="text-black">{selectedMedicineDemands.details?.packing_size}</span> <span className="text-emerald-600">{selectedMedicineDemands.details?.unit_type}</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="bg-slate-50 rounded-3xl p-6 mb-8 grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Requested</p>
                    <p className="text-2xl font-black text-slate-900">{selectedMedicineDemands.total_requested}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Forwarded</p>
                    <p className="text-2xl font-black text-blue-600">{selectedMedicineDemands.total_forwarded}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Approved</p>
                    <p className="text-2xl font-black text-emerald-600">{selectedMedicineDemands.total_approved}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 ml-2">Hospital-wise Breakdown</h3>
                  <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-gray-100">
                          <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Hospital / Facility</th>
                          <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">District</th>
                          <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Requested</th>
                          <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Forwarded</th>
                          <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Approved</th>
                          <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedMedicineDemands.demands.map((demand: MedicineDemand) => (
                          <tr key={demand.id} className="hover:bg-slate-50/30 transition-all">
                            <td className="py-4 px-6">
                              <p className="font-bold text-slate-900">{demand.hospitals?.facility_name}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-xs font-medium text-slate-500">{demand.hospitals?.district}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-bold text-slate-900">{demand.quantity_requested}</span>
                            </td>
                            <td className="py-4 px-6">
                              {editingDemandId === demand.id && (session.role === 'DISTRICT_ADMIN' || session.role === 'DISTRICT_MEDICINE_INCHARGE' || session.role === 'STATE_ADMIN') ? (
                                <input 
                                  type="number"
                                  value={editValue}
                                  max={demand.quantity_requested}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    if ((session.role === 'DISTRICT_ADMIN' || session.role === 'DISTRICT_MEDICINE_INCHARGE') && val > demand.quantity_requested) {
                                      // Don't allow increasing beyond requested
                                      return;
                                    }
                                    setEditValue(val);
                                  }}
                                  className="w-20 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                              ) : (
                                <span className={`font-bold ${demand.quantity_forwarded ? 'text-blue-600' : 'text-slate-300'}`}>
                                  {demand.quantity_forwarded || 'Pending'}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {editingDemandId === demand.id && session.role === 'STATE_ADMIN' ? (
                                <input 
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                                  className="w-20 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                              ) : (
                                <span className={`font-bold ${demand.quantity_approved ? 'text-emerald-600' : 'text-slate-300'}`}>
                                  {demand.quantity_approved || 'Pending'}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              {editingDemandId === demand.id ? (
                                <div className="flex justify-end items-center gap-2">
                                  {(session.role === 'STATE_ADMIN' || session.role === 'DISTRICT_ADMIN' || session.role === 'DISTRICT_MEDICINE_INCHARGE') && (
                                    <button
                                      onClick={() => {
                                        const comment = prompt("Enter reason for reverting:");
                                        if (comment) {
                                          handleRevertDemand(demand.id, comment);
                                          setEditingDemandId(null);
                                        }
                                      }}
                                      className="p-1 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                                      title="Revert to Hospital"
                                    >
                                      <AlertCircle size={18} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => setEditingDemandId(null)}
                                    className="p-1 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                  >
                                    <X size={18} />
                                  </button>
                                  <button 
                                    onClick={() => updateDemand(demand.id, session.role === 'STATE_ADMIN' ? 'quantity_approved' : 'quantity_forwarded', editValue)}
                                    className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                                  >
                                    <CheckCircle2 size={18} />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setEditingDemandId(demand.id);
                                    setEditValue(session.role === 'STATE_ADMIN' ? (demand.quantity_approved || demand.quantity_forwarded || demand.quantity_requested) : (demand.quantity_forwarded || demand.quantity_requested));
                                  }}
                                  disabled={(session.role === 'DISTRICT_ADMIN' || session.role === 'DISTRICT_MEDICINE_INCHARGE') && demand.status === 'Forwarded'}
                                  className={`font-bold text-xs hover:underline ${
                                    (session.role === 'DISTRICT_ADMIN' || session.role === 'DISTRICT_MEDICINE_INCHARGE') && demand.status === 'Forwarded' 
                                      ? 'text-slate-300 cursor-not-allowed' 
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmationId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmationId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                <Trash size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Demand?</h3>
              <p className="text-slate-500 mb-8">Are you sure you want to delete this demand? This action cannot be undone.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeleteConfirmationId(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteDemand}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toggle Confirmation Modal */}
      <AnimatePresence>
        {isToggleModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsToggleModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center z-[121]"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isModuleActive ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {isModuleActive ? <Lock size={32} /> : <Unlock size={32} />}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {isModuleActive ? 'Turn off Demand Module?' : 'Turn on Demand Module?'}
              </h3>
              <p className="text-slate-500 mb-8">
                {isModuleActive 
                  ? 'This will disable the demand module for all Incharges. They will see a "Module Deactivated" banner.' 
                  : 'This will enable the demand module for all Incharges.'}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsToggleModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  No, Go back
                </button>
                <button 
                  onClick={performToggleModule}
                  className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors shadow-lg ${
                    isModuleActive 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-100' 
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                  }`}
                >
                  Yes, {isModuleActive ? 'Turn Off' : 'Turn On'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[130] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm ${
              toast.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-red-600 text-white shadow-red-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Loader2({ className, size }: { className?: string, size?: number }) {
  return <Activity className={className} size={size} />;
}

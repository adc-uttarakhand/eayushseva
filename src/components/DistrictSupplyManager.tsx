import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  Plus, 
  ArrowRight, 
  History,
  Clock,
  Building2,
  Calendar,
  Database,
  ArrowUpRight,
  ClipboardList,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  FlaskConical,
  FileText,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';

interface DistrictSupplyManagerProps {
  session: UserSession;
}

const DISTRICT_ALIASES: { [key: string]: string[] } = {
  'ALMORA': ['ALMORA'],
  'BAGESHWAR': ['BAGESHWAR'],
  'CHAMOLI': ['CHAMOLI'],
  'CHAMPAWAT': ['CHAMPAWAT'],
  'DEHRADUN': ['DEHRADUN'],
  'HARIDWAR': ['HARIDWAR'],
  'NAINITAL': ['NAINITAL'],
  'PAURI': ['PAURI', 'PAURI GARHWAL', 'PAURIGARHWAL'],
  'PITHORAGARH': ['PITHORAGARH'],
  'RUDRAPRAYAG': ['RUDRAPRAYAG'],
  'TEHRI': ['TEHRI', 'TEHRI GARHWAL'],
  'UDHAM SINGH NAGAR': ['UDHAM SINGH NAGAR', 'U.S. NAGAR', 'U S NAGAR', 'US NAGAR', 'UDHAMSINGH NAGAR'],
  'UTTARKASHI': ['UTTARKASHI']
};

const normalizeDistrict = (name: string) => {
  if (!name) return '';
  const sanitized = name.toUpperCase().replace(/[.\-\s]/g, '');
  for (const [standardName, aliases] of Object.entries(DISTRICT_ALIASES)) {
    for (const alias of aliases) {
      if (alias.toUpperCase().replace(/[.\-\s]/g, '') === sanitized) {
        return standardName;
      }
    }
  }
  return name.toUpperCase();
};

export default function DistrictSupplyManager({ session }: DistrictSupplyManagerProps) {
  const [activeTab, setActiveTab] = useState<'receiving' | 'received' | 'returns' | 'dispatch' | 'confirmations' | 'logs'>('receiving');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  const [receivingPage, setReceivingPage] = useState(0);
  const [receivedPage, setReceivedPage] = useState(0);
  const PAGE_SIZE = 1000;
  
  const [stateOrders, setStateOrders] = useState<any[]>([]);
  const [districtInventory, setDistrictInventory] = useState<any[]>([]);
  const [receivedInventory, setReceivedInventory] = useState<any[]>([]);
  const [pendingClaims, setPendingClaims] = useState<any[]>([]);
  const [sampleRequests, setSampleRequests] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logDateFilter, setLogDateFilter] = useState('');
  const [logOrderFilter, setLogOrderFilter] = useState('');
  const [logMedicineFilter, setLogMedicineFilter] = useState('');
  const [receivedOrderFilter, setReceivedOrderFilter] = useState('');
  const [receivedSupplyTypeFilter, setReceivedSupplyTypeFilter] = useState<'ALL' | 'Rishikul Pharmacy' | 'Tender'>('ALL');
  const [receivedStartDate, setReceivedStartDate] = useState('');
  const [receivedEndDate, setReceivedEndDate] = useState('');
  const [receivedManufacturerFilter, setReceivedManufacturerFilter] = useState('');
  const [districtHospitals, setDistrictHospitals] = useState<any[]>([]);

  // Batch editing state
  const [isEditBatchModalOpen, setIsEditBatchModalOpen] = useState(false);
  const [isEditQtyModalOpen, setIsEditQtyModalOpen] = useState(false);
  const [editingBatchItem, setEditingBatchItem] = useState<any>(null);
  const [editBatchForm, setEditBatchForm] = useState({ batch_no: '', mfg_date: '', expiry_date: '' });
  const [editQtyForm, setEditQtyForm] = useState({ total_received: 0 });

  // Per-row state for receiving batch details
  const [rowValues, setRowValues] = useState<{ [key: string]: { batch_no: string, mfg_date: string, expiry_date: string } }>({});

  const formatMonthYear = (dateStr: string | undefined): string => {
    if (!dateStr) return 'N/A';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const [year, month] = parts;
        return `${month}/${year}`;
      }
    }
    return dateStr;
  };

  const getQualityReportBadge = (report: string | null) => {
    const normalized = (report || '').toUpperCase().trim();
    let label = 'NR';
    let color = 'bg-slate-200 text-slate-600';

    if (normalized === 'STANDARD QUALITY') {
      label = 'SQ';
      color = 'bg-emerald-100 text-emerald-700';
    } else if (normalized === 'NOT OF STANDARD QUALITY') {
      label = 'NSQ';
      color = 'bg-red-100 text-red-700';
    }

    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${color} border border-white shadow-sm`}>
        {label}
      </div>
    );
  };

  const handleDateInput = (id: string, value: string, field: 'mfg_date' | 'expiry_date') => {
    let clean = value.replace(/\D/g, '');
    if (clean.length > 6) clean = clean.slice(0, 6);
    let formatted = clean;
    if (clean.length > 2) {
      formatted = clean.slice(0, 2) + '/' + clean.slice(2);
    }
    setRowValues(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: formatted }
    }));
  };

  const formatToDatabaseDate = (mm_yyyy: string): string | null => {
    if (!mm_yyyy) return null;
    const parts = mm_yyyy.split('/');
    if (parts.length !== 2) return null;
    const [month, year] = parts;
    if (month.length !== 2 || year.length !== 4) return null;
    const m = parseInt(month, 10);
    if (m < 1 || m > 12) return null;
    return `${year}-${month}-01`;
  };

  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');
  const [receiveOrderFilter, setReceiveOrderFilter] = useState('');
  const [receiveSupplyTypeFilter, setReceiveSupplyTypeFilter] = useState<'ALL' | 'Rishikul Pharmacy' | 'Tender'>('ALL');
  const [dispatchOrderFilter, setDispatchOrderFilter] = useState('');
  const [dispatchStartDate, setDispatchStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dispatchEndDate, setDispatchEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [dispatchQuantities, setDispatchQuantities] = useState<{ [inventory_id: string]: number }>({});
  const [approvedQuantities, setApprovedQuantities] = useState<{ [claimId: string]: number }>({});
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const downloadHospitalDispatches = async (hospitalId: string, hospitalName: string) => {
    try {
      let query = supabase
        .from('hospital_dispatches')
        .select('*, medicine_master(*)')
        .eq('hospital_id', hospitalId);
      
      if (dispatchStartDate) {
        query = query.gte('dispatch_date', `${dispatchStartDate}T00:00:00`);
      }
      if (dispatchEndDate) {
        query = query.lte('dispatch_date', `${dispatchEndDate}T23:59:59`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const worksheet = XLSX.utils.json_to_sheet(data.map(d => ({
        'Order Number': d.order_number,
        'Medicine Name': d.medicine_master?.medicine_name,
        'Quality Report': d.quality_report,
        'Batch Number': d.batch_no,
        'Mfg Date': d.mfg_date,
        'Expiry Date': d.expiry_date,
        'Status': d.status,
        'Dispatch Date': d.dispatch_date,
        'Receiving Date': d.receiving_date,
        'Request Date': d.request_date
      })));
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dispatches');
      XLSX.writeFile(workbook, `${hospitalName}_dispatches.xlsx`);
    } catch (err) {
      console.error('Error downloading dispatches:', err);
    }
  };

  const rawDistrict = session.access_districts?.[0] || session.district || '';
  const district = normalizeDistrict(rawDistrict);

  // Independent effect for hospitals
  useEffect(() => {
    const fetchHospitals = async () => {
      if (!district) return;
      console.log("Logged District:", district);
      try {
        const { data } = await supabase
          .from('hospitals')
          .select('hospital_id, facility_name')
          .or(`district.ilike.%${district.toUpperCase()}%,district.ilike.%${rawDistrict.toUpperCase()}%`);
        setDistrictHospitals(data || []);
        console.log("Hospitals Found:", data?.length || 0);
      } catch (err) {
        console.error('Error fetching hospitals:', err);
      }
    };
    fetchHospitals();
  }, [district]);

  const fetchInventory = async () => {
    if (!district) return;
    try {
      const { data: inv } = await supabase
        .from('district_inventory')
        .select('*, medicine_master(*)')
        .ilike('district', district.toUpperCase())
        .eq('is_returned', false)
        .gt('remaining_qty', 0);
      
      const [samplesRes, dispatchesRes] = await Promise.all([
        supabase
          .from('sample_requests')
          .select('inventory_id, medicine_name, batch_number, order_no, quality_report, requested_amount, status')
          .ilike('district', district.toUpperCase())
          .order('requested_at', { ascending: false }),
        supabase
          .from('hospital_dispatches')
          .select('medicine_id, batch_no, order_number, quantity')
          .ilike('district', district.toUpperCase())
          .eq('status', 'Dispatched')
      ]);
      
      const samples = samplesRes.data;
      const dispatches = dispatchesRes.data;
      
      if (samplesRes.error) console.error('Error fetching samples for inventory:', samplesRes.error);
      if (dispatchesRes.error) console.error('Error fetching dispatches for inventory:', dispatchesRes.error);
      
      const mergedInv = inv?.map(item => {
        const unclearedHospital = dispatches
          ?.filter(d => d.medicine_id === item.medicine_id && d.batch_no === item.batch_no && d.order_number === item.order_number)
          .reduce((sum, d) => sum + d.quantity, 0) || 0;

        const unclearedSampling = samples
          ?.filter(s => (s.inventory_id === item.id || (s.medicine_name === item.medicine_master?.medicine_name && s.batch_number === item.batch_no && s.order_no === item.order_number)) && s.status === 'Sent')
          .reduce((sum, s) => sum + (s.requested_amount || 0), 0) || 0;

        const unclearedQty = unclearedHospital + unclearedSampling;

        const sampleWithReport = samples?.find(s => 
          (s.inventory_id === item.id || 
          (s.medicine_name === item.medicine_master?.medicine_name && 
           s.batch_number === item.batch_no &&
           s.order_no === item.order_number)) &&
          s.quality_report
        );
        const anySample = samples?.find(s => 
          s.inventory_id === item.id || 
          (s.medicine_name === item.medicine_master?.medicine_name && 
           s.batch_number === item.batch_no &&
           s.order_no === item.order_number)
        );
        return { 
          ...item, 
          quality_report: sampleWithReport?.quality_report || anySample?.quality_report || item.quality_report,
          uncleared_qty: unclearedQty
        };
      });
      
      setDistrictInventory(mergedInv || []);
      console.log("Inventory Found:", mergedInv?.length || 0);
    } catch (err) {
      console.error('Error fetching district inventory:', err);
    }
  };

  // Independent effect for district inventory
  useEffect(() => {
    fetchInventory();
  }, [district]);

  useEffect(() => {
    console.log('DistrictSupplyManager: Session District:', rawDistrict, 'Normalized:', district);
    if (district) {
      fetchData();
    }
  }, [district, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'receiving') {
        console.log(`Fetching Dispatched orders for district: ${district}`);
        let query = supabase
          .from('state_supply_orders')
          .select('*, medicine_master(*)')
          .range(receivingPage * PAGE_SIZE, (receivingPage + 1) * PAGE_SIZE - 1);
        
        if (district !== 'ALL') {
          query = query.ilike('district_name', district.toUpperCase());
        }
        
        const { data, error } = await query.eq('status', 'Dispatched');
        
        if (error) throw error;
        console.log(`Found ${data?.length || 0} orders for receiving.`);
        setStateOrders([...(data || [])]); // Force new array for re-render
        
        const formatFromDatabaseDate = (dbDate: string | null): string => {
          if (!dbDate) return '';
          const parts = dbDate.split('-');
          if (parts.length >= 2) {
            return `${parts[1]}/${parts[0]}`;
          }
          return '';
        };

        // Initialize rowValues for new orders
        const newRowValues = { ...rowValues };
        data?.forEach(order => {
          if (!newRowValues[order.id]) {
            newRowValues[order.id] = { 
              batch_no: order.batch_number || '', 
              mfg_date: formatFromDatabaseDate(order.mfg_date), 
              expiry_date: formatFromDatabaseDate(order.expiry_date),
              received_qty: order.allocated_qty?.toString() || ''
            };
          }
        });
        setRowValues(newRowValues);
      } else if (activeTab === 'received') {
        const [invRes, dispatchesRes, samplesRes] = await Promise.all([
          supabase
            .from('district_inventory')
            .select('*, medicine_master(medicine_name, unit_type, packing_size)')
            .ilike('district', district.toUpperCase())
            .order('receiving_date', { ascending: false })
            .range(receivedPage * PAGE_SIZE, (receivedPage + 1) * PAGE_SIZE - 1),
          supabase
            .from('hospital_dispatches')
            .select('medicine_id, batch_no, order_number, quantity')
            .ilike('district', district.toUpperCase())
            .eq('status', 'Dispatched'),
          supabase
            .from('sample_requests')
            .select('inventory_id, medicine_name, batch_number, order_no, quality_report')
            .ilike('district', district.toUpperCase())
            .order('requested_at', { ascending: false })
        ]);

        const invData = invRes.data || [];
        const dispatches = dispatchesRes.data || [];
        const samples = samplesRes.data || [];

        const mergedReceived = invData.map(item => {
          const unclearedQty = dispatches
            ?.filter(d => d.medicine_id === item.medicine_id && d.batch_no === item.batch_no && d.order_number === item.order_number)
            .reduce((sum, d) => sum + d.quantity, 0) || 0;

          const sampleWithReport = samples?.find(s => 
            (s.inventory_id === item.id || 
            (s.medicine_name === item.medicine_master?.medicine_name && 
             s.batch_number === item.batch_no &&
             s.order_no === item.order_number)) &&
            s.quality_report
          );
          const anySample = samples?.find(s => 
            s.inventory_id === item.id || 
            (s.medicine_name === item.medicine_master?.medicine_name && 
             s.batch_number === item.batch_no &&
             s.order_no === item.order_number)
          );

          return { 
            ...item, 
            uncleared_qty: unclearedQty,
            quality_report: sampleWithReport?.quality_report || anySample?.quality_report || item.quality_report
          };
        });

        setReceivedInventory(mergedReceived);
      } else if (activeTab === 'returns') {
        const [invRes, samplesRes] = await Promise.all([
          supabase
            .from('district_inventory')
            .select('*, medicine_master(medicine_name, unit_type, packing_size)')
            .ilike('district', district.toUpperCase())
            .eq('is_returned', true)
            .order('receiving_date', { ascending: false }),
          supabase
            .from('sample_requests')
            .select('inventory_id, medicine_name, batch_number, order_no, quality_report')
            .ilike('district', district.toUpperCase())
            .order('requested_at', { ascending: false })
        ]);

        const invData = invRes.data || [];
        const samples = samplesRes.data || [];

        const mergedReturns = invData.map(item => {
          const sampleWithReport = samples?.find(s => 
            (s.inventory_id === item.id || 
            (s.medicine_name === item.medicine_master?.medicine_name && 
             s.batch_number === item.batch_no &&
             s.order_no === item.order_number)) &&
            s.quality_report
          );
          return { 
            ...item, 
            quality_report: sampleWithReport?.quality_report || item.quality_report
          };
        });

        setReceivedInventory(mergedReturns);
      } else if (activeTab === 'dispatch') {
        fetchInventory();
        const { data: sampleData } = await supabase
          .from('sample_requests')
          .select('*')
          .ilike('district', district.toUpperCase());
        setSampleRequests(sampleData || []);
      } else if (activeTab === 'confirmations') {
        const { data, error } = await supabase
          .from('hospital_dispatches')
          .select('*, medicine_master!inner(medicine_name, unit_type, packing_size), hospitals!inner(facility_name)')
          .or(`district.ilike.%${district}%,status.eq.Pending Approval`)
          .ilike('status', 'Pending%');
        
        if (error) {
          console.error('Error fetching confirmations:', error);
        }
        
        const claims = data || [];
        if (claims.length === 0) {
          console.log('App thinks there are 0 claims for:', district);
        }
        setPendingClaims(claims);

        // Fetch sample requests
        const { data: sampleData, error: sampleError } = await supabase
          .from('sample_requests')
          .select('*')
          .ilike('district', district.toUpperCase())
          .eq('status', 'Pending');
        
        if (sampleError) {
          console.error('Error fetching sample requests:', sampleError);
          setSampleRequests([]);
        } else {
          setSampleRequests(sampleData || []);
        }
      } else if (activeTab === 'logs') {
        const [dispatchesRes, inventoryRes, samplesRes] = await Promise.all([
          supabase
            .from('hospital_dispatches')
            .select('*, medicine_master(medicine_name, unit_type, packing_size), hospitals(facility_name)')
            .ilike('district', district.toUpperCase())
            .order('created_at', { ascending: false }),
          supabase
            .from('district_inventory')
            .select('*, medicine_master(medicine_name, unit_type, packing_size)')
            .ilike('district', district.toUpperCase())
            .order('receiving_date', { ascending: false }),
          supabase
            .from('sample_requests')
            .select('*')
            .ilike('district', district.toUpperCase())
            .order('requested_at', { ascending: false })
        ]);

        const allLogs: any[] = [];
        
        if (inventoryRes.data) {
          inventoryRes.data.forEach(item => {
            allLogs.push({
              id: `inv_${item.id}`,
              date: item.receiving_date || item.created_at,
              type: 'Received',
              order_number: item.order_number,
              medicine_name: item.medicine_master?.medicine_name,
              packing_size: item.medicine_master?.packing_size,
              unit_type: item.medicine_master?.unit_type,
              batch_no: item.batch_no,
              mfg_date: item.mfg_date,
              expiry_date: item.expiry_date,
              quantity: item.total_received,
              manufacturer_name: item.manufacturer_name,
              source_destination: 'From State',
              status: 'Received',
              receiving_date: item.receiving_date
            });
          });
        }

        if (dispatchesRes.data) {
          dispatchesRes.data.forEach(item => {
            allLogs.push({
              id: `disp_${item.id}`,
              date: item.dispatch_date || item.created_at,
              type: item.action_type === 'Push_by_District' ? 'Dispatched' : 'Claim Approved',
              order_number: item.order_number,
              medicine_name: item.medicine_master?.medicine_name,
              packing_size: item.medicine_master?.packing_size,
              unit_type: item.medicine_master?.unit_type,
              manufacturer_name: item.manufacturer_name,
              batch_no: item.batch_no,
              mfg_date: item.mfg_date,
              expiry_date: item.expiry_date,
              quantity: item.quantity,
              source_destination: `To ${item.hospitals?.facility_name || 'Hospital'}`,
              status: item.status,
              dispatch_date: item.dispatch_date,
              receiving_date: item.receiving_date,
              request_date: item.request_date
            });
          });
        }

        if (samplesRes.data) {
          samplesRes.data.forEach(item => {
            allLogs.push({
              id: `samp_${item.id}`,
              date: item.sent_at || item.requested_at,
              type: 'Sample Request',
              order_number: item.order_no,
              medicine_name: item.medicine_name,
              packing_size: item.packing_size,
              unit_type: item.unit_type,
              manufacturer_name: item.manufacturer_name,
              batch_no: item.batch_number || 'N/A',
              mfg_date: item.mfg_date || 'N/A',
              expiry_date: item.expiry_date || 'N/A',
              quantity: item.requested_amount,
              source_destination: 'To State Admin',
              status: item.status,
              requested_at: item.requested_at,
              sent_at: item.sent_at,
              received_at: item.received_at,
              reported_at: item.reported_at
            });
          });
        }

        allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLogs(allLogs);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async (order: any) => {
    const details = rowValues[order.id];
    if (!details?.batch_no || !details?.mfg_date || !details?.expiry_date || !details?.received_qty) {
      alert('Please fill all batch details and received quantity for this item');
      return;
    }

    const mfgDateDb = formatToDatabaseDate(details.mfg_date);
    const expiryDateDb = formatToDatabaseDate(details.expiry_date);
    const receivedQty = Number(details.received_qty);

    if (!mfgDateDb || !expiryDateDb || isNaN(receivedQty) || receivedQty <= 0) {
      alert('Please use MM/YYYY format for dates (e.g., 12/2027) and enter a valid positive received quantity');
      return;
    }

    setProcessing(order.id);
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const istTimestamp = istDate.toISOString().replace('Z', '+05:30');
    try {
      // 1. Update state_supply_orders
      const { error: updateError } = await supabase
        .from('state_supply_orders')
        .update({ 
          status: 'Received'
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // 2. Insert into district_inventory
      const { error: invError } = await supabase
        .from('district_inventory')
        .insert([{
          district: district,
          medicine_id: order.medicine_id,
          batch_no: details.batch_no,
          mfg_date: mfgDateDb,
          expiry_date: expiryDateDb,
          total_received: receivedQty,
          remaining_qty: receivedQty,
          order_number: order.order_no,
          manufacturer_name: order.firm_name,
          receiving_date: istTimestamp,
          source_type: order.medicine_master?.source_type || order.source_type
        }]);

      if (invError) throw invError;

      alert('Stock received and added to district inventory');
      
      // Clean up row state
      const newRowValues = { ...rowValues };
      delete newRowValues[order.id];
      setRowValues(newRowValues);
      
      fetchData();
      fetchInventory();
    } catch (err) {
      console.error('Error receiving stock:', err);
      alert('Failed to receive stock');
    } finally {
      setProcessing(null);
    }
  };

  const handleSendProactiveSample = async () => {
    const itemsToSample = Object.entries(dispatchQuantities)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([inventory_id, quantity]) => {
        const item = districtInventory.find(i => i.id === inventory_id);
        return { item, quantity: quantity as number };
      })
      .filter(d => d.item && (d.item.remaining_qty - (d.item.uncleared_qty || 0)) >= d.quantity);

    if (itemsToSample.length === 0) {
      alert('Please enter valid quantities for at least one medicine');
      return;
    }

    setProcessing('sampling');
    try {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      const istTimestamp = istDate.toISOString().replace('Z', '+05:30');

      // 1. Create sample_requests records
      const samplePayloads = itemsToSample.map(d => ({
        inventory_id: d.item.id,
        order_no: d.item.order_number,
        medicine_name: d.item.medicine_master?.medicine_name,
        batch_number: d.item.batch_no,
        mfg_date: d.item.mfg_date,
        expiry_date: d.item.expiry_date,
        district: district,
        packing_size: d.item.medicine_master?.packing_size,
        unit_type: d.item.medicine_master?.unit_type,
        requested_amount: d.quantity,
        status: 'Sent',
        requested_at: istTimestamp,
        sent_at: istTimestamp
      }));

      const { error: sampleErr } = await supabase
        .from('sample_requests')
        .insert(samplePayloads);

      if (sampleErr) throw sampleErr;

      // 2. Update district inventory
      // Inventory reduction is now handled when the sample is received by the super admin.
      
      alert('Samples sent successfully!');
      setDispatchQuantities({});
      setSelectedHospitalId('');
      fetchData();
    } catch (err: any) {
      console.error('Error sending samples:', err);
      alert('Failed to send samples: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleDispatch = async () => {
    if (!selectedHospitalId) {
      alert('Please select a hospital first');
      return;
    }

    const itemsToDispatch = Object.entries(dispatchQuantities)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([inventory_id, quantity]) => {
        const item = districtInventory.find(i => i.id === inventory_id);
        return { item, quantity: quantity as number };
      })
      .filter(d => d.item && (d.item.remaining_qty - (d.item.uncleared_qty || 0)) >= d.quantity);

    if (itemsToDispatch.length === 0) {
      alert('Please enter valid quantities for at least one medicine');
      return;
    }

    setProcessing('dispatching');
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const istTimestamp = istDate.toISOString().replace('Z', '+05:30');
    try {
      // Check quality
      for (const d of itemsToDispatch) {
        const sourceType = d.item.medicine_master?.source_type;
        
        if (sourceType === 'Tender') {
          // Check quality_control column in district_inventory
          if (d.item.quality_control !== 'Standard Quality') {
            setAlertMessage(`Quality Not Reported as Standard for ${d.item.medicine_master?.medicine_name} (Batch: ${d.item.batch_no}). Dispatch blocked for Tender medicines.`);
            return;
          }
        }
      }

      const dispatchPayloads = itemsToDispatch.map(d => ({
        district: district,
        hospital_id: selectedHospitalId,
        medicine_id: d.item.medicine_id,
        batch_no: d.item.batch_no,
        mfg_date: d.item.mfg_date,
        expiry_date: d.item.expiry_date,
        quantity: d.quantity,
        action_type: 'Push_by_District',
        status: 'Dispatched',
        order_number: d.item.order_number,
        manufacturer_name: d.item.manufacturer_name,
        quality_report: d.item.quality_report,
        dispatch_date: istTimestamp
      }));

      // 1. Create dispatch records
      const { error: dispatchError } = await supabase
        .from('hospital_dispatches')
        .insert(dispatchPayloads);

      if (dispatchError) throw dispatchError;

      alert('Items dispatched successfully. Inventory will be updated once received by the hospital.');
      setDispatchQuantities({});
      setSelectedHospitalId('');
      setHospitalSearchQuery('');
      fetchData();
      fetchInventory();
    } catch (err) {
      console.error('Error dispatching stock:', err);
      alert('Failed to dispatch stock');
    } finally {
      setProcessing(null);
    }
  };

  const handleConfirmClaim = async (claim: any) => {
    const approvedQty = approvedQuantities[claim.id] || claim.quantity;
    if (approvedQty <= 0) {
      alert('Approved quantity must be greater than 0');
      return;
    }
    setProcessing(claim.id);
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const istTimestamp = istDate.toISOString().replace('Z', '+05:30');
    try {
      // 1. Find district inventory item
      const { data: inv } = await supabase
        .from('district_inventory')
        .select('*, medicine_master(source_type, medicine_name)')
        .ilike('district', district.toUpperCase())
        .eq('medicine_id', claim.medicine_id)
        .gte('remaining_qty', approvedQty)
        .limit(1)
        .single();

      if (!inv) {
        alert('Insufficient stock in district inventory');
        return;
      }

      // Quality Check for Tender medicines
      if (inv.medicine_master?.source_type === 'Tender') {
        if (inv.quality_control !== 'Standard Quality') {
          alert(`Quality Not Reported as Standard for ${inv.medicine_master?.medicine_name} (Batch: ${inv.batch_no}). Dispatch blocked for Tender medicines.`);
          setProcessing(null);
          return;
        }
      }

      // Fetch latest quality report for this batch
      const { data: sampleReport } = await supabase
        .from('sample_requests')
        .select('quality_report')
        .ilike('district', district.toUpperCase())
        .eq('batch_number', inv.batch_no)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 3. Handle based on request_type
      if (claim.request_type === 'Instant_Pull') {
        // 2. Deduct from district_inventory (Only for Instant_Pull as it is auto-received)
        const { error: invError } = await supabase
          .from('district_inventory')
          .update({ 
            remaining_qty: inv.remaining_qty - approvedQty,
            updated_at: istTimestamp
          })
          .eq('id', inv.id);

        if (invError) throw invError;

        // Double-Action: Stock Merge (Auto-Receive)
        const { data: existingBatch } = await supabase
          .from('medicine_inventory')
          .select('quantity')
          .eq('hospital_id', claim.hospital_id)
          .eq('medicine_id', claim.medicine_id)
          .eq('batch_number', inv.batch_no)
          .eq('manufacturer_name', inv.manufacturer_name)
          .maybeSingle();

        const newQuantity = (existingBatch?.quantity || 0) + approvedQty;

        const { error: hospitalInvError } = await supabase
          .from('medicine_inventory')
          .upsert({
            hospital_id: claim.hospital_id,
            medicine_id: claim.medicine_id,
            batch_number: inv.batch_no,
            manufacturer_name: inv.manufacturer_name,
            expiry_date: inv.expiry_date,
            mfg_date: inv.mfg_date,
            quantity: newQuantity,
            order_number: inv.order_number,
            district: district,
            receiving_date: istTimestamp
          }, {
            onConflict: 'hospital_id,medicine_id,batch_number,manufacturer_name'
          });

        if (hospitalInvError) throw hospitalInvError;

        // Update dispatch status to 'Received'
        await supabase
          .from('hospital_dispatches')
          .update({ 
            status: 'Received', 
            quantity: approvedQty,
            quality_report: sampleReport?.quality_report || null,
            dispatch_date: istTimestamp,
            receiving_date: istTimestamp
          })
          .eq('id', claim.id);
      } else {
        // Manual_Request: Just Dispatch (Do not deduct yet)
        await supabase
          .from('hospital_dispatches')
          .update({ 
            status: 'Dispatched', 
            quantity: approvedQty,
            quality_report: sampleReport?.quality_report || null,
            dispatch_date: istTimestamp
          })
          .eq('id', claim.id);
      }

      alert(claim.request_type === 'Instant_Pull' ? 'Claim approved and stock transferred successfully' : 'Demand approved and stock dispatched successfully');
      fetchData();
    } catch (err) {
      console.error('Error confirming claim:', err);
      alert('Failed to confirm claim');
    } finally {
      setProcessing(null);
    }
  };

  const handleExportExcel = () => {
    const headers = ['Date', 'Medicine', 'Packing Size', 'Unit Type', 'Batch No', 'Mfg Date', 'Expiry Date', 'Manufacturer', 'Order Number', 'Quantity', 'Source/Destination', 'Type', 'Status', 'Request Date', 'Dispatch Date', 'Receiving Date', 'Sample Sent Date', 'Sample Reported Date'];
    const csvContent = [
      headers.join(','),
      ...logs
        .filter(log => {
          if (!logDateFilter) return true;
          return log.date.startsWith(logDateFilter);
        })
        .filter(log => !logOrderFilter || log.order_number?.toLowerCase().includes(logOrderFilter.toLowerCase()))
        .filter(log => !logMedicineFilter || log.medicine_name?.toLowerCase().includes(logMedicineFilter.toLowerCase()))
        .map(log => [
          new Date(log.date).toLocaleDateString(),
          `"${log.medicine_name || ''}"`,
          `"${log.packing_size || ''}"`,
          `"${log.unit_type || ''}"`,
          `"${log.batch_no || ''}"`,
          `"${formatMonthYear(log.mfg_date) || ''}"`,
          `"${formatMonthYear(log.expiry_date) || ''}"`,
          `"${log.manufacturer_name || ''}"`,
          `"${log.order_number || ''}"`,
          log.quantity,
          `"${log.source_destination || ''}"`,
          `"${log.type || ''}"`,
          `"${log.status || ''}"`,
          log.request_date ? new Date(log.request_date).toLocaleDateString() : (log.requested_at ? new Date(log.requested_at).toLocaleDateString() : ''),
          log.dispatch_date ? new Date(log.dispatch_date).toLocaleDateString() : (log.sent_at ? new Date(log.sent_at).toLocaleDateString() : ''),
          log.receiving_date ? new Date(log.receiving_date).toLocaleDateString() : (log.received_at ? new Date(log.received_at).toLocaleDateString() : ''),
          log.sent_at ? new Date(log.sent_at).toLocaleDateString() : '',
          log.reported_at ? new Date(log.reported_at).toLocaleDateString() : ''
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `district_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendSample = async (sampleId: string) => {
    setProcessing(sampleId);
    try {
      // 1. Fetch the sample request
      const { data: sampleReq, error: sampleErr } = await supabase
        .from('sample_requests')
        .select('*')
        .eq('id', sampleId)
        .single();
      
      if (sampleErr || !sampleReq) throw new Error('Sample request not found');

      // 2. Find the corresponding district_inventory record
      const { data: invData, error: invErr } = await supabase
        .from('district_inventory')
        .select('*, medicine_master!inner(medicine_name)')
        .ilike('district', district.toUpperCase())
        .eq('order_number', sampleReq.order_no)
        .eq('medicine_master.medicine_name', sampleReq.medicine_name)
        .limit(1)
        .single();

      if (invErr || !invData) {
        throw new Error('Inventory record not found for this sample request');
      }

      if (invData.remaining_qty < sampleReq.requested_amount) {
        throw new Error('Insufficient inventory to send this sample');
      }

      // 3. Update sample request status (Deduction will happen on receipt by super admin)
      const { error } = await supabase
        .from('sample_requests')
        .update({ 
          status: 'Sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', sampleId);
      
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      console.error('Error sending sample:', err);
      alert(err.message || 'Failed to send sample');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              District <span className="text-emerald-600">Supply Desk</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Managing inventory and dispatches for {district} district.</p>
          </div>
          
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            {[
              { id: 'receiving', label: 'Receiving', icon: Package },
              { id: 'received', label: 'Received', icon: CheckCircle2 },
              { id: 'returns', label: 'Returns', icon: History },
              { id: 'dispatch', label: 'Dispatch Desk', icon: Truck },
              { id: 'confirmations', label: 'Claims', icon: ClipboardList },
              { id: 'logs', label: 'Logs', icon: History }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-slate-400 font-medium">Fetching district data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'receiving' && (
              <motion.div 
                key="receiving"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Filter by Order Number</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Search order number..."
                        value={receiveOrderFilter}
                        onChange={e => setReceiveOrderFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Filter by Supply Type</label>
                    <div className="relative">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <select
                        value={receiveSupplyTypeFilter}
                        onChange={e => setReceiveSupplyTypeFilter(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium appearance-none"
                      >
                        <option value="ALL">All Supplies</option>
                        <option value="Rishikul Pharmacy">Rishikul Pharmacy</option>
                        <option value="Tender">Tender</option>
                      </select>
                    </div>
                  </div>
                </div>

                {stateOrders
                  .filter(order => !receiveOrderFilter || order.order_no?.toLowerCase().includes(receiveOrderFilter.toLowerCase()))
                  .filter(order => {
                    if (receiveSupplyTypeFilter === 'ALL') return true;
                    if (receiveSupplyTypeFilter === 'Rishikul Pharmacy') return order.uploaded_by === 'Manager Rishikul Pharmacy';
                    if (receiveSupplyTypeFilter === 'Tender') return order.uploaded_by !== 'Manager Rishikul Pharmacy';
                    return true;
                  }).length === 0 ? (
                  <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-slate-200">
                    <Package size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">No pending state supplies</h3>
                    <p className="text-slate-500 mt-2">All orders from state have been processed or no matches found.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine & Order Info</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Order Qty</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Received Qty</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Batch Details</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {stateOrders
                            .filter(order => !receiveOrderFilter || order.order_no?.toLowerCase().includes(receiveOrderFilter.toLowerCase()))
                            .filter(order => {
                              if (receiveSupplyTypeFilter === 'ALL') return true;
                              if (receiveSupplyTypeFilter === 'Rishikul Pharmacy') return order.uploaded_by === 'Manager Rishikul Pharmacy';
                              if (receiveSupplyTypeFilter === 'Tender') return order.uploaded_by !== 'Manager Rishikul Pharmacy';
                              return true;
                            })
                            .map(order => (
                            <tr key={order.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
                                      #{order.order_no}
                                    </span>
                                    <span className="text-slate-400 text-[9px] font-medium">
                                      {new Date(order.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <h3 className="text-sm font-bold text-slate-900">{order.medicine_master?.medicine_name}</h3>
                                    <span className="text-[9px] text-slate-500 font-medium">
                                      {order.medicine_master?.packing_size} {order.medicine_master?.unit_type}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                                    <span className="flex items-center gap-1"><Building2 size={12} /> {order.firm_name}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-slate-900">{order.allocated_qty}</span>
                              </td>
                              <td className="px-6 py-4">
                                <input 
                                  type="number"
                                  placeholder="Received Qty"
                                  className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                  value={rowValues[order.id]?.received_qty || ''}
                                  onChange={e => setRowValues({
                                    ...rowValues,
                                    [order.id]: { ...rowValues[order.id], received_qty: e.target.value }
                                  })}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    placeholder="Batch No"
                                    className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    value={rowValues[order.id]?.batch_no || ''}
                                    onChange={e => setRowValues({
                                      ...rowValues,
                                      [order.id]: { ...rowValues[order.id], batch_no: e.target.value }
                                    })}
                                  />
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase w-8">Mfg</span>
                                      <input 
                                        type="text" 
                                        placeholder="MM/YYYY"
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-20"
                                        value={rowValues[order.id]?.mfg_date || ''}
                                        onChange={e => handleDateInput(order.id, e.target.value, 'mfg_date')}
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase w-8">Exp</span>
                                      <input 
                                        type="text" 
                                        placeholder="MM/YYYY"
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-20"
                                        value={rowValues[order.id]?.expiry_date || ''}
                                        onChange={e => handleDateInput(order.id, e.target.value, 'expiry_date')}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleReceive(order)}
                                  disabled={processing === order.id}
                                  className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 ml-auto"
                                >
                                  {processing === order.id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                                  Confirm Receipt
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'received' && (
              <motion.div 
                key="received"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Filter by Order Number</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Search order..."
                        value={receivedOrderFilter}
                        onChange={e => setReceivedOrderFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Filter by Supply Type</label>
                    <div className="relative">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <select
                        value={receivedSupplyTypeFilter}
                        onChange={e => setReceivedSupplyTypeFilter(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium appearance-none"
                      >
                        <option value="ALL">All Supplies</option>
                        <option value="Rishikul Pharmacy">Rishikul Pharmacy</option>
                        <option value="Tender">Tender</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Filter by Manufacturer</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Search manufacturer..."
                        value={receivedManufacturerFilter}
                        onChange={e => setReceivedManufacturerFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Start Date</label>
                    <input 
                      type="date"
                      value={receivedStartDate}
                      onChange={e => setReceivedStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">End Date</label>
                    <input 
                      type="date"
                      value={receivedEndDate}
                      onChange={e => setReceivedEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>
                </div>

                {receivedInventory
                  .filter(item => !item.is_returned)
                  .filter(item => !receivedOrderFilter || item.order_number?.toLowerCase().includes(receivedOrderFilter.toLowerCase()))
                  .filter(item => {
                    if (receivedSupplyTypeFilter === 'ALL') return true;
                    if (receivedSupplyTypeFilter === 'Rishikul Pharmacy') return item.manufacturer_name === 'Rishikul Pharmacy';
                    if (receivedSupplyTypeFilter === 'Tender') return item.manufacturer_name !== 'Rishikul Pharmacy';
                    return true;
                  })
                  .filter(item => !receivedManufacturerFilter || item.manufacturer_name?.toLowerCase().includes(receivedManufacturerFilter.toLowerCase()))
                  .filter(item => {
                    if (!receivedStartDate && !receivedEndDate) return true;
                    const itemDate = item.receiving_date ? new Date(item.receiving_date) : null;
                    if (!itemDate) return false;
                    
                    if (receivedStartDate) {
                      const start = new Date(`${receivedStartDate}T00:00:00`);
                      if (itemDate < start) return false;
                    }
                    if (receivedEndDate) {
                      const end = new Date(`${receivedEndDate}T23:59:59`);
                      if (itemDate > end) return false;
                    }
                    return true;
                  }).length === 0 ? (
                  <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-slate-200">
                    <CheckCircle2 size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">No received inventory</h3>
                    <p className="text-slate-500 mt-2">You haven't received any medicines matching the filters.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine & Order Info</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Batch Details</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quantities</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {receivedInventory
                            .filter(item => !item.is_returned)
                            .filter(item => !receivedOrderFilter || item.order_number?.toLowerCase().includes(receivedOrderFilter.toLowerCase()))
                            .filter(item => {
                              if (receivedSupplyTypeFilter === 'ALL') return true;
                              if (receivedSupplyTypeFilter === 'Rishikul Pharmacy') return item.manufacturer_name === 'Rishikul Pharmacy';
                              if (receivedSupplyTypeFilter === 'Tender') return item.manufacturer_name !== 'Rishikul Pharmacy';
                              return true;
                            })
                            .filter(item => !receivedManufacturerFilter || item.manufacturer_name?.toLowerCase().includes(receivedManufacturerFilter.toLowerCase()))
                            .filter(item => {
                              if (!receivedStartDate && !receivedEndDate) return true;
                              const itemDate = item.receiving_date ? new Date(item.receiving_date) : null;
                              if (!itemDate) return false;
                              
                              if (receivedStartDate) {
                                const start = new Date(`${receivedStartDate}T00:00:00`);
                                if (itemDate < start) return false;
                              }
                              if (receivedEndDate) {
                                const end = new Date(`${receivedEndDate}T23:59:59`);
                                if (itemDate > end) return false;
                              }
                              return true;
                            })
                            .map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
                                      {item.medicine_master?.unit_type}
                                    </span>
                                    <span className="font-bold text-slate-900">{item.medicine_master?.medicine_name}</span>
                                    {getQualityReportBadge(item.quality_report)}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 text-[10px] font-medium">
                                      {item.medicine_master?.packing_size}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-emerald-600 text-[10px] font-bold">
                                      Order: #{item.order_number}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Building2 size={12} className="text-slate-400" />
                                    <span className="text-slate-500 text-[10px] font-medium italic">
                                      {item.manufacturer_name || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase w-8">Batch</span>
                                    <span className="text-sm font-medium text-slate-700">{item.batch_no}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase w-8">Mfg</span>
                                    <span className="text-xs font-medium text-slate-600">{formatMonthYear(item.mfg_date)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase w-8">Exp</span>
                                    <span className="text-xs font-medium text-slate-600">{formatMonthYear(item.expiry_date)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Received</span>
                                    <span className="text-sm font-bold text-slate-900">{item.total_received}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Remaining</span>
                                    <div className="flex flex-col items-end">
                                      <span className="text-sm font-bold text-emerald-600">
                                        {item.remaining_qty}
                                      </span>
                                      {item.uncleared_qty > 0 && (
                                        <span className="text-[9px] font-bold text-red-500">
                                          (-{item.uncleared_qty})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <button 
                                    onClick={() => {
                                      setEditingBatchItem(item);
                                      
                                      const formatDate = (dateStr: string) => {
                                        if (!dateStr) return '';
                                        const date = new Date(dateStr);
                                        if (isNaN(date.getTime())) return '';
                                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                        const year = date.getFullYear().toString();
                                        return `${month}/${year}`;
                                      };

                                      setEditBatchForm({ 
                                        batch_no: item.batch_no, 
                                        mfg_date: formatDate(item.mfg_date), 
                                        expiry_date: formatDate(item.expiry_date) 
                                      });
                                      setIsEditBatchModalOpen(true);
                                    }}
                                    className="text-emerald-600 hover:text-emerald-800 font-bold text-xs"
                                  >
                                    Edit Batch Details
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setEditingBatchItem(item);
                                      setEditQtyForm({ total_received: item.total_received });
                                      setIsEditQtyModalOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-bold text-xs"
                                  >
                                    Edit Qty
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {isEditQtyModalOpen && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">Edit Total Received Quantity</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-2">Total Received</label>
                          <input 
                            type="number"
                            value={editQtyForm.total_received}
                            onChange={e => setEditQtyForm({ ...editQtyForm, total_received: Number(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 mt-8">
                        <button 
                          onClick={() => setIsEditQtyModalOpen(false)}
                          className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={async () => {
                            const { error } = await supabase
                              .from('district_inventory')
                              .update({
                                total_received: editQtyForm.total_received,
                                remaining_qty: editQtyForm.total_received - (editingBatchItem.total_received - editingBatchItem.remaining_qty)
                              })
                              .eq('id', editingBatchItem.id);
                            
                            if (error) {
                              console.error('Error updating qty:', error);
                              alert('Failed to update quantity.');
                            } else {
                              setReceivedInventory(receivedInventory.map(item => item.id === editingBatchItem.id ? { ...item, total_received: editQtyForm.total_received, remaining_qty: editQtyForm.total_received - (editingBatchItem.total_received - editingBatchItem.remaining_qty) } : item));
                              setIsEditQtyModalOpen(false);
                            }
                          }}
                          className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isEditBatchModalOpen && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">Edit Batch Details</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-2">Batch Number</label>
                          <input 
                            value={editBatchForm.batch_no}
                            onChange={e => setEditBatchForm({ ...editBatchForm, batch_no: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-2">Manufacturing Date</label>
                          <input 
                            type="text"
                            placeholder="MM/YYYY"
                            value={editBatchForm.mfg_date}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 6) val = val.slice(0, 6);
                              if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                              setEditBatchForm({ ...editBatchForm, mfg_date: val });
                            }}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-2">Expiry Date</label>
                          <input 
                            type="text"
                            placeholder="MM/YYYY"
                            value={editBatchForm.expiry_date}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 6) val = val.slice(0, 6);
                              if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                              setEditBatchForm({ ...editBatchForm, expiry_date: val });
                            }}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 mt-8">
                        <button 
                          onClick={() => setIsEditBatchModalOpen(false)}
                          className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={async () => {
                            const parseDate = (dateStr: string) => {
                              const [month, year] = dateStr.split('/');
                              return `${year}-${month.padStart(2, '0')}-01`;
                            };
                            const mfgDateDb = parseDate(editBatchForm.mfg_date);
                            const expiryDateDb = parseDate(editBatchForm.expiry_date);

                            const { error } = await supabase
                              .from('district_inventory')
                              .update({
                                batch_no: editBatchForm.batch_no,
                                mfg_date: mfgDateDb,
                                expiry_date: expiryDateDb
                              })
                              .eq('id', editingBatchItem.id);
                            
                            if (error) {
                              console.error('Error updating batch:', error);
                              alert('Failed to update batch details.');
                            } else {
                              setReceivedInventory(receivedInventory.map(item => item.id === editingBatchItem.id ? { ...item, ...editBatchForm, mfg_date: mfgDateDb, expiry_date: expiryDateDb } : item));
                              setIsEditBatchModalOpen(false);
                            }
                          }}
                          className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'returns' && (
              <motion.div 
                key="returns"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Filter by Order Number</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Search order..."
                        value={receivedOrderFilter}
                        onChange={e => setReceivedOrderFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500/20 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {receivedInventory
                  .filter(item => item.is_returned)
                  .filter(item => !receivedOrderFilter || item.order_number?.toLowerCase().includes(receivedOrderFilter.toLowerCase()))
                  .length === 0 ? (
                  <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-red-200">
                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">No returned inventory</h3>
                    <p className="text-slate-500 mt-2">Medicines marked as NSQ will appear here.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-[2rem] shadow-sm border border-red-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-red-50/50">
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400">Medicine & Order Info</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400">Batch Details</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-50">
                          {receivedInventory
                            .filter(item => item.is_returned)
                            .filter(item => !receivedOrderFilter || item.order_number?.toLowerCase().includes(receivedOrderFilter.toLowerCase()))
                            .map(item => (
                            <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
                                      #{item.order_number}
                                    </span>
                                    <span className="text-slate-400 text-[9px] font-medium">
                                      {new Date(item.receiving_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <h3 className="text-sm font-bold text-slate-900">{item.medicine_master?.medicine_name}</h3>
                                    <span className="text-[9px] text-slate-500 font-medium">
                                      {item.medicine_master?.packing_size} {item.medicine_master?.unit_type}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Batch:</span>
                                    <span className="text-xs font-bold text-slate-700">{item.batch_no}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                                    <span>M: {formatMonthYear(item.mfg_date)}</span>
                                    <span>E: {formatMonthYear(item.expiry_date)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col items-start gap-2">
                                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    Returned (NSQ)
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {getQualityReportBadge(item.quality_report)}
                                    <span className="text-[10px] text-slate-500 font-medium">Not of Standard Quality</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'dispatch' && (
              <motion.div 
                key="dispatch"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm mb-8 flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[250px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Search Hospital</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Search hospital by name..."
                        value={hospitalSearchQuery}
                        onChange={e => setHospitalSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[250px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Filter by Order Number</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Search order..."
                        value={dispatchOrderFilter}
                        onChange={e => setDispatchOrderFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8 flex flex-wrap gap-6 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Report Start Date</label>
                    <input 
                      type="date"
                      value={dispatchStartDate}
                      onChange={e => setDispatchStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Report End Date</label>
                    <input 
                      type="date"
                      value={dispatchEndDate}
                      onChange={e => setDispatchEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-100">
                    <Clock size={18} className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">Selected Range for Reports</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Send For Sampling Row */}
                  <div className="bg-purple-50 rounded-[2rem] shadow-sm border border-purple-100 overflow-hidden mb-8">
                    <button
                      onClick={() => setSelectedHospitalId(selectedHospitalId === 'SAMPLING' ? '' : 'SAMPLING')}
                      className="w-full px-8 py-6 flex items-center justify-between hover:bg-purple-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-200 text-purple-700 flex items-center justify-center">
                          <FlaskConical size={24} />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-slate-900 text-lg">Send For Sampling</h3>
                          <p className="text-sm font-medium text-purple-600 uppercase tracking-widest">Directorate / ADC</p>
                        </div>
                      </div>
                      <div className="text-purple-400">
                        {selectedHospitalId === 'SAMPLING' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </div>
                    </button>

                    {selectedHospitalId === 'SAMPLING' && (
                      <div className="border-t border-purple-100 bg-white">
                        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                              <Database size={20} className="text-purple-600" />
                              Available District Inventory
                            </h3>
                            <p className="text-slate-500 text-sm mt-1 font-medium">Select quantities to send for sampling</p>
                          </div>
                          <button 
                            onClick={handleSendProactiveSample}
                            disabled={processing === 'sampling' || Object.values(dispatchQuantities).every(q => !q)}
                            className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 disabled:opacity-50 w-full md:w-auto justify-center"
                          >
                            {processing === 'sampling' ? <Loader2 className="animate-spin" size={20} /> : <FlaskConical size={20} />}
                            Send Selected Samples
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Batch & Order</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Manufacturer</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Available Qty</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Sample Qty</th>
                                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Remaining Qty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {districtInventory
                                .filter(item => !dispatchOrderFilter || item.order_number?.toLowerCase().includes(dispatchOrderFilter.toLowerCase()))
                                .map(item => {
                                const dispatchQty = dispatchQuantities[item.id] || 0;
                                const remainingQty = item.remaining_qty - dispatchQty;
                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-8 py-4">
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-bold text-slate-900">{item.medicine_master?.medicine_name}</h4>
                                          {getQualityReportBadge(item.quality_report)}
                                        </div>
                                        <span className="text-[9px] text-slate-500 font-medium">
                                          {item.medicine_master?.packing_size} {item.medicine_master?.unit_type}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700">Batch: {item.batch_no}</span>
                                        <span className="text-[10px] text-purple-600 font-bold">Order: #{item.order_number}</span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Exp: {formatMonthYear(item.expiry_date)}</span>
                                      </div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <span className="text-xs font-medium text-slate-600">{item.manufacturer_name || 'N/A'}</span>
                                    </td>
                                    <td className="px-8 py-4">
                                      <div className="flex flex-col">
                                        <span className="text-lg font-black text-emerald-600">
                                          {item.remaining_qty}
                                        </span>
                                        {item.uncleared_qty > 0 && (
                                          <span className="text-[10px] font-bold text-red-500">
                                            (-{item.uncleared_qty})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-8 py-4">
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.remaining_qty}
                                        value={dispatchQuantities[item.id] || ''}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          const availableQty = item.remaining_qty - (item.uncleared_qty || 0);
                                          if (val > availableQty) {
                                            alert('Dispatch quantity is more than available quantity. Revise Dispatch quantity');
                                            return;
                                          }
                                          setDispatchQuantities(prev => ({ ...prev, [item.id]: val }));
                                        }}
                                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                        placeholder="0"
                                      />
                                    </td>
                                    <td className="px-8 py-4">
                                      <span className={`font-bold ${remainingQty < 0 ? 'text-red-500' : 'text-slate-600'}`}>
                                        {remainingQty}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {districtHospitals.filter(h => (h.facility_name || '').toLowerCase().includes((hospitalSearchQuery || '').toLowerCase())).map(h => (
                    <div key={h.hospital_id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedHospitalId(selectedHospitalId === h.hospital_id ? '' : h.hospital_id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedHospitalId(selectedHospitalId === h.hospital_id ? '' : h.hospital_id); }}
                        className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Building2 size={24} />
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-slate-900 text-lg">{h.facility_name}</h3>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">{district}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-4 text-xs font-bold text-slate-500">
                            <span className="bg-slate-100 px-2 py-1 rounded-lg">
                              {new Date(dispatchStartDate).toLocaleDateString()} - {new Date(dispatchEndDate).toLocaleDateString()}
                            </span>
                            <div 
                              className="cursor-pointer p-2 hover:bg-emerald-50 rounded-xl transition-colors group" 
                              onClick={(e) => { e.stopPropagation(); downloadHospitalDispatches(h.hospital_id, h.facility_name); }}
                              title="Download Report for Selected Range"
                            >
                              <FileText size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                            </div>
                          </div>
                        </div>
                        <div className="text-slate-400">
                          {selectedHospitalId === h.hospital_id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                      </div>

                      {selectedHospitalId === h.hospital_id && (
                        <div className="border-t border-slate-100 bg-slate-50/50">
                          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Database size={20} className="text-emerald-600" />
                                Available District Inventory
                              </h3>
                              <p className="text-slate-500 text-sm mt-1 font-medium">Select quantities to dispatch to <span className="text-slate-900 font-bold">{h.facility_name}</span></p>
                            </div>
                            <button 
                              onClick={handleDispatch}
                              disabled={processing === 'dispatching' || Object.values(dispatchQuantities).every(q => !q)}
                              className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 w-full md:w-auto justify-center"
                            >
                              {processing === 'dispatching' ? <Loader2 className="animate-spin" size={20} /> : <Truck size={20} />}
                              Dispatch Selected Items
                            </button>
                          </div>
                          <div className="overflow-x-auto bg-white">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50/50">
                                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine</th>
                                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Batch & Order</th>
                                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Manufacturer</th>
                                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Available Qty</th>
                                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Dispatch Qty</th>
                                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Remaining Qty</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {districtInventory
                                  .filter(item => !dispatchOrderFilter || item.order_number?.toLowerCase().includes(dispatchOrderFilter.toLowerCase()))
                                  .map(item => {
                                  const dispatchQty = dispatchQuantities[item.id] || 0;
                                  const remainingQty = item.remaining_qty - dispatchQty;
                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                      <td className="px-8 py-4">
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900">{item.medicine_master?.medicine_name}</h4>
                                            {getQualityReportBadge(item.quality_report)}
                                          </div>
                                          <span className="text-[9px] text-slate-500 font-medium">
                                            {item.medicine_master?.packing_size} {item.medicine_master?.unit_type}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-8 py-4">
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold text-slate-700">Batch: {item.batch_no}</span>
                                          <span className="text-[10px] text-emerald-600 font-bold">Order: #{item.order_number}</span>
                                          <span className="text-[10px] text-slate-400 uppercase tracking-widest">Exp: {formatMonthYear(item.expiry_date)}</span>
                                        </div>
                                      </td>
                                      <td className="px-8 py-4">
                                        <span className="text-xs font-medium text-slate-600">{item.manufacturer_name}</span>
                                      </td>
                                      <td className="px-8 py-4">
                                        <div className="flex flex-col">
                                          <span className="text-lg font-black text-emerald-600">
                                            {item.remaining_qty}
                                          </span>
                                          {item.uncleared_qty > 0 && (
                                            <span className="text-[10px] font-bold text-red-500">
                                              (-{item.uncleared_qty})
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-8 py-4">
                                        <input 
                                          type="number"
                                          min="0"
                                          max={item.remaining_qty}
                                          placeholder="0"
                                          className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                          value={dispatchQuantities[item.id] || ''}
                                          onChange={e => {
                                            const val = parseInt(e.target.value) || 0;
                                            const availableQty = item.remaining_qty - (item.uncleared_qty || 0);
                                            if (val > availableQty) {
                                              alert('Dispatch quantity is more than available quantity. Revise Dispatch quantity');
                                              return;
                                            }
                                            setDispatchQuantities({...dispatchQuantities, [item.id]: val});
                                          }}
                                        />
                                      </td>
                                      <td className="px-8 py-4">
                                        <span className={`text-lg font-black ${remainingQty < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                          {remainingQty}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {districtInventory.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-slate-500 font-medium">
                                      No inventory available to dispatch.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {districtHospitals.filter(h => (h.facility_name || '').toLowerCase().includes((hospitalSearchQuery || '').toLowerCase())).length === 0 && (
                    <div className="text-center py-12 bg-white rounded-[3rem] border border-slate-100">
                      <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                      <h3 className="text-xl font-bold text-slate-900">No Hospitals Found</h3>
                      <p className="text-slate-500 mt-2 font-medium">Try adjusting your search query.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'confirmations' && (
              <motion.div 
                key="confirmations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 gap-6"
              >
                {sampleRequests.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Sample Requests from State</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {sampleRequests.map(sample => (
                        <div key={sample.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-purple-100 flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                              <FlaskConical size={32} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">STATE HQ</span>
                                <span className="text-slate-200">•</span>
                                <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">
                                  Sample Request
                                </span>
                                {sample.order_no && (
                                  <>
                                    <span className="text-slate-200">•</span>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                      Order: {sample.order_no}
                                    </span>
                                  </>
                                )}
                              </div>
                              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                {sample.medicine_name}
                                {getQualityReportBadge(sample.quality_report)}
                              </h3>
                              <div className="mt-1 text-sm text-slate-500 flex gap-4">
                                {sample.packing_size && <span>Size: {sample.packing_size}</span>}
                                {sample.unit_type && <span>Unit: {sample.unit_type}</span>}
                                {sample.requested_amount && <span className="font-bold text-purple-600">Qty Requested: {sample.requested_amount}</span>}
                              </div>
                              <div className="mt-1 text-xs text-slate-400 flex gap-4">
                                {sample.batch_number && <span>Batch: {sample.batch_number}</span>}
                                {sample.mfg_date && <span>Mfg: {sample.mfg_date}</span>}
                                {sample.expiry_date && <span>Exp: {sample.expiry_date}</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSendSample(sample.id)}
                            disabled={processing === sample.id}
                            className={`px-8 py-4 rounded-2xl font-bold text-white transition-all flex items-center gap-2 ${
                              processing === sample.id
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:-translate-y-0.5'
                            }`}
                          >
                            {processing === sample.id ? (
                              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Send size={20} />
                                Mark as Sent
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingClaims.length === 0 && sampleRequests.length === 0 ? (
                  <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-slate-200">
                    <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">No pending claims or requests</h3>
                    <p className="text-slate-500 mt-2">Hospitals haven't pulled any stock yet, and no samples requested.</p>
                  </div>
                ) : (
                  pendingClaims.map(claim => (
                    <div key={claim.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                          <ArrowUpRight size={32} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{claim.hospitals?.facility_name}</span>
                            <span className="text-slate-200">•</span>
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                              Requested on {claim.request_date ? new Date(claim.request_date).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Edit Qty</span>
                              <input 
                                type="number"
                                value={approvedQuantities[claim.id] || claim.quantity}
                                onChange={e => setApprovedQuantities({...approvedQuantities, [claim.id]: parseInt(e.target.value) || 0})}
                                className="w-24 p-2 rounded-xl border border-emerald-200 bg-emerald-50/30 font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              />
                            </div>
                            <div className="flex flex-col mt-4">
                              <span className="text-lg font-bold text-slate-900">{claim.medicine_master?.medicine_name}</span>
                              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                {claim.medicine_master?.packing_size} {claim.medicine_master?.unit_type}
                              </span>
                            </div>
                          </h3>
                          {claim.request_type === 'Instant_Pull' && (
                            <div className="mt-2 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
                              <AlertCircle size={14} className="text-amber-600" />
                              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">
                                Request to add Received medicine - Please Confirm Digital Transfer
                              </span>
                            </div>
                          )}
                          {claim.request_type === 'Manual_Request' && (
                            <div className="mt-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
                              <Truck size={14} className="text-blue-600" />
                              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">
                                Request to Provide Medicines from Store - Will be Dispatched upon Approval
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleConfirmClaim(claim)}
                          disabled={processing === claim.id}
                          className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                        >
                          {processing === claim.id ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                          Confirm Claim
                        </button>
                        <button className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Filter by Date</label>
                    <input 
                      type="date"
                      value={logDateFilter}
                      onChange={e => setLogDateFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Filter by Order Number</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Search order..."
                        value={logOrderFilter}
                        onChange={e => setLogOrderFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-3">Filter by Medicine</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Search medicine..."
                        value={logMedicineFilter}
                        onChange={e => setLogMedicineFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-colors"
                    >
                      Print
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-2xl font-bold transition-colors"
                    >
                      Export Excel
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
                  <div>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 rounded-l-3xl">Date</th>
                          <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine & Order</th>
                          <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Batch Details</th>
                          <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quantity</th>
                          <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Source / Destination / Type</th>
                          <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 rounded-r-3xl">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {logs
                          .filter(log => {
                            if (!logDateFilter) return true;
                            // logDateFilter is YYYY-MM-DD, log.date is ISO string
                            return log.date.startsWith(logDateFilter);
                          })
                          .filter(log => !logOrderFilter || log.order_number?.toLowerCase().includes(logOrderFilter.toLowerCase()))
                          .filter(log => !logMedicineFilter || log.medicine_name?.toLowerCase().includes(logMedicineFilter.toLowerCase()))
                          .map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-8 py-4 text-xs font-medium text-slate-500">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-slate-700">
                                  {new Date(log.date).toLocaleDateString()}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-slate-900">{log.medicine_name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    {log.packing_size} {log.unit_type}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[10px] text-emerald-600 font-bold">
                                    Order: #{log.order_number}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase w-8">Batch</span>
                                  <span className="text-xs font-medium text-slate-700">{log.batch_no || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase w-8">Mfg</span>
                                  <span className="text-[10px] font-medium text-slate-600">{formatMonthYear(log.mfg_date) || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase w-8">Exp</span>
                                  <span className="text-[10px] font-medium text-slate-600">{formatMonthYear(log.expiry_date) || 'N/A'}</span>
                                </div>
                                {log.manufacturer_name && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase w-8">Mfr</span>
                                    <span className="text-[10px] font-medium text-slate-500 italic">{log.manufacturer_name}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-4 font-black text-slate-900">{log.quantity}</td>
                            <td className="px-8 py-4 text-xs font-medium text-slate-600">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-emerald-700">{log.type}</span>
                                <span>{log.source_destination}</span>
                              </div>
                            </td>
                            <td className="px-8 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit ${
                                  ['Received', 'Reported', 'Dispatched'].includes(log.status) 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {log.status}
                                </span>
                                <div className="flex flex-col text-[9px] text-slate-400 font-medium">
                                  {(log.request_date || log.requested_at) && (
                                    <span>Req: {new Date(log.request_date || log.requested_at).toLocaleDateString()}</span>
                                  )}
                                  {(log.dispatch_date || log.sent_at) && (
                                    <span>Sent: {new Date(log.dispatch_date || log.sent_at).toLocaleDateString()}</span>
                                  )}
                                  {(log.receiving_date || log.received_at) && (
                                    <span>Recv: {new Date(log.receiving_date || log.received_at).toLocaleDateString()}</span>
                                  )}
                                  {log.reported_at && (
                                    <span>Rep: {new Date(log.reported_at).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {logs.filter(log => {
                            if (!logDateFilter) return true;
                            return log.date.startsWith(logDateFilter);
                          })
                          .filter(log => !logOrderFilter || log.order_number?.toLowerCase().includes(logOrderFilter.toLowerCase()))
                          .filter(log => !logMedicineFilter || log.medicine_name?.toLowerCase().includes(logMedicineFilter.toLowerCase()))
                          .length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-8 py-12 text-center text-slate-500 font-medium">
                              No logs found matching your filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        {alertMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full"
            >
              <div className="flex items-center gap-3 text-amber-600 mb-4">
                <AlertCircle size={24} />
                <h3 className="font-bold text-lg text-slate-900">Quality Check Required</h3>
              </div>
              <p className="text-slate-600 mb-6">{alertMessage}</p>
              <button 
                onClick={() => setAlertMessage(null)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

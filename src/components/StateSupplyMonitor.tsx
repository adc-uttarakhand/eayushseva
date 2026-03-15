import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Truck, 
  Building2, 
  Package, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  Database,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const DISTRICTS = [
  'ALMORA', 'BAGESHWAR', 'CHAMOLI', 'CHAMPAWAT', 'DEHRADUN', 
  'HARIDWAR', 'NAINITAL', 'PAURI', 'PITHORAGARH', 'RUDRAPRAYAG', 
  'TEHRI', 'UDHAM SINGH NAGAR', 'UTTARKASHI'
];

const DISTRICT_SHORTS: Record<string, string> = {
  'ALMORA': 'ALM',
  'BAGESHWAR': 'BAG',
  'CHAMOLI': 'CHM',
  'CHAMPAWAT': 'CMP',
  'DEHRADUN': 'DDN',
  'HARIDWAR': 'HAR',
  'NAINITAL': 'NTL',
  'PAURI': 'PAU',
  'PITHORAGARH': 'PITH',
  'RUDRAPRAYAG': 'RUD',
  'TEHRI': 'TEH',
  'UDHAM SINGH NAGAR': 'USN',
  'UTTARKASHI': 'UTK'
};

export default function StateSupplyMonitor({ filterBy }: { filterBy?: string }) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [hospitalDispatches, setHospitalDispatches] = useState<any[]>([]);
  const [districtInventory, setDistrictInventory] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    district: '',
    order_no: '',
    medicine_name: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterBy]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let ordersQuery = supabase.from('state_supply_orders').select('*').order('created_at', { ascending: false });
      if (filterBy) {
        ordersQuery = ordersQuery.eq('uploaded_by', filterBy);
      }
      
      const [ordersRes, dispatchesRes, inventoryRes] = await Promise.all([
        ordersQuery,
        supabase.from('hospital_dispatches').select('*'),
        supabase.from('district_inventory').select('*')
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (dispatchesRes.error) throw dispatchesRes.error;
      if (inventoryRes.error) throw inventoryRes.error;

      setOrders(ordersRes.data || []);
      setHospitalDispatches(dispatchesRes.data || []);
      setDistrictInventory(inventoryRes.data || []);
    } catch (err) {
      console.error('Error fetching supply monitor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHospitalDispatchQty = (medicineId: string, district: string, orderNo: string, batchNo: string) => {
    if (!district) return 0;
    return hospitalDispatches
      .filter(d => 
        d.medicine_id === medicineId && 
        d.district?.toLowerCase() === district.toLowerCase() &&
        d.order_number === orderNo &&
        (batchNo ? d.batch_no === batchNo : true)
      )
      .reduce((sum, d) => sum + (d.quantity || 0), 0);
  };

  const getDistrictInventoryQty = (medicineId: string, district: string, orderNo: string, batchNo: string) => {
    if (!district) return 0;
    return districtInventory
      .filter(i => 
        i.medicine_id === medicineId && 
        i.district?.toLowerCase() === district.toLowerCase() &&
        i.order_number === orderNo &&
        (batchNo ? i.batch_no === batchNo : true)
      )
      .reduce((sum, i) => sum + (i.remaining_qty || 0), 0);
  };

  const filteredOrders = orders.filter(order => {
    const matchesDistrict = !filters.district || order.district_name === filters.district;
    const matchesOrder = !filters.order_no || order.order_no?.toLowerCase().includes(filters.order_no.toLowerCase());
    const matchesMedicine = !filters.medicine_name || order.medicine_name?.toLowerCase().includes(filters.medicine_name.toLowerCase());
    return matchesDistrict && matchesOrder && matchesMedicine;
  });

  const groupedOrders = React.useMemo(() => {
    const groups = new Map();
    filteredOrders.forEach(order => {
      const key = `${order.order_no}_${order.medicine_id}_${order.firm_name}_${order.batch_number}`;
      if (!groups.has(key)) {
        groups.set(key, {
          order_no: order.order_no,
          medicine_id: order.medicine_id,
          medicine_name: order.medicine_name,
          firm_name: order.firm_name,
          batch_number: order.batch_number,
          created_at: order.created_at,
          districts: {} as Record<string, any>
        });
      }
      groups.get(key).districts[order.district_name.toUpperCase()] = order;
    });
    return Array.from(groups.values());
  }, [filteredOrders]);

  const getStatusStep = (order: any) => {
    if (!order) return 0;
    if (order.status === 'Delivered to Hospital') return 3;
    const hospitalQty = getHospitalDispatchQty(order.medicine_id, order.district_name, order.order_no, order.batch_number);
    if (hospitalQty > 0) return 3;
    if (order.status === 'Received') return 2;
    return 1;
  };

  const getStatusColor = (status: string) => {
    if (status === 'Dispatched') return 'bg-blue-500';
    if (status === 'Received') return 'bg-emerald-500';
    if (status === 'Partially Issued') return 'bg-amber-500';
    if (status === 'Issued to Hospital') return 'bg-purple-500';
    if (status === 'Delivered to Hospital') return 'bg-indigo-500';
    return 'bg-slate-300';
  };

  const getShortStatus = (status: string) => {
    if (status === 'Dispatched') return 'DISP';
    if (status === 'Received') return 'REC';
    if (status === 'Partially Issued') return 'P.ISS';
    if (status === 'Issued to Hospital') return 'ISS';
    if (status === 'Pending at District') return 'PEND';
    if (status === 'Delivered to Hospital') return 'DELV';
    return status.substring(0, 4).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">District</label>
          <select 
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={filters.district}
            onChange={e => setFilters({ ...filters, district: e.target.value })}
          >
            <option value="">All Districts</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Order Number</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search Order..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={filters.order_no}
              onChange={e => setFilters({ ...filters, order_no: e.target.value })}
            />
          </div>
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Medicine Name</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search Medicine..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={filters.medicine_name}
              onChange={e => setFilters({ ...filters, medicine_name: e.target.value })}
            />
          </div>
        </div>
        <button 
          onClick={fetchData}
          className="bg-slate-900 text-white p-3.5 rounded-2xl hover:bg-slate-800 transition-all"
        >
          <Loader2 className={loading ? 'animate-spin' : ''} size={20} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-transparent overflow-hidden">
        <div className="w-full h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-y-4 table-fixed relative">
            <thead className="sticky top-0 z-20">
              <tr className="bg-white shadow-sm rounded-2xl">
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-48 border-r border-slate-100 rounded-l-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">Medicine Info</th>
                {DISTRICTS.map((d, i) => (
                  <th key={d} className={`p-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-l border-slate-100 text-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] ${i === DISTRICTS.length - 1 ? 'rounded-r-2xl' : ''}`} title={d}>
                    {DISTRICT_SHORTS[d] || d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="bg-white shadow-sm rounded-2xl">
                  <td colSpan={14} className="py-20 text-center rounded-2xl">
                    <Loader2 className="animate-spin text-emerald-600 mx-auto" size={40} />
                    <p className="text-slate-400 mt-4 font-medium">Fetching supply data...</p>
                  </td>
                </tr>
              ) : groupedOrders.length === 0 ? (
                <tr className="bg-white shadow-sm rounded-2xl">
                  <td colSpan={14} className="py-20 text-center rounded-2xl">
                    <AlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">No supply records found</h3>
                    <p className="text-slate-500 mt-2">Try adjusting your filters or check back later.</p>
                  </td>
                </tr>
              ) : (
                groupedOrders.map(group => (
                  <tr key={`${group.order_no}_${group.medicine_id}_${group.batch_number}`} className="hover:bg-slate-50/30 transition-colors bg-white shadow-sm rounded-2xl">
                    <td className="p-4 bg-white border-r border-slate-100 align-top rounded-l-2xl">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
                            #{group.order_no}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-xs leading-tight">{group.medicine_name}</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate" title={group.firm_name}>{group.firm_name}</p>
                        {group.batch_number && (
                          <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest truncate">Batch: {group.batch_number}</p>
                        )}
                      </div>
                    </td>
                    {DISTRICTS.map((d, i) => {
                      const districtOrder = group.districts[d];
                      return (
                        <td key={d} className={`p-2 align-top border-l border-slate-100 ${i === DISTRICTS.length - 1 ? 'rounded-r-2xl' : ''}`}>
                          {districtOrder ? (
                            <div className="flex flex-col gap-2 h-full">
                              {/* Status */}
                              <div className="flex items-center gap-1 justify-center">
                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(districtOrder.status)}`} />
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider text-center" title={districtOrder.status}>
                                  {getShortStatus(districtOrder.status)}
                                </span>
                              </div>
                              
                              {/* Vertical Journey */}
                              <div className="flex flex-col items-center gap-0.5 my-1">
                                <div className={`flex items-center justify-center w-4 h-4 rounded-full border ${getStatusStep(districtOrder) >= 1 ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-300'}`}>
                                  <Database size={8} />
                                </div>
                                <div className={`w-px h-2 ${getStatusStep(districtOrder) >= 2 ? 'bg-emerald-600' : 'bg-slate-200'}`}></div>
                                <div className={`flex items-center justify-center w-4 h-4 rounded-full border ${getStatusStep(districtOrder) >= 2 ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-300'}`}>
                                  <Building2 size={8} />
                                </div>
                                <div className={`w-px h-2 ${getStatusStep(districtOrder) >= 3 ? 'bg-emerald-600' : 'bg-slate-200'}`}></div>
                                <div className={`flex items-center justify-center w-4 h-4 rounded-full border ${getStatusStep(districtOrder) >= 3 ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-300'}`}>
                                  <Package size={8} />
                                </div>
                              </div>

                              {/* Counts */}
                              <div className="flex flex-col gap-0.5 mt-auto bg-slate-50 p-1.5 rounded-lg">
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-slate-500 font-medium">O:</span>
                                  <span className="font-bold text-slate-900">{districtOrder.allocated_qty}</span>
                                </div>
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-slate-500 font-medium">D:</span>
                                  <span className="font-bold text-emerald-600">{getDistrictInventoryQty(districtOrder.medicine_id, d, group.order_no, group.batch_number)}</span>
                                </div>
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-slate-500 font-medium">H:</span>
                                  <span className="font-bold text-blue-600">{getHospitalDispatchQty(districtOrder.medicine_id, d, group.order_no, group.batch_number)}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-slate-300 text-xs font-medium py-4">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Clock, AlertTriangle, Search, Package, FileText, Send, FlaskConical } from 'lucide-react';
import { motion } from 'motion/react';

type SampleTab = 'requests' | 'received' | 'reports' | 'log';

export default function StateSamplesManager() {
  const [activeTab, setActiveTab] = useState<SampleTab>('requests');
  const [orders, setOrders] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistricts, setSelectedDistricts] = useState<{ [key: string]: boolean }>({});
  const [requestedAmounts, setRequestedAmounts] = useState<{ [key: string]: number }>({});

  const groupedOrders = React.useMemo(() => {
    const groups: { [key: string]: any } = {};
    orders.forEach(order => {
      if (!order.order_number) return;
      const key = `${order.order_number}_${order.medicine_id}`;
      if (!groups[key]) {
        groups[key] = {
          order_no: order.order_number,
          medicine_id: order.medicine_id,
          medicine_name: order.medicine_master?.medicine_name,
          manufacturer_name: order.manufacturer_name,
          packing_size: order.medicine_master?.packing_size,
          unit_type: order.medicine_master?.unit_type,
          districts: []
        };
      }
      groups[key].districts.push({
        id: order.id,
        district_name: order.district,
        allocated_qty: order.remaining_qty,
        batch_no: order.batch_no,
        mfg_date: order.mfg_date,
        expiry_date: order.expiry_date
      });
    });

    Object.values(groups).forEach((group: any) => {
      group.districts.sort((a: any, b: any) => b.allocated_qty - a.allocated_qty);
      group.districts = group.districts.slice(0, 5);
    });

    return Object.values(groups);
  }, [orders]);

  const filteredGroups = groupedOrders.filter((g: any) => 
    (g.order_no || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (g.medicine_name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'requests') {
        // Fetch existing district inventory
        const { data: ordersData, error: ordersError } = await supabase
          .from('district_inventory')
          .select(`
            *,
            medicine_master (medicine_name, packing_size, unit_type)
          `)
          .gt('remaining_qty', 0)
          .order('receiving_date', { ascending: false });
        
        if (ordersError) throw ordersError;
        setOrders(ordersData || []);
      } else {
        // Fetch sample requests
        const { data: samplesData, error: samplesError } = await supabase
          .from('sample_requests')
          .select('*, district_inventory(manufacturer_name)')
          .order('requested_at', { ascending: false });
        
        if (samplesError) {
          // If table doesn't exist, it will throw an error. We can just set empty array.
          console.error(samplesError);
          setSamples([]);
        } else {
          const formattedSamples = (samplesData || []).map((s: any) => ({
            ...s,
            manufacturer_name: s.district_inventory?.manufacturer_name
          }));
          setSamples(formattedSamples);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestGroupSample = async (group: any) => {
    const selectedOrderIds = group.districts.filter((d: any) => selectedDistricts[d.id]).map((d: any) => d.id);
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one district.');
      return;
    }

    try {
      const inserts = group.districts
        .filter((d: any) => selectedDistricts[d.id])
        .map((d: any) => ({
          order_no: group.order_no,
          inventory_id: d.id,
          medicine_name: group.medicine_name,
          district: d.district_name,
          packing_size: group.packing_size,
          unit_type: group.unit_type,
          requested_amount: requestedAmounts[d.id] || 0,
          status: 'Pending',
          requested_at: new Date().toISOString(),
          batch_number: d.batch_no,
          mfg_date: d.mfg_date,
          expiry_date: d.expiry_date
        }));

      const { error } = await supabase.from('sample_requests').insert(inserts);
      if (error) throw error;

      alert('Samples requested successfully!');
      
      const newSelected = { ...selectedDistricts };
      const newAmounts = { ...requestedAmounts };
      group.districts.forEach((d: any) => {
        delete newSelected[d.id];
        delete newAmounts[d.id];
      });
      setSelectedDistricts(newSelected);
      setRequestedAmounts(newAmounts);
      
      fetchData();
    } catch (error: any) {
      console.error('Error requesting sample:', error);
      alert('Failed to request sample. Make sure the sample_requests table exists.');
    }
  };

  const markReceived = async (sampleId: string, receivedAmount: number) => {
    try {
      // 1. Fetch sample request
      const { data: sample, error: fetchErr } = await supabase
        .from('sample_requests')
        .select('inventory_id, requested_amount')
        .eq('id', sampleId)
        .single();
      if (fetchErr) throw fetchErr;

      // 2. Reduce inventory
      const { data: inv, error: invFetchErr } = await supabase
        .from('district_inventory')
        .select('remaining_qty')
        .eq('id', sample.inventory_id)
        .single();
      if (invFetchErr) throw invFetchErr;

      const { error: invUpdateErr } = await supabase
        .from('district_inventory')
        .update({ remaining_qty: inv.remaining_qty - sample.requested_amount })
        .eq('id', sample.inventory_id);
      if (invUpdateErr) throw invUpdateErr;

      const { error } = await supabase
        .from('sample_requests')
        .update({
          status: 'Received',
          received_amount: receivedAmount,
          received_at: new Date().toISOString()
        })
        .eq('id', sampleId);
      
      if (error) throw error;
      alert('Sample marked as received!');
      fetchData();
    } catch (error: any) {
      console.error('Error marking received:', error);
      alert('Failed to update sample.');
    }
  };

  const submitReport = async (sampleId: string, reportData: any) => {
    try {
      // Fetch sample details to get inventory_id
      const { data: sample, error: sampleFetchErr } = await supabase
        .from('sample_requests')
        .select('inventory_id')
        .eq('id', sampleId)
        .single();
      
      if (sampleFetchErr) throw sampleFetchErr;

      const { error } = await supabase
        .from('sample_requests')
        .update({
          status: 'Reported',
          batch_number: reportData.batchNo,
          mfg_date: reportData.mfgDate,
          expiry_date: reportData.expiryDate,
          quality_report: reportData.reportStatus,
          reported_at: new Date().toISOString()
        })
        .eq('id', sampleId);
      
      if (error) throw error;

      // If reported as Standard Quality, update district_inventory if it's a Tender medicine
      if (sample?.inventory_id) {
        // Get medicine_id and order_number from district_inventory
        const { data: inv } = await supabase
          .from('district_inventory')
          .select('medicine_id, order_number')
          .eq('id', sample.inventory_id)
          .single();

        if (inv?.medicine_id) {
          const { data: medicine } = await supabase
            .from('medicine_master')
            .select('source_type')
            .eq('id', inv.medicine_id)
            .single();

          if (reportData.reportStatus === 'Standard Quality') {
            if (medicine?.source_type === 'Tender') {
              const { error: invUpdateErr } = await supabase
                .from('district_inventory')
                .update({ quality_control: 'Standard Quality' })
                .eq('id', sample.inventory_id);
              
              if (invUpdateErr) {
                console.error('Error updating district inventory quality control:', invUpdateErr);
              }
            }
          } else if (reportData.reportStatus === 'Not of Standard Quality') {
            // Mark as returned in district_inventory
            const { error: invUpdateErr } = await supabase
              .from('district_inventory')
              .update({ is_returned: true })
              .eq('id', sample.inventory_id);
            
            if (invUpdateErr) {
              console.error('Error marking district inventory as returned:', invUpdateErr);
            }

            // Update state_supply_orders status to 'Returned'
            if (inv.order_number) {
              const { error: orderUpdateErr } = await supabase
                .from('state_supply_orders')
                .update({ status: 'Returned' })
                .eq('order_no', inv.order_number)
                .eq('medicine_id', inv.medicine_id);
              
              if (orderUpdateErr) {
                console.error('Error updating state supply order status:', orderUpdateErr);
              }
            }
          }
        }
      }

      alert('Report submitted successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'requests' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Requests
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'received' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Received
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'reports' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'log' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Log
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {activeTab === 'requests' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Request Samples from Districts</h2>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by order number or medicine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            
            <div className="space-y-6">
              {filteredGroups.map((group: any) => (
                <div key={`${group.order_no}_${group.medicine_id}`} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md">Order: {group.order_no}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{group.medicine_name} / {group.manufacturer_name}</h3>
                    <p className="text-sm text-slate-500">Packing Size: {group.packing_size} • Unit: {group.unit_type}</p>
                  </div>

                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                          <th className="pb-2 font-medium w-10">Select</th>
                          <th className="pb-2 font-medium">District (Top 5 by Qty)</th>
                          <th className="pb-2 font-medium">Available Qty</th>
                          <th className="pb-2 font-medium w-32">Request Amount</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {group.districts.map((d: any) => (
                          <tr key={d.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-2">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                checked={!!selectedDistricts[d.id]}
                                onChange={(e) => {
                                  setSelectedDistricts(prev => ({ ...prev, [d.id]: e.target.checked }));
                                }}
                              />
                            </td>
                            <td className="py-2">
                              <div className="font-medium text-slate-700">{d.district_name}</div>
                              <div className="text-xs text-slate-500">
                                Batch: {d.batch_no || 'N/A'} | Mfg: {d.mfg_date || 'N/A'} | Exp: {d.expiry_date || 'N/A'}
                              </div>
                            </td>
                            <td className="py-2 text-slate-600">{d.allocated_qty}</td>
                            <td className="py-2">
                              <input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                disabled={!selectedDistricts[d.id]}
                                value={requestedAmounts[d.id] || ''}
                                onChange={(e) => {
                                  setRequestedAmounts(prev => ({ ...prev, [d.id]: parseInt(e.target.value) || 0 }));
                                }}
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleRequestGroupSample(group)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200"
                    >
                      <FlaskConical size={18} />
                      Request Sample
                    </button>
                  </div>
                </div>
              ))}
              {filteredGroups.length === 0 && !loading && (
                <div className="py-8 text-center text-slate-500">No orders found matching your search.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'received' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Receive Samples</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-sm text-slate-500">
                    <th className="pb-3 font-medium">Medicine</th>
                    <th className="pb-3 font-medium">District</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Received Amount</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {samples.filter(s => s.status === 'Sent').map((sample) => (
                    <tr key={sample.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-slate-900">
                        <div>{sample.medicine_name} / {sample.manufacturer_name}</div>
                        <div className="text-xs text-slate-500">
                          {sample.packing_size} {sample.unit_type} • Batch: {sample.batch_number}
                        </div>
                        <div className="text-xs text-slate-400">
                          Mfg: {sample.mfg_date} | Exp: {sample.expiry_date}
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">{sample.district}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-xs font-medium">Sent by District</span>
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          defaultValue={sample.requested_amount}
                          id={`amount-${sample.id}`}
                          placeholder="Amount"
                          className="w-24 px-2 py-1 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            const input = document.getElementById(`amount-${sample.id}`) as HTMLInputElement;
                            if (input && input.value) {
                              markReceived(sample.id, parseInt(input.value));
                            } else {
                              alert('Please enter received amount');
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg font-medium hover:bg-emerald-100 transition-colors flex items-center gap-1 ml-auto"
                        >
                          <CheckCircle size={16} />
                          Mark Received
                        </button>
                      </td>
                    </tr>
                  ))}
                  {samples.filter(s => s.status === 'Sent').length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">No samples sent by districts yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Sample Reports</h2>
            <div className="space-y-4">
              {Object.values(samples.filter(s => s.status === 'Received' || s.status === 'Reported').reduce((acc: any, sample: any) => {
                const key = `${sample.medicine_name}_${sample.batch_number}_${sample.mfg_date}_${sample.expiry_date}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(sample);
                return acc;
              }, {})).map((group: any, index: number) => (
                <div key={index} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-900">{group[0].medicine_name} / {group[0].manufacturer_name}</h3>
                    <p className="text-xs text-slate-500">Batch: {group[0].batch_number} | Mfg: {group[0].mfg_date} | Exp: {group[0].expiry_date}</p>
                  </div>
                  <div className="space-y-2">
                    {group.map((sample: any) => (
                      <div key={sample.id} className="flex justify-between items-center border-t border-slate-200 pt-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-700">{sample.district}</span>
                          <span className="text-slate-500 ml-2">Received: {sample.received_amount}</span>
                        </div>
                        {sample.status === 'Reported' && (
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            sample.quality_report === 'Standard Quality' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {sample.quality_report}
                          </span>
                        )}
                        {sample.status === 'Received' && (
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              submitReport(sample.id, {
                                batchNo: sample.batch_number,
                                mfgDate: sample.mfg_date,
                                expiryDate: sample.expiry_date,
                                reportStatus: formData.get('reportStatus')
                              });
                            }}
                            className="flex gap-2"
                          >
                            <select name="reportStatus" required className="px-2 py-1 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 bg-white">
                              <option value="">Select Status...</option>
                              <option value="Standard Quality">Standard Quality</option>
                              <option value="Not of Standard Quality">Not of Standard Quality</option>
                            </select>
                            <button type="submit" className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                              Submit
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {samples.filter(s => s.status === 'Received' || s.status === 'Reported').length === 0 && !loading && (
                <div className="py-8 text-center text-slate-500">No received samples to report on.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Sample Requests Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-sm text-slate-500">
                    <th className="pb-3 font-medium">Order No</th>
                    <th className="pb-3 font-medium">Medicine</th>
                    <th className="pb-3 font-medium">District</th>
                    <th className="pb-3 font-medium">Qty Asked</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Timeline</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {samples.map((sample) => (
                    <tr key={sample.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-3 font-mono text-slate-600">{sample.order_no}</td>
                      <td className="py-3">
                        <div className="font-medium text-slate-900">{sample.medicine_name} / {sample.manufacturer_name}</div>
                        <div className="text-xs text-slate-500">
                          {sample.packing_size} {sample.unit_type} • Batch: {sample.batch_number}
                        </div>
                        <div className="text-xs text-slate-500">
                          Mfg: {sample.mfg_date} | Exp: {sample.expiry_date}
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">{sample.district}</td>
                      <td className="py-3 text-slate-600">{sample.requested_amount || '-'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          sample.status === 'Pending' ? 'bg-slate-100 text-slate-600' :
                          sample.status === 'Sent' ? 'bg-amber-50 text-amber-600' :
                          sample.status === 'Received' ? 'bg-blue-50 text-blue-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {sample.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        {sample.requested_at && <div>Req: {new Date(sample.requested_at).toLocaleString()}</div>}
                        {sample.sent_at && <div>Sent: {new Date(sample.sent_at).toLocaleString()}</div>}
                        {sample.received_at && <div>Recv: {new Date(sample.received_at).toLocaleString()}</div>}
                        {sample.reported_at && <div>Rep: {new Date(sample.reported_at).toLocaleString()}</div>}
                      </td>
                    </tr>
                  ))}
                  {samples.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">No sample requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

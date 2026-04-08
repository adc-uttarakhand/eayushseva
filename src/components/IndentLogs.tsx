import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, History, Package } from 'lucide-react';

interface IndentLogsProps {
  hospitalId: string;
}

export default function IndentLogs({ hospitalId }: IndentLogsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [hospitalId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('indent_logs')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('indented_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching indent logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History className="text-emerald-600" /> Indent Logs
        </h3>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="text-slate-300" size={32} />
          </div>
          <h4 className="text-lg font-bold text-slate-900">No logs found</h4>
          <p className="text-slate-500 text-sm mt-1">There are no indent logs available yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date & Time</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Medicine Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Manufacturer Details</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Order No</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Units Indented</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {log.indented_at ? new Date(log.indented_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                      }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{log.medicine_name}</div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Packing: {log.packing_size || '---'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{log.manufacturer_name || '---'}</div>
                      <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                        <div>Batch: {log.batch_number || '---'}</div>
                        <div>Mfg: {log.mfg_date ? new Date(log.mfg_date).toLocaleDateString('en-IN') : '---'}</div>
                        <div>Exp: {log.expiry_date ? new Date(log.expiry_date).toLocaleDateString('en-IN') : '---'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{log.order_number || '---'}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{log.units_indented}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        log.indent_type === 'ISSUE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {log.indent_type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

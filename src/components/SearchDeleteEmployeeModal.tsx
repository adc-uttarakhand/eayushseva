import React, { useState } from 'react';
import { Search, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export default function SearchDeleteEmployeeModal({ isOpen, onClose, onDelete }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    const { data } = await supabase
      .from('staff')
      .select('id, full_name, role, mobile_number')
      .or(`full_name.ilike.%${searchQuery}%,mobile_number.ilike.%${searchQuery}%`);
    setResults(data || []);
    setLoading(false);
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action is irreversible.')) return;
    
    const { error } = await supabase.from('staff').delete().eq('id', staffId);
    if (error) {
      toast.error('Failed to delete staff: ' + error.message);
    } else {
      toast.success('Staff deleted successfully');
      setResults(results.filter(r => r.id !== staffId));
      onDelete();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Search & Delete Staff</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="Search by name or mobile..." 
            className="flex-1 bg-slate-50 rounded-xl px-4 py-3"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button onClick={handleSearch} className="bg-emerald-600 text-white px-4 rounded-xl font-bold"><Search size={20} /></button>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2">
          {loading ? <div className="text-center py-4 text-slate-400">Searching...</div> : results.map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-bold text-sm">{s.full_name}</p>
                <p className="text-xs text-slate-500">{s.role} | {s.mobile_number}</p>
              </div>
              <button 
                onClick={() => handleDelete(s.id)}
                className="text-red-500 hover:bg-red-50 p-2 rounded-full"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {!loading && results.length === 0 && <p className="text-center text-slate-400 text-sm">No results found</p>}
        </div>
      </div>
    </div>
  );
}

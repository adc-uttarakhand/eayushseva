import React, { useState } from 'react';
import { X, Search, User, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ChangeInchargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (staff: any) => void;
  userRole?: string;
}

export default function ChangeInchargeModal({ isOpen, onClose, onAssign, userRole }: ChangeInchargeModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAssign = ['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(userRole || '');

  const handleSearch = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!searchQuery) return;
    setLoading(true);
    setError(null);
    
    try {
      console.log('Searching for:', searchQuery);
      const { data, error: searchError } = await supabase
        .from('staff')
        .select('*')
        .or(`full_name.ilike.%${searchQuery}%,mobile_number.ilike.%${searchQuery}%,employee_id.ilike.%${searchQuery}%`);

      if (searchError) {
        console.error('Supabase search error details:', searchError);
        throw searchError;
      }
      console.log('Search results:', data);
      setResults(data || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Change Incharge</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-8">
          <div className="relative mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Mobile, or Emp ID"
              className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-4 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button type="button" onClick={handleSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-xl">
              <Search size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium animate-shake">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" /></div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.length === 0 && searchQuery && !loading && (
                <p className="text-center text-slate-500 py-4">No staff found with this information.</p>
              )}
              {results.map(staff => (
                <div key={staff.id} className="p-4 border border-gray-100 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{staff.full_name}</p>
                    <p className="text-xs text-slate-500">{staff.role} | {staff.employee_id || staff.aadhaar_number || 'No ID'}</p>
                  </div>
                  <button 
                    type="button"
                    disabled={!canAssign}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!canAssign) {
                        setError('Only District, State, or Super Admins can assign incharges.');
                        return;
                      }
                      console.log('Assign button clicked for staff:', staff.id);
                      onAssign(staff);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      canAssign 
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

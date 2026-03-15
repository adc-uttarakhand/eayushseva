import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Plus, Edit2, Trash2, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import DiseaseFormModal from './DiseaseFormModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface Disease {
  id: string;
  disease_name: string;
  srotas_category: string;
  search_keywords: string;
  is_active: boolean;
}

interface DiseaseManagementProps {
  session: any;
}

export default function DiseaseManagement({ session }: DiseaseManagementProps) {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [districtFilter, setDistrictFilter] = useState('All');
  const [dateRange, setDateRange] = useState('This Month');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState<Disease | undefined>();
  const [diseaseToDelete, setDiseaseToDelete] = useState<Disease | undefined>();
  const [sortConfig, setSortConfig] = useState<{ key: keyof Disease; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const sortedDiseases = useMemo(() => {
    let sortableDiseases = [...diseases];
    if (sortConfig !== null) {
      sortableDiseases.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableDiseases;
  }, [diseases, sortConfig]);

  const requestSort = (key: keyof Disease) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }: { column: keyof Disease }) => {
    if (sortConfig?.key !== column) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, hRes, pRes] = await Promise.all([
        supabase.from('diseases_master').select('*'),
        supabase.from('hospitals').select('hospital_id, district'),
        supabase.from('patients').select('diagnosis, hospital_id, created_at')
      ]);
      
      if (dRes.error) throw dRes.error;
      if (hRes.error) throw hRes.error;
      if (pRes.error) throw pRes.error;

      if (dRes.data) setDiseases(dRes.data);
      if (hRes.data) setHospitals(hRes.data);
      if (pRes.data) setPatients(pRes.data);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      alert(`Failed to fetch data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addDisease = async (disease: Omit<Disease, 'id'>) => {
    try {
      const { data, error } = await supabase.from('diseases_master').insert([{ ...disease, is_active: true }]).select();
      if (error) throw error;
      setDiseases([...diseases, ...data]);
      alert('Disease added successfully');
    } catch (error: any) {
      console.error('Error adding disease:', error);
      alert(`Failed to add disease: ${error.message}`);
    }
  };

  const updateDisease = async (id: string, updates: Partial<Disease>) => {
    try {
      const { error } = await supabase.from('diseases_master').update(updates).eq('id', id);
      if (error) throw error;
      setDiseases(diseases.map(d => d.id === id ? { ...d, ...updates } : d));
      alert('Disease updated successfully');
    } catch (error: any) {
      console.error('Error updating disease:', error);
      alert(`Failed to update disease: ${error.message}`);
    }
  };

  const deleteDisease = async (id: string) => {
    try {
      const { error } = await supabase.from('diseases_master').delete().eq('id', id);
      if (error) throw error;
      setDiseases(diseases.filter(d => d.id !== id));
      alert('Disease deleted successfully');
    } catch (error: any) {
      console.error('Error deleting disease:', error);
      alert(`Failed to delete disease: ${error.message}`);
    }
  };

  const handleSaveDisease = (disease: Omit<Disease, 'id'>) => {
    if (editingDisease) {
      updateDisease(editingDisease.id, disease);
    } else {
      addDisease(disease);
    }
    setEditingDisease(undefined);
  };

  const filteredPatients = useMemo(() => {
    let filtered = patients;
    if (districtFilter !== 'All') {
      const hospitalIds = hospitals.filter(h => h.district === districtFilter).map(h => h.hospital_id);
      filtered = filtered.filter(p => hospitalIds.includes(p.hospital_id));
    }
    return filtered;
  }, [patients, districtFilter, hospitals]);

  const diseaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPatients.forEach(p => {
      if (p.diagnosis) counts[p.diagnosis] = (counts[p.diagnosis] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredPatients]);

  const srotasCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPatients.forEach(p => {
      const disease = diseases.find(d => d.disease_name === p.diagnosis);
      if (disease) {
        counts[disease.srotas_category] = (counts[disease.srotas_category] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredPatients, diseases]);

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;

  return (
    <div className="p-8 space-y-12">
      <h1 className="text-3xl font-bold text-slate-900">Disease Management & Analytics</h1>
      <DiseaseFormModal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setEditingDisease(undefined); }}
        onSave={handleSaveDisease}
        initialData={editingDisease}
      />
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDiseaseToDelete(undefined); }}
        onConfirm={() => diseaseToDelete && deleteDisease(diseaseToDelete.id)}
        diseaseName={diseaseToDelete?.disease_name || ''}
      />

      {/* Part A: CRUD */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Master List Management</h2>
          <button 
            onClick={() => { setEditingDisease(undefined); setIsFormModalOpen(true); }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <Plus size={16} /> Add New Disease
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 uppercase tracking-widest text-[10px] font-bold">
              <th className="pb-4 cursor-pointer" onClick={() => requestSort('disease_name')}>Disease Name <SortIcon column="disease_name" /></th>
              <th className="pb-4 cursor-pointer" onClick={() => requestSort('srotas_category')}>Srotas <SortIcon column="srotas_category" /></th>
              <th className="pb-4">Keywords</th>
              <th className="pb-4">Active</th>
              <th className="pb-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedDiseases.map(d => (
              <tr key={d.id} className="border-t border-gray-50">
                <td className="py-4 font-bold">{d.disease_name}</td>
                <td className="py-4">{d.srotas_category}</td>
                <td className="py-4 text-slate-500">{d.search_keywords}</td>
                <td className="py-4">{d.is_active ? 'Yes' : 'No'}</td>
                <td className="py-4 flex gap-2">
                  <button 
                    onClick={() => { setEditingDisease(d); setIsFormModalOpen(true); }}
                    className="text-slate-400 hover:text-emerald-600"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => { setDiseaseToDelete(d); setIsDeleteModalOpen(true); }}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Part B: Analytics */}
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Disease Pattern Analytics</h2>
          <div className="flex gap-4">
            <select className="bg-neutral-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold" onChange={(e) => setDistrictFilter(e.target.value)}>
              <option value="All">All Districts</option>
              {[...new Set(hospitals.map(h => h.district))].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="bg-neutral-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold" onChange={(e) => setDateRange(e.target.value)}>
              <option>This Month</option>
              <option>Last 3 Months</option>
              <option>Yearly</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="h-80">
            <h3 className="text-sm font-bold text-slate-500 mb-4">Top 10 Diagnosed Diseases</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diseaseCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-80">
            <h3 className="text-sm font-bold text-slate-500 mb-4">Distribution by Srotas</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={srotasCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {srotasCounts.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

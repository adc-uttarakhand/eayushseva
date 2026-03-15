import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Loader2, Shield, Edit2, Save, X } from 'lucide-react';

export default function RoleManagement() {
  const [roles, setRoles] = useState<any[]>([]);
  const [newRole, setNewRole] = useState('');
  const [newSanctionedCount, setNewSanctionedCount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSanctionedCount, setEditSanctionedCount] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('roles').select('*').order('role_name');
    if (error) {
      console.error('Error fetching roles:', error);
      alert('Error fetching roles: ' + error.message);
    } else if (data) {
      console.log('Roles data:', data);
      setRoles(data);
    }
    setLoading(false);
  };

  const addRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('roles').insert([{ 
      role_name: newRole.trim(),
      total_sanctioned_posts: parseInt(newSanctionedCount) || 0
    }]);
    if (error) {
      alert('Error adding role: ' + error.message);
    } else {
      setNewRole('');
      setNewSanctionedCount('');
      setIsAdding(false);
      fetchRoles();
    }
    setSubmitting(false);
  };

  const updateRole = async (id: number) => {
    if (!editValue.trim()) return;
    const { error } = await supabase.from('roles').update({ 
      role_name: editValue.trim(),
      total_sanctioned_posts: parseInt(editSanctionedCount) || 0
    }).eq('id', id);
    if (error) {
      alert('Error updating role: ' + error.message);
    } else {
      setEditingId(null);
      fetchRoles();
    }
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    const { error } = await supabase.from('roles').delete().eq('id', roleToDelete.id);
    if (error) {
      alert('Error deleting role: ' + error.message);
    } else {
      fetchRoles();
    }
    setRoleToDelete(null);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="text-emerald-600" /> Role Management
        </h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2"
        >
          <Plus size={18} />
          {isAdding ? 'Cancel' : 'Add Role'}
        </button>
      </div>
      
      {isAdding && (
        <form onSubmit={addRole} className="flex gap-4 mb-8 bg-slate-50 p-6 rounded-2xl border border-gray-100">
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Enter new role name"
            className="flex-1 bg-white border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="number"
            value={newSanctionedCount}
            onChange={(e) => setNewSanctionedCount(e.target.value)}
            placeholder="Sanctioned count"
            className="w-40 bg-white border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button 
            disabled={submitting}
            type="submit"
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Role
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-4 px-4 font-bold text-slate-900">Sanctioned post name</th>
              <th className="py-4 px-4 font-bold text-slate-900">Total Sanctioned Posts</th>
              <th className="py-4 px-4 font-bold text-slate-900 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id} className="border-b border-gray-100 hover:bg-slate-50">
                <td className="py-4 px-4">
                  {editingId === role.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <span className="font-medium text-slate-700">{role.role_name}</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  {editingId === role.id ? (
                    <input
                      type="number"
                      value={editSanctionedCount}
                      onChange={(e) => setEditSanctionedCount(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <span className="text-slate-600">{role.total_sanctioned_posts || 0}</span>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex gap-2 justify-end">
                    {editingId === role.id ? (
                      <>
                        <button onClick={() => updateRole(role.id)} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl">
                          <Save size={18} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-slate-500 hover:bg-slate-100 p-2 rounded-xl">
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(role.id); setEditValue(role.role_name); setEditSanctionedCount(role.total_sanctioned_posts || '0'); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-xl">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => setRoleToDelete(role)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {roleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
            <p className="text-slate-600 mb-6">Are you sure you want to delete the role "{roleToDelete.role_name}"? This action cannot be undone.</p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

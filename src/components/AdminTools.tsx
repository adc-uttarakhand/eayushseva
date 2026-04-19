import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Wrench, 
  Database, 
  ShieldAlert, 
  FileText, 
  Settings, 
  Activity,
  ChevronRight,
  AlertTriangle,
  Users,
  Plus,
  ShieldCheck,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  UserX
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import SearchDeleteEmployeeModal from './SearchDeleteEmployeeModal';
import { UserSession } from './LoginModal';
import { supabase } from '../lib/supabase';

interface AdminToolsProps {
  session: UserSession;
  setActiveTab: (tab: any) => void;
  onAddMedicine: () => void;
}

export default function AdminTools({ session, setActiveTab, onAddMedicine }: AdminToolsProps) {
  const [isTransferEnabled, setIsTransferEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingToggleState, setPendingToggleState] = useState<boolean | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchTransferStatus();
  }, []);

  const fetchTransferStatus = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('global_settings')
      .select('is_active')
      .eq('setting_key', 'transfer_module_enabled')
      .maybeSingle();
    
    if (data) {
      setIsTransferEnabled(data.is_active);
    } else {
      setIsTransferEnabled(false);
    }
    setLoading(false);
  };

  const toggleTransferModule = () => {
    const newState = !isTransferEnabled;
    setPendingToggleState(newState);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (pendingToggleState === null) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('global_settings')
      .update({ is_active: pendingToggleState })
      .eq('setting_key', 'transfer_module_enabled');
    
    if (!error) {
      setIsTransferEnabled(pendingToggleState);
    } else {
      alert('Error updating transfer module status: ' + error.message);
    }
    setLoading(false);
    setIsConfirmModalOpen(false);
    setPendingToggleState(null);
  };

  if (!session) return null;

  console.log('AdminTools session:', session);
  console.log('DEBUG AdminTools - All Tools:', tools);
  console.log('DEBUG AdminTools - Filtered Tools:', tools.filter(t => t.show));

  const tools = [
    {
      id: 'employees',
      label: 'Employee Directory',
      description: 'Manage staff records, service dossiers, and login credentials.',
      icon: Users,
      color: 'blue',
      show: session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN' || session.role === 'DISTRICT_ADMIN'
    },
    {
      id: 'incharge',
      label: 'Incharge Management',
      description: 'Assign and manage hospital incharges across districts.',
      icon: ShieldCheck,
      color: 'emerald',
      show: session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN' || session.role === 'DISTRICT_ADMIN'
    },
    {
      id: 'disease_management',
      label: 'Disease Management',
      description: 'Configure and manage disease categories and reporting parameters.',
      icon: Activity,
      color: 'purple',
      show: session.role === 'SUPER_ADMIN'
    },
    {
      id: 'role_management',
      label: 'Role Management',
      description: 'Manage system roles and permissions.',
      icon: ShieldAlert,
      color: 'red',
      show: session.role === 'SUPER_ADMIN'
    },
    {
      id: 'staff_distribution',
      label: 'Staff Distribution',
      description: 'View and manage staff distribution across facilities.',
      icon: BarChart3,
      color: 'blue',
      show: session.role === 'SUPER_ADMIN'
    },
    {
      id: 'add_medicine',
      label: 'Add New Medicine',
      description: 'Add new medicine records to the central inventory.',
      icon: Plus,
      color: 'emerald',
      show: session.role === 'SUPER_ADMIN',
      action: () => onAddMedicine()
    },
    {
      id: 'delete_employee',
      label: 'Delete Employee',
      description: 'Search and permanently remove an employee record from the system.',
      icon: UserX,
      color: 'red',
      show: true,
      action: () => setIsDeleteModalOpen(true)
    },
    {
      id: 'transfer_control',
      label: 'Transfer Module Control',
      description: 'Master switch to enable or disable the transfer module for all districts.',
      icon: Settings,
      color: 'orange',
      show: session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN',
      action: toggleTransferModule,
      isToggle: true
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmToggle}
        title="Transfer Module Control"
        message={`Are you sure you want to ${pendingToggleState ? 'enable' : 'disable'} the transfer module for all districts?`}
      />
      <SearchDeleteEmployeeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={() => {}}
      />
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Admin <span className="text-emerald-600">Management</span></h1>
          <p className="text-slate-500 mt-2 font-medium">Centralized control for staff, incharges, and system configuration.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.filter(t => t.show).map((tool, index) => (
            <motion.button
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                if (tool.action) {
                  tool.action();
                } else {
                  setActiveTab(tool.id);
                }
              }}
              className="group relative overflow-hidden p-8 rounded-[2.5rem] text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Glass Effect Background */}
              <div className="absolute inset-0 bg-white/40 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/50" />
              
              {/* Hover Gradient */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${
                tool.color === 'emerald' ? 'from-emerald-500 to-teal-500' :
                tool.color === 'blue' ? 'from-blue-500 to-indigo-500' :
                tool.color === 'red' ? 'from-red-500 to-orange-500' :
                tool.color === 'orange' ? 'from-orange-500 to-amber-500' :
                'from-purple-500 to-pink-500'
              }`} />

              <div className="relative flex items-start gap-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                  tool.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                  tool.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  tool.color === 'red' ? 'bg-red-50 text-red-600' :
                  tool.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  <tool.icon size={32} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-slate-900">{tool.label}</h3>
                    {tool.isToggle ? (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold text-xs ${isTransferEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {isTransferEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        {isTransferEnabled ? 'LIVE' : 'DISABLED'}
                      </div>
                    ) : (
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                    )}
                  </div>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}

          {tools.filter(t => t.show).length === 0 && (
            <div className="col-span-full p-12 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/40 text-center">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Restricted Access</h3>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                These tools are only available to Super Administrators. Please contact the system administrator if you believe this is an error.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

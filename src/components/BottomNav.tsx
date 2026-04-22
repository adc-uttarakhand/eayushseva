import { Building2, BarChart3, LayoutDashboard, Users, Wrench, User, Key, ClipboardList, Truck, ShieldCheck, ArrowUpDown, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export type TabId = 'dashboard' | 'hospitals' | 'doctors' | 'tools' | 'profile' | 'eparchi' | 'stats' | 'demands' | 'supply_upload' | 'district_supply' | 'disease_management' | 'role_management' | 'staff_distribution' | 'pharmacy_dashboard' | 'requests' | 'transfer_module' | 'registrations' | 'nearby' | 'rate' | 'transfer_requests' | 'loginDirectory' | 'panchakarma' | 'rapid_tests' | 'patients';

interface BottomNavProps {
  active: TabId;
  setActive: (id: TabId) => void;
  role: string | null;
  isTransferEnabled: boolean;
  hasPanchakarma?: boolean;
  modules: string[];
  isIncharge: boolean;
}

export default function BottomNav({ active, setActive, role, isTransferEnabled, hasPanchakarma, modules, isIncharge }: BottomNavProps) {
  const publicTabs = [
    { id: 'dashboard' as TabId, label: 'AYUSH Network', icon: Building2 },
    { id: 'stats' as TabId, label: 'Statistics', icon: BarChart3 },
  ];

  const adminTabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'hospitals' as TabId, label: 'Hospitals', icon: Building2 },
    { id: 'patients' as TabId, label: 'Patients', icon: Users },
    { id: 'demands' as TabId, label: 'Demands', icon: ClipboardList },
    ...((role === 'SUPER_ADMIN' || role === 'STATE_ADMIN') ? [{ id: 'supply_upload' as TabId, label: 'State Supply', icon: Truck }] : []),
    ...(role === 'DISTRICT_ADMIN' ? [{ id: 'district_supply' as TabId, label: 'District Supply', icon: Truck }] : []),
    ...((role === 'SUPER_ADMIN' || role === 'STATE_ADMIN' || (role === 'DISTRICT_ADMIN' && isTransferEnabled)) ? [{ id: 'requests' as TabId, label: 'Requests', icon: ClipboardList }] : []),
    ...(isTransferEnabled ? [{ id: 'transfer_module' as TabId, label: 'Transfers', icon: ArrowUpDown }] : []),
    ...(hasPanchakarma || role === 'SUPER_ADMIN' || role === 'STATE_ADMIN' ? [{ id: 'panchakarma' as TabId, label: 'Panchakarma', icon: Activity }] : []),
    ...(isIncharge || modules.includes('rapid_tests') ? [{ id: 'rapid_tests' as TabId, label: 'Rapid Tests', icon: Activity }] : []),
    ...((role === 'SUPER_ADMIN' || role === 'STATE_ADMIN') ? [{ id: 'tools' as TabId, label: 'Tools', icon: Wrench }] : []),
    { id: 'profile' as TabId, label: 'Profile', icon: User },
  ];

  const medicineInchargeTabs = [
    { id: 'demands' as TabId, label: 'Demands', icon: ClipboardList },
    { id: 'district_supply' as TabId, label: 'Supply', icon: Truck },
    { id: 'profile' as TabId, label: 'Profile', icon: User },
  ];

  const pharmacyTabs = [
    { id: 'pharmacy_dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile' as TabId, label: 'Profile', icon: User },
  ];

  const isPublic = !role;
  const tabs = isPublic ? publicTabs : (role === 'DISTRICT_MEDICINE_INCHARGE' ? medicineInchargeTabs : (role === 'PHARMACY_MANAGER' ? pharmacyTabs : adminTabs));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-lg">
      <div className="flex overflow-x-auto items-center p-2 gap-2 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 whitespace-nowrap ${
                isActive ? 'text-emerald-900 bg-emerald-100' : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-bold uppercase tracking-widest">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

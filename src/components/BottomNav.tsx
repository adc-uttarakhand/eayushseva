import { Building2, BarChart3, LayoutDashboard, Users, Wrench, User, Key, ClipboardList, Truck, ShieldCheck, ArrowUpDown } from 'lucide-react';
import { motion } from 'motion/react';

export type TabId = 'dashboard' | 'hospitals' | 'doctors' | 'tools' | 'profile' | 'eparchi' | 'stats' | 'demands' | 'supply_upload' | 'district_supply' | 'disease_management' | 'role_management' | 'staff_distribution' | 'pharmacy_dashboard' | 'requests' | 'transfer_module' | 'registrations' | 'nearby' | 'rate' | 'transfer_requests' | 'loginDirectory';

interface BottomNavProps {
  active: TabId;
  setActive: (id: TabId) => void;
  role: string | null;
  isTransferEnabled: boolean;
}

export default function BottomNav({ active, setActive, role, isTransferEnabled }: BottomNavProps) {
  const publicTabs = [
    { id: 'dashboard' as TabId, label: 'AYUSH Network', icon: Building2 },
    { id: 'stats' as TabId, label: 'Statistics', icon: BarChart3 },
  ];

  const adminTabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'hospitals' as TabId, label: 'Hospitals', icon: Building2 },
    { id: 'demands' as TabId, label: 'Demands', icon: ClipboardList },
    ...((role === 'SUPER_ADMIN' || role === 'STATE_ADMIN') ? [{ id: 'supply_upload' as TabId, label: 'State Supply', icon: Truck }] : []),
    ...(role === 'DISTRICT_ADMIN' ? [{ id: 'district_supply' as TabId, label: 'District Supply', icon: Truck }] : []),
    ...((role === 'SUPER_ADMIN' || role === 'STATE_ADMIN' || (role === 'DISTRICT_ADMIN' && isTransferEnabled)) ? [{ id: 'requests' as TabId, label: 'Requests', icon: ClipboardList }] : []),
    ...(isTransferEnabled ? [{ id: 'transfer_module' as TabId, label: 'Transfers', icon: ArrowUpDown }] : []),
    { id: 'registrations' as TabId, label: 'Registrations', icon: ShieldCheck },
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
    <div className="fixed bottom-8 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="max-w-fit mx-auto bg-white/40 backdrop-blur-3xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-full p-2 flex justify-center items-center pointer-events-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 relative group ${
                isActive ? 'text-emerald-900 bg-white/60 shadow-sm' : 'text-slate-600 hover:text-emerald-800 hover:bg-white/30'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300 group-hover:scale-110" />
              <span className={`text-xs font-bold uppercase tracking-widest transition-all duration-300 overflow-hidden ${isActive ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

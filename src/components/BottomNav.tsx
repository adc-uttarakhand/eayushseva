import { Building2, BarChart3, LayoutDashboard, Users, Wrench, User, Key, ClipboardList, Upload, Truck } from 'lucide-react';
import { motion } from 'motion/react';

export type TabId = 'dashboard' | 'hospitals' | 'doctors' | 'tools' | 'profile' | 'eparchi' | 'staff' | 'stats' | 'ayush_network' | 'nearby' | 'employees' | 'loginDirectory' | 'demands' | 'supply_upload' | 'district_supply' | 'disease_management' | 'role_management' | 'staff_distribution' | 'pharmacy_dashboard';

interface BottomNavProps {
  active: TabId;
  setActive: (id: TabId) => void;
  role: string | null;
}

export default function BottomNav({ active, setActive, role }: BottomNavProps) {
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
    ...((role === 'SUPER_ADMIN' || role === 'STATE_ADMIN' || role === 'DISTRICT_ADMIN') ? [{ id: 'employees' as TabId, label: 'Employees', icon: Users }] : [{ id: 'doctors' as TabId, label: 'Doctors', icon: Users }]),
    ...(role === 'SUPER_ADMIN' ? [{ id: 'loginDirectory' as TabId, label: 'Logins', icon: Key }] : []),
    { id: 'tools' as TabId, label: 'Tools', icon: Wrench },
    { id: 'profile' as TabId, label: 'Profile', icon: User },
  ];

  const medicineInchargeTabs = [
    { id: 'demands' as TabId, label: 'Demands', icon: ClipboardList },
    { id: 'district_supply' as TabId, label: 'Supply', icon: Truck },
    { id: 'tools' as TabId, label: 'Tools', icon: Wrench },
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
      <div className="max-w-fit mx-auto bg-white/70 backdrop-blur-2xl border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-full p-1.5 flex justify-center items-center pointer-events-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-500 relative group ${
                isActive ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-white shadow-sm rounded-full -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300 group-hover:scale-110" />
              <span className={`text-xs font-bold uppercase tracking-widest transition-all duration-300 ${isActive ? 'opacity-100 w-auto' : 'opacity-60 group-hover:opacity-100'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

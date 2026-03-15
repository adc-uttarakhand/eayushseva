import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  PlusCircle, 
  Activity, 
  Truck,
  LayoutDashboard
} from 'lucide-react';
import StateSupplyUpload from './StateSupplyUpload';
import ManualSupplyEntry from './ManualSupplyEntry';
import StateSupplyMonitor from './StateSupplyMonitor';
import StateSamplesManager from './StateSamplesManager';
import { FlaskConical } from 'lucide-react';

import RishikulPharmacyManager from './RishikulPharmacyManager';

type StateTab = 'upload' | 'manual' | 'monitor' | 'samples' | 'rishikul';

export default function StateSupplyDashboard() {
  const [activeTab, setActiveTab] = useState<StateTab>('monitor');

  const tabs = [
    { id: 'monitor', label: 'Supply Monitor', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'upload', label: 'Excel Upload', icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'manual', label: 'Manual Entry', icon: PlusCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'samples', label: 'Samples', icon: FlaskConical, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'rishikul', label: 'Rishikul Pharmacy', icon: Truck, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <Truck className="text-white" size={20} />
              </div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                State <span className="text-emerald-600">Supply Administration</span>
              </h1>
            </div>
            <p className="text-slate-500 font-medium ml-13">Manage and monitor medicine distribution across all 13 districts.</p>
          </div>

          {/* Tab Switcher */}
          <div className="bg-white p-1.5 rounded-[2rem] shadow-sm border border-slate-100 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StateTab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] font-bold transition-all ${
                  activeTab === tab.id 
                    ? `${tab.bg} ${tab.color} shadow-sm` 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={18} />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'upload' && <StateSupplyUpload />}
            {activeTab === 'manual' && <ManualSupplyEntry />}
            {activeTab === 'monitor' && <StateSupplyMonitor />}
            {activeTab === 'samples' && <StateSamplesManager />}
            {activeTab === 'rishikul' && <RishikulPharmacyManager />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

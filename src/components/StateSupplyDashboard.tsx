import React, { useState, useEffect } from 'react';
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

export default function StateSupplyDashboard({ activeSubTab = 'monitor' }: { activeSubTab?: 'upload' | 'manual' | 'monitor' | 'samples' | 'rishikul' }) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'monitor' | 'samples' | 'rishikul'>('monitor');

  useEffect(() => {
    if (activeSubTab) {
      setActiveTab(activeSubTab);
    }
  }, [activeSubTab]);

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

          {/* Tab Switcher moved to bottom bar */}
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

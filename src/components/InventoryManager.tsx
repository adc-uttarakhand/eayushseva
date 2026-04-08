import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Plus, History, Database, Box, Truck, Search, Loader2, BarChart3, Calendar, CheckCircle2, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import HospitalSupplyPull from './HospitalSupplyPull';
import RequestStock from './RequestStock';
import MainInventory from './MainInventory';
import HospitalIndent from './HospitalIndent';
import DailyConsumption from './DailyConsumption';
import IndentLogs from './IndentLogs';

export default function InventoryManager({ hospitalId, district, activeSubTab = 'receive' }: { hospitalId: string; district: string; activeSubTab?: 'receive' | 'add_request' | 'main' | 'indent' | 'indent_logs' | 'consumption' }) {
  const [activeTab, setActiveTab] = useState<'receive' | 'add_request' | 'main' | 'indent' | 'indent_logs' | 'consumption'>('receive');

  useEffect(() => {
    if (activeSubTab) {
      setActiveTab(activeSubTab);
    }
  }, [activeSubTab]);

  return (
    <div className="min-h-screen bg-slate-50 p-2 sm:p-4 md:p-8">
      <h1 className="text-xl md:text-3xl font-bold mb-4 md:mb-8">Medicine Management</h1>

      {/* Content Area */}
      <div className="bg-white p-2 sm:p-4 md:p-6 rounded-2xl shadow-sm overflow-x-auto">
        {activeTab === 'receive' && <HospitalSupplyPull hospitalId={hospitalId} district={district} />}
        {activeTab === 'add_request' && <RequestStock hospitalId={hospitalId} district={district} />}
        {activeTab === 'main' && <MainInventory hospitalId={hospitalId} district={district} />}
        {activeTab === 'indent_logs' && <IndentLogs hospitalId={hospitalId} />}
        {activeTab === 'indent' && <HospitalIndent hospitalId={hospitalId} />}
        {activeTab === 'consumption' && <DailyConsumption hospitalId={hospitalId} />}
      </div>
    </div>
  );
}

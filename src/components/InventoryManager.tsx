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

export default function InventoryManager({ hospitalId, district }: { hospitalId: string; district: string; }) {
  const [activeTab, setActiveTab] = useState<'receive' | 'add_request' | 'main' | 'indent' | 'consumption'>('receive');

  const tabs = [
    { id: 'receive', label: 'Receive Stock', icon: Truck },
    { id: 'add_request', label: 'Add / Request Stock', icon: Plus },
    { id: 'main', label: 'Main Inventory', icon: Database },
    { id: 'indent', label: 'Indent', icon: Box },
    { id: 'consumption', label: 'Daily Consumption', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Medicine Management</h1>
      
      {/* Navigation */}
      <div className="flex gap-2 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === tab.id 
              ? 'bg-emerald-600 text-white shadow-lg' 
              : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        {activeTab === 'receive' && <HospitalSupplyPull hospitalId={hospitalId} district={district} />}
        {activeTab === 'add_request' && <RequestStock hospitalId={hospitalId} district={district} />}
        {activeTab === 'main' && <MainInventory hospitalId={hospitalId} district={district} />}
        {activeTab === 'indent' && <HospitalIndent hospitalId={hospitalId} />}
        {activeTab === 'consumption' && <DailyConsumption hospitalId={hospitalId} />}
      </div>
    </div>
  );
}

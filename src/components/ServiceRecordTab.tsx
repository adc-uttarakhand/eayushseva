import React, { useState } from 'react';
import Profiler from './Profiler';

interface ServiceRecordTabProps {
  targetStaffId: string;
  isAdminMode: boolean;
  onBack?: () => void;
  hospitals?: any[];
  employmentType?: string;
}

export default function ServiceRecordTab({ targetStaffId, isAdminMode, onBack, hospitals = [], employmentType }: ServiceRecordTabProps) {
  // Yahan humne 3 tabs ke liye state add kar di hai
  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'service' | 'trainings'>('basic');

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {onBack && (
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all mb-4 font-bold"
        >
          ← Back to List
        </button>
      )}

      {/* Ye wo 3 Buttons hain jo Admin ko screen par upar dikhenge tab switch karne ke liye */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveSubTab('basic')}
          className={`pb-3 font-bold text-sm ${activeSubTab === 'basic' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Basic Info
        </button>
        {!(isAdminMode && employmentType !== 'Permanent') && (
          <button 
            onClick={() => setActiveSubTab('service')}
            className={`pb-3 font-bold text-sm ${activeSubTab === 'service' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Service Record
          </button>
        )}
        {!(isAdminMode && employmentType !== 'Permanent') && (
          <button 
            onClick={() => setActiveSubTab('trainings')}
            className={`pb-3 font-bold text-sm ${activeSubTab === 'trainings' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Trainings
          </button>
        )}
      </div>

      <div className="bg-transparent w-full">
        <Profiler 
          staffId={targetStaffId} 
          userRole={isAdminMode ? 'ADMIN' : 'STAFF'} 
          hospitals={hospitals} 
          activeSubTab={activeSubTab}
          employmentType={employmentType}
        />
      </div>
    </div>
  );
}
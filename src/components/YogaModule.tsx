import React, { useState } from 'react';
import YogaSessionControl from './YogaSessionControl';
import YogaInstructorModule from './YogaInstructorModule';

export default function YogaModule({ session }: { session: any }) {
  const [view, setView] = useState<'control' | 'instructor'>(
    (session.activeModules?.includes('yoga_control') || session.isIncharge || session.role === 'HOSPITAL') ? 'control' : 'instructor'
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {view === 'control' ? (
        <YogaSessionControl session={session} onSwitchToInstructor={() => setView('instructor')} />
      ) : (
        <YogaInstructorModule session={session} onSwitchToControl={() => setView('control')} />
      )}
    </div>
  );
}

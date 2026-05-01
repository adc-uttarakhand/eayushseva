import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 z-[200] flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <img 
          src="https://czjxoavqlznzvhypqtwe.supabase.co/storage/v1/object/public/logo/eAYUSHSeva%20(1).png" 
          alt="App Icon" 
          className="w-12 h-12 rounded-xl"
        />
        <p className="text-sm font-bold text-slate-900">Install eAYUSHseval App for fast access</p>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleInstallClick}
          className="bg-blue-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-900 transition-all"
        >
          Install
        </button>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-2 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

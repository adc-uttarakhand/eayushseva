import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel' 
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] px-4">
      <div className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-6">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-slate-600">{message}</p>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 bg-slate-100 p-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">{cancelText}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 bg-emerald-600 text-white p-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  diseaseName: string;
}

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, diseaseName }: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white p-8 rounded-3xl w-96 space-y-6">
        <h2 className="text-xl font-bold">Delete Disease</h2>
        <p>Are you sure you want to delete <strong>{diseaseName}</strong>?</p>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 bg-slate-100 p-3 rounded-xl font-bold">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 bg-red-600 text-white p-3 rounded-xl font-bold">Delete</button>
        </div>
      </div>
    </div>
  );
}

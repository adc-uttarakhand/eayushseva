import React from 'react';

interface PostingDeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PostingDeleteConfirmationModal({ isOpen, onClose, onConfirm }: PostingDeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white p-8 rounded-3xl w-96 space-y-6">
        <h2 className="text-xl font-bold">Confirm Deletion</h2>
        <p>Are you sure you want to delete this posting history record?</p>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 bg-slate-100 p-3 rounded-xl font-bold">No, Go back</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 bg-red-600 text-white p-3 rounded-xl font-bold">Yes, delete</button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Disease {
  id: string;
  disease_name: string;
  srotas_category: string;
  search_keywords: string;
  is_active: boolean;
}

interface DiseaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (disease: Omit<Disease, 'id'>) => void;
  initialData?: Disease;
}

export default function DiseaseFormModal({ isOpen, onClose, onSave, initialData }: DiseaseFormModalProps) {
  const [formData, setFormData] = useState({
    disease_name: '',
    srotas_category: '',
    search_keywords: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        disease_name: initialData.disease_name,
        srotas_category: initialData.srotas_category,
        search_keywords: initialData.search_keywords,
      });
    } else {
      setFormData({
        disease_name: '',
        srotas_category: '',
        search_keywords: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-3xl w-96 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{initialData ? 'Edit Disease' : 'Add New Disease'}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <input
          type="text"
          placeholder="Disease Name"
          className="w-full p-3 border rounded-xl"
          value={formData.disease_name}
          onChange={(e) => setFormData({ ...formData, disease_name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Srotas Category"
          className="w-full p-3 border rounded-xl"
          value={formData.srotas_category}
          onChange={(e) => setFormData({ ...formData, srotas_category: e.target.value })}
        />
        <input
          type="text"
          placeholder="Keywords (comma separated)"
          className="w-full p-3 border rounded-xl"
          value={formData.search_keywords}
          onChange={(e) => setFormData({ ...formData, search_keywords: e.target.value })}
        />
        <button
          onClick={() => {
            onSave(formData);
            onClose();
          }}
          className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold"
        >
          Save
        </button>
      </div>
    </div>
  );
}

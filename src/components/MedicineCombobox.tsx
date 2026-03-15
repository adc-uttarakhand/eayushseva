import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as stringSimilarity from 'string-similarity';

interface Medicine {
  id: string;
  medicine_name: string;
  packing_size: number | string;
  unit_type: string;
  category: string;
  source_type: string;
}

interface MedicineComboboxProps {
  options: Medicine[];
  value: string | null;
  onChange: (id: string) => void;
  onSearchChange?: (term: string) => void;
  placeholder?: string;
  suggestions?: Medicine[];
}

export default function MedicineCombobox({ options, value, onChange, onSearchChange, placeholder = "Search medicine...", suggestions = [] }: MedicineComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMedicine = useMemo(() => 
    options.find(opt => opt.id === value),
  [options, value]);

  useEffect(() => {
    if (selectedMedicine) {
      setSearchTerm(selectedMedicine.medicine_name);
    } else {
      setSearchTerm('');
    }
  }, [selectedMedicine]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm || (selectedMedicine && searchTerm === selectedMedicine.medicine_name)) {
      return options.slice(0, 50); // Show first 50 if no search
    }

    const sanitizedSearch = searchTerm.toLowerCase().trim();
    
    // Fuzzy matching using string-similarity
    const ss = (stringSimilarity as any).default || stringSimilarity;
    
    const scored = options.map(opt => {
      const target = `${opt.medicine_name} ${opt.packing_size} ${opt.unit_type} ${opt.category}`.toLowerCase();
      const rating = ss.compareTwoStrings(sanitizedSearch, target);
      
      // Also check for simple inclusion for better UX on short strings
      const includes = target.includes(sanitizedSearch) ? 0.5 : 0;
      
      return { ...opt, score: Math.max(rating, includes) };
    });

    return scored
      .filter(opt => opt.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  }, [searchTerm, options, selectedMedicine]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search term to selected medicine name if closed without selection
        if (selectedMedicine) {
          setSearchTerm(selectedMedicine.medicine_name);
        }
        // If no medicine is selected, we keep the searchTerm so the parent can use it for new entries
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedMedicine]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all"
      >
        <Search className="ml-3 text-slate-400" size={16} />
        <input
          type="text"
          className="w-full px-3 py-2 text-sm outline-none bg-transparent"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            const term = e.target.value;
            setSearchTerm(term);
            onSearchChange?.(term);
            // If the user starts typing and it doesn't match the selected medicine, clear the selection
            if (selectedMedicine && term !== selectedMedicine.medicine_name) {
              onChange('');
            }
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {searchTerm && (
          <button 
            onClick={() => {
              setSearchTerm('');
              onSearchChange?.('');
              onChange('');
              setIsOpen(true);
            }}
            className="p-1 hover:bg-slate-100 rounded-full mr-1 text-slate-400"
          >
            <X size={14} />
          </button>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-slate-50 text-slate-400 border-l border-slate-100"
        >
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-80 flex flex-col"
          >
            <div className="overflow-y-auto flex-1">
              {suggestions.length > 0 && !searchTerm && (
                <div className="p-2 border-b border-slate-50">
                  <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suggestions</p>
                  {suggestions.map((opt) => (
                    <button
                      key={`sug-${opt.id}`}
                      onClick={() => {
                        onChange(opt.id);
                        setSearchTerm(opt.medicine_name);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex flex-col hover:bg-emerald-50 transition-colors ${value === opt.id ? 'bg-emerald-50' : ''}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-900">{opt.medicine_name}</span>
                        {value === opt.id && <Check size={14} className="text-emerald-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500">{opt.packing_size} {opt.unit_type} | {opt.category}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="p-2">
                <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {searchTerm ? 'Search Results' : 'All Medicines'}
                </p>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        onChange(opt.id);
                        setSearchTerm(opt.medicine_name);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex flex-col hover:bg-slate-50 transition-colors ${value === opt.id ? 'bg-emerald-50' : ''}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-900">{opt.medicine_name}</span>
                        {value === opt.id && <Check size={14} className="text-emerald-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500">{opt.packing_size} {opt.unit_type} | {opt.category}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center">
                    <p className="text-sm text-slate-400 italic">No medicines found</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { normalizeForSearch } from '../lib/utils';
import * as stringSimilarity from 'string-similarity';

interface Disease {
  id: string;
  disease_name: string;
  srotas_category: string;
  search_keywords: string;
}

interface DiseaseComboboxProps {
  options: Disease[];
  value: string | null;
  onChange: (diseaseName: string) => void;
  placeholder?: string;
  onSelect?: () => void;
}

export default function DiseaseCombobox({ options, value, onChange, placeholder = "Search diagnosis...", onSelect }: DiseaseComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return options.slice(0, 50);
    }

    const sanitizedSearch = normalizeForSearch(searchTerm);
    const ss = (stringSimilarity as any).default || stringSimilarity;
    
    const scored = options.map(opt => {
      const target = normalizeForSearch(`${opt.disease_name} ${opt.srotas_category} ${opt.search_keywords}`);
      const rating = ss.compareTwoStrings(sanitizedSearch, target);
      const includes = target.includes(sanitizedSearch) ? 0.5 : 0;
      return { ...opt, score: Math.max(rating, includes) };
    });

    return scored
      .filter(opt => opt.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  }, [searchTerm, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {searchTerm && (
          <button 
            type="button"
            onClick={() => {
              setSearchTerm('');
              onChange('');
              setIsOpen(true);
            }}
            className="p-1 hover:bg-slate-100 rounded-full mr-1 text-slate-400"
          >
            <X size={14} />
          </button>
        )}
        <button 
          type="button"
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
              <div className="p-2">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(opt.disease_name);
                        setSearchTerm(opt.disease_name);
                        setIsOpen(false);
                        onSelect?.();
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex flex-col hover:bg-slate-50 transition-colors ${value === opt.disease_name ? 'bg-emerald-50' : ''}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-900">{opt.disease_name}</span>
                        {value === opt.disease_name && <Check size={14} className="text-emerald-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500">{opt.srotas_category}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center">
                    <p className="text-sm text-slate-400 italic">No diseases found</p>
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

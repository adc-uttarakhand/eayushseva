import React, { useState, useEffect, useRef } from 'react';

export const HospitalSearchInput = ({ 
  value, 
  onChange, 
  hospitals, 
  placeholder = "Search hospital...", 
  className = "",
  isTextarea = false
}: { 
  value: string, 
  onChange: (val: string) => void, 
  hospitals: any[], 
  placeholder?: string,
  className?: string,
  isTextarea?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filteredHospitals = hospitals
    ? hospitals
        .filter(h => h.facility_name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)
    : [];

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
      {isTextarea ? (
        <textarea
          rows={2}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={`w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none leading-tight ${className}`}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={`w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${className}`}
          placeholder={placeholder}
        />
      )}
      {isOpen && filteredHospitals.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredHospitals.map((h: any) => (
            <button
              key={h.id}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-sm"
              onClick={() => {
                onChange(h.facility_name);
                setQuery(h.facility_name);
                setIsOpen(false);
              }}
            >
              {h.facility_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const OfficeSearchInput = ({ 
  value, 
  onChange, 
  offices, 
  placeholder = "Search office...", 
  className = "",
  isTextarea = false
}: { 
  value: string, 
  onChange: (val: string) => void, 
  offices: any[], 
  placeholder?: string,
  className?: string,
  isTextarea?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filteredOffices = offices
    ? offices
        .filter(o => o.office_name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)
    : [];

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
      {isTextarea ? (
        <textarea
          rows={2}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={`w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none leading-tight ${className}`}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={`w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${className}`}
          placeholder={placeholder}
        />
      )}
      {isOpen && filteredOffices.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredOffices.map((o: any) => (
            <button
              key={o.id}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-sm"
              onClick={() => {
                onChange(o.office_name);
                setQuery(o.office_name);
                setIsOpen(false);
              }}
            >
              {o.office_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, History, User, Calendar, Hash, FileText, Save, Loader2, Languages, CheckCircle, Printer, Download, MessageCircle, ArrowLeft, Trash2, AlertTriangle, ShoppingCart, IndianRupee, X, Eye, ArrowLeftRight, CheckCircle2, FileImage, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const PDF_STYLES = `
  .pdf-print-container {
    font-family: 'Inter', sans-serif !important;
    color: #0f172a !important;
    --tw-text-opacity: 1 !important;
    --tw-bg-opacity: 1 !important;
    --tw-border-opacity: 1 !important;
    background-color: #ffffff !important;
  }
  .pdf-print-container * {
    border-color: #cbd5e1 !important;
    box-shadow: none !important;
    text-shadow: none !important;
    outline: none !important;
  }
  .pdf-print-container .bg-emerald-600 { background-color: #059669 !important; }
  .pdf-print-container .text-emerald-700 { color: #047857 !important; }
  .pdf-print-container .text-emerald-600 { color: #059669 !important; }
  .pdf-print-container .bg-emerald-50 { background-color: #ecfdf5 !important; }
  .pdf-print-container .text-emerald-800 { color: #065f46 !important; }
  .pdf-print-container .bg-slate-50 { background-color: #f8fafc !important; }
  .pdf-print-container .bg-neutral-50 { background-color: #fafafa !important; }
  .pdf-print-container .text-slate-500 { color: #64748b !important; }
  .pdf-print-container .text-slate-400 { color: #94a3b8 !important; }
  .pdf-print-container .text-slate-800 { color: #1e293b !important; }
  .pdf-print-container .text-slate-900 { color: #0f172a !important; }
  .pdf-print-container .border-slate-900 { border-color: #0f172a !important; }
  .pdf-print-container .border-gray-200 { border-color: #e5e7eb !important; }
  .pdf-print-container .border-gray-100 { border-color: #f3f4f6 !important; }
  .pdf-print-container .border-gray-300 { border-color: #d1d5db !important; }
  .pdf-print-container .bg-white { background-color: #ffffff !important; }
`;
import { PrescriptionMedicine, IndentStock } from '../types/inventory';
import DiseaseCombobox from './DiseaseCombobox';
import PrescriptionTable from './PrescriptionTable';
import { normalizeForSearch } from '../lib/utils';
import FeesModule from './FeesModule';

interface Patient {
  id?: string;
  global_serial: string;
  hospital_yearly_serial: string;
  daily_opd_number: string;
  hospital_id: string;
  name: string;
  age: string;
  gender: string;
  mobile: string;
  aadhar: string;
  patient_location?: string;
  detailed_address?: string;
  complaints: string;
  diagnosis: string;
  history: string;
  nadi: string;
  prakruti: string;
  mutra: string;
  mala: string;
  jivha: string;
  netra: string;
  nidra: string;
  agni: string;
  ahar_shakti: string;
  satva: string;
  vyayam_shakti: string;
  investigations: string;
  prescription: string;
  created_at: string;
  registration_date?: string | null;
  revisit_count?: number;
  revisit_date?: string | null;
  is_new?: boolean;
  status?: string;
  consultation_mode?: string;
  assigned_doctor_id?: string;
  queue_time?: string;
  lifestyle_advice?: string;
  marma_points?: string;
  prescribed_panchakarma?: string;
  prescribed_special_therapy?: string;
  prescribed_tests?: string;
  fee_amount?: number;
}

const getValidityDate = (regDate: string | null | undefined) => {
  if (!regDate) return '-';
  try {
    const date = new Date(regDate);
    if (isNaN(date.getTime())) return '-';
    date.setDate(date.getDate() + 14);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
  } catch (e) {
    return '-';
  }
};

interface Staff {
  id: string;
  full_name: string;
  role: string;
  hospital_id: string;
}

const AsyncMultiSelect = ({
  placeholder,
  tableName,
  filterColumn,
  filterValue,
  displayColumn,
  selectedItems,
  onAdd,
  onRemove,
  onUpdateItem,
  showDaysInput = false,
  allowCustom = false
}: {
  placeholder: string;
  tableName: string;
  filterColumn?: string;
  filterValue?: string;
  displayColumn: string;
  selectedItems: any[];
  onAdd: (item: any) => void;
  onRemove: (item: any) => void;
  onUpdateItem?: (item: any) => void;
  showDaysInput?: boolean;
  allowCustom?: boolean;
}) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      if (query.length < 2) {
        setOptions([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      let q = supabase.from(tableName).select('*').ilike(displayColumn, `%${query}%`);
      if (filterColumn && filterValue) {
        q = q.eq(filterColumn, filterValue);
      }
      const { data, error } = await q.limit(20);
      if (!error && data) {
        setOptions(data);
        setIsOpen(true);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchOptions, 300);
    return () => clearTimeout(debounce);
  }, [query, tableName, filterColumn, filterValue, displayColumn]);

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedItems.map((item, idx) => (
          <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
            {item[displayColumn]}
            {showDaysInput && (
              <input
                type="number"
                min="1"
                placeholder="Days"
                value={item.days || ''}
                onChange={(e) => {
                  if (onUpdateItem) {
                    onUpdateItem({ ...item, days: parseInt(e.target.value) || undefined });
                  }
                }}
                className="w-12 px-1 py-0.5 text-xs bg-white border border-emerald-200 rounded text-center focus:outline-none focus:border-emerald-400"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <button type="button" onClick={() => onRemove(item)} className="text-emerald-600 hover:text-emerald-900 ml-1">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        {loading && <div className="absolute right-3 top-3"><Loader2 className="w-4 h-4 animate-spin text-emerald-500" /></div>}
      </div>
      {isOpen && (options.length > 0 || allowCustom) && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {options.map((option, idx) => (
            <li
              key={idx}
              className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm"
              onClick={() => {
                // Prevent duplicate selection
                if (!selectedItems.find(i => i.id === option.id)) {
                  onAdd(option);
                }
                setQuery('');
                setIsOpen(false);
              }}
            >
              {option[displayColumn]} {option.charges ? `(₹${option.charges})` : ''}
            </li>
          ))}
          {allowCustom && query.length >= 2 && !options.find(o => o[displayColumn]?.toLowerCase() === query.toLowerCase()) && (
            <li
              className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm text-emerald-600 font-medium"
              onClick={() => {
                const customItem = {
                  id: `custom_${Date.now()}`,
                  [displayColumn]: query,
                  charges: 0
                };
                onAdd(customItem);
                setQuery('');
                setIsOpen(false);
              }}
            >
              + Add "{query}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

const MedicineSearch = ({ 
  value, 
  onChange, 
  onSelect,
  indentStock, 
  mainInventory,
  masterMedicines
}: { 
  value: string; 
  onChange: (val: string) => void; 
  onSelect?: (val: string) => void;
  indentStock: any[]; 
  mainInventory: any[]; 
  masterMedicines: string[];
}) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal query with parent value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filteredOptions = React.useMemo(() => {
    if (!query || query.length < 1) return [];
    
    const normalizedQuery = normalizeForSearch(query);
    const optionsMap = new Map<string, { name: string; type: 'green' | 'red' | 'slate' }>();

    // 1. Check Indent Stock (Green)
    indentStock.forEach(item => {
      if (normalizeForSearch(item.medicine_name).includes(normalizedQuery)) {
        optionsMap.set(item.medicine_name, { name: item.medicine_name, type: 'green' });
      }
    });

    // 2. Check Main Inventory (Red)
    mainInventory.forEach(item => {
      if (normalizeForSearch(item.medicine_name).includes(normalizedQuery) && !optionsMap.has(item.medicine_name)) {
        optionsMap.set(item.medicine_name, { name: item.medicine_name, type: 'red' });
      }
    });

    // 3. Check All Master Medicines (Slate/Default)
    masterMedicines.forEach(name => {
      if (normalizeForSearch(name).includes(normalizedQuery) && !optionsMap.has(name)) {
        optionsMap.set(name, { name: name, type: 'slate' });
      }
    });

    return Array.from(optionsMap.values()).slice(0, 50);
  }, [query, indentStock, mainInventory, masterMedicines]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search medicine..."
        className="w-full bg-white border border-gray-100 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
      />
      
      <AnimatePresence>
        {isOpen && filteredOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-64 overflow-y-auto overflow-x-hidden"
          >
            {filteredOptions.map((opt, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onChange(opt.name);
                  setQuery(opt.name);
                  setIsOpen(false);
                  if (onSelect) onSelect(opt.name);
                }}
                className={`flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0`}
              >
                <span className={`text-sm font-bold ${
                  opt.type === 'green' ? 'text-emerald-600' : 
                  opt.type === 'red' ? 'text-red-600' : 'text-slate-600'
                }`}>
                  {opt.name}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  opt.type === 'green' ? 'bg-emerald-50 text-emerald-700' : 
                  opt.type === 'red' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'
                }`}>
                  {opt.type === 'green' ? 'In Stock' : opt.type === 'red' ? 'Main Store Only' : 'Master List'}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface EParchiProps {
  hospitalId: string;
  hospitalName?: string;
  district?: string;
  hospitalType?: string;
  regionIndicator?: string;
  session?: any;
  activeSubTab?: 'registration' | 'queue' | 'dispensing';
  onNavigateToIndent?: () => void;
}

export default function EParchi({ hospitalId, hospitalName, district, hospitalType, regionIndicator, session, activeSubTab = 'registration', onNavigateToIndent }: EParchiProps) {
  const userRole = session?.role;
  const staffRole = session?.staffRole;
  const isHospital = userRole === 'HOSPITAL';
  const isIncharge = session?.isIncharge;
  const isSMO = staffRole === 'Senior Medical Officer';
  const isMO = staffRole === 'Medical Officer';
  const isPharmacist = staffRole === 'Pharmacist' || staffRole === 'Chief Pharmacy Officer';

  const assignedModules = session?.modules || [];
  const canRegister = isIncharge || isHospital || assignedModules.includes('e_parchi') || assignedModules.includes('eparchi_registration');
  const canFees = canRegister || assignedModules.includes('eparchi_fees'); // Auto-assigned if canRegister is true, or explicitly assigned
  const canConsult = isIncharge || isHospital || assignedModules.includes('e_parchi') || assignedModules.includes('eparchi_consultation');
  const canViewQueue = isIncharge || isHospital || assignedModules.includes('e_parchi') || assignedModules.includes('eparchi_queue');
  const canDispense = isIncharge || isHospital || assignedModules.includes('e_parchi') || assignedModules.includes('eparchi_pharmacy');

  const [activeTab, setActiveTab] = useState<'registration' | 'queue' | 'dispensing'>(
    'registration'
  );
  const [activeRegistrationSubTab, setActiveRegistrationSubTab] = useState<'registration' | 'list'>('registration');
  const [activeDispensingTab, setActiveDispensingTab] = useState<'auto' | 'manual'>('auto');

  useEffect(() => {
    if (activeSubTab) {
      setActiveTab(activeSubTab);
    }
  }, [activeSubTab]);
  const [isNew, setIsNew] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [diseaseMaster, setDiseaseMaster] = useState<any[]>([]);
  const [registrationList, setRegistrationList] = useState<Patient[]>([]);
  const [filterType, setFilterType] = useState<'today' | 'monthly' | 'range'>('today');
  const [filterMonth, setFilterMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showPreviewModal, setShowPreviewModal] = useState<Patient | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [pdfData, setPdfData] = useState<Patient | null>(null);
  const [pngData, setPngData] = useState<Patient | null>(null);
  const pngContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDiseases();
  }, []);

  useEffect(() => {
    if (activeRegistrationSubTab === 'list') {
      fetchRegistrationList();
    }
  }, [activeRegistrationSubTab, filterType, filterMonth, filterYear, startDate, endDate]);

  const fetchDiseases = async () => {
    try {
      const { data, error } = await supabase.from('diseases_master').select('*').eq('is_active', true);
      console.log('Diseases fetched:', data, error);
      if (error) {
        console.error('Error fetching diseases:', error);
        return;
      }
      if (data) setDiseaseMaster(data);
    } catch (err) {
      console.error('Unexpected error fetching diseases:', err);
    }
  };

  const fetchRegistrationList = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospitalId);

      if (filterType === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('created_at', `${today}T00:00:00Z`)
                     .lte('created_at', `${today}T23:59:59Z`);
      } else if (filterType === 'monthly') {
        const startOfMonth = `${filterYear}-${filterMonth}-01T00:00:00Z`;
        const lastDay = new Date(Number(filterYear), Number(filterMonth), 0).getDate();
        const endOfMonth = `${filterYear}-${filterMonth}-${lastDay}T23:59:59Z`;
        query = query.gte('created_at', startOfMonth)
                     .lte('created_at', endOfMonth);
      } else if (filterType === 'range') {
        query = query.gte('created_at', `${startDate}T00:00:00Z`)
                     .lte('created_at', `${endDate}T23:59:59Z`);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      setRegistrationList(data || []);
    } catch (err) {
      console.error('Error fetching registration list:', err);
    } finally {
      setLoading(false);
    }
  };

const removeOklch = (clonedDoc: Document) => {
  const elements = clonedDoc.getElementsByTagName('*');
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;
    try {
      if (!el.style) continue;
      
      const computed = window.getComputedStyle(el);
      
      // Specifically check properties that might have oklch
      const props = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'];
      props.forEach(prop => {
        // @ts-ignore
        const val = computed[prop];
        if (val && val.includes('oklch')) {
          if (prop === 'backgroundColor') el.style.backgroundColor = '#ffffff';
          else if (prop === 'borderColor') el.style.borderColor = '#cbd5e1';
          else el.style[prop as any] = '#0f172a';
        }
      });

      // Also check inline styles
      for (let j = 0; j < el.style.length; j++) {
        const prop = el.style[j];
        const value = el.style.getPropertyValue(prop);
        if (value && value.includes('oklch')) {
          el.style.setProperty(prop, 'inherit');
        }
      }
    } catch (e) {}
  }
};

const handleDownloadPDF = async (patient: Patient) => {
  setIsGeneratingPDF(true);
  setPdfData(patient);
  
  setTimeout(async () => {
    const element = document.getElementById('parchi-preview-content');
    if (!element) {
      setIsGeneratingPDF(false);
      return;
    }

    const opt = {
      margin: 0,
      filename: `${patient.name}_${patient.hospital_yearly_serial}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 3,
        useCORS: true, 
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          removeOklch(clonedDoc);
        }
      },
      jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ["px_scaling"] }
    };

    try {
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Generation Error:', error);
    } finally {
      setIsGeneratingPDF(false);
      setPdfData(null);
    }
  }, 500);
};

const handleDownloadPNG = async (patient: Patient) => {
  setIsGeneratingPDF(true);
  setPngData(patient);
  
  setTimeout(async () => {
    const element = document.getElementById('parchi-preview-content');
    if (!element) {
      setIsGeneratingPDF(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        onclone: (clonedDoc: Document) => {
          removeOklch(clonedDoc);
        }
      });
      
      const link = document.createElement('a');
      link.download = `${patient.name}_${patient.hospital_yearly_serial}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('PNG Generation Error:', error);
      toast.error('Failed to generate PNG');
    } finally {
      setIsGeneratingPDF(false);
      setPngData(null);
    }
  }, 500);
};
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [patientLastVisit, setPatientLastVisit] = useState<Record<string, { days: number, history: any[] }>>({});

  const checkPatientHistory = async (patient: Patient) => {
    try {
      const { data, error } = await supabase
        .from('daily_consumption')
        .select('medicine_name, created_at')
        .eq('patient_id', patient.id)
        .gte('created_at', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastDate = new Date(data[0].created_at);
        const diff = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        setPatientLastVisit(prev => ({ ...prev, [patient.id!]: { days: diff, history: data } }));
      }
    } catch (err) {
      console.error('Error checking patient history:', err);
    }
  };

  // ... inside selectPatient or search results mapping ...
  // When patient is selected or added to list, call checkPatientHistory(patient)
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  const [prescribedMedicines, setPrescribedMedicines] = useState<PrescriptionMedicine[]>([]);
  const [indentStock, setIndentStock] = useState<IndentStock[]>([]);
  const [mainInventory, setMainInventory] = useState<any[]>([]);
  const [availableMedicines, setAvailableMedicines] = useState<string[]>([]);
  const [medicineUnits, setMedicineUnits] = useState<Record<string, string>>({});
  const [newMedicine, setNewMedicine] = useState<Partial<PrescriptionMedicine>>({
    medicine_name: '',
    dosage: '1-0-1',
    frequency: '2',
    instruction: 'After Food',
    duration_days: 5,
    unit_label: 'tab'
  });

  const [availableDoctors, setAvailableDoctors] = useState<Staff[]>([]);
  const [selectedTherapies, setSelectedTherapies] = useState<any[]>([]);
  const [selectedTests, setSelectedTests] = useState<any[]>([]);
  const [lifestyleAdvice, setLifestyleAdvice] = useState('');
  const [marmaPoints, setMarmaPoints] = useState('');
  const [liveBill, setLiveBill] = useState(0);
  const [queue, setQueue] = useState<Patient[]>([]);
  const [dispensingQueue, setDispensingQueue] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [dispensingMedicine, setDispensingMedicine] = useState<any | null>(null);
  const [lastConsumption, setLastConsumption] = useState<{ date: string, medicines: string } | null>(null);
  const [consumptionHistory, setConsumptionHistory] = useState<{ date: string, medicines: string }[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showIndentModal, setShowIndentModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [dispensedQty, setDispensedQty] = useState<string>('');
  const [showConsultationCompletePopup, setShowConsultationCompletePopup] = useState(false);
  const [dispensedMedicines, setDispensedMedicines] = useState<string[]>([]);
  const [masterMedicines, setMasterMedicines] = useState<string[]>([]);
  const [currentPrescription, setCurrentPrescription] = useState<any[]>([]);
  const [originalPatient, setOriginalPatient] = useState<Patient | null>(null);

  const fetchPatientConsumptionHistory = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('daily_consumption')
        .select('medicine_name, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        setLastConsumption(null);
        setConsumptionHistory([]);
        return;
      }

      // Group by date
      const grouped = data.reduce((acc: any, curr: any) => {
        const date = new Date(curr.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        if (!acc[date]) acc[date] = [];
        acc[date].push(curr.medicine_name);
        return acc;
      }, {});

      const history = Object.entries(grouped).map(([date, meds]: any) => ({
        date,
        medicines: meds.join(', ')
      }));

      setConsumptionHistory(history);
      setLastConsumption(history[0]);
    } catch (err) {
      console.error('Error fetching consumption history:', err);
    }
  };

  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '',
    age: '',
    gender: 'Male',
    mobile: '',
    aadhar: '',
    patient_location: '',
    detailed_address: '',
    complaints: '',
    diagnosis: '',
    history: '',
    nadi: '',
    prakruti: '',
    mutra: '',
    mala: '',
    jivha: '',
    netra: '',
    nidra: '',
    agni: '',
    ahar_shakti: '',
    satva: '',
    vyayam_shakti: '',
    investigations: '',
    prescription: '',
    global_serial: '',
    assigned_doctor_id: '',
  });

  const [globalSerial, setGlobalSerial] = useState('');
  const [hospitalYearlySerial, setHospitalYearlySerial] = useState('');
  const [dailyOpdNumber, setDailyOpdNumber] = useState('');
  const [revisitCount, setRevisitCount] = useState<number>(0);
  const historyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeTab === 'registration') {
      generateSerials();
      fetchDoctors();
    } else if (activeTab === 'queue') {
      fetchQueue();
      fetchInventoryData();
    } else if (activeTab === 'dispensing') {
      fetchDispensingQueue();
      fetchInventoryData();
    }
  }, [hospitalId, activeTab]);

  const fetchDispensingQueue = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospitalId)
        .in('status', ['Completed', 'Consultation Completed'])
        .gte('created_at', `${today}T00:00:00Z`)
        .lte('created_at', `${today}T23:59:59Z`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDispensingQueue(data || []);
    } catch (err) {
      console.error('Error fetching dispensing queue:', err);
    }
  };

  const fetchInventoryData = async () => {
    try {
      // Fetch Indent Stock (hospital_indent)
      const { data: stockData } = await supabase
        .from('hospital_indent')
        .select('*')
        .eq('hospital_id', hospitalId);
      
      if (stockData) setIndentStock(stockData);

      // Fetch Main Inventory with units
      const { data: invData } = await supabase
        .from('medicine_inventory')
        .select('medicine_name:medicine_master(medicine_name, unit_type), quantity')
        .eq('hospital_id', hospitalId);
      
      if (invData) {
        const units: Record<string, string> = {};
        // Aggregate quantities by medicine_name
        const aggregatedInventory = invData.reduce((acc, item) => {
          const med = (item.medicine_name as any);
          const name = med?.medicine_name || 'Unknown';
          if (med?.unit_type) units[name] = med.unit_type;
          acc[name] = (acc[name] || 0) + (item.quantity || 0);
          return acc;
        }, {} as Record<string, number>);

        setMedicineUnits(prev => ({ ...prev, ...units }));

        const formattedInventory = Object.entries(aggregatedInventory).map(([name, qty]) => ({
          medicine_name: name,
          quantity: qty
        }));

        setAvailableMedicines(Object.keys(aggregatedInventory));
        setMainInventory(formattedInventory);
      }

      // Fetch Master Medicine
      const { data: masterData, error: masterError } = await supabase
        .from('medicine_master')
        .select('medicine_name, unit_type');
      
      if (masterError) {
        console.error('Error fetching master_medicine:', masterError);
      }
      
      if (masterData) {
        const units: Record<string, string> = {};
        masterData.forEach(m => {
          if (m.unit_type) units[m.medicine_name] = m.unit_type;
        });
        setMedicineUnits(prev => ({ ...prev, ...units }));
        setMasterMedicines(masterData.map(m => m.medicine_name));
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name, role, hospital_id')
        .eq('hospital_id', hospitalId)
        .in('role', ['Medical Officer', 'Senior Medical Officer', 'SMO / ADAUO', 'DAUO', 'JD']);

      if (error) throw error;
      setAvailableDoctors(data || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  const fetchQueue = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('status', 'Waiting')
        .gte('created_at', `${today}T00:00:00Z`)
        .lte('created_at', `${today}T23:59:59Z`)
        .order('daily_opd_number', { ascending: true });

      if (!isIncharge) {
        query = query.eq('assigned_doctor_id', session?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setQueue(data || []);
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  };

  const generateSerials = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const fyStartYear = month >= 3 ? year : year - 1;
      const fyStartDate = new Date(fyStartYear, 3, 1).toISOString();
      const { data: hospitalData } = await supabase
        .from('hospitals')
        .select('sr_no')
        .eq('hospital_id', hospitalId)
        .single();
      const hSrNo = hospitalData?.sr_no || '00';

      const fy = month >= 3 ? `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}` : `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
      
      const { count: globalCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fyStartDate);

      const { count: hospitalCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .gte('created_at', fyStartDate);

      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

      const { count: dailyCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      const nextGlobal = (globalCount || 0) + 1;
      const nextHospital = (hospitalCount || 0) + 1;
      const nextDaily = (dailyCount || 0) + 1;

      setGlobalSerial(`${nextGlobal}/${fy}`);
      setHospitalYearlySerial(`${nextHospital.toString().padStart(4, '0')}/${hSrNo}/${fy}`);
      setDailyOpdNumber(nextDaily.toString().padStart(2, '0'));
      setRevisitCount(0);
    } catch (err) {
      console.error('Error generating serials:', err);
    }
  };

  const fetchPatientHistory = async (aadhar: string, mobile: string) => {
    if (!aadhar && !mobile) return;
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .or(`aadhar.eq.${aadhar},mobile.eq.${mobile}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPatientHistory(data || []);
      return data || [];
    } catch (err) {
      console.error('History fetch error:', err);
      return [];
    }
  };

  const handleSearchRegistration = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const cleanQuery = searchQuery.replace(/[^0-9]/g, '');
      let query = supabase.from('patients').select('*').eq('hospital_id', hospitalId);
      
      if (cleanQuery) {
        query = query.or(`hospital_yearly_serial.ilike.%${cleanQuery}%,mobile.ilike.%${cleanQuery}%`);
      } else {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDispensing = async () => {
    if (!searchQuery) {
      setPatients([]);
      return;
    }
    setLoading(true);
    try {
      // Clean query: remove non-numeric chars for serial/mobile search
      const cleanQuery = searchQuery.replace(/[^0-9]/g, '');
      
      let query = supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospitalId)
        .gte('created_at', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString());

      // Search by serial OR mobile using OR logic
      if (cleanQuery) {
        query = query.or(`hospital_yearly_serial.ilike.%${cleanQuery}%,mobile.ilike.%${cleanQuery}%`);
      } else {
        // Fallback to name search if not numeric
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(10);
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectPatient = async (patient: Patient) => {
    setLoading(true);
    try {
      // 1. Identify Original/New registration record (is_new: true)
      const { data: originalData } = await supabase
        .from('patients')
        .select('*')
        .eq('hospital_yearly_serial', patient.hospital_yearly_serial)
        .eq('hospital_id', patient.hospital_id)
        .eq('is_new', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const baseRecord = originalData || patient;
      setOriginalPatient(baseRecord);

      // 2. Count existing False rows for revisit count
      const { count: falseRowsCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_yearly_serial', baseRecord.hospital_yearly_serial)
        .eq('hospital_id', baseRecord.hospital_id)
        .eq('is_new', false);

      const nextRevisitCount = (falseRowsCount || 0) + 1;
      const registrationDate = new Date(baseRecord.registration_date || baseRecord.created_at);
      const diffDays = Math.ceil(Math.abs(new Date().getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const history = await fetchPatientHistory(patient.aadhar, patient.mobile);
      const historyLength = history.length;

      if (diffDays <= 15) {
        const targetRegistrationDate = baseRecord.registration_date || baseRecord.created_at || '';
        setFormData({ 
          ...patient, 
          global_serial: baseRecord.global_serial || patient.global_serial || '', 
          assigned_doctor_id: '',
          revisit_count: nextRevisitCount,
          registration_date: targetRegistrationDate
        });
        setGlobalSerial(baseRecord.global_serial || patient.global_serial);
        setHospitalYearlySerial(baseRecord.hospital_yearly_serial || patient.hospital_yearly_serial);
        
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
        const { count: dailyCount } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('hospital_id', hospitalId)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);
          
        setDailyOpdNumber(((dailyCount || 0) + 1).toString().padStart(2, '0'));
        setRevisitCount(nextRevisitCount);
        setIsNew(false);
      } else {
        toast('Patient last visit was more than 15 days ago. They will be registered as a New Patient, but personal details have been auto-filled.', {
          icon: 'ℹ️',
          duration: 5000
        });
        setFormData({
          ...patient,
          complaints: '',
          diagnosis: '',
          prescription: '',
          global_serial: '',
          assigned_doctor_id: '',
          registration_date: new Date().toISOString()
        });
        setRevisitCount(historyLength);
        generateSerials();
        setIsNew(true);
      }
    } catch (err) {
      console.error('Select patient error:', err);
    } finally {
      setLoading(false);
      setPatients([]);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assigned_doctor_id) {
      toast.error('Please select a doctor or Teleconsultation.');
      return;
    }
    setSaving(true);
    try {
      const serverNow = new Date().toISOString();
      const payload: any = {
        ...formData,
        global_serial: isNew ? globalSerial : (originalPatient?.global_serial || formData.global_serial),
        hospital_yearly_serial: isNew ? hospitalYearlySerial : (originalPatient?.hospital_yearly_serial || formData.hospital_yearly_serial),
        daily_opd_number: dailyOpdNumber,
        hospital_id: isNew ? hospitalId : (originalPatient?.hospital_id || hospitalId),
        revisit_count: revisitCount,
        is_new: isNew,
        created_at: serverNow,
        registration_date: isNew ? serverNow : (originalPatient?.registration_date || originalPatient?.created_at || formData.registration_date),
        revisit_date: isNew ? null : serverNow,
        status: formData.assigned_doctor_id === 'teleconsultation' ? 'Completed' : 'Waiting',
        consultation_mode: formData.assigned_doctor_id === 'teleconsultation' ? 'Teleconsultation' : 'Online',
        queue_time: formData.assigned_doctor_id === 'teleconsultation' ? null : serverNow,
        assigned_doctor_id: formData.assigned_doctor_id === 'teleconsultation' ? null : formData.assigned_doctor_id,
        fee_amount: feeAmount,
      };

      if (!isNew) {
        delete payload.id;
        if (originalPatient) {
          payload.name = originalPatient.name;
          payload.age = originalPatient.age;
          payload.gender = originalPatient.gender;
          payload.mobile = originalPatient.mobile;
          payload.aadhar = originalPatient.aadhar;
          payload.patient_location = originalPatient.patient_location;
          payload.detailed_address = originalPatient.detailed_address;
          payload.hospital_id = originalPatient.hospital_id;
          payload.global_serial = originalPatient.global_serial;
          payload.hospital_yearly_serial = originalPatient.hospital_yearly_serial;
          payload.registration_date = originalPatient.registration_date || originalPatient.created_at;
        }
      }

      const { error } = await supabase.from('patients').insert([payload]);
      if (error) throw error;
      
      toast.success(formData.assigned_doctor_id === 'teleconsultation' ? 'Teleconsultation recorded successfully!' : 'Patient registered and sent for consultation successfully!');
      setFormData({
        name: '', age: '', gender: 'Male', mobile: '', aadhar: '',
        patient_location: '', detailed_address: '',
        complaints: '', diagnosis: '', history: '', nadi: '', prakruti: '',
        mutra: '', mala: '', jivha: '', netra: '', nidra: '', agni: '',
        ahar_shakti: '', satva: '', vyayam_shakti: '', investigations: '', prescription: '', global_serial: '', assigned_doctor_id: ''
      });
      setOriginalPatient(null);
      setPatientHistory([]);
      generateSerials();
      setIsNew(true);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Error saving patient data');
    } finally {
      setSaving(false);
    }
  };

  const handleOfflineParchi = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Patient Name, Age, Gender, and Assigned Doctor must be filled
    if (!formData.name || !formData.age || !formData.gender || !formData.assigned_doctor_id) {
      toast.error('Please fill in Patient Name, Age, Gender, and assign a Doctor before submitting.');
      return;
    }

    setSaving(true);
    try {
      const serverNow = new Date().toISOString();
      const isTeleconsultation = formData.assigned_doctor_id === 'teleconsultation';
      const payload: any = {
        ...formData,
        global_serial: isNew ? globalSerial : (originalPatient?.global_serial || formData.global_serial),
        hospital_yearly_serial: isNew ? hospitalYearlySerial : (originalPatient?.hospital_yearly_serial || formData.hospital_yearly_serial),
        daily_opd_number: dailyOpdNumber,
        hospital_id: isNew ? hospitalId : (originalPatient?.hospital_id || hospitalId),
        revisit_count: revisitCount,
        is_new: isNew,
        created_at: serverNow,
        registration_date: isNew ? serverNow : (originalPatient?.registration_date || originalPatient?.created_at || formData.registration_date),
        revisit_date: isNew ? null : serverNow,
        status: 'Completed',
        consultation_mode: isTeleconsultation ? 'Teleconsultation' : 'Offline',
        queue_time: null,
        assigned_doctor_id: isTeleconsultation ? null : formData.assigned_doctor_id,
        fee_amount: feeAmount,
      };

      if (!isNew) {
        delete payload.id;
        if (originalPatient) {
          payload.name = originalPatient.name;
          payload.age = originalPatient.age;
          payload.gender = originalPatient.gender;
          payload.mobile = originalPatient.mobile;
          payload.aadhar = originalPatient.aadhar;
          payload.patient_location = originalPatient.patient_location;
          payload.detailed_address = originalPatient.detailed_address;
          payload.hospital_id = originalPatient.hospital_id;
          payload.global_serial = originalPatient.global_serial;
          payload.hospital_yearly_serial = originalPatient.hospital_yearly_serial;
          payload.registration_date = originalPatient.registration_date || originalPatient.created_at;
        }
      }

      const { error } = await supabase.from('patients').insert([payload]);
      if (error) throw error;
      
      window.print();

      toast.success('Offline Parchi recorded and PDF generated!');
      setFormData({
        name: '', age: '', gender: 'Male', mobile: '', aadhar: '',
        patient_location: '', detailed_address: '',
        complaints: '', diagnosis: '', history: '', nadi: '', prakruti: '',
        mutra: '', mala: '', jivha: '', netra: '', nidra: '', agni: '',
        ahar_shakti: '', satva: '', vyayam_shakti: '', investigations: '', prescription: '', global_serial: '', assigned_doctor_id: ''
      });
      setOriginalPatient(null);
      generateSerials();
      setIsNew(true);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Error saving patient data');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectQueuePatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(patient);
    setLifestyleAdvice(patient.lifestyle_advice || '');
    setMarmaPoints(patient.marma_points || '');
    
    // Parse existing prescription if it's JSON, otherwise clear
    try {
      if (patient.prescription && patient.prescription.startsWith('[')) {
        setPrescribedMedicines(JSON.parse(patient.prescription));
      } else {
        setPrescribedMedicines([]);
      }
    } catch (e) {
      setPrescribedMedicines([]);
    }
    
    // Fetch treatments for this patient
    try {
      if (patient.prescribed_panchakarma || patient.prescribed_special_therapy || patient.prescribed_tests) {
        const therapies = [
          ...(patient.prescribed_panchakarma || []),
          ...(patient.prescribed_special_therapy || [])
        ];
        const tests = patient.prescribed_tests || [];
        
        setSelectedTherapies(therapies);
        setSelectedTests(tests);
      } else {
        setSelectedTherapies([]);
        setSelectedTests([]);
      }
    } catch (e) {
      console.error("Error fetching treatments", e);
    }
    
    await fetchPatientHistory(patient.aadhar, patient.mobile);
  };

  const addMedicine = () => {
    if (!newMedicine.medicine_name || !newMedicine.quantity || !newMedicine.duration_days || !newMedicine.frequency) {
      toast.error('Please fill all required fields, including frequency');
      return;
    }

    // Calculate total quantity
    const qty = Number(newMedicine.quantity?.toString() || '0');
    const freq = Number(newMedicine.frequency?.toString() || '0') || 0;
    const days = newMedicine.duration_days || 0;
    const total = qty * freq * days;

    const medicine: PrescriptionMedicine = {
      id: Date.now().toString(),
      medicine_name: newMedicine.medicine_name!,
      dosage: newMedicine.dosage || '1-0-1',
      frequency: newMedicine.frequency || '2',
      instruction: newMedicine.instruction || [],
      duration_days: newMedicine.duration_days || 5,
      total_quantity: total,
      quantity: qty,
      unit_label: newMedicine.unit_label || 'tab',
      is_market_purchase: newMedicine.is_market_purchase || false
    };

    setPrescribedMedicines([...prescribedMedicines, medicine]);
    setNewMedicine({
      medicine_name: '',
      dosage: '1-0-1',
      frequency: '2',
      quantity: 0,
      instruction: [],
      duration_days: 5,
      is_market_purchase: false,
      unit_label: 'tab'
    });
  };

  const removeMedicine = (id: string) => {
    setPrescribedMedicines(prescribedMedicines.filter(m => m.id !== id));
  };

  const checkStock = (medicineName: string, requiredQty: number) => {
    const normalizedName = normalizeForSearch(medicineName);
    const indentItems = indentStock.filter(s => normalizeForSearch(s.medicine_name) === normalizedName);
    const totalLoose = indentItems.reduce((acc, curr) => acc + Number(curr.remaining_loose_quantity || 0), 0);
    const totalPacking = indentItems.reduce((acc, curr) => acc + Number(curr.remaining_packing_quantity || 0), 0);
    
    if (totalLoose > 0 || totalPacking > 0) {
      return { 
        status: 'green', 
        available: true,
        current: `${totalPacking} Packing + ${totalLoose} Loose`,
        message: 'Ready to dispense'
      };
    }

    const mainInvItems = mainInventory.filter(i => normalizeForSearch(i.medicine_name) === normalizedName);
    const totalBulkUnits = mainInvItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

    if (totalBulkUnits > 0) {
      return { 
        status: 'dark_yellow', 
        available: false, 
        current: 0,
        message: 'Transfer from Main Store required'
      };
    }

    const inMaster = masterMedicines.some(m => normalizeForSearch(m) === normalizedName);
    if (inMaster) {
      return { 
        status: 'red', 
        available: false, 
        current: 0,
        message: 'Out of Stock'
      };
    }

    return { 
      status: 'dark_grey', 
      available: false, 
      current: 0,
      message: 'Not in Master List'
    };
  };

  const handlePatientDispensed = async (e: React.MouseEvent, patientId: string) => {
    e.stopPropagation();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({ status: 'Dispensing Completed' })
        .eq('id', patientId);

      if (error) throw error;
      fetchDispensingQueue();
    } catch (err) {
      console.error('Error marking as dispensed:', err);
      alert('Error updating patient status');
    } finally {
      setSaving(false);
    }
  };

  const handleConsultationComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient?.id) return;
    setSaving(true);
    try {
      // 1. Update patient status
      const prescriptionString = JSON.stringify(prescribedMedicines);

      const payload = {
        complaints: formData.complaints,
        diagnosis: formData.diagnosis,
        history: formData.history,
        investigations: formData.investigations,
        nadi: formData.nadi,
        prakruti: formData.prakruti,
        mutra: formData.mutra,
        mala: formData.mala,
        jivha: formData.jivha,
        netra: formData.netra,
        nidra: formData.nidra,
        agni: formData.agni,
        ahar_shakti: formData.ahar_shakti,
        satva: formData.satva,
        vyayam_shakti: formData.vyayam_shakti,
        lifestyle_advice: lifestyleAdvice,
        marma_points: marmaPoints,
        prescription: prescriptionString,
        prescribed_panchakarma: selectedTherapies.filter(t => t.module_name === 'Panchakarma'),
        prescribed_special_therapy: selectedTherapies.filter(t => t.module_name === 'Special Therapy'),
        prescribed_tests: selectedTests,
        status: 'Consultation Completed',
        consultation_completed_at: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      };

      const { error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', selectedPatient.id);

      if (error) throw error;
      
      setShowConsultationCompletePopup(true);
      setSelectedPatient({ ...selectedPatient, ...payload });
      fetchQueue();
      fetchInventoryData();
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving consultation data');
    } finally {
      setSaving(false);
    }
  };

  const t = {
    en: {
      title: 'Patient Registration (e-Parchi)',
      new: 'New Patient',
      old: 'Old Patient',
      search: 'Search Patient',
      name: 'Patient Name',
      age: 'Age',
      gender: 'Gender',
      mobile: 'Mobile Number',
      aadhar: 'Aadhar Number',
      complaints: 'Complaints',
      diagnosis: 'Diagnosis',
      history: 'History',
      nadi: 'Nadi',
      prakruti: 'Prakruti',
      save: 'Online Parchi',
      globalSerial: 'Global Serial',
      hospitalSerial: 'Hospital Yearly Serial',
      dailyOpd: 'Daily OPD No.',
      date: 'Date',
      prescription: 'Prescription',
      revisit: 'Revisit Count',
      preview: 'Parchi Preview'
    },
    hi: {
      title: 'रोगी पंजीकरण (ई-पर्ची)',
      new: 'नया रोगी',
      old: 'पुराना रोगी',
      search: 'रोगी खोजें',
      name: 'रोगी का नाम',
      age: 'आयु',
      gender: 'लिंग',
      mobile: 'मोबाइल नंबर',
      aadhar: 'आधार नंबर',
      complaints: 'शिकायतें',
      diagnosis: 'निदान',
      history: 'इतिहास',
      nadi: 'नाड़ी',
      prakruti: 'प्रकृति',
      save: 'ऑनलाइन परामर्श के लिए भेजें',
      globalSerial: 'ग्लोबल सीरियल',
      hospitalSerial: 'अस्पताल वार्षिक सीरियल',
      dailyOpd: 'दैनिक ओपीडी नंबर',
      date: 'दिनांक',
      prescription: 'नुस्खा',
      revisit: 'पुनरावृत्ति गणना',
      preview: 'पर्ची पूर्वावलोकन'
    }
  };

  const handleDispense = async (medicine: any) => {
    if (!selectedPatient?.id) return;
    
    const qty = Number(dispensedQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    // Find all batches in indent
    const normalizedName = normalizeForSearch(medicine.medicine_name);
    const batches = indentStock
      .filter(s => normalizeForSearch(s.medicine_name) === normalizedName && Number(s.remaining_loose_quantity) > 0)
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
    
    const totalAvailable = batches.reduce((sum, b) => sum + Number(b.remaining_loose_quantity), 0);

    if (totalAvailable < qty) {
      alert(`Insufficient stock in Dispensary. Available: ${totalAvailable}. Please transfer from Main Store.`);
      return;
    }

    setSaving(true);
    try {
      let remainingToDispense = qty;
      
      for (const batch of batches) {
        if (remainingToDispense <= 0) break;
        
        const batchQty = Number(batch.remaining_loose_quantity);
        const dispenseFromBatch = Math.min(remainingToDispense, batchQty);
        
        // 1. Record Daily Consumption
        const { error: consError } = await supabase
          .from('daily_consumption')
          .insert([{
            hospital_id: hospitalId,
            patient_id: selectedPatient.id,
            patient_name: selectedPatient.name,
            medicine_id: batch.medicine_id,
            medicine_name: batch.medicine_name,
            batch_number: batch.batch_number,
            unit_type: batch.unit_type,
            quantity_dispensed: dispenseFromBatch,
            dispensed_at: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
          }]);

        if (consError) throw consError;

        // 2. Update Indent Stock
        const { error: indentError } = await supabase
          .from('hospital_indent')
          .update({ remaining_loose_quantity: batchQty - dispenseFromBatch })
          .eq('id', batch.id);

        if (indentError) throw indentError;
        
        remainingToDispense -= dispenseFromBatch;
      }

      setDispensedMedicines([...dispensedMedicines, medicine.medicine_name]);
      alert(`Successfully dispensed ${qty} ${medicine.unit_label}s.`);
      setDispensingMedicine(null);
      setDispensedQty('');
      fetchInventoryData();
      
    } catch (err) {
      console.error('Dispensing error:', err);
      alert('Error processing dispensing.');
    } finally {
      setSaving(false);
    }
  };

  const handleDispensingComplete = async () => {
    if (!selectedPatient) return;
    
    try {
      const { error } = await supabase
        .from('patients')
        .update({ status: 'Dispensing Completed' })
        .eq('id', selectedPatient.id);
      
      if (error) throw error;
      
      setSelectedPatient(null);
      setCurrentPrescription([]);
      setSearchQuery('');
      setPatients([]);
      fetchDispensingQueue(); // Refresh queue
    } catch (err) {
      console.error('Error updating patient status:', err);
      alert('Error updating patient status');
    }
  };

  const cur = t[language];

  const normalizedHospitalType = hospitalType ? hospitalType.toLowerCase().replace(/\s+/g, '') : '';
  const isNoFeeHospital = normalizedHospitalType.includes('ayushwing') || normalizedHospitalType.includes('moch');

  let feeAmount = 0;
  if (!isNoFeeHospital && isNew) {
    feeAmount = regionIndicator?.toLowerCase() === 'urban' ? 10 : 5;
  }

  const getAssignedDoctorName = (doctorId?: string) => {
    if (!doctorId) return '---';
    const doc = availableDoctors.find(d => d.id === doctorId);
    return doc ? doc.full_name : '---';
  };

  const renderA4Preview = (patientData: Partial<Patient>, isForExport = false) => {
    const doctorName = getAssignedDoctorName(patientData.assigned_doctor_id);
    const content = (
    <div 
      id={isForExport ? "parchi-preview-content" : undefined}
      className="pdf-print-container bg-white border border-gray-300 shadow-2xl overflow-visible flex flex-col relative text-[15px] p-[5%]"
      style={{ width: '794px', height: '1123px', minWidth: '794px', minHeight: '1123px', margin: '0 auto', backgroundColor: '#ffffff' }}
    >
      <style>{PDF_STYLES}</style>
      <div className="w-full h-full flex flex-col border border-slate-900">
        {/* 5% Hospital Details */}
        <div className="h-[5%] flex flex-col items-center justify-center border-b-2 border-slate-900 bg-slate-50 relative px-4">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-[80%] flex items-center justify-center">
            <img 
              src="https://waxolpvdayhkqhtfnbfk.supabase.co/storage/v1/object/public/logo/Uttarakhand%20logo.png" 
              alt="Uttarakhand Govt" 
              className="h-full object-contain mix-blend-multiply"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          </div>
          <h3 className="text-[16.5px] font-bold uppercase leading-none text-center px-12">{hospitalName || 'AYUSH HEALTH CENTRE'}</h3>
          <p className="text-[10.5px] font-medium uppercase leading-none mt-0.5 text-center px-12">{hospitalType} • {district}</p>
          <div className="absolute top-2 right-2 border border-slate-900 px-1.5 py-0.5 rounded text-[9px] font-bold">
            {`Fee: ₹${feeAmount.toString().padStart(2, '0')}`}
          </div>
        </div>

        {/* 2.0625% Date, Visit Details */}
        <div className="h-[2.0625%] flex justify-between items-center px-3 text-[10.5px] bg-white">
          <div className="flex gap-3">
            <p><span className="font-bold">Date:</span> {new Date(patientData.created_at || new Date()).toLocaleDateString()}</p>
            <p><span className="font-bold">Valid Until:</span> {getValidityDate(patientData.registration_date || patientData.created_at)}</p>
            <p><span className="font-bold">Yearly:</span> {patientData.hospital_yearly_serial || hospitalYearlySerial}</p>
            <p><span className="font-bold">Daily OPD:</span> {patientData.daily_opd_number || dailyOpdNumber}</p>
            <p><span className="font-bold">Type:</span> {patientData.is_new ? 'New' : 'Revisit'}</p>
            <p><span className="font-bold">Revisit:</span> {(patientData.revisit_count || revisitCount).toString().padStart(2, '0')}</p>
          </div>
        </div>

        {/* 6% Patient Personal Details */}
        <div className="h-[6%] px-3 py-1.5 flex flex-col justify-center bg-white relative">
          <p className="text-[10.5px] font-bold uppercase mb-1 text-emerald-700">Patient Details</p>
          <div className="absolute top-1.5 right-3 ">
            <QRCodeSVG value={JSON.stringify({
              id: patientData.id,
              date: new Date(patientData.created_at || new Date()).toLocaleDateString(),
              globalSerial: patientData.global_serial,
              hospitalSerial: patientData.hospital_yearly_serial,
              type: patientData.is_new ? 'New' : 'Revisit',
              revisitCount: patientData.revisit_count || revisitCount,
              name: patientData.name,
              age: patientData.age,
              gender: patientData.gender,
              mobile: patientData.mobile,
              aadhar: patientData.aadhar,
              hospitalId: patientData.hospital_id
            })} size={52.5} />
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[12px]">
            <p><span className="font-bold text-slate-500">Name:</span> {patientData.name || '---'}</p>
            <p><span className="font-bold text-slate-500">Age/Gender:</span> {patientData.age || '--'} / {patientData.gender?.charAt(0)}</p>
            <div />
            <p><span className="font-bold text-slate-500">Aadhar:</span> {patientData.aadhar || '---'}</p>
            <p><span className="font-bold text-slate-500">Mobile:</span> {patientData.mobile || '---'}</p>
          </div>
        </div>

        {/* 11.25% Clinical Assessment */}
        <div className="min-h-[11.25%] px-3 py-1.5 border-b-2 border-slate-900 flex flex-col justify-center bg-white">
          <p className="text-[10.5px] font-bold uppercase mb-1 text-emerald-700">Clinical Assessment</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 h-full overflow-visible">
            <div className="flex flex-col">
              <p className="text-[10.5px] font-bold text-slate-500">Complaints:</p>
              <p className="text-[10.5px] whitespace-pre-wrap break-words italic leading-tight">{patientData.complaints || '---'}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[10.5px] font-bold text-slate-500">Diagnosis:</p>
              <p className="text-[10.5px] whitespace-pre-wrap break-words font-bold leading-tight text-slate-800 px-1 rounded">{patientData.diagnosis || '---'}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[10.5px] font-bold text-slate-500">History:</p>
              <p className="text-[10.5px] whitespace-pre-wrap break-words italic leading-tight">{patientData.history || '---'}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[10.5px] font-bold text-slate-500">Investigations:</p>
              <p className="text-[10.5px] whitespace-pre-wrap break-words italic leading-tight">{patientData.investigations || '---'}</p>
            </div>
          </div>
        </div>

        {/* 75.6875% Remaining Page */}
        <div className="h-[75.6875%] flex flex-row bg-white">
          {/* Left Side: Ayurvedic Parameters & Tests (20% width) */}
          <div className="w-[20%] border-r-2 border-slate-900 p-2 flex flex-col gap-1.5 overflow-visible bg-neutral-50">
            <p className="text-[10.5px] font-bold uppercase text-emerald-700 mb-1 border-b border-slate-200 pb-1">Parameters</p>
            <div className="grid grid-cols-1 gap-1">
              {[
                { id: 'nadi', label: 'Nadi' },
                { id: 'prakruti', label: 'Prakruti' },
                { id: 'mutra', label: 'Mutra' },
                { id: 'mala', label: 'Mala' },
                { id: 'jivha', label: 'Jivha' },
                { id: 'netra', label: 'Netra' },
                { id: 'nidra', label: 'Nidra' },
                { id: 'agni', label: 'Agni' },
                { id: 'ahar_shakti', label: 'Ahar Shakti' },
                { id: 'satva', label: 'Satva' },
                { id: 'vyayam_shakti', label: 'Vyayam' },
              ].map(field => (
                <div key={field.id} className="text-[9px] leading-tight flex justify-between gap-1">
                  <span className="font-bold text-slate-600 shrink-0">{field.label}:</span> 
                  <span className="break-words whitespace-pre-wrap text-right">{(patientData as any)[field.id] || '-'}</span>
                </div>
              ))}
            </div>

            {selectedTests.length > 0 && (
              <div className="mt-2">
                <p className="text-[10.5px] font-bold uppercase text-emerald-700 mb-1 border-b border-slate-200 pb-1">Investigations</p>
                <ul className="list-disc pl-3 text-[9px] text-slate-800 space-y-0.5">
                  {selectedTests.map((t, idx) => (
                    <li key={idx}>{t.test_name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Side: Prescription & Therapies (80% width) */}
          <div className="w-[80%] p-3 flex flex-col relative">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[12px] font-bold uppercase text-emerald-700">Prescription</p>
            </div>
            
            <div className="flex-1 overflow-visible flex flex-col gap-0.5">
              {/* Medicines */}
              <div className="flex-shrink-0">
                {(() => {
                  try {
                    if (patientData.prescription && patientData.prescription.startsWith('[')) {
                      const medicines = JSON.parse(patientData.prescription);
                      if (Array.isArray(medicines) && medicines.length > 0) {
                        return (
                          <table className="w-full text-[10.5px] border-collapse">
                            <tbody>
                              {medicines.map((med: any, i: number) => (
                                <tr key={i} className="align-top">
                                  <td className="py-0.5 min-w-[30%]">
                                    <p className="font-bold leading-tight">{med.medicine_name}</p>
                                    {med.instruction && (
                                      <p className="text-[9px] italic text-slate-500 leading-none mt-0">
                                        {Array.isArray(med.instruction) ? med.instruction.join(', ') : (typeof med.instruction === 'string' ? med.instruction : JSON.stringify(med.instruction).replace(/[\[\]"]/g, '').split(',').join(', '))}
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-0.5">{med.quantity}</td>
                                  <td className="py-0.5">{med.unit_label}</td>
                                  <td className="py-0.5">
                                    <div className="flex items-center gap-0.5">
                                      <span className="font-medium">{med.frequency || med.dosage}</span>
                                      <span className="text-[7.5px] text-slate-400">times/day</span>
                                    </div>
                                  </td>
                                  <td className="py-0.5">{med.duration_days} Days</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      }
                    }
                  } catch (e) {}
                  
                  return (
                    <p className="text-[13.5px] font-mono whitespace-pre-wrap leading-relaxed">
                      {patientData.prescription || '---'}
                    </p>
                  );
                })()}
              </div>

              {/* Panchkarma & Special Therapy */}
              {selectedTherapies.length > 0 && (
                <div className="flex-shrink-0 border-t border-slate-100 pt-0.5">
                  <p className="text-[10.5px] font-bold uppercase text-emerald-700 mb-0.5">Therapies (Panchkarma & Special)</p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {selectedTherapies.map((t, idx) => (
                      <div key={idx} className="text-[10.5px] text-slate-800 flex items-center gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                        {t.days && t.days > 1 ? `${t.therapy_name} (${t.days} Days)` : t.therapy_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Yogasan & Lifestyle Advice */}
              {patientData.lifestyle_advice && (
                <div className="flex-shrink-0 border-t border-slate-100 pt-0.5">
                  <p className="text-[10.5px] font-bold uppercase text-emerald-700 mb-0.5">Yogasan & Lifestyle Advice</p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {patientData.lifestyle_advice.split('\n').filter(Boolean).map((advice, idx) => (
                      <div key={idx} className="text-[10.5px] text-slate-800 flex items-center gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                        {advice.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Marma Chikitsa */}
              {patientData.marma_points && (
                <div className="flex-shrink-0 border-t border-slate-100 pt-0.5">
                  <p className="text-[10.5px] font-bold uppercase text-emerald-700 mb-0.5">Marma Chikitsa</p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {patientData.marma_points.split('\n').filter(Boolean).map((point, idx) => (
                      <div key={idx} className="text-[10.5px] text-slate-800 flex items-center gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                        {point.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* History Section if old patient */}
            
            <div className="absolute bottom-1 right-3 text-center">
              <div className="mb-0 text-center flex items-end justify-center pb-0">
                <span className="text-[12px] font-bold text-slate-800">{doctorName !== '---' ? doctorName : ''}</span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Medical Officer</p>
            </div>
            
            <div className="absolute bottom-2 left-3 text-[7.5px] text-slate-300 uppercase tracking-widest">
              Generated via e-AYUSH Seva
            </div>
          </div>
        </div>
      </div>
    </div>
    );

    if (isForExport) return content;

    return (
      <div className="w-full flex justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/30 print:block print:overflow-visible print:border-none print:bg-transparent">
        <div className="print:scale-100 print:m-0" style={{ transform: 'scale(0.48)', transformOrigin: 'top center', width: '794px', height: '1123px', marginBottom: '-584px' }}>
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 pb-32">
      {/* Hospital Header */}
      <div className="text-center mb-12 print:hidden">
        <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{hospitalName || 'AYUSH Health Centre'}</h2>
        <div className="flex items-center justify-center gap-4 mt-2 text-slate-500 font-medium">
          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{hospitalType || 'Wellness Centre'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <span className="uppercase tracking-widest text-xs font-bold">{district || 'Uttarakhand'}</span>
        </div>
      </div>

      {activeTab === 'registration' && (
        <div className="space-y-6">
          <div className="flex gap-2 bg-slate-100 p-1 rounded-full w-fit">
            <button onClick={() => setActiveRegistrationSubTab('registration')} className={`px-6 py-2 rounded-full font-bold ${activeRegistrationSubTab === 'registration' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Patient Registration</button>
            <button onClick={() => setActiveRegistrationSubTab('list')} className={`px-6 py-2 rounded-full font-bold ${activeRegistrationSubTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Registration List</button>
          </div>

          {activeRegistrationSubTab === 'registration' && (
            <div className="flex flex-col lg:flex-row gap-8 print:hidden">
              {/* Left Side: Form */}
              <div className="flex-1 space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{cur.title}</h1>
                <p className="text-slate-500 text-sm">Fill in patient details for registration</p>
              </div>
              <button 
                onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                className="flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-neutral-200 transition-all"
              >
                <Languages size={16} />
                {language === 'en' ? 'हिन्दी' : 'English'}
              </button>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsNew(true)}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                  isNew ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-neutral-100 text-slate-500 hover:bg-neutral-200'
                }`}
              >
                <Plus size={20} />
                {cur.new}
              </button>
              <button 
                onClick={() => setIsNew(false)}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                  !isNew ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-neutral-100 text-slate-500 hover:bg-neutral-200'
                }`}
              >
                <History size={20} />
                {cur.old}
              </button>
            </div>

            {!isNew && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder={cur.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <button 
                    onClick={handleSearchRegistration}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
                  </button>
                </div>

                {patients.filter(p => {
                    const regDate = p.registration_date || p.created_at;
                    if (!regDate) return false;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const vtDate = new Date(regDate);
                    vtDate.setDate(vtDate.getDate() + 14);
                    vtDate.setHours(0, 0, 0, 0);
                    return vtDate >= today;
                  }).length > 0 && (
                  <div className="mt-6 space-y-2">
                    {patients.filter(p => {
                      const regDate = p.registration_date || p.created_at;
                      if (!regDate) return false;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const vtDate = new Date(regDate);
                      vtDate.setDate(vtDate.getDate() + 14);
                      vtDate.setHours(0, 0, 0, 0);
                      return vtDate >= today;
                    }).map(p => {
                      if (!patientLastVisit[p.id!]) checkPatientHistory(p);
                      return (
                        <div key={p.id} className="w-full p-4 border border-gray-100 rounded-xl mb-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-slate-900">{p.name}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                <p className="text-[10px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-full">{p.hospital_yearly_serial}</p>
                                <p className="text-[10px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-full">{p.mobile}</p>
                                <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Reg: {new Date(p.registration_date || p.created_at).toLocaleDateString()}</p>
                                <p className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">Valid Until: {getValidityDate(p.registration_date || p.created_at)}</p>
                              </div>
                              {patientLastVisit[p.id!] && (
                                <p className="text-xs font-bold text-red-500 mt-1">
                                  Medicine given {patientLastVisit[p.id!].days} days back
                                  <button 
                                    onClick={() => {/* Show history modal */}}
                                    className="ml-2 text-[10px] bg-red-100 px-2 py-0.5 rounded-full"
                                  >
                                    Details
                                  </button>
                                </p>
                              )}
                            </div>
                            <button onClick={() => selectPatient(p)} className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleRegistrationSubmit} className="space-y-8">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">{cur.date}</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-xs">{new Date().toLocaleDateString()}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Valid Until</span>
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {getValidityDate(formData.registration_date || new Date().toISOString())}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between col-span-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <IndianRupee size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Fee (₹)</span>
                  </div>
                  <p className="font-semibold text-purple-600 text-xs">{feeAmount}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between col-span-1_5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Hash size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">{cur.globalSerial}</span>
                  </div>
                  <p className="font-semibold text-emerald-600 text-xs truncate w-full pl-4">{globalSerial}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between col-span-1_5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Hash size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">{cur.hospitalSerial}</span>
                  </div>
                  <p className="font-semibold text-emerald-600 text-xs truncate w-full pl-4">{hospitalYearlySerial}</p>
                </div>
                <div className="col-span-1" />
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between col-span-1 mr-[-90px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Hash size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">{cur.dailyOpd}</span>
                  </div>
                  <p className="font-semibold text-emerald-600 text-xs">{dailyOpdNumber}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between col-span-1 ml-[87px] mt-0 mr-[-198px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <History size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">{cur.revisit}</span>
                  </div>
                  <p className="font-semibold text-blue-600 text-xs">{revisitCount.toString().padStart(2, '0')}</p>
                </div>
                <div className="col-span-1" />
              </div>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm pl-[15px] pr-[21px] pt-[6px] pb-[5px] mt-[-14px] mb-[13px] mr-0">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <User className="text-emerald-600" size={20} />
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-3">{cur.name}</label>
                    <input 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-3">{cur.age}</label>
                    <input 
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-3">{cur.gender}</label>
                    <select 
                      value={formData.gender ?? ''}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-sm"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-3">{cur.mobile}</label>
                    <input 
                      value={formData.mobile}
                      onChange={e => setFormData({...formData, mobile: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-3">{cur.aadhar}</label>
                    <input 
                      value={formData.aadhar}
                      onChange={e => setFormData({...formData, aadhar: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-3">Patient Location</label>
                    <select 
                      value={formData.patient_location ?? ''}
                      onChange={e => setFormData({...formData, patient_location: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-sm"
                      required
                    >
                      <option value="">Select Location</option>
                      <option value="Local">Local</option>
                      <option value="Nearby Village/City">Nearby Village/City</option>
                      <option value="Other District">Other District</option>
                      <option value="Outside Uttarakhand">Outside Uttarakhand</option>
                      <option value="NRI">NRI</option>
                      <option value="Foreign Nationalist">Foreign Nationalist</option>
                    </select>
                  </div>
                  <div className="space-y-0.5 md:col-span-3">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-3 flex items-center gap-1"><MapPin size={10}/> Detailed Address</label>
                    <textarea 
                      value={formData.detailed_address}
                      onChange={e => setFormData({...formData, detailed_address: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-sm"
                      rows={1}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm mt-[-4px] pt-[6px] pl-[15px] pb-[12px] pr-[34px]">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <User className="text-emerald-600" size={20} />
                  Assign Doctor
                </h2>
                <div className="space-y-1 max-w-md">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Select Doctor</label>
                  <select 
                    value={formData.assigned_doctor_id || ''}
                    onChange={e => setFormData({...formData, assigned_doctor_id: e.target.value})}
                    className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  >
                    <option value="">-- Select Doctor --</option>
                    <option value="teleconsultation">Teleconsultation</option>
                    {availableDoctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.full_name} ({doc.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-[2rem] text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {cur.save}
                </button>
                <button 
                  type="button"
                  onClick={handleOfflineParchi}
                  disabled={saving}
                  className="flex-1 bg-amber-500 text-white font-bold py-4 rounded-[2rem] text-lg shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                  Offline Parchi
                </button>
              </div>
            </form>
          </div>
          
          {/* Right Side: A4 Preview */}
          <div className="hidden lg:block w-[400px] print:hidden">
            <div className="sticky top-24 space-y-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 px-4">
                <FileText className="text-emerald-600" size={20} />
                {cur.preview}
              </h2>
              {renderA4Preview({ 
                ...formData, 
                prescription: JSON.stringify(prescribedMedicines),
                lifestyle_advice: lifestyleAdvice, 
                marma_points: marmaPoints 
              })}
            </div>
          </div>
        </div>
      )}

      {activeRegistrationSubTab === 'list' && (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Registration List</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setFilterType('today')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setFilterType('monthly')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setFilterType('range')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'range' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Range
                </button>
              </div>

              {filterType === 'monthly' && (
                <div className="flex gap-2">
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="bg-neutral-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="bg-neutral-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    {[2024, 2025, 2026].map(year => (
                      <option key={year} value={year.toString()}>{year}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterType === 'range' && (
                <div className="flex items-center gap-2">
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-neutral-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <span className="text-slate-400 font-bold">to</span>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-neutral-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              )}

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search by Name/Mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 border border-gray-100 rounded-xl py-2 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Name</th>
                  <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Serial</th>
                  <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Mobile</th>
                  <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Aadhar</th>
                  <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reg Date</th>
                  <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Valid Until</th>
                  <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={32} />
                      <p className="text-slate-500 font-medium">Loading registrations...</p>
                    </td>
                  </tr>
                ) : registrationList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="text-slate-300" size={32} />
                      </div>
                      <p className="text-slate-500 font-medium">No registrations found for selected period.</p>
                    </td>
                  </tr>
                ) : (
                  registrationList
                    .filter(p => !searchQuery || 
                                 p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 p.mobile.includes(searchQuery) ||
                                 (p.aadhar && p.aadhar.includes(searchQuery)) ||
                                 p.hospital_yearly_serial.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-4 px-4 text-sm font-bold text-slate-900">{p.name} ({p.age}/{p.gender})</td>
                        <td className="py-4 px-4 text-sm text-emerald-700 font-bold">{p.hospital_yearly_serial}</td>
                        <td className="py-4 px-4 text-sm text-slate-600">{p.mobile}</td>
                        <td className="py-4 px-4 text-sm text-slate-600">{p.aadhar || '---'}</td>
                        <td className="py-4 px-4 text-sm text-slate-600">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="py-4 px-4 text-sm text-emerald-700">{getValidityDate(p.registration_date || p.created_at)}</td>
                        <td className="py-4 px-4 text-sm text-slate-600">{(p.registration_date || p.created_at) ? new Date(p.registration_date || p.created_at).toLocaleDateString() : '---'}</td>
                        <td className="py-4 px-4 text-right flex justify-end gap-2">
                          <button onClick={() => setShowPreviewModal(p)} className="p-2 bg-emerald-50 rounded-lg text-emerald-600 hover:bg-emerald-100" title="Preview">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )}

      {activeTab === 'fees' && (
        <FeesModule hospitalId={hospitalId} />
      )}

      {activeTab === 'queue' && (
        <div className="space-y-8">
          {!selectedPatient ? (
            <>
              <h2 className="text-2xl font-bold text-slate-900 print:hidden">Consultation Queue</h2>
                  {queue.length === 0 && (
                    <div className="bg-white p-8 rounded-3xl text-center text-slate-500 border border-gray-100 print:hidden">
                      No patients waiting in the queue.
                    </div>
                  )}
                  {canConsult && queue.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
                      {queue.map(p => (
                        <div key={p.id} onClick={() => handleSelectQueuePatient(p)} className="bg-white p-6 rounded-3xl border border-gray-100 hover:border-emerald-500 cursor-pointer transition-all shadow-sm hover:shadow-md">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold text-lg text-slate-900">{p.name}</h3>
                              <p className="text-sm text-slate-500">{p.age} yrs • {p.gender}</p>
                            </div>
                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">Waiting</span>
                          </div>
                          <div className="text-xs text-slate-400 space-y-1">
                            <p>Queue Time: {new Date(p.queue_time || p.created_at).toLocaleTimeString()}</p>
                            <p>Mobile: {p.mobile}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!canConsult && canViewQueue && queue.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
                      {queue.map(p => (
                        <div key={p.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold text-lg text-slate-900">{p.name}</h3>
                              <p className="text-sm text-slate-500">{p.age} yrs • {p.gender}</p>
                            </div>
                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">Waiting</span>
                          </div>
                          <div className="text-xs text-slate-400 space-y-1">
                            <p>Queue Time: {new Date(p.queue_time || p.created_at).toLocaleTimeString()}</p>
                            <p>Mobile: {p.mobile}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
            </>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8 print:hidden">
              <div className="flex-1 space-y-8">
                {selectedPatient.status === 'Waiting' ? (
                  <form onSubmit={handleConsultationComplete} className="space-y-8 print:hidden">
                    <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedPatient.name}</h2>
                        <p className="text-slate-500">{selectedPatient.age} yrs • {selectedPatient.gender} • {selectedPatient.mobile}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedPatient(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-medium">
                        <ArrowLeft size={16} /> Back to Queue
                      </button>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                      <h2 className="text-xl font-bold text-slate-900 mb-2">Assigned Consultant</h2>
                      <p className="text-emerald-700 font-medium">{getAssignedDoctorName(selectedPatient.assigned_doctor_id)}</p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <FileText className="text-emerald-600" size={20} />
                      Clinical Assessment
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{cur.complaints}</label>
                        <textarea 
                          value={formData.complaints || ''}
                          onChange={e => setFormData({...formData, complaints: e.target.value})}
                          className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{cur.diagnosis}</label>
                        <DiseaseCombobox 
                          options={diseaseMaster}
                          value={formData.diagnosis || ''}
                          onChange={(val) => setFormData({...formData, diagnosis: val})}
                          onSelect={() => historyRef.current?.focus()}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{cur.history}</label>
                        <textarea 
                          ref={historyRef}
                          value={formData.history || ''}
                          onChange={e => setFormData({...formData, history: e.target.value})}
                          className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Other Investigations</label>
                        <textarea 
                          value={formData.investigations || ''}
                          onChange={e => setFormData({...formData, investigations: e.target.value})}
                          className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[100px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Ayurvedic Parameters</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {[
                        { id: 'nadi', label: 'Nadi' },
                        { id: 'prakruti', label: 'Prakruti' },
                        { id: 'mutra', label: 'Mutra' },
                        { id: 'mala', label: 'Mala' },
                        { id: 'jivha', label: 'Jivha' },
                        { id: 'netra', label: 'Netra' },
                        { id: 'nidra', label: 'Nidra' },
                        { id: 'agni', label: 'Agni' },
                        { id: 'ahar_shakti', label: 'Ahar Shakti' },
                        { id: 'satva', label: 'Satva' },
                        { id: 'vyayam_shakti', label: 'Vyayam Shakti' },
                      ].map(field => (
                        <div key={field.id} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{field.label}</label>
                          <input 
                            value={(formData as any)[field.id] || ''}
                            onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                            className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Additional Therapy & Tests</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Panchkarma</label>
                        <AsyncMultiSelect
                          placeholder="Search Panchkarma..."
                          tableName="master_therapies"
                          filterColumn="module_name"
                          filterValue="Panchakarma"
                          displayColumn="therapy_name"
                          selectedItems={selectedTherapies.filter(t => t.module_name === 'Panchakarma')}
                          showDaysInput={true}
                          onAdd={(item) => {
                            setSelectedTherapies([...selectedTherapies, { ...item, days: 1 }]);
                            setLiveBill(liveBill + (item.charges || 0));
                          }}
                          onUpdateItem={(updatedItem) => {
                            const oldItem = selectedTherapies.find(t => t.id === updatedItem.id);
                            const oldDays = oldItem?.days || 1;
                            const newDays = updatedItem.days || 1;
                            const chargeDiff = (newDays - oldDays) * (updatedItem.charges || 0);
                            setSelectedTherapies(selectedTherapies.map(t => t.id === updatedItem.id ? updatedItem : t));
                            setLiveBill(liveBill + chargeDiff);
                          }}
                          onRemove={(item) => {
                            const days = item.days || 1;
                            setSelectedTherapies(selectedTherapies.filter(t => t.id !== item.id));
                            setLiveBill(liveBill - ((item.charges || 0) * days));
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Special Therapy</label>
                        <AsyncMultiSelect
                          placeholder="Search Special Therapy..."
                          tableName="master_therapies"
                          filterColumn="module_name"
                          filterValue="Special Therapy"
                          displayColumn="therapy_name"
                          selectedItems={selectedTherapies.filter(t => t.module_name === 'Special Therapy')}
                          showDaysInput={true}
                          onAdd={(item) => {
                            setSelectedTherapies([...selectedTherapies, { ...item, days: 1 }]);
                            setLiveBill(liveBill + (item.charges || 0));
                          }}
                          onUpdateItem={(updatedItem) => {
                            const oldItem = selectedTherapies.find(t => t.id === updatedItem.id);
                            const oldDays = oldItem?.days || 1;
                            const newDays = updatedItem.days || 1;
                            const chargeDiff = (newDays - oldDays) * (updatedItem.charges || 0);
                            setSelectedTherapies(selectedTherapies.map(t => t.id === updatedItem.id ? updatedItem : t));
                            setLiveBill(liveBill + chargeDiff);
                          }}
                          onRemove={(item) => {
                            const days = item.days || 1;
                            setSelectedTherapies(selectedTherapies.filter(t => t.id !== item.id));
                            setLiveBill(liveBill - ((item.charges || 0) * days));
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Investigations</label>
                        <AsyncMultiSelect
                          placeholder="Search Investigations..."
                          tableName="rapid_tests"
                          displayColumn="test_name"
                          selectedItems={selectedTests}
                          allowCustom={true}
                          onAdd={(item) => {
                            setSelectedTests([...selectedTests, item]);
                            setLiveBill(liveBill + (item.charges || 0));
                          }}
                          onRemove={(item) => {
                            setSelectedTests(selectedTests.filter(t => t.id !== item.id));
                            setLiveBill(liveBill - (item.charges || 0));
                          }}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Yogasan & Lifestyle Advice</label>
                          <div className="flex flex-wrap gap-1">
                            {['Daily Walk 3km', 'Surya Namaskar', 'Backward Walk Daily 20min', 'Pranayama', 'Avoid Cold Water'].map(advice => (
                              <button 
                                key={advice}
                                type="button"
                                onClick={() => setLifestyleAdvice(prev => prev ? `${prev}\n${advice}` : advice)}
                                className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-bold hover:bg-emerald-100 transition-all"
                              >
                                {advice}
                              </button>
                            ))}
                          </div>
                        </div>
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-emerald-600 font-bold mb-2">Toggle Advice</summary>
                          <textarea 
                            value={lifestyleAdvice}
                            onChange={e => setLifestyleAdvice(e.target.value)}
                            className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[100px]"
                          />
                        </details>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Marma Chikitsa Instructions</label>
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-emerald-600 font-bold mb-2">Toggle Instructions</summary>
                          <textarea 
                            value={marmaPoints}
                            onChange={e => setMarmaPoints(e.target.value)}
                            className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[100px]"
                          />
                        </details>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-emerald-50 rounded-2xl flex justify-between items-center">
                      <span className="font-bold text-emerald-900">Live Bill</span>
                      <span className="text-2xl font-black text-emerald-700">₹{liveBill}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="text-emerald-600" size={18} />
                        {cur.prescription}
                      </h2>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setShowIndentModal(true)} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all">Indent Stock</button>
                        <button type="button" onClick={() => { fetchInventoryData(); setShowInventoryModal(true); }} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all">Inventory Stock</button>
                      </div>
                    </div>

                    {/* Medicine Input Form */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-2">
                        <div className="lg:col-span-2 space-y-0.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Medicine Name</label>
                          <MedicineSearch 
                            value={newMedicine.medicine_name || ''}
                            onChange={(val) => {
                              setNewMedicine({...newMedicine, medicine_name: val});
                            }}
                            onSelect={(name) => {
                              if (medicineUnits[name]) {
                                setNewMedicine(prev => ({ 
                                  ...prev, 
                                  medicine_name: name, 
                                  unit_label: medicineUnits[name] 
                                }));
                              }
                            }}
                            indentStock={indentStock}
                            mainInventory={mainInventory}
                            masterMedicines={masterMedicines}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Quantity</label>
                          <input 
                            type="number"
                            value={newMedicine.quantity ?? ''}
                            onChange={e => setNewMedicine({...newMedicine, quantity: e.target.value ? Number(e.target.value) : 0})}
                            placeholder="Qty"
                            className="w-full bg-white border border-gray-100 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Unit</label>
                          <select 
                            value={newMedicine.unit_label ?? ''}
                            onChange={e => setNewMedicine({...newMedicine, unit_label: e.target.value})}
                            className="w-full bg-white border border-gray-100 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                          >
                            <option value="tab">tab</option>
                            <option value="cap">cap</option>
                            <option value="mg">mg</option>
                            <option value="gm">gm</option>
                            <option value="ml">ml</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Frequency</label>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <input 
                              type="number"
                              min="1"
                              max="9"
                              value={newMedicine.frequency ?? ''}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 9)) {
                                  setNewMedicine({...newMedicine, frequency: val});
                                }
                              }}
                              placeholder="1"
                              className="w-12 bg-white border border-gray-100 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm italic"
                            />
                            <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">times/day</span>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Days</label>
                          <input 
                            type="number"
                            value={newMedicine.duration_days ?? ''}
                            onChange={e => setNewMedicine({...newMedicine, duration_days: parseInt(e.target.value) || 0})}
                            className="w-full bg-white border border-gray-100 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Total</label>
                          <div className="w-full bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-700 text-sm">
                            {
                              (() => {
                                const qty = Number(newMedicine.quantity?.toString() || '0');
                                const freq = Number(newMedicine.frequency?.toString() || '0') || 0;
                                const days = newMedicine.duration_days || 0;
                                let total = qty * freq * days;
                                let unit = newMedicine.unit_label || '';
                                if (unit === 'mg') {
                                  total = total / 1000;
                                  unit = 'gm';
                                }
                                return `${total} ${unit}`;
                              })()
                            }
                          </div>
                        </div>


                        {/* Tags and Manual Instruction - Full width row below grid */}
                        <div className="lg:col-span-full space-y-2 mt-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Instructions</label>
                          <div className="flex flex-wrap gap-1">
                            {['After Food', 'Before food', 'Mixed in food', 'Empty stomach', 'With honey', 'with water', 'with ghee', 'with milk'].map(inst => (
                              <button
                                key={inst}
                                type="button"
                                onClick={() => {
                                  const current = Array.isArray(newMedicine.instruction) ? newMedicine.instruction : [];
                                  if (current.includes(inst)) setNewMedicine({...newMedicine, instruction: current.filter(i => i !== inst)});
                                  else setNewMedicine({...newMedicine, instruction: [...current, inst]});
                                }}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${newMedicine.instruction?.includes(inst) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                              >
                                {inst}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add manual instruction..."
                              className="text-[10px] font-bold px-2 py-1.5 rounded-lg flex-grow border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              onBlur={(e) => {
                                if (e.target.value) {
                                  const val = e.target.value;
                                  const current = Array.isArray(newMedicine.instruction) ? newMedicine.instruction : [];
                                  setNewMedicine({...newMedicine, instruction: [...current, val]});
                                  e.target.value = '';
                                }
                              }}
                            />
                            <button type="button" onClick={addMedicine} className="bg-emerald-600 text-white rounded-lg px-6 py-1.5 font-bold hover:bg-emerald-700 text-xs">Add Medicine</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prescription Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Medicine</th>
                            <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                            <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</th>
                            <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Frequency</th>
                            <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Days</th>
                            <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                            <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="text-right py-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {prescribedMedicines.map(med => {
                            const stock = checkStock(med.medicine_name, med.total_quantity);
                            return (
                              <tr key={med.id} className="group hover:bg-slate-50/50 transition-all text-sm">
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">{med.medicine_name}</span>
                                    {med.is_market_purchase && (
                                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">Market</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-bold text-slate-900">{med.quantity}</td>
                                <td className="py-2 px-3 text-slate-500 font-medium">{med.unit_label}</td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-slate-800 italic">{med.frequency || med.dosage}</span>
                                    <span className="text-[10px] text-slate-400 italic">t/d</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-medium text-slate-600">{med.duration_days} Days</td>
                                <td className="py-2 px-3 font-bold text-emerald-700">
                                  {med.unit_label === 'mg' ? `${(med.total_quantity || 0) / 1000} gm` : `${med.total_quantity || 0} ${med.unit_label}`}
                                </td>
                                <td className="py-2 px-3">
                                  {med.is_market_purchase ? (
                                    <span className="flex items-center gap-1 text-blue-600 text-[10px] font-bold uppercase tracking-widest">
                                      <ShoppingCart size={12} /> External
                                    </span>
                                  ) : stock.status === 'green' ? (
                                    <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
                                      <CheckCircle size={12} /> OK
                                    </span>
                                  ) : stock.status === 'yellow' ? (
                                    <span className="flex items-center gap-1 text-amber-500 text-[10px] font-bold uppercase tracking-widest">
                                      <AlertTriangle size={12} /> Low
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-red-500 text-[10px] font-black uppercase tracking-widest">
                                      <AlertTriangle size={12} /> Out
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button 
                                    onClick={() => removeMedicine(med.id)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {prescribedMedicines.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-400 italic text-sm">
                                No medicines prescribed yet. Use the form above to add.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={saving}
                    className="w-full bg-emerald-600 text-white font-bold py-6 rounded-[2.5rem] text-xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {saving ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} />}
                    Consultation Complete
                  </button>
                </form>
              ) : (
                <div className="space-y-8">
                  <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-emerald-100 bg-emerald-50/30 print:hidden">
                    <div>
                      <h2 className="text-2xl font-bold text-emerald-900">{selectedPatient.name}</h2>
                      <p className="text-emerald-700/70">{selectedPatient.age} yrs • {selectedPatient.gender} • {selectedPatient.mobile}</p>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <CheckCircle size={20} />
                      Completed
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 print:hidden">
                    <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800">
                      <Printer size={20} /> Print Parchi
                    </button>
                    <button onClick={() => window.print()} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700">
                      <Download size={20} /> Download PDF
                    </button>
                    <button onClick={() => window.open(`https://wa.me/91${selectedPatient.mobile}?text=Your%20e-Parchi%20is%20ready.`, '_blank')} className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#128C7E]">
                      <MessageCircle size={20} /> WhatsApp
                    </button>
                  </div>

                  <button type="button" onClick={() => setSelectedPatient(null)} className="w-full text-slate-500 hover:text-slate-700 font-bold py-4 print:hidden">
                    Back to Queue
                  </button>
                </div>
              )}
              </div>
              
              {/* Right Side: A4 Preview */}
              <div className="hidden lg:block w-[400px] print:hidden">
                <div className="sticky top-24 space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 px-4">
                    <FileText className="text-emerald-600" size={20} />
                    {cur.preview}
                  </h2>
                  {renderA4Preview({ 
                    ...selectedPatient, 
                    ...formData, 
                    prescription: JSON.stringify(prescribedMedicines),
                    lifestyle_advice: lifestyleAdvice, 
                    marma_points: marmaPoints 
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'dispensing' && (
        <div className="space-y-8">
          <div className="flex gap-4 mb-4">
            <button 
              onClick={() => setActiveDispensingTab('auto')}
              className={`px-4 py-2 rounded-xl font-bold ${activeDispensingTab === 'auto' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-gray-100'}`}
            >
              Auto-Queue
            </button>
            <button 
              onClick={() => setActiveDispensingTab('manual')}
              className={`px-4 py-2 rounded-xl font-bold ${activeDispensingTab === 'manual' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-gray-100'}`}
            >
              Manual Dispense
            </button>
          </div>

          {activeDispensingTab === 'auto' && (
            !selectedPatient ? (
              <>
                <h2 className="text-2xl font-bold text-slate-900">Dispensing Queue (Completed Consultations)</h2>
                {dispensingQueue.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl text-center text-slate-500 border border-gray-100">
                    No prescriptions ready for dispensing.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dispensingQueue.map(p => (
                      <div key={p.id} onClick={() => handleSelectQueuePatient(p)} className="bg-white p-6 rounded-3xl border border-gray-100 hover:border-emerald-500 cursor-pointer transition-all shadow-sm hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-slate-900">{p.name}</h3>
                            <p className="text-sm text-slate-500">{p.age} yrs • {p.gender}</p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">Ready</span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1 mb-4">
                          <p>Completed: {new Date(p.created_at).toLocaleTimeString()}</p>
                          <p>Mobile: {p.mobile}</p>
                        </div>
                        <button 
                          onClick={(e) => handlePatientDispensed(e, p.id)}
                          disabled={saving}
                          className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Dispensed
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-8">
                  <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedPatient.name}</h2>
                      <p className="text-slate-500">{selectedPatient.age} yrs • {selectedPatient.gender} • {selectedPatient.mobile}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedPatient(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-medium">
                      <ArrowLeft size={16} /> Back to Queue
                    </button>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <FileText className="text-emerald-600" size={20} />
                      Prescribed Medicines
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Medicine</th>
                            <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Prescribed Qty</th>
                            <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Stock in Indent</th>
                            <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {prescribedMedicines.map((med, idx) => {
                            const stock = checkStock(med.medicine_name, med.total_quantity);
                            let rowClass = 'bg-slate-100';
                            let statusIcon = <X size={14} />;
                            let statusColor = 'text-slate-700';

                            if (stock.status === 'green') {
                              rowClass = 'bg-emerald-50';
                              statusIcon = <CheckCircle2 size={14} />;
                              statusColor = 'text-emerald-700';
                            } else if (stock.status === 'dark_yellow') {
                              rowClass = 'bg-red-50';
                              statusIcon = <ArrowLeftRight size={14} />;
                              statusColor = 'text-red-700';
                            }

                            return (
                              <tr key={idx} className={`${rowClass} group hover:bg-opacity-80 transition-all`}>
                                <td className="py-4 px-4">
                                  <p className="font-bold text-slate-900">{med.medicine_name}</p>
                                  <p className="text-[10px] text-slate-400">{med.dosage} • {med.duration_days} Days</p>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="font-bold text-slate-900">{med.quantity}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">{med.unit_label}s</span>
                                </td>
                                <td className="py-4 px-4">
                                  <div className={`flex items-center gap-1 font-bold ${statusColor}`}>
                                    {statusIcon}
                                    {stock.status === 'green' ? `${stock.current} ${med.unit_label}s` : stock.message}
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  {!med.is_market_purchase ? (
                                    <div className="flex justify-end gap-2">
                                      {stock.status === 'green' && (
                                        <button 
                                          onClick={() => { setDispensingMedicine(med); setDispensedQty(med.total_quantity.toString()); }}
                                          disabled={dispensedMedicines.includes(med.medicine_name)}
                                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                            dispensedMedicines.includes(med.medicine_name) 
                                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                          }`}
                                        >
                                          {dispensedMedicines.includes(med.medicine_name) ? 'Dispensed' : 'Dispense'}
                                        </button>
                                      )}
                                      {stock.status === 'dark_yellow' && (
                                        <>
                                          <button 
                                            disabled
                                            className="bg-slate-200 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold cursor-not-allowed"
                                          >
                                            Dispense
                                          </button>
                                          <button 
                                            onClick={onNavigateToIndent}
                                            className="bg-yellow-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-600 transition-all"
                                          >
                                            Indent Medicine
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Market Purchase</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block w-[400px] print:hidden">
                  <div className="sticky top-24 space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 px-4">
                      <FileText className="text-emerald-600" size={20} />
                      {cur.preview}
                    </h2>
                    {renderA4Preview({ 
                      ...selectedPatient, 
                      ...formData, 
                      prescription: JSON.stringify(prescribedMedicines),
                      lifestyle_advice: lifestyleAdvice, 
                      marma_points: marmaPoints 
                    })}
                  </div>
                </div>
              </div>
            )
          )}

          {activeDispensingTab === 'manual' && (
            <div className="space-y-8">
              <div className="bg-white border border-emerald-500 rounded-3xl p-6 shadow-sm">
                <label className="block text-emerald-600 font-bold mb-2">Search Patient / रोगी खोजें</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                  <input 
                    type="text"
                    placeholder="Enter Hospital Serial or Mobile Number"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      // Trigger search on input change for fuzzy-like behavior
                      handleSearchDispensing();
                    }}
                    className="w-full bg-emerald-50 border border-emerald-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {patients.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {patients.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          fetchPatientConsumptionHistory(p.id!);
                          setPatients([]); // Clear results after selection
                          setSearchQuery('');
                          setCurrentPrescription([]);
                        }}
                        className="w-full flex justify-between items-center p-4 hover:bg-emerald-50 rounded-xl border border-emerald-100 transition-all text-left"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.hospital_yearly_serial} • {p.mobile}</p>
                        </div>
                        <Plus size={16} className="text-emerald-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedPatient && (
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6 text-sm">
                      <p><span className="font-bold text-slate-500">Name:</span> {selectedPatient.name}</p>
                      <p><span className="font-bold text-slate-500">Age:</span> {selectedPatient.age}</p>
                      <p><span className="font-bold text-slate-500">Serial:</span> {selectedPatient.hospital_yearly_serial}</p>
                      <p><span className="font-bold text-slate-500">OPD:</span> {selectedPatient.daily_opd_number}</p>
                      <p><span className="font-bold text-slate-500">Date:</span> {new Date(selectedPatient.created_at).toLocaleDateString()}</p>
                      {lastConsumption && (
                        <p className="font-bold text-red-600">
                          Last Medicines given on {lastConsumption.date}
                          <button 
                            onClick={() => setShowHistoryModal(true)}
                            className="ml-2 text-[10px] bg-red-100 px-2 py-0.5 rounded-full"
                          >
                            Details
                          </button>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-6">
                    <PrescriptionTable 
                      hospitalId={hospitalId}
                      patientId={selectedPatient.id}
                      patientName={selectedPatient.name}
                      onPrescriptionChange={(prescription) => {
                        setCurrentPrescription(prescription);
                      }}
                      onNavigateToIndent={onNavigateToIndent}
                    />
                    
                    {currentPrescription.length > 0 && currentPrescription.every(row => row.dispensed) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-6 flex justify-center"
                      >
                        <button 
                          onClick={handleDispensingComplete}
                          className="w-full py-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={20} />
                          Dispensing Complete / वितरण पूर्ण
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:bg-white print:p-0 print:block">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-white/20 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full"
            >
              <div className="flex justify-between items-center mb-6 print:hidden">
                <h2 className="text-xl font-bold text-slate-900">Parchi Preview</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleDownloadPDF(showPreviewModal)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                    title="Download PDF"
                  >
                    <Download size={20} />
                  </button>
                  <button 
                    onClick={() => handleDownloadPNG(showPreviewModal)}
                    className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all"
                    title="Download PNG"
                  >
                    <FileImage size={20} />
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                    title="Print Parchi"
                  >
                    <Printer size={20} />
                  </button>
                  <button onClick={() => setShowPreviewModal(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="flex justify-center print:block">
                {renderA4Preview(showPreviewModal, false)}
              </div>
            </motion.div>
          </div>
        )}
        {showConsultationCompletePopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-white/20 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Consultation Completed</h2>
              <p className="text-slate-500 mb-8">The patient's consultation has been successfully recorded.</p>
              
              <button 
                onClick={() => setShowConsultationCompletePopup(false)}
                className="w-full py-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}

        {dispensingMedicine && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-white/20"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Dispense Medicine</h2>
              <p className="text-slate-500 mb-6">Enter the actual quantity dispensed to the patient.</p>
              
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Medicine</p>
                  <p className="font-bold text-slate-900">{dispensingMedicine.medicine_name}</p>
                  <p className="text-xs text-slate-500">Prescribed: {dispensingMedicine.total_quantity} {dispensingMedicine.unit_label}s</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Dispensed Quantity ({dispensingMedicine.unit_label}s)</label>
                  <input 
                    type="number"
                    value={dispensedQty}
                    onChange={e => setDispensedQty(e.target.value)}
                    className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-lg"
                    placeholder="Enter quantity..."
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setDispensingMedicine(null)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-600 bg-neutral-100 hover:bg-neutral-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDispense(dispensingMedicine)}
                    disabled={saving}
                    className="flex-1 py-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    Confirm Dispense
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {showHistoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border border-white/20"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Medicine Dispensing History</h2>
                <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {consumptionHistory.map((h, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-emerald-600 mb-1">{h.date}</p>
                    <p className="text-sm text-slate-700">{h.medicines}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
        {showIndentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Indent Stock</h2>
                <button onClick={() => setShowIndentModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {indentStock.filter(m => Number(m.remaining_loose_quantity) > 0).map((m, i) => <div key={i} className="p-3 border rounded-xl flex justify-between"><span>{m.medicine_name}</span><span className="font-bold text-emerald-600">{m.remaining_loose_quantity} {m.unit_type}</span></div>)}
              </div>
            </motion.div>
          </div>
        )}
        {showInventoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Inventory Stock</h2>
                <button onClick={() => setShowInventoryModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {mainInventory.map((m, i) => <div key={i} className="p-3 border rounded-xl flex justify-between"><span>{m.medicine_name}</span><span className="font-bold text-emerald-600">{m.quantity}</span></div>)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Export Content */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={pdfContentRef}>
          {(pdfData || pngData) && renderA4Preview(pdfData || pngData || {}, true)}
        </div>
      </div>

      {/* PDF Generation Overlay */}
      <AnimatePresence>
        {isGeneratingPDF && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]"
          >
            <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl flex items-center gap-4 border border-gray-100">
              <Loader2 className="animate-spin text-emerald-600" size={24} />
              <span className="font-bold text-slate-700">Generating PDF...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

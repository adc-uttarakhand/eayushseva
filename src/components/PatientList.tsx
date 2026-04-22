import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Calendar, Users, UserPlus, UserCheck, Phone, CreditCard, Loader2, ChevronDown, Download, Edit2, Check, X, IndianRupee, Printer, Eye, FileImage } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';

const PDF_STYLES = `
  .pdf-print-container {
    font-family: 'Inter', sans-serif !important;
    color: #0f172a !important;
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

interface PatientRecord {
  id: string;
  name: string;
  age: string;
  gender: string;
  mobile: string;
  aadhar: string;
  global_serial: string;
  hospital_yearly_serial: string;
  daily_opd_number: string;
  created_at: string;
  registration_date?: string | null;
  is_new: boolean;
  consultation_mode?: string;
  fee_amount?: number;
  complaints?: string;
  diagnosis?: string;
  history?: string;
  investigations?: string;
  prescription?: string;
  nadi?: string;
  prakruti?: string;
  mutra?: string;
  mala?: string;
  jivha?: string;
  netra?: string;
  nidra?: string;
  agni?: string;
  ahar_shakti?: string;
  satva?: string;
  vyayam_shakti?: string;
  lifestyle_advice?: string;
  marma_points?: string;
  assigned_doctor_id?: string;
  revisit_count?: number;
  bp?: string | null;
  temp_f?: number | null;
  pulse_rate?: number | null;
  respiratory_rate?: number | null;
  spo2?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  bmi?: number | null;
  rbs?: number | null;
  hb?: number | null;
  pain_scale?: number | null;
}

import { UserSession } from './LoginModal';

interface PatientListProps {
  hospitalId: string;
  hospitalName?: string;
  session?: UserSession;
}

type TimeRange = 'today' | 'month' | 'quarter' | 'year' | 'custom';

export default function PatientList({ hospitalId, hospitalName: initialHospitalName, session }: PatientListProps) {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [hospitalName, setHospitalName] = useState<string>(initialHospitalName || 'AYUSH HEALTH CENTRE');
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [activeTab, setActiveTab] = useState<'all' | 'opd' | 'teleconsultation'>('all');
  
  // New Admin filters
  const [districtFilter, setDistrictFilter] = useState<string>('All');
  const [hospitalsList, setHospitalsList] = useState<any[]>([]); // Need to fetch all hospitals if admin
  const [hospitalFilter, setHospitalFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PatientRecord>>({});
  const [updating, setUpdating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfData, setPdfData] = useState<PatientRecord | null>(null);
  const [pngData, setPngData] = useState<PatientRecord | null>(null);

  // --- Eye button preview modal state ---
  const [showPreviewModal, setShowPreviewModal] = useState<PatientRecord | null>(null);

  const [hospitalInfo, setHospitalInfo] = useState<{
    facility_name: string;
    type: string;
    district: string;
    region_indicator: string;
  } | null>(null);

  const getValidityDate = (regDate: string | null | undefined) => {
    if (!regDate) return '-';
    try {
      const date = new Date(regDate);
      if (isNaN(date.getTime())) return '-';
      date.setDate(date.getDate() + 14);
      return date.toLocaleDateString('en-GB');
    } catch (e) {
      return '-';
    }
  };

  const removeOklch = (doc: Document) => {
    const allElements = doc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i] as HTMLElement;
      try {
        const computed = window.getComputedStyle(el);
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

  // --- Download PDF (same as EParchi) ---
  const handleDownloadPDF = async (patient: PatientRecord) => {
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
        toast.error('Failed to generate PDF');
      } finally {
        setIsGeneratingPDF(false);
        setPdfData(null);
      }
    }, 500);
  };

  // --- Download PNG (same as EParchi) ---
  const handleDownloadPNG = async (patient: PatientRecord) => {
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

  const maskDate = (value: string) => {
    const v = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length <= 2) return v;
    if (v.length <= 5) return `${v.slice(0, 2)}-${v.slice(2)}`;
    return `${v.slice(0, 2)}-${v.slice(2, 5)}-${v.slice(5, 9)}`;
  };

  const [stats, setStats] = useState({
    totalOPD: 0,
    newPatients: 0,
    femalePatients: 0,
    aadharSeeded: 0,
    mobileSeeded: 0,
    totalFees: 0
  });

  useEffect(() => {
    if (initialHospitalName) {
      setHospitalName(initialHospitalName);
      return;
    }
    const fetchHospitalName = async () => {
      try {
        const { data } = await supabase.from('hospitals')
          .select('facility_name, type, district, region_indicator')
          .eq('id', hospitalId)
          .single();
        if (data) {
          setHospitalName(data.facility_name);
          setHospitalInfo(data);
        }
      } catch (err) {}
    };
    fetchHospitalName();
  }, [hospitalId, initialHospitalName]);

  useEffect(() => {
    fetchPatients();
  }, [hospitalId, timeRange, startDate, endDate, activeTab, districtFilter, hospitalFilter]);

  // Fetch all hospitals for district/hospital filters if admin
  useEffect(() => {
    if (session && (session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN' || session.role === 'DISTRICT_ADMIN')) {
      const fetchHospitals = async () => {
        let query = supabase.from('hospitals').select('hospital_id, facility_name, district');
        if (session.role === 'DISTRICT_ADMIN' && session.district) {
          query = query.eq('district', session.district);
        }
        const { data } = await query;
        if (data) setHospitalsList(data);
      };
      fetchHospitals();
    }
  }, [session]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      // Only restrict by hospital_id if a valid UUID is provided
      if (hospitalId && hospitalId !== 'ALL' && hospitalId !== 'undefined' && hospitalId !== '') {
        query = query.eq('hospital_id', hospitalId);
      } else if (session && (session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN' || session.role === 'DISTRICT_ADMIN')) {
        // Handle admin filters
        if (hospitalFilter !== 'All') {
          query = query.eq('hospital_id', hospitalFilter);
        } else if (districtFilter !== 'All') {
          const districtHospitals = hospitalsList.filter(h => h.district === districtFilter).map(h => h.hospital_id);
          query = query.in('hospital_id', districtHospitals);
        }
      }

      if (activeTab === 'teleconsultation') {
        query = query.eq('consultation_mode', 'Teleconsultation');
      } else if (activeTab === 'opd') {
        query = query.neq('consultation_mode', 'Teleconsultation');
      }

      const now = new Date();
      let start = new Date();
      let end = new Date();

      if (timeRange === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (timeRange === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === 'quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
      } else if (timeRange === 'year') {
        start = new Date(now.getFullYear(), 0, 1);
      } else if (timeRange === 'custom' && startDate && endDate) {
        const parseDate = (d: string) => {
          if (/^\d{2}-[A-Z]{3}-\d{4}$/i.test(d)) {
            const months: { [key: string]: string } = {
              'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
              'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
            };
            const [day, month, year] = d.split('-');
            const monthNum = months[month.toUpperCase()];
            return new Date(`${year}-${monthNum}-${day}`);
          }
          if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
            const [day, month, year] = d.split('-');
            return new Date(`${year}-${month}-${day}`);
          }
          return new Date(d);
        };
        start = parseDate(startDate);
        end = parseDate(endDate);
        end.setHours(23, 59, 59, 999);
      }

      if (timeRange !== 'custom' || (startDate && endDate)) {
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const records = data || [];
      setPatients(records);

      setStats({
        totalOPD: records.length,
        newPatients: records.filter(p => !p.global_serial.includes('revisit')).length,
        femalePatients: records.filter(p => p.gender === 'Female').length,
        aadharSeeded: records.filter(p => p.aadhar && p.aadhar.length === 12).length,
        mobileSeeded: records.filter(p => p.mobile && p.mobile.length === 10).length,
        totalFees: records.reduce((sum, p) => sum + (p.fee_amount || 0), 0)
      });

    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (filteredPatients.length === 0) return;

    let finalHospitalName = hospitalName;
    try {
      const { data } = await supabase.from('hospitals').select('facility_name').eq('id', hospitalId).single();
      if (data?.facility_name) {
        finalHospitalName = data.facility_name;
        setHospitalName(data.facility_name);
      }
    } catch (err) {}

    const row1 = `"${finalHospitalName}"`;
    const headers = ['Date', 'Time', 'Patient Name', 'Age', 'Gender', 'Mobile', 'Aadhar', 'Daily OPD', 'Yearly Serial', 'Global Serial', 'Type', 'Consultation', 'Fee Collected', 'Complaints', 'Diagnosis'];
    const row2 = headers.map(h => `"${h}"`).join(',');

    const csvRows = filteredPatients.map(p => {
      const d = new Date(p.created_at);
      return [
        `"${d.toLocaleDateString()}"`,
        `"${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}"`,
        `"${p.name || ''}"`,
        `"${p.age || ''}"`,
        `"${p.gender || ''}"`,
        `"${p.mobile || ''}"`,
        `"${p.aadhar || ''}"`,
        `"${p.daily_opd_number || ''}"`,
        `"${p.hospital_yearly_serial || ''}"`,
        `"${p.global_serial || ''}"`,
        `"${p.is_new ? 'New' : 'Revisit'}"`,
        `"${p.consultation_mode || 'OPD'}"`,
        `"₹${p.fee_amount || 0}"`,
        `"${(p.complaints || '').replace(/"/g, '""')}"`,
        `"${(p.diagnosis || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [row1, row2, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Patient_List_${finalHospitalName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (patient: PatientRecord) => {
    setEditingId(patient.id);
    setEditForm({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      mobile: patient.mobile,
      aadhar: patient.aadhar
    });
  };

  const handleUpdatePatient = async () => {
    if (!editingId) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update(editForm)
        .eq('id', editingId);

      if (error) throw error;
      toast.success('Patient record updated successfully');
      setEditingId(null);
      fetchPatients();
    } catch (err) {
      console.error('Error updating patient:', err);
      toast.error('Failed to update patient record');
    } finally {
      setUpdating(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mobile.includes(searchQuery) ||
    p.global_serial.includes(searchQuery)
  );

  // --- Full A4 Parchi Preview (same layout as EParchi) ---
  const renderA4Preview = (patientData: PatientRecord, isForExport = false) => {
    const content = (
      <div
        id={isForExport ? "parchi-preview-content" : undefined}
        className="pdf-print-container bg-white border border-gray-300 shadow-2xl overflow-visible flex flex-col relative text-[15px] p-[5%]"
        style={{ width: '794px', height: '1123px', minWidth: '794px', minHeight: '1123px', margin: '0 auto', backgroundColor: '#ffffff' }}
      >
        <style>{PDF_STYLES}</style>
        <div className="w-full h-full flex flex-col border border-slate-900">

          {/* Header: Hospital Details */}
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
            <p className="text-[10.5px] font-medium uppercase leading-none mt-0.5 text-center px-12">{hospitalInfo?.type} • {hospitalInfo?.district}</p>
            <div className="absolute top-2 right-2 border border-slate-900 px-1.5 py-0.5 rounded text-[9px] font-bold">
              {`Fee: ₹${(patientData.fee_amount || 0).toString().padStart(2, '0')}`}
            </div>
          </div>

          {/* Date, Visit Details */}
          <div className="h-[2.0625%] flex justify-between items-center px-3 text-[10.5px] bg-white">
            <div className="flex gap-3">
              <p><span className="font-bold">Date:</span> {new Date(patientData.created_at || new Date()).toLocaleDateString()}</p>
              <p><span className="font-bold">Valid Until:</span> {getValidityDate(patientData.registration_date || patientData.created_at)}</p>
              <p><span className="font-bold">Yearly:</span> {patientData.hospital_yearly_serial}</p>
              <p><span className="font-bold">Daily OPD:</span> {patientData.daily_opd_number}</p>
              <p><span className="font-bold">Type:</span> {patientData.is_new ? 'New' : 'Revisit'}</p>
              <p><span className="font-bold">Revisit:</span> {(patientData.revisit_count || 0).toString().padStart(2, '0')}</p>
            </div>
          </div>

          {/* Patient Personal Details */}
          <div className="h-[6%] px-3 py-1.5 flex flex-col justify-center bg-white relative">
            <p className="text-[10.5px] font-bold uppercase mb-1 text-emerald-700">Patient Details</p>
            <div className="absolute top-1.5 right-3">
              <QRCodeSVG value={JSON.stringify({
                id: patientData.id,
                date: new Date(patientData.created_at || new Date()).toLocaleDateString(),
                globalSerial: patientData.global_serial,
                hospitalSerial: patientData.hospital_yearly_serial,
                type: patientData.is_new ? 'New' : 'Revisit',
                revisitCount: patientData.revisit_count || 0,
                name: patientData.name,
                age: patientData.age,
                gender: patientData.gender,
                mobile: patientData.mobile,
                aadhar: patientData.aadhar,
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

          {/* Clinical Assessment */}
          <div className="min-h-[11.25%] px-3 py-1.5 border-b-2 border-slate-900 flex flex-col justify-center bg-white">
            <p className="text-[10.5px] font-bold uppercase mb-1 text-emerald-700">Clinical Assessment</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 overflow-visible">
              <div className="flex flex-col">
                <p className="text-[10.5px] font-bold text-slate-500">Complaints:</p>
                <p className="text-[10.5px] whitespace-pre-wrap break-words italic leading-tight">{patientData.complaints || '---'}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[10.5px] font-bold text-slate-500">Diagnosis:</p>
                <p className="text-[10.5px] whitespace-pre-wrap break-words font-bold leading-tight text-slate-800">{patientData.diagnosis || '---'}</p>
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

          {/* Remaining: Parameters + Prescription */}
          <div className="h-[75.6875%] flex flex-row bg-white">
            {/* Left: Ayurvedic Parameters */}
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
                <p className="text-[10.5px] font-bold uppercase text-emerald-700 mt-2 mb-1 border-b border-slate-200 pb-1">Modern Parameters</p>
                {[
                  { id: 'bp', label: 'BP', unit: ' mmHg' },
                  { id: 'temp_f', label: 'Temp', unit: '°F' },
                  { id: 'pulse_rate', label: 'Pulse' },
                  { id: 'respiratory_rate', label: 'Resp' },
                  { id: 'spo2', label: 'SpO2', unit: '%' },
                  { id: 'weight_kg', label: 'Wt', unit: ' kg' },
                  { id: 'height_cm', label: 'Ht', unit: ' cm' },
                  { id: 'bmi', label: 'BMI' },
                  { id: 'rbs', label: 'RBS' },
                  { id: 'hb', label: 'Hb' },
                  { id: 'pain_scale', label: 'Pain' },
                ].filter(field => (patientData as any)[field.id]).map(field => (
                  <div key={field.id} className="text-[9px] leading-tight flex justify-between gap-1">
                    <span className="font-bold text-slate-600 shrink-0">{field.label}:</span>
                    <span className="break-words whitespace-pre-wrap text-right">
                      {(patientData as any)[field.id]}{field.unit || ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Prescription */}
            <div className="w-[80%] p-3 flex flex-col relative">
              <p className="text-[12px] font-bold uppercase text-emerald-700 mb-0.5">Prescription</p>
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

                {/* Lifestyle Advice */}
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

              <div className="absolute bottom-2 left-3 text-[7.5px] text-slate-300 uppercase tracking-widest">
                Generated via e-AYUSH Seva
              </div>
              <div className="absolute bottom-1 right-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Medical Officer</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    );

    if (isForExport) return content;

    return (
      <div className="w-full flex justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/30">
        <div style={{ transform: 'scale(0.48)', transformOrigin: 'top center', width: '794px', height: '1123px', marginBottom: '-584px' }}>
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Patient Registry</h1>
          <p className="text-slate-500 mt-1">Manage and track patient visits</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            {(['all', 'opd', 'teleconsultation'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'all' ? 'All Patients' : tab === 'opd' ? 'OPD Patients' : 'Teleconsultation'}
              </button>
            ))}
          </div>
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            {(['today', 'month', 'quarter', 'year', 'custom'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  timeRange === range ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {timeRange === 'custom' && (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="DD-MMM-YYYY"
                value={startDate}
                onChange={(e) => setStartDate(maskDate(e.target.value))}
                className="bg-neutral-50 border border-gray-100 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500/20 w-28"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="text"
                placeholder="DD-MMM-YYYY"
                value={endDate}
                onChange={(e) => setEndDate(maskDate(e.target.value))}
                className="bg-neutral-50 border border-gray-100 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500/20 w-28"
              />
            </div>
          )}

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total OPD', value: stats.totalOPD, icon: Users, color: 'emerald' },
          { label: 'New Patients', value: stats.newPatients, icon: UserPlus, color: 'blue' },
          { label: 'Female Patients', value: stats.femalePatients, icon: UserCheck, color: 'pink' },
          { label: 'Aadhar Seeded', value: stats.aadharSeeded, icon: CreditCard, color: 'purple' },
          { label: 'Mobile Seeded', value: stats.mobileSeeded, icon: Phone, color: 'orange' },
          { label: 'Total Fees', value: `₹${stats.totalFees}`, icon: IndianRupee, color: 'teal' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Admin Filters */}
      {session && (session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN' || session.role === 'DISTRICT_ADMIN') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-4 flex gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 mb-1 block">District</label>
            <select
              value={districtFilter}
              onChange={(e) => {
                setDistrictFilter(e.target.value);
                setHospitalFilter('All');
              }}
              className="w-full bg-neutral-50 border border-gray-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
            >
              <option value="All">All Districts</option>
              {[...new Set(hospitalsList.map(h => h.district))].filter(Boolean).sort().map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 mb-1 block">Hospital</label>
            <select
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
              className="w-full bg-neutral-50 border border-gray-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
            >
              <option value="All">All Hospitals</option>
              {hospitalsList
                .filter(h => districtFilter === 'All' || h.district === districtFilter)
                .sort((a, b) => a.facility_name.localeCompare(b.facility_name))
                .map(h => (
                  <option key={h.hospital_id} value={h.hospital_id}>{h.facility_name}</option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, mobile or serial number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-gray-100 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No patients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/50">
                  <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Patient</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Serials</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Fee</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Visit Type</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPatients.map((patient) => {
                  const isEditing = editingId === patient.id;
                  const d = new Date(patient.created_at);
                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-6">
                        <p className="text-sm font-medium text-slate-700">{d.toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-400">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-8 py-6">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <input
                              className="bg-neutral-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500/20"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              placeholder="Name"
                            />
                            <div className="flex gap-2">
                              <input
                                className="bg-neutral-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500/20 w-16"
                                value={editForm.age}
                                onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                                placeholder="Age"
                              />
                              <select
                                className="bg-neutral-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500/20"
                                value={editForm.gender}
                                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-bold text-slate-900">{patient.name}</p>
                            <p className="text-[10px] text-slate-400">{patient.age} yrs • {patient.gender}</p>
                          </>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-emerald-600">{patient.hospital_yearly_serial}</p>
                        <p className="text-[10px] text-slate-400">OPD: {patient.daily_opd_number}</p>
                        <p className="text-[10px] text-slate-400">Global: {patient.global_serial}</p>
                      </td>
                      <td className="px-8 py-6">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <input
                              className="bg-neutral-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500/20"
                              value={editForm.mobile}
                              onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                              placeholder="Mobile"
                            />
                            <input
                              className="bg-neutral-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500/20"
                              value={editForm.aadhar}
                              onChange={(e) => setEditForm({ ...editForm, aadhar: e.target.value })}
                              placeholder="Aadhar"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-700">{patient.mobile || 'N/A'}</p>
                            <p className="text-[10px] text-slate-400">Aadhar: {patient.aadhar ? `****${patient.aadhar.slice(-4)}` : 'Not Seeded'}</p>
                          </>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900">₹{patient.fee_amount || 0}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                          patient.is_new ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {patient.is_new ? 'NEW VISIT' : 'REVISIT'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={handleUpdatePatient}
                              disabled={updating}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Save Changes"
                            >
                              {updating ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            {/* Eye button - Opens parchi preview modal */}
                            <button
                              onClick={() => setShowPreviewModal(patient)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Preview Parchi"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(patient)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Edit Record"
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== PARCHI PREVIEW MODAL (same as EParchi) ===== */}
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
                  {/* Download PDF */}
                  <button
                    onClick={() => handleDownloadPDF(showPreviewModal)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                    title="Download PDF"
                  >
                    <Download size={20} />
                  </button>
                  {/* Download PNG */}
                  <button
                    onClick={() => handleDownloadPNG(showPreviewModal)}
                    className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all"
                    title="Download PNG"
                  >
                    <FileImage size={20} />
                  </button>
                  {/* Print */}
                  <button
                    onClick={() => window.print()}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                    title="Print Parchi"
                  >
                    <Printer size={20} />
                  </button>
                  {/* Close */}
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
      </AnimatePresence>

      {/* Hidden Export Content for PDF/PNG generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {(pdfData || pngData) && renderA4Preview((pdfData || pngData)!, true)}
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
              <span className="font-bold text-slate-700">Generating...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

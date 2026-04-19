import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileBadge, Printer, X, Save, Loader2, CheckCircle, FileText, UserCheck, Eye, Image, Download, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { format, parseISO, differenceInDays, addDays, isToday, isSameMonth, isSameYear, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';

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
    transform: none !important;
  }
`;

const removeOklch = (clonedDoc: Document) => {
  const elements = clonedDoc.getElementsByTagName('*');
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;
    try {
      if (!el.style) continue;
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

export default function CertificateModule({ session, hospitalName: initialHospitalName }: { session: any, hospitalName?: string }) {
  const [activeTab, setActiveTab] = useState<'issue' | 'records' | 'logs'>('issue');
  const [certType, setCertType] = useState<'medical' | 'fitness'>('medical');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientVisits, setPatientVisits] = useState<any[]>([]);
  const [selectedVisits, setSelectedVisits] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const getFilename = (ext: string) => {
    const cleanName = formData.patientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const cleanCert = formData.certNumber.replace(/\//g, '_');
    return `${cleanName}_${cleanCert}.${ext}`;
  };

  const downloadPDF = async () => {
    const element = document.getElementById('certificate-a4-preview');
    if (!element) {
      console.error('Certificate preview not found');
      return;
    }
    
    const opt = {
      margin: 0,
      filename: getFilename('pdf'),
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 3,
        useCORS: true, 
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = PDF_STYLES;
          clonedDoc.head.appendChild(style);
          
          const clonedElement = clonedDoc.getElementById('certificate-a4-preview');
          if (clonedElement) {
            clonedElement.style.width = '794px';
            clonedElement.style.minHeight = '1123px';
            clonedElement.style.padding = '8mm';
          }
          removeOklch(clonedDoc);
        }
      },
      jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ["px_scaling"] }
    };

    try {
      setLoading(true);
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
      toast.success('PDF Downloaded');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const downloadPNG = async () => {
    const element = document.getElementById('certificate-a4-preview');
    if (!element) {
      console.error('Certificate preview not found');
      return;
    }

    try {
      setLoading(true);
      // @ts-ignore
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = PDF_STYLES;
          clonedDoc.head.appendChild(style);
          const clonedElement = clonedDoc.getElementById('certificate-a4-preview');
          if (clonedElement) {
            clonedElement.style.width = '794px';
            clonedElement.style.minHeight = '1123px';
            clonedElement.style.padding = '8mm';
          }
          removeOklch(clonedDoc);
        }
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = getFilename('png');
      link.href = dataUrl;
      link.click();
      toast.success('PNG Downloaded');
    } catch (error) {
      console.error('PNG Generation Error:', error);
      toast.error('Failed to generate PNG');
    } finally {
      setLoading(false);
    }
  };

  const printLayout = async () => {
    const element = document.getElementById('certificate-a4-preview');
    if (!element) {
      console.error('Certificate preview not found');
      return;
    }
    
    const opt = {
      margin: 0,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 3,
        useCORS: true, 
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = PDF_STYLES;
          clonedDoc.head.appendChild(style);
          
          const clonedElement = clonedDoc.getElementById('certificate-a4-preview');
          if (clonedElement) {
            clonedElement.style.width = '794px';
            clonedElement.style.minHeight = '1123px';
            clonedElement.style.padding = '8mm';
          }
          removeOklch(clonedDoc);
        }
      },
      jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ["px_scaling"] }
    };

    try {
      setLoading(true);
      // @ts-ignore
      const pdf = await html2pdf().set(opt).from(element).toPdf().get('pdf');
      const blobUrl = pdf.output('bloburl');
      const win = window.open(blobUrl, '_blank');
      if (win) {
        win.onload = () => win.print();
      }
    } catch (error) {
      console.error('Print Error:', error);
      toast.error('Failed to print');
    } finally {
      setLoading(false);
    }
  };

  const getFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    return now.getMonth() >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
  };

  const generateCertNumber = async () => {
    const fy = getFinancialYear();
    const { count } = await supabase
      .from('patient_certificates')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .ilike('certificate_number', `%/${fy}`);
    
    const nextNumber = (count || 0) + 1;
    return `${String(nextNumber).padStart(4, '0')}/${fy}`;
  };

  useEffect(() => {
    if (activeTab === 'issue' && selectedPatient) {
      generateCertNumber().then(num => setFormData(prev => ({ ...prev, certNumber: num })));
      setIsSaved(false); // Reset saved state for new patient/tab switch
    }
  }, [activeTab, selectedPatient]);

  const [formData, setFormData] = useState({
    startDate: '', endDate: '', diagnosis: '', remarks: '', 
    fitnessDate: '', idMark: '', fathersName: '', address: '',
    certNumber: '',
    patientName: '',
    patientAge: '',
    patientGender: 'Male',
    issueDate: format(new Date(), 'yyyy-MM-dd')
  });

  // Handle form changes and reset saved state
  const handleFormChange = (updates: any) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsSaved(false);
  };
  const [feeCollected, setFeeCollected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [expandingRow, setExpandingRow] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [fitnessData, setFitnessData] = useState({ date: '', issueDate: format(new Date(), 'yyyy-MM-dd') });
  const [hospitalName, setHospitalName] = useState<string>(initialHospitalName || '');
  const [records, setRecords] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<'today' | 'month' | 'year' | 'range' | 'all'>('all');
  const [logRange, setLogRange] = useState({ start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') });
  const [diseaseResults, setDiseaseResults] = useState<any[]>([]);
  const [diseaseLoading, setDiseaseLoading] = useState(false);
  const [showDiseaseResults, setShowDiseaseResults] = useState(false);

  useEffect(() => {
    if (initialHospitalName) {
      setHospitalName(initialHospitalName);
    }
  }, [initialHospitalName]);

  const hospitalId = session?.activeHospitalId || session?.hospitalId || session?.id;
  const [currentStaff, setCurrentStaff] = useState<any>(null);

  useEffect(() => {
    const fetchCurrentStaff = async () => {
      // In this app's custom session, session.id is the actual staff/hospital ID
      const staffId = session?.id;
      if (!staffId || session?.role === 'HOSPITAL') return;

      const { data, error } = await supabase
        .from('staff')
        .select('full_name, role')
        .eq('id', staffId)
        .single();

      if (data && !error) {
        setCurrentStaff(data);
      }
    };
    fetchCurrentStaff();
  }, [session]);

  useEffect(() => {
    const fetchHospitalName = async () => {
      if (!hospitalId) return;
      try {
        // Try hospitals table first with both possible ID columns
        const { data, error } = await supabase
          .from('hospitals')
          .select('facility_name, name')
          .or(`hospital_id.eq.${hospitalId},id.eq.${hospitalId}`)
          .maybeSingle();

        if (data && !error) {
          const nameValue = data.facility_name || data.name;
          if (nameValue) {
            setHospitalName(nameValue);
            return;
          }
        }

        // Try 'hospital' table if 'hospitals' didn't yield a name
        const { data: hData } = await supabase
          .from('hospital')
          .select('facility_name, name')
          .or(`hospital_id.eq.${hospitalId},id.eq.${hospitalId}`)
          .maybeSingle();
        
        if (hData) {
          const nameValue = hData.facility_name || hData.name;
          if (nameValue) setHospitalName(nameValue);
        }
      } catch (err) {
        console.error('Error fetching hospital name:', err);
      }
    };
    if (hospitalId && !hospitalName) fetchHospitalName();
  }, [hospitalId, hospitalName]);

  const doctorName = currentStaff?.full_name || session?.name || session?.full_name || session?.user?.user_metadata?.full_name || 'Medical Officer';
  const doctorRole = currentStaff?.role || session?.staffRole || session?.role || '';

  const CertificateBody = ({ isOfficeCopy }: any) => (
    <div className={`relative p-[15mm] h-[148.5mm] flex flex-col ${isOfficeCopy ? 'border-b-2 border-dotted border-slate-300' : ''}`}>
      <div className="relative flex justify-between items-start mb-6 w-full">
        <div className="text-left text-slate-900 z-10">
          <p className="text-[10px] font-bold text-slate-500">Number: {formData.certNumber || '............'}</p>
        </div>
        
        <div className="absolute inset-x-0 text-center pointer-events-none">
          <h2 className="text-xl font-black tracking-tighter uppercase text-slate-900 pointer-events-auto">
            {certType === 'medical' ? 'MEDICAL CERTIFICATE' : 'FITNESS CERTIFICATE'}
          </h2>
        </div>

        <span className="text-[8px] border border-slate-300 px-2 py-1 rounded text-slate-400 font-bold uppercase tracking-widest z-10">
          {isOfficeCopy ? 'OFFICE COPY' : 'PATIENT COPY'}
        </span>
      </div>

      <div className="text-xs leading-relaxed text-justify space-y-4 text-slate-900">
        {certType === 'medical' ? (
          <p>
            I, <strong>Dr. {doctorName} ({doctorRole})</strong> after careful personal examination of the case hereby certify that 
            Dr./ Shri/ Smt./ Ms. <u><strong>{formData.patientName || '....................'}</strong></u> Age: <u><strong>{formData.patientAge || '...'}</strong></u> Gender: <u><strong>{formData.patientGender || '...'}</strong></u> Father's Name: <u><strong>{formData.fathersName || '....................'}</strong></u> Resident of <u><strong>{formData.address || '....................'}</strong></u> whose signature is given above
            is suffering from <u><strong>{formData.diagnosis || '....................'}</strong></u> and is under my treatment. Therefore, I consider, that a period of absence from duty 
            from <u><strong>{formData.startDate || '..........'}</strong></u> to <u><strong>{formData.endDate || '..........'}</strong></u> for <u><strong>{differenceInDays(parseISO(formData.endDate || formData.startDate), parseISO(formData.startDate || formData.endDate)) + 1 || '0'}</strong></u> days is absolutely necessary for the restoration of his/her health.
          </p>
        ) : (
          <p>
            I, <strong>Dr. {doctorName} ({doctorRole})</strong> do hereby certify that I had carefully examined 
            Dr./ Shri/ Smt./ Ms. <u><strong>{formData.patientName || '....................'}</strong></u> Age: <u><strong>{formData.patientAge || '...'}</strong></u> Gender: <u><strong>{formData.patientGender || '...'}</strong></u> Father's Name: <u><strong>{formData.fathersName || '....................'}</strong></u> Resident of <u><strong>{formData.address || '....................'}</strong></u> 
            whose signature is given above, was under my treatment from <u><strong>{formData.startDate || '..........'}</strong></u> to <u><strong>{formData.endDate || '..........'}</strong></u> for <u><strong>{formData.diagnosis || '....................'}</strong></u> and find that he/she has recovered from his/her illness and is now fit to resume duties from <u><strong>{formData.fitnessDate || '..........'}</strong></u>.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-[10px] font-medium mt-16 mb-2 text-slate-900">
        <p>Signature of Applicant: .......................................</p>
        <p>Identification Mark: <span className="underline font-bold">{formData.idMark || '....................'}</span></p>
      </div>

      <div className="mt-auto pt-8 flex justify-between items-end text-slate-900">
        <div className="text-[10px] space-y-1">
          <p>Place: <span className="font-bold underline">{hospitalName || 'Hospital'}</span></p>
          <p>Date: <span className="font-bold underline">{formData.issueDate ? format(parseISO(formData.issueDate), 'dd-MM-yyyy') : '..........'}</span></p>
        </div>
        <div className="text-center border-t border-slate-300 pt-2 px-4">
          <p className="text-[10px] font-bold">Signature of {doctorName}</p>
          <p className="text-[8px] uppercase text-slate-500 tracking-tighter">{doctorRole}</p>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (activeTab === 'records' || activeTab === 'logs') fetchRecords();
  }, [activeTab]);

  const performSearch = async () => {
    if (searchQuery.length < 2) return toast.error('Enter at least 2 characters');
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('hospital_id', hospitalId)
      .or(`name.ilike.%${searchQuery}%,hospital_yearly_serial.ilike.%${searchQuery}%`)
      .order('created_at', { ascending: false });
    
    if (data) {
      // Group by name to show unique patients
      const uniquePatients = Array.from(new Set(data.map(p => p.name)))
        .map(name => data.find(p => p.name === name));
      setSearchResults(uniquePatients);
    }
  };

  const selectPatientAndFetchVisits = async (patient: any) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patientName: patient.name,
      patientAge: patient.age.toString(),
      patientGender: patient.gender || 'Male'
    }));
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('name', patient.name)
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });
    
    if (data) setPatientVisits(data);
    setSearchResults([]);
  };

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_certificates')
        .select(`
          *,
          patients (
            name,
            age,
            gender
          )
        `)
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch Error:', error);
      } else if (data) {
        setRecords(data);
      }
    } catch (err) {
      console.error('System Fetch Error:', err);
    }
  };

  const handleDiagnosisChange = async (val: string) => {
    handleFormChange({ diagnosis: val });
    if (val.length < 2) {
      setDiseaseResults([]);
      setShowDiseaseResults(false);
      return;
    }

    try {
      setDiseaseLoading(true);
      const { data, error } = await supabase
        .from('diseases_master')
        .select('id, disease_name')
        .ilike('disease_name', `%${val}%`)
        .limit(10);
      
      if (data) {
        setDiseaseResults(data);
        setShowDiseaseResults(true);
      }
    } catch (err) {
      console.error('Error fetching diseases:', err);
    } finally {
      setDiseaseLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPatient) return toast.error('Select a patient');
    if (selectedVisits.length === 0) return toast.error('Select at least one visit for continuation');
    if (!feeCollected) return toast.error('Please collect the fee (₹150) before saving');

    setLoading(true);
    const days = formData.startDate && formData.endDate ? differenceInDays(parseISO(formData.endDate), parseISO(formData.startDate)) + 1 : 0;
    
    // Sort visits by created_at and use the oldest
    const sortedVisits = [...patientVisits].filter(v => selectedVisits.includes(v.id)).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const oldestVisit = sortedVisits[0];

    const { error } = await supabase.from('patient_certificates').insert([{
      patient_id: oldestVisit.id,
      hospital_id: hospitalId,
      staff_id: session?.id,
      certificate_type: 'Medical',
      certificate_number: formData.certNumber,
      fathers_name: formData.fathersName,
      address: formData.address,
      diagnosis: formData.diagnosis,
      start_date: formData.startDate,
      end_date: formData.endDate,
      no_of_days: days,
      id_mark: formData.idMark,
      medical_issue_date: formData.issueDate,
      remarks: JSON.stringify(selectedVisits),
      fee_amount: 150,
      is_collected: true,
      patient_name: formData.patientName,
      age: formData.patientAge,
      gender: formData.patientGender,
      first_reg_number: oldestVisit.hospital_yearly_serial
    }]);

    if (!error) {
      toast.success('Medical Certificate Saved & Fee Collected');
      setIsSaved(true);
      fetchRecords();
    } else toast.error(error.message);
    setLoading(false);
  };

  const issueFitness = (record: any) => {
    const nextDate = format(addDays(parseISO(record.end_date), 1), 'yyyy-MM-dd');
    setFitnessData({
      date: nextDate,
      issueDate: format(new Date(), 'yyyy-MM-dd')
    });
    setExpandingRow(expandingRow === record.id ? null : record.id);
  };

  const finalizeFitness = async (record: any) => {
    setLoading(true);
    const { error } = await supabase
      .from('patient_certificates')
      .update({ 
        certificate_type: 'Fitness',
        fitness_date: fitnessData.date,
        fitness_issue_date: fitnessData.issueDate
      })
      .eq('id', record.id);

    if (!error) {
      toast.success('Fitness Certificate Generated Successfully');
      setExpandingRow(null);
      fetchRecords();
    } else {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const loadRecord = (item: any) => {
    setSelectedPatient({
      name: item.patient_name || item.patients?.name,
      age: item.age || item.patients?.age,
      gender: item.gender || item.patients?.gender
    });
    setFormData({
      certNumber: item.certificate_number,
      fathersName: item.fathers_name,
      address: item.address,
      diagnosis: item.diagnosis,
      startDate: item.start_date,
      endDate: item.end_date,
      idMark: item.id_mark,
      fitnessDate: item.fitness_date,
      remarks: item.remarks,
      patientName: item.patient_name || item.patients?.name || '',
      patientAge: (item.age || item.patients?.age || '').toString(),
      patientGender: item.gender || item.patients?.gender || 'Male',
      issueDate: item.medical_issue_date ? format(parseISO(item.medical_issue_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    });
    setCertType(item.certificate_type.toLowerCase() as any);
    setIsSaved(true);
  };

  const printCert = (item: any) => {
    loadRecord(item);
    setActiveTab('issue');
    toast.success('Record loaded into Preview for printing');
  };

  const downloadCSV = () => {
    const headers = ["Serial", "Patient", "Medical Issue", "Fitness Issue", "Days", "Charges", "Issued By", "Hospital"];
    const rows = filteredLogs.map(r => [
      r.certificate_number,
      r.patients?.name || r.patient_name || 'N/A',
      r.medical_issue_date,
      r.fitness_issue_date || '-',
      r.no_of_days,
      r.fee_amount || 0,
      doctorName,
      hospitalName || 'Hospital'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Certificates_Logs_${format(new Date(), 'dd_MMM_yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Downloaded');
  };

  const filteredLogs = (records || []).filter(r => {
    const search = searchQuery.toLowerCase();
    const certNo = (r.certificate_number || '').toLowerCase();
    const pName = (r.patients?.name || r.patient_name || '').toLowerCase();
    
    const matchesSearch = certNo.includes(search) || pName.includes(search);
    
    if (!matchesSearch) return false;
    if (logFilter === 'all') return true;

    if (!r.medical_issue_date) return false;
    const issueDate = parseISO(r.medical_issue_date);
    
    if (logFilter === 'today') return isToday(issueDate);
    if (logFilter === 'month') return isSameMonth(issueDate, new Date());
    if (logFilter === 'year') return isSameYear(issueDate, new Date());
    if (logFilter === 'range') {
      try {
        return isWithinInterval(issueDate, {
          start: startOfDay(parseISO(logRange.start)),
          end: endOfDay(parseISO(logRange.end))
        });
      } catch (e) { return true; }
    }
    return true;
  });

  return (
    <div className="p-4 bg-slate-50 min-h-screen pb-20">
      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="font-black text-xl flex items-center gap-2 text-slate-800"><FileBadge className="text-emerald-600"/> Certificates</h2>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button onClick={() => setActiveTab('issue')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'issue' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-500'}`}>New Certificate</button>
          <button onClick={() => setActiveTab('records')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'records' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-500'}`}>History & Fitness</button>
          <button onClick={() => setActiveTab('logs')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'logs' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-500'}`}>Logs</button>
        </div>
      </header>

      {activeTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-3">Search & Continuation Select</label>
              <div className="flex gap-2">
                <input className="flex-1 p-4 bg-slate-50 border-none rounded-2xl text-sm" placeholder="Search Patient..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <button onClick={performSearch} className="bg-slate-900 text-white p-4 rounded-2xl"><Search size={20}/></button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map(p => (
                    <button key={p.id} onClick={() => selectPatientAndFetchVisits(p)} className="w-full p-3 text-left hover:bg-emerald-50 rounded-xl border border-slate-100 flex justify-between items-center">
                      <span className="font-bold text-sm">{p.name}</span>
                      <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedPatient && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-3">Select Visits for Leave Period</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {patientVisits.map(v => (
                      <label key={v.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                        <input type="checkbox" checked={selectedVisits.includes(v.id)} onChange={(e) => e.target.checked ? setSelectedVisits([...selectedVisits, v.id]) : setSelectedVisits(selectedVisits.filter(id => id !== v.id))} />
                        <span className="text-xs font-medium">OPD: {v.hospital_yearly_serial} ({format(parseISO(v.created_at), 'dd MMM yyyy')})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

{/* --- Live Certificate Preview Section --- */}
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col items-center">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-4 self-start tracking-widest">
              Live Certificate Preview (55% Zoom)
            </label>

            {/* Outer Container: Height increased to accommodate larger scale */}
            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] w-full overflow-hidden flex justify-center items-start h-[650px] relative">
              
              {/* A4 Paper Wrapper: Scale increased to 0.55 for readability */}
              <div 
                id="certificate-a4-preview-main" 
                className="bg-white pdf-print-container shadow-2xl border border-slate-200"
                style={{ 
                  width: '210mm', 
                  height: '297mm', 
                  transform: 'scale(0.55)', // 55% Zoom for better reading
                  transformOrigin: 'top center', 
                  marginTop: '20px',
                  marginBottom: '-400px', // Adjusted to remove dead space
                  flexShrink: 0,
                  color: '#000'
                }}
              >
                {[0, 1].map((i) => (
                  <CertificateBody key={i} isOfficeCopy={i === 0} />
                ))}
              </div>
            </div>

            {isSaved ? (
              <div className="mt-6 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                   <button 
                    onClick={downloadPDF} 
                    disabled={loading}
                    className="flex-1 bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <FileText size={18}/>}
                    Download PDF
                  </button>
                  <button 
                    onClick={downloadPNG} 
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <Image size={18}/>}
                    Download PNG
                  </button>
                </div>
                <button 
                  onClick={printLayout} 
                  disabled={loading}
                  className="w-full bg-slate-800 text-white p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <Printer size={18}/>}
                  Print Certificate
                </button>
                <p className="text-[10px] text-center text-emerald-600 font-bold animate-pulse uppercase tracking-widest">
                  Certificate Saved Successfully! Ready for export.
                </p>
              </div>
            ) : (
              <p className="mt-6 text-center text-[10px] text-slate-400 font-medium uppercase tracking-tighter italic">
                Save the medical certificate first to enable download & print options.
              </p>
            )}
          </div>
        </div> {/* End of first column */}

        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-5">
            <h3 className="font-black text-lg border-b pb-3">Certificate Details</h3>
             <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 ml-1 block">Certificate Number</label>
                <input className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-mono" value={formData.certNumber} readOnly />
              </div>
              
              <div className="col-span-2 space-y-4 pt-2 border-t">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Patient Name</label>
                  <input 
                    className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold" 
                    placeholder="Patient Name" 
                    value={formData.patientName} 
                    onChange={e => handleFormChange({ patientName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Age</label>
                    <input 
                      className="w-full p-3 bg-slate-50 border rounded-xl text-sm" 
                      placeholder="Age" 
                      value={formData.patientAge} 
                      onChange={e => handleFormChange({ patientAge: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Gender</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                      value={formData.patientGender}
                      onChange={e => handleFormChange({ patientGender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="col-span-2 pt-2 border-t">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Father's Name</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl text-sm" placeholder="Father's Name" value={formData.fathersName} onChange={e => handleFormChange({ fathersName: e.target.value })}/>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Full Address</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl text-sm" placeholder="Full Address" value={formData.address} onChange={e => handleFormChange({ address: e.target.value })}/>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Start Date</label>
                <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" value={formData.startDate} onChange={e => handleFormChange({ startDate: e.target.value })}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">End Date</label>
                <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" value={formData.endDate} onChange={e => handleFormChange({ endDate: e.target.value })}/>
              </div>

              <div className="col-span-2 flex justify-end px-2">
                {formData.startDate && formData.endDate && (
                  <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    Total Duration: {differenceInDays(parseISO(formData.endDate), parseISO(formData.startDate)) + 1} Days (Inclusive)
                  </span>
                )}
              </div>

              <div className="col-span-2 relative">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Diagnosis / Disease</label>
                <div className="relative">
                  <input 
                    className="w-full p-3 bg-slate-50 border rounded-xl text-sm" 
                    placeholder="Type diagnosis or disease name..." 
                    value={formData.diagnosis} 
                    onChange={e => handleDiagnosisChange(e.target.value)}
                    onFocus={() => { if (diseaseResults.length > 0) setShowDiseaseResults(true); }}
                  />
                  {diseaseLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-slate-400"/>
                    </div>
                  )}
                </div>
                
                <AnimatePresence>
                  {showDiseaseResults && diseaseResults.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDiseaseResults(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
                      >
                        {diseaseResults.map((disease) => (
                          <button
                            key={disease.id}
                            className="w-full text-left p-3 hover:bg-slate-50 border-b last:border-none transition-colors group flex items-center justify-between"
                            onClick={() => {
                              handleFormChange({ diagnosis: disease.disease_name });
                              setShowDiseaseResults(false);
                            }}
                          >
                            <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 transition-colors">
                              {disease.disease_name}
                            </span>
                            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                              <UserCheck size={12} className="text-slate-400 group-hover:text-emerald-500"/>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Identification Mark</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl text-sm" placeholder="Identification Mark" value={formData.idMark} onChange={e => handleFormChange({ idMark: e.target.value })}/>
              </div>

              <div className="col-span-2 pt-2 border-t">
                <label className="text-[10px] font-bold text-emerald-600 block mb-1 ml-1 uppercase">Issue Date</label>
                <input 
                  type="date" 
                  className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-800" 
                  value={formData.issueDate} 
                  onChange={e => handleFormChange({ issueDate: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <input className="w-full p-3 bg-slate-100 border-none rounded-xl text-[10px] text-slate-500" value={`Issued by: ${doctorName} (${doctorRole})`} readOnly />
              </div>
            </div>
            <button 
              onClick={() => setFeeCollected(!feeCollected)}
              className={`w-full p-4 rounded-2xl font-bold flex justify-center items-center gap-2 ${feeCollected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
            >
              <CheckCircle size={20}/> {feeCollected ? 'Fee (₹150) Collected' : 'Mark Fee (₹150) as Collected'}
            </button>
            <button onClick={handleSave} disabled={loading || !feeCollected} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold flex justify-center items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Save Medical Certificate</>}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
          {/* Hidden Generation Container - Always rendered for html2pdf */}
          <div 
            ref={previewRef}
            style={{ position: 'absolute', top: '-10000px', left: '-10000px', pointerEvents: 'none' }}
          >
            <div 
              id="certificate-a4-preview" 
              className="bg-white pdf-print-container"
              style={{ width: '794px', minHeight: '1123px', background: 'white' }}
            >
               {[0, 1].map((i) => (
                  <CertificateBody key={i} isOfficeCopy={i === 0} />
                ))}
            </div>
          </div>
          
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="p-5">Cert No / Patient</th>
                <th className="p-5">Medical Issue Date</th>
                <th className="p-5">Fitness Issue Date</th>
                <th className="p-5">Period</th>
                <th className="p-5">Days</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-600">
              {records.map(r => (
                <React.Fragment key={r.id}>
                  <tr className={`text-sm transition-colors ${expandingRow === r.id ? 'bg-orange-50/50 border-l-4 border-orange-400' : ''}`}>
                    <td className="p-5">
                      <p className="font-bold">{r.certificate_number}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold">{r.patients?.name}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[8px] font-black uppercase tracking-wider">Medical</span>
                      </div>
                    </td>
                    <td className="p-5 text-xs font-medium text-slate-600">
                      {r.medical_issue_date ? format(parseISO(r.medical_issue_date), 'dd-MM-yyyy') : '-'}
                    </td>
                    <td className="p-5">
                      {r.certificate_type === 'Fitness' ? (
                        <span className="text-xs font-medium text-slate-600">
                          {r.fitness_issue_date ? format(parseISO(r.fitness_issue_date), 'dd-MM-yyyy') : '-'}
                        </span>
                      ) : (
                        <button 
                          onClick={() => issueFitness(r)} 
                          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all shadow-md ${expandingRow === r.id ? 'bg-slate-800 text-white shadow-slate-200' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'}`}
                          title="Issue Fitness"
                        >
                          {expandingRow === r.id ? <X size={14}/> : <UserCheck size={14}/>}
                          {expandingRow === r.id ? 'Cancel' : 'Generate Fitness'}
                        </button>
                      )}
                    </td>
                    <td className="p-5 text-[10px] text-slate-500 font-medium">
                      {r.start_date} to {r.end_date}
                    </td>
                    <td className="p-5 text-xs font-mono font-bold text-emerald-600">{r.no_of_days} Days</td>
                    <td className="p-5 text-right flex justify-end gap-2">
                       <button 
                        onClick={() => {
                          const medRecord = {...r, certificate_type: 'Medical'};
                          loadRecord(medRecord);
                          setTimeout(printLayout, 100);
                        }} 
                        className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                        title="Print Medical"
                      >
                        <Printer size={18}/>
                      </button>
                      <button 
                        onClick={() => {
                          const medRecord = {...r, certificate_type: 'Medical'};
                          loadRecord(medRecord);
                          setTimeout(downloadPDF, 100);
                        }} 
                        className="p-2 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Download Medical PDF"
                      >
                        <FileText size={18}/>
                      </button>
                      <button 
                        onClick={() => {
                          const medRecord = {...r, certificate_type: 'Medical'};
                          loadRecord(medRecord);
                          setTimeout(downloadPNG, 100);
                        }} 
                        className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Download Medical PNG"
                      >
                        <Image size={18}/>
                      </button>
                      <button 
                        onClick={() => {
                          const medRecord = {...r, certificate_type: 'Medical'};
                          loadRecord(medRecord);
                          setIsPreviewModalOpen(true);
                        }} 
                        className="p-2 bg-slate-50 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        title="Preview Medical"
                      >
                        <Eye size={18}/>
                      </button>
                    </td>
                  </tr>
                  
                  {r.certificate_type === 'Fitness' && (
                    <tr className="bg-emerald-50/20 text-xs border-l-4 border-emerald-400">
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-wider">Fitness</span>
                          <span className="text-[10px] text-slate-400 italic">Sub-Certificate Issued</span>
                        </div>
                      </td>
                      <td className="p-5">-</td>
                      <td className="p-5 font-bold text-emerald-800">
                        {r.fitness_issue_date ? format(parseISO(r.fitness_issue_date), 'dd-MM-yyyy') : '-'}
                      </td>
                      <td className="p-5">
                        <span className="text-[10px] text-slate-500">Fit to resume: </span>
                        <span className="font-bold text-blue-600 underline text-xs">{r.fitness_date ? format(parseISO(r.fitness_date), 'dd-MM-yyyy') : '-'}</span>
                      </td>
                      <td className="p-5">-</td>
                      <td className="p-5 text-right flex justify-end gap-2 pr-5">
                        <button 
                          onClick={() => {
                            loadRecord(r);
                            setTimeout(printLayout, 100);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200 rounded"
                          title="Print Fitness"
                        >
                          <Printer size={16}/>
                        </button>
                         <button 
                          onClick={() => {
                            loadRecord(r);
                            setTimeout(downloadPDF, 100);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100 rounded"
                          title="Download Fitness PDF"
                        >
                          <FileText size={16}/>
                        </button>
                        <button 
                          onClick={() => {
                            loadRecord(r);
                            setTimeout(downloadPNG, 100);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100 rounded"
                          title="Download Fitness PNG"
                        >
                          <Image size={16}/>
                        </button>
                        <button 
                          onClick={() => {
                            loadRecord(r);
                            setIsPreviewModalOpen(true);
                          }} 
                          className="p-1.5 text-slate-400 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100 rounded"
                          title="Preview Fitness"
                        >
                          <Eye size={16}/>
                        </button>
                      </td>
                    </tr>
                  )}
                  {expandingRow === r.id && (
                    <tr>
                      <td colSpan={6} className="p-0 border-b border-blue-100">
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="bg-blue-50/30 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8"
                        >
                          {/* Live Preview for Fitness */}
                          <div className="flex flex-col items-center">
                            <label className="text-[10px] font-black uppercase text-blue-400 block mb-4 self-start tracking-widest">
                              Fitness Preview (Inline)
                            </label>
                            <div className="bg-white border border-blue-100 rounded-[2rem] w-full overflow-hidden flex justify-center items-start h-[500px] relative shadow-inner">
                              <div 
                                className="bg-white pdf-print-container shadow-xl"
                                style={{ 
                                  width: '210mm', 
                                  height: '297mm', 
                                  transform: 'scale(0.4)', 
                                  transformOrigin: 'top center', 
                                  marginTop: '20px',
                                  marginBottom: '-500px',
                                  flexShrink: 0,
                                  color: '#000'
                                }}
                              >
                                {[0, 1].map((i) => (
                                  <div key={i} className={`relative p-[15mm] h-[148.5mm] flex flex-col ${i === 0 ? 'border-b-2 border-dotted border-slate-300' : ''}`}>
                                    <div className="flex justify-between items-start mb-6 text-left">
                                      <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">FITNESS CERTIFICATE</h2>
                                        <p className="text-[10px] font-bold text-slate-500">Number: {r.certificate_number}</p>
                                      </div>
                                      <span className="text-[8px] border border-slate-300 px-2 py-1 rounded text-slate-400 font-bold uppercase tracking-widest">
                                        {i === 0 ? 'OFFICE COPY' : 'PATIENT COPY'}
                                      </span>
                                    </div>

                                    <div className="text-xs leading-relaxed text-justify space-y-4 text-slate-900">
                                      <p>
                                        I, <strong>Dr. {doctorName} ({doctorRole})</strong> do hereby certify that I had carefully examined 
                                        Dr./ Shri/ Smt./ Ms. <u><strong>{r.patients?.name}</strong></u> Age: <u><strong>{r.age || r.patients?.age}</strong></u> Gender: <u><strong>{r.gender || r.patients?.gender}</strong></u> Father's Name: <u><strong>{r.fathers_name}</strong></u> Resident of <u><strong>{r.address}</strong></u> 
                                        whose signature is given above, was under my treatment from <u><strong>{r.start_date}</strong></u> to <u><strong>{r.end_date}</strong></u> for <u><strong>{r.diagnosis}</strong></u> and find that he/she has recovered from his/her illness and is now fit to resume duties from <u><strong>{fitnessData.date || '..........'}</strong></u>.
                                      </p>
                                    </div>

                                    <div className="mt-auto pt-8 flex justify-between items-end">
                                      <div className="text-[10px] space-y-1">
                                        <p>Place: <span className="font-bold underline">{hospitalName || 'Hospital'}</span></p>
                                        <p>Date: <span className="font-bold underline">{fitnessData.issueDate ? format(parseISO(fitnessData.issueDate), 'dd-MM-yyyy') : '..........'}</span></p>
                                      </div>
                                      <div className="text-center border-t border-slate-300 pt-2 px-4">
                                        <p className="text-[10px] font-bold">Signature of {doctorName}</p>
                                        <p className="text-[8px] uppercase text-slate-500 tracking-tighter">{doctorRole}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Controls for Fitness */}
                          <div className="space-y-6 flex flex-col justify-center">
                            <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4">
                              <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2">
                                <CheckCircle size={16} className="text-blue-500"/>
                                Fitness Finalization
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Fit to Resume Duty From</label>
                                  <input 
                                    type="date" 
                                    className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-900" 
                                    value={fitnessData.date}
                                    onChange={e => setFitnessData(prev => ({ ...prev, date: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Fitness Issue Date</label>
                                  <input 
                                    type="date" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                                    value={fitnessData.issueDate}
                                    onChange={e => setFitnessData(prev => ({ ...prev, issueDate: e.target.value }))}
                                  />
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                                <p className="text-[10px] text-slate-500 flex justify-between">
                                  <span>Patient Name:</span>
                                  <span className="font-bold text-slate-700">{r.patients?.name}</span>
                                </p>
                                <p className="text-[10px] text-slate-500 flex justify-between">
                                  <span>Medical Duration:</span>
                                  <span className="font-bold text-emerald-600">{r.no_of_days} Days</span>
                                </p>
                                <p className="text-[10px] text-slate-500 flex justify-between">
                                  <span>Period:</span>
                                  <span className="font-bold text-slate-700">{r.start_date} to {r.end_date}</span>
                                </p>
                              </div>

                              <button 
                                onClick={() => finalizeFitness(r)}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
                              >
                                {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                Generate Now
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-[2rem] border shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setLogFilter('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${logFilter === 'all' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>All</button>
              <button onClick={() => setLogFilter('today')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${logFilter === 'today' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Today</button>
              <button onClick={() => setLogFilter('month')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${logFilter === 'month' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Month</button>
              <button onClick={() => setLogFilter('year')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${logFilter === 'year' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Year</button>
              <button onClick={() => setLogFilter('range')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${logFilter === 'range' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Range</button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {logFilter === 'range' && (
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border">
                  <Calendar size={14} className="text-slate-400 ml-1"/>
                  <input type="date" className="bg-transparent border-none text-[10px] uppercase font-bold text-slate-600" value={logRange.start} onChange={e => setLogRange({...logRange, start: e.target.value})}/>
                  <span className="text-slate-300">to</span>
                  <input type="date" className="bg-transparent border-none text-[10px] uppercase font-bold text-slate-600" value={logRange.end} onChange={e => setLogRange({...logRange, end: e.target.value})}/>
                </div>
              )}
              <button onClick={downloadCSV} className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs hover:bg-emerald-700 transition-all">
                <Download size={16}/> Download CSV
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input className="w-full pl-12 p-4 bg-slate-50 border-none rounded-2xl text-sm" placeholder="Search by Cert No or Patient Name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-100">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-4">Serial</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Medical Issue</th>
                  <th className="p-4">Fitness Issue</th>
                  <th className="p-4">Days</th>
                  <th className="p-4">Charges</th>
                  <th className="p-4">Issued By</th>
                  <th className="p-4">Hospital</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map(r => (
                  <tr key={r.id} className="text-xs hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{r.certificate_number}</td>
                    <td className="p-4 font-medium">{r.patients?.name}</td>
                    <td className="p-4 text-slate-500">{r.medical_issue_date ? format(parseISO(r.medical_issue_date), 'dd MMM yyyy') : '-'}</td>
                    <td className="p-4 text-slate-500">{r.fitness_issue_date ? format(parseISO(r.fitness_issue_date), 'dd MMM yyyy') : '-'}</td>
                    <td className="p-4 font-mono font-bold text-emerald-600">{r.no_of_days}</td>
                    <td className="p-4 font-bold text-slate-900 tracking-tighter">₹{r.fee_amount || 0}</td>
                    <td className="p-4 text-slate-500 font-medium">{doctorName}</td>
                    <td className="p-4 text-slate-400 italic">
                      {(hospitalName || 'Hospital').slice(0, 20)}...
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 italic">No records found for the selected filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Certificate Preview</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{formData.certNumber} • {formData.patientName}</p>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={printLayout} className="p-3 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-all font-bold text-xs flex items-center gap-2">
                    <Printer size={18}/> Print
                  </button>
                  <button onClick={downloadPDF} className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-bold text-xs flex items-center gap-2">
                    <FileText size={18}/> PDF
                  </button>
                  <button onClick={() => setIsPreviewModalOpen(false)} className="p-3 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all">
                    <X size={20}/>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-slate-50 flex justify-center">
                 <div 
                    className="bg-white shadow-xl border border-slate-200"
                    style={{ 
                      width: '210mm', 
                      minHeight: '297mm', 
                      flexShrink: 0,
                      color: '#000'
                    }}
                  >
                    {[0, 1].map((i) => (
                      <CertificateBody key={i} isOfficeCopy={i === 0} />
                    ))}
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
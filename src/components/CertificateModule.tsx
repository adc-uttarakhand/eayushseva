import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileBadge, Printer, X, Save, Loader2, CheckCircle, FileText, UserCheck, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { format, parseISO, differenceInDays } from 'date-fns';
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

export default function CertificateModule({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState<'issue' | 'records' | 'logs'>('issue');
  const [certType, setCertType] = useState<'medical' | 'fitness'>('medical');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientVisits, setPatientVisits] = useState<any[]>([]);
  const [selectedVisits, setSelectedVisits] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const printLayout = async () => {
    if (!previewRef.current) return;
    const element = previewRef.current;
    
    const opt = {
      margin: 0,
      filename: `certificate_${formData.certNumber || 'new'}.pdf`,
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
            clonedElement.style.transform = 'scale(1)';
            clonedElement.style.width = '210mm';
            clonedElement.style.minHeight = '297mm';
            clonedElement.style.padding = '8mm';
          }
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
  const [feeCollected, setFeeCollected] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
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

  const doctorName = currentStaff?.full_name || session?.name || session?.full_name || session?.user?.user_metadata?.full_name || 'Medical Officer';
  const doctorRole = currentStaff?.role || session?.staffRole || session?.role || '';

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
    const { data } = await supabase
      .from('patient_certificates')
      .select('*, patients(name, age, gender)')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });
    if (data) setRecords(data);
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
      setActiveTab('records');
    } else toast.error(error.message);
    setLoading(false);
  };

  const issueFitness = async (record: any) => {
    const fitDate = prompt("Enter Fitness Date (YYYY-MM-DD):", format(new Date(), 'yyyy-MM-dd'));
    if (!fitDate) return;

    const { error } = await supabase
      .from('patient_certificates')
      .update({ 
        certificate_type: 'Fitness',
        fitness_date: fitDate,
        fitness_issue_date: new Date().toISOString()
      })
      .eq('id', record.id);

    if (!error) {
      toast.success('Fitness Issued');
      fetchRecords();
    }
  };

  const printCert = (item: any) => {
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
    setActiveTab('issue');
    toast.success('Record loaded into Preview for printing');
  };

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
                id="certificate-a4-preview" 
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
                  <div key={i} className={`relative p-[15mm] h-[148.5mm] flex flex-col ${i === 0 ? 'border-b-2 border-dotted border-slate-300' : ''}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-left">
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">
                          {certType === 'medical' ? 'MEDICAL CERTIFICATE' : 'FITNESS CERTIFICATE'}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-500">Number: {formData.certNumber || '............'}</p>
                      </div>
                      <span className="text-[8px] border border-slate-300 px-2 py-1 rounded text-slate-400 font-bold uppercase tracking-widest">
                        {i === 0 ? 'OFFICE COPY' : 'PATIENT COPY'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px] font-medium mb-6">
                      <p>Signature of Applicant: .......................................</p>
                      <p>Identification Mark: <span className="underline font-bold">{formData.idMark || '....................'}</span></p>
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

                    <div className="mt-auto pt-8 flex justify-between items-end">
                      <div className="text-[10px] space-y-1">
                        <p>Place: <span className="font-bold underline">{session?.activeHospitalId || 'Hospital'}</span></p>
                        <p>Date: <span className="font-bold underline">{formData.issueDate ? format(parseISO(formData.issueDate), 'dd-MM-yyyy') : '..........'}</span></p>
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

            <button 
              onClick={printLayout} 
              disabled={loading || !feeCollected}
              className="mt-6 w-full bg-emerald-600 text-white p-5 rounded-[2rem] flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Printer size={20}/>}
              Confirm & Generate High-Res PDF
            </button>
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
                    onChange={e => setFormData({...formData, patientName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Age</label>
                    <input 
                      className="w-full p-3 bg-slate-50 border rounded-xl text-sm" 
                      placeholder="Age" 
                      value={formData.patientAge} 
                      onChange={e => setFormData({...formData, patientAge: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Gender</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                      value={formData.patientGender}
                      onChange={e => setFormData({...formData, patientGender: e.target.value})}
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
                <input className="w-full p-3 bg-slate-50 border rounded-xl text-sm" placeholder="Father's Name" value={formData.fathersName} onChange={e => setFormData({...formData, fathersName: e.target.value})}/>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Full Address</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl text-sm" placeholder="Full Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}/>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Start Date</label>
                <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">End Date</label>
                <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}/>
              </div>

              <div className="col-span-2 flex justify-end px-2">
                {formData.startDate && formData.endDate && (
                  <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    Total Duration: {differenceInDays(parseISO(formData.endDate), parseISO(formData.startDate)) + 1} Days (Inclusive)
                  </span>
                )}
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Diagnosis / Disease</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl text-sm" placeholder="Diagnosis / Disease" value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})}/>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">Identification Mark</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl text-sm" placeholder="Identification Mark" value={formData.idMark} onChange={e => setFormData({...formData, idMark: e.target.value})}/>
              </div>

              <div className="col-span-2 pt-2 border-t">
                <label className="text-[10px] font-bold text-emerald-600 block mb-1 ml-1 uppercase">Issue Date</label>
                <input 
                  type="date" 
                  className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-800" 
                  value={formData.issueDate} 
                  onChange={e => setFormData({...formData, issueDate: e.target.value})}
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
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="p-5">Cert No / Patient</th>
                <th className="p-5">Type</th>
                <th className="p-5">Period</th>
                <th className="p-5">Days</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map(r => (
                <tr key={r.id} className="text-sm">
                  <td className="p-5">
                    <p className="font-bold">{r.certificate_number}</p>
                    <p className="text-[10px] text-slate-500">{r.patients?.name}</p>
                  </td>
                  <td className="p-5">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${r.certificate_type === 'Medical' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.certificate_type}</span>
                  </td>
                  <td className="p-5 text-xs text-slate-600">{r.start_date} to {r.end_date}</td>
                  <td className="p-5 text-xs font-mono font-bold text-emerald-600">{r.no_of_days} Days</td>
                  <td className="p-5 text-right flex justify-end gap-2">
                    {r.certificate_type === 'Medical' && (
                      <button onClick={() => issueFitness(r)} className="p-2 bg-blue-50 text-blue-600 rounded-lg" title="Issue Fitness"><UserCheck size={18}/></button>
                    )}
                    <button onClick={() => printCert(r)} className="p-2 bg-slate-50 text-slate-600 rounded-lg"><Printer size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-[2rem] border shadow-sm p-6 space-y-4">
          <input className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm" placeholder="Search by Cert No or Patient Name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-4">Serial</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Medical Issue</th>
                  <th className="p-4">Fitness Issue</th>
                  <th className="p-4">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.filter(r => r.certificate_number?.toLowerCase().includes(searchQuery.toLowerCase()) || r.patients?.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                  <tr key={r.id} className="text-xs">
                    <td className="p-4 font-bold">{r.certificate_number}</td>
                    <td className="p-4">{r.patients?.name}</td>
                    <td className="p-4">{r.medical_issue_date ? format(parseISO(r.medical_issue_date), 'dd MMM yyyy') : '-'}</td>
                    <td className="p-4">{r.fitness_issue_date ? format(parseISO(r.fitness_issue_date), 'dd MMM yyyy') : '-'}</td>
                    <td className="p-4">{r.no_of_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
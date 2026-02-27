import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, History, User, Calendar, Hash, FileText, Save, Loader2, Languages, CheckCircle, Printer, Download, MessageCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  revisit_count?: number;
  is_new?: boolean;
  centralized_serial?: string;
  status?: string;
  consultation_mode?: string;
  assigned_doctor_id?: string;
  queue_time?: string;
}

interface Staff {
  id: string;
  full_name: string;
  role: string;
  hospital_id: string;
}

interface EParchiProps {
  hospitalId: string;
  hospitalName?: string;
  district?: string;
  hospitalType?: string;
  regionIndicator?: string;
  session?: any;
}

export default function EParchi({ hospitalId, hospitalName, district, hospitalType, regionIndicator, session }: EParchiProps) {
  const userRole = session?.role;
  const staffRole = session?.staffRole;
  const isHospital = userRole === 'HOSPITAL';
  const isIncharge = session?.isIncharge;
  const isSMO = staffRole === 'Senior Medical Officer';
  const isMO = staffRole === 'Medical Officer';
  const isReceptionist = staffRole === 'Receptionist' || staffRole === 'Pharmacist' || staffRole === 'Nurse' || (!isIncharge && !isSMO && !isMO);

  const canRegister = isHospital || isIncharge || isSMO || isMO || isReceptionist;
  const canConsult = !isHospital && (isIncharge || isSMO || isMO);

  const [activeTab, setActiveTab] = useState<'registration' | 'queue'>(canRegister ? 'registration' : 'queue');
  const [isNew, setIsNew] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'serial' | 'mobile' | 'aadhar'>('name');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientHistory, setPatientHistory] = useState<Patient[]>([]);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  const [availableDoctors, setAvailableDoctors] = useState<Staff[]>([]);
  const [queue, setQueue] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '',
    age: '',
    gender: 'Male',
    mobile: '',
    aadhar: '',
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
    centralized_serial: '',
    assigned_doctor_id: '',
  });

  const [globalSerial, setGlobalSerial] = useState('');
  const [hospitalYearlySerial, setHospitalYearlySerial] = useState('');
  const [dailyOpdNumber, setDailyOpdNumber] = useState('');
  const [revisitCount, setRevisitCount] = useState<number>(0);

  useEffect(() => {
    if (activeTab === 'registration') {
      generateSerials();
      fetchDoctors();
    } else if (activeTab === 'queue') {
      fetchQueue();
    }
  }, [hospitalId, activeTab]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name, role, hospital_id')
        .eq('hospital_id', hospitalId)
        .in('role', ['Senior Medical Officer', 'Medical Officer']);

      if (error) throw error;
      setAvailableDoctors(data || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  const fetchQueue = async () => {
    try {
      let query = supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('status', 'Waiting')
        .order('queue_time', { ascending: true });

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
      const fy = month >= 3 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
      
      const { count: globalCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      const { count: hospitalCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId);

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
      setHospitalYearlySerial(`H-${nextHospital.toString().padStart(2, '0')}/${fy}`);
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

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      let query = supabase.from('patients').select('*');
      
      if (searchType === 'name') query = query.ilike('name', `%${searchQuery}%`);
      if (searchType === 'serial') query = query.eq('global_serial', searchQuery);
      if (searchType === 'mobile') query = query.eq('mobile', searchQuery);
      if (searchType === 'aadhar') query = query.eq('aadhar', searchQuery);

      const { data, error } = await query;
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectPatient = async (patient: Patient) => {
    const lastVisit = new Date(patient.created_at);
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    
    const history = await fetchPatientHistory(patient.aadhar, patient.mobile);
    const visitCount = history.length;

    if (diffDays <= 15) {
      setFormData({ ...patient, centralized_serial: patient.centralized_serial || '', assigned_doctor_id: '' });
      setGlobalSerial(patient.global_serial);
      setHospitalYearlySerial(patient.hospital_yearly_serial);
      
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
      setRevisitCount(visitCount);
      setIsNew(false);
    } else {
      alert('Patient last visit was more than 15 days ago. They will be registered as a New Patient, but personal details have been auto-filled.');
      setFormData({
        ...patient,
        complaints: '',
        diagnosis: '',
        prescription: '',
        centralized_serial: '',
        assigned_doctor_id: '',
      });
      setRevisitCount(visitCount);
      generateSerials();
      setIsNew(true);
    }
    setPatients([]);
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assigned_doctor_id) {
      alert('Please select a doctor for consultation.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        global_serial: globalSerial,
        hospital_yearly_serial: hospitalYearlySerial,
        daily_opd_number: dailyOpdNumber,
        hospital_id: hospitalId,
        revisit_count: revisitCount,
        is_new: isNew,
        created_at: new Date().toISOString(),
        status: 'Waiting',
        consultation_mode: 'Online',
        queue_time: new Date().toISOString(),
      };

      const { error } = await supabase.from('patients').insert([payload]);
      if (error) throw error;
      
      alert('Patient registered and sent for consultation successfully!');
      setFormData({
        name: '', age: '', gender: 'Male', mobile: '', aadhar: '',
        complaints: '', diagnosis: '', history: '', nadi: '', prakruti: '',
        mutra: '', mala: '', jivha: '', netra: '', nidra: '', agni: '',
        ahar_shakti: '', satva: '', vyayam_shakti: '', investigations: '', prescription: '', centralized_serial: '', assigned_doctor_id: ''
      });
      setPatientHistory([]);
      generateSerials();
      setIsNew(true);
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving patient data');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectQueuePatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(patient);
    await fetchPatientHistory(patient.aadhar, patient.mobile);
  };

  const handleConsultationComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient?.id) return;
    setSaving(true);
    try {
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
        prescription: formData.prescription,
        status: 'Completed'
      };

      const { error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', selectedPatient.id);

      if (error) throw error;
      
      alert('Consultation Completed!');
      setSelectedPatient({ ...selectedPatient, ...payload });
      fetchQueue();
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
      save: 'Send for Online Consultation',
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

  const cur = t[language];

  const noFeeHospitalTypes = [
    'AYUSH Wing -CHC',
    'AYUSH Wing- PHC',
    'AYUSH Wing at District Hospital',
    'MOCH- CHC',
    'MOCH - PHC'
  ];
  const isNoFeeHospital = hospitalType && noFeeHospitalTypes.some(t => t.toLowerCase().replace(/\s+/g, '') === hospitalType.toLowerCase().replace(/\s+/g, ''));

  let feeAmount = 0;
  if (!isNoFeeHospital && isNew) {
    feeAmount = regionIndicator?.toLowerCase() === 'urban' ? 10 : 5;
  }

  const getAssignedDoctorName = (doctorId?: string) => {
    if (!doctorId) return '---';
    const doc = availableDoctors.find(d => d.id === doctorId);
    return doc ? `${doc.full_name} (${doc.role})` : '---';
  };

  const renderA4Preview = (patientData: Partial<Patient>) => {
    const doctorName = getAssignedDoctorName(patientData.assigned_doctor_id);
    return (
    <div className="bg-white border border-gray-200 shadow-2xl rounded-lg overflow-hidden aspect-[1/1.414] w-[400px] flex flex-col relative text-[10px] p-[5%] print:shadow-none print:w-full print:h-screen print:border-none print:p-0">
      <div className="w-full h-full flex flex-col border border-slate-900">
        {/* 5% Hospital Details */}
        <div className="h-[7%] flex flex-col items-center justify-center border-b-2 border-slate-900 bg-slate-50 relative">
          <h3 className="text-[11px] font-bold uppercase leading-none">{hospitalName || 'AYUSH HEALTH CENTRE'}</h3>
          <p className="text-[7px] font-medium uppercase leading-none mt-0.5">{hospitalType} • {district}</p>
          <div className="absolute top-2 right-2 border border-slate-900 px-1.5 py-0.5 rounded text-[6px] font-bold">
            {isNoFeeHospital ? (
              `Centralized No: ${patientData.centralized_serial || '---'}`
            ) : (
              `Fee: ₹${feeAmount.toString().padStart(2, '0')}`
            )}
          </div>
        </div>

        {/* 5% Date, Visit Details */}
        <div className="h-[5%] flex justify-between items-center px-3 border-b border-gray-200 text-[7px] bg-white">
          <div className="flex gap-3">
            <p><span className="font-bold">Date:</span> {new Date(patientData.created_at || new Date()).toLocaleDateString()}</p>
            <p><span className="font-bold">Global:</span> {patientData.global_serial || globalSerial}</p>
            <p><span className="font-bold">Yearly:</span> {patientData.hospital_yearly_serial || hospitalYearlySerial}</p>
            <p><span className="font-bold">Daily OPD:</span> {patientData.daily_opd_number || dailyOpdNumber}</p>
          </div>
          <div className="flex gap-3">
            <p><span className="font-bold">Type:</span> {patientData.is_new ? 'New' : 'Revisit'}</p>
            <p><span className="font-bold">Revisit:</span> {(patientData.revisit_count || revisitCount).toString().padStart(2, '0')}</p>
          </div>
        </div>

        {/* 10% Patient Personal Details */}
        <div className="h-[8%] px-3 py-1.5 border-b border-gray-200 flex flex-col justify-center bg-white">
          <p className="text-[7px] font-bold uppercase mb-1 text-emerald-700">Patient Details</p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[8px]">
            <p><span className="font-bold text-slate-500">Name:</span> {patientData.name || '---'}</p>
            <p><span className="font-bold text-slate-500">Age/Sex:</span> {patientData.age || '--'} / {patientData.gender?.charAt(0)}</p>
            <p><span className="font-bold text-slate-500">Mobile:</span> {patientData.mobile || '---'}</p>
            <p className="col-span-3"><span className="font-bold text-slate-500">Aadhar:</span> {patientData.aadhar || '---'}</p>
          </div>
        </div>

        {/* 10% Clinical Assessment */}
        <div className="h-[15%] px-3 py-1.5 border-b-2 border-slate-900 flex flex-col justify-center bg-white">
          <p className="text-[7px] font-bold uppercase mb-1 text-emerald-700">Clinical Assessment</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 h-full overflow-hidden">
            <div className="flex flex-col">
              <p className="text-[7px] font-bold text-slate-500">Complaints:</p>
              <p className="text-[7px] line-clamp-2 italic leading-tight">{patientData.complaints || '---'}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[7px] font-bold text-slate-500">Diagnosis:</p>
              <p className="text-[7px] line-clamp-2 font-bold leading-tight">{patientData.diagnosis || '---'}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[7px] font-bold text-slate-500">History:</p>
              <p className="text-[7px] line-clamp-2 italic leading-tight">{patientData.history || '---'}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[7px] font-bold text-slate-500">Investigations:</p>
              <p className="text-[7px] line-clamp-2 italic leading-tight">{patientData.investigations || '---'}</p>
            </div>
          </div>
        </div>

        {/* 70% Remaining Page */}
        <div className="h-[65%] flex flex-row bg-white">
          {/* Left Side: Ayurvedic Parameters (approx 25% width) */}
          <div className="w-[25%] border-r-2 border-slate-900 p-2 flex flex-col gap-1.5 overflow-hidden bg-neutral-50">
            <p className="text-[7px] font-bold uppercase text-emerald-700 mb-1 border-b border-slate-200 pb-1">Parameters</p>
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
              <div key={field.id} className="text-[7px] leading-tight">
                <span className="font-bold text-slate-600">{field.label}:</span> 
                <span className="block truncate text-slate-900">{(patientData as any)[field.id] || '-'}</span>
              </div>
            ))}
          </div>

          {/* Right Side: Prescription (approx 75% width) */}
          <div className="w-[75%] p-3 flex flex-col relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-serif font-bold italic">Rx</span>
              <p className="text-[8px] font-bold uppercase text-emerald-700">Prescription</p>
            </div>
            
            <p className="text-[9px] font-mono whitespace-pre-wrap flex-1 overflow-hidden leading-relaxed">
              {patientData.prescription || '---'}
            </p>
            
            {/* History Section if old patient */}
            {patientHistory.length > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-gray-300 max-h-[30%] overflow-hidden">
                <p className="text-[7px] font-bold uppercase mb-1 text-emerald-700">Previous Visits</p>
                <div className="space-y-1">
                  {patientHistory.slice(0, 2).map((h, i) => (
                    <div key={i} className="bg-neutral-50 p-1.5 rounded border border-gray-100">
                      <p className="text-[6px] font-bold text-slate-400 mb-0.5">{new Date(h.created_at).toLocaleDateString()}</p>
                      <p className="text-[7px] font-medium text-slate-700 line-clamp-2 leading-tight">{h.prescription}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="absolute bottom-3 right-3 text-center">
              <div className="w-32 h-8 border-b border-slate-400 mb-1 flex items-end justify-center pb-1">
                <span className="text-[8px] font-bold text-slate-800">{doctorName !== '---' ? doctorName : ''}</span>
              </div>
              <p className="text-[6px] font-bold uppercase tracking-wider text-slate-500">Medical Officer</p>
            </div>
            
            <div className="absolute bottom-2 left-3 text-[5px] text-slate-300 uppercase tracking-widest">
              Generated via e-AYUSH Seva
            </div>
          </div>
        </div>
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

      <div className="flex gap-4 mb-8 print:hidden">
        {canRegister && (
          <button 
            onClick={() => { setActiveTab('registration'); setSelectedPatient(null); }} 
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'registration' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 hover:bg-neutral-50'}`}
          >
            Registration
          </button>
        )}
        {canConsult && (
          <button 
            onClick={() => { setActiveTab('queue'); setSelectedPatient(null); }} 
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'queue' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 hover:bg-neutral-50'}`}
          >
            Consultation Queue
          </button>
        )}
      </div>

      {activeTab === 'registration' && (
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
                  <select 
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="bg-neutral-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="name">Name</option>
                    <option value="serial">Global Serial</option>
                    <option value="mobile">Mobile</option>
                    <option value="aadhar">Aadhar</option>
                  </select>
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
                    onClick={handleSearch}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
                  </button>
                </div>

                {patients.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {patients.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => selectPatient(p)}
                        className="w-full flex justify-between items-center p-4 hover:bg-neutral-50 rounded-xl border border-transparent hover:border-gray-100 transition-all text-left"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.global_serial} • {p.mobile}</p>
                        </div>
                        <Plus size={16} className="text-emerald-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleRegistrationSubmit} className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-neutral-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Calendar size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{cur.date}</span>
                  </div>
                  <p className="font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Hash size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{cur.globalSerial}</span>
                  </div>
                  <p className="font-bold text-emerald-600">{globalSerial}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Hash size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{cur.hospitalSerial}</span>
                  </div>
                  <p className="font-bold text-emerald-600">{hospitalYearlySerial}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Hash size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{cur.dailyOpd}</span>
                  </div>
                  <p className="font-bold text-emerald-600">{dailyOpdNumber}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <History size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{cur.revisit}</span>
                  </div>
                  <p className="font-bold text-blue-600">{revisitCount.toString().padStart(2, '0')}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <User className="text-emerald-600" size={20} />
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{cur.name}</label>
                    <input 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{cur.age}</label>
                    <input 
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{cur.gender}</label>
                    <select 
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{cur.mobile}</label>
                    <input 
                      value={formData.mobile}
                      onChange={e => setFormData({...formData, mobile: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{cur.aadhar}</label>
                    <input 
                      value={formData.aadhar}
                      onChange={e => setFormData({...formData, aadhar: e.target.value})}
                      className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  {isNoFeeHospital && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Centralized Serial No.</label>
                      <input 
                        value={formData.centralized_serial || ''}
                        onChange={e => setFormData({...formData, centralized_serial: e.target.value})}
                        className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
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
                    {availableDoctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.full_name} ({doc.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-emerald-600 text-white font-bold py-6 rounded-[2.5rem] text-xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                {cur.save}
              </button>
            </form>
          </div>
          
          {/* Right Side: A4 Preview */}
          <div className="hidden lg:block w-[400px]">
            <div className="sticky top-24 space-y-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 px-4">
                <FileText className="text-emerald-600" size={20} />
                {cur.preview}
              </h2>
              {renderA4Preview(formData)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="space-y-8">
          {!selectedPatient ? (
            <>
              <h2 className="text-2xl font-bold text-slate-900 print:hidden">Consultation Queue</h2>
              {queue.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl text-center text-slate-500 border border-gray-100 print:hidden">
                  No patients waiting in the queue.
                </div>
              ) : (
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
                        <textarea 
                          value={formData.diagnosis || ''}
                          onChange={e => setFormData({...formData, diagnosis: e.target.value})}
                          className="w-full bg-neutral-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">{cur.history}</label>
                        <textarea 
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
                    <h2 className="text-xl font-bold text-slate-900 mb-6">{cur.prescription}</h2>
                    <textarea 
                      value={formData.prescription || ''}
                      onChange={e => setFormData({...formData, prescription: e.target.value})}
                      placeholder="Write prescription details here..."
                      className="w-full bg-neutral-50 border border-gray-100 rounded-[2.5rem] py-6 px-8 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[300px] font-mono text-sm leading-relaxed"
                    />
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
              <div className="hidden lg:block w-[400px]">
                <div className="sticky top-24 space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 px-4">
                    <FileText className="text-emerald-600" size={20} />
                    {cur.preview}
                  </h2>
                  {renderA4Preview({ ...selectedPatient, ...formData })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

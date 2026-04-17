import React, { useState, useEffect, useRef } from 'react';
import { User, Activity, Plus, Save, UserCircle2, X, CheckCircle, Camera, Loader2, Upload, Eye, EyeOff, Shield, Building2, MapPin, Calendar, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';
import HospitalChangeModal from './HospitalChangeModal';
import { toast } from 'react-hot-toast';

const UTTARAKHAND_DISTRICTS = [
  "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
  "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", 
  "Udham Singh Nagar", "Uttarkashi", "Outside Uttarakhand"
];

let _idCounter = 0;
const generateId = () => `gen_${Date.now()}_${++_idCounter}_${Math.random().toString(36).slice(2)}`;

// Local Hospital Search Input Component
const HospitalSearchInput = ({ value, onChange, hospitals, placeholder = "Search hospital...", className = "", isTextarea = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  const filteredHospitals = (hospitals || [])
    .filter((h: any) => (h.facility_name || '').toLowerCase().includes((query || '').toLowerCase()))
    .slice(0, 10);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {isTextarea ? (
        <textarea
          rows={2}
          value={query || ''}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className={`w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none leading-tight ${className}`}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={query || ''}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className={`w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${className}`}
          placeholder={placeholder}
        />
      )}
      {isOpen && query && filteredHospitals.length > 0 && (
        <div className="absolute z-[100] w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto">
          {filteredHospitals.map((h: any) => (
            <button
              key={h.hospital_id}
              type="button"
              onClick={() => { onChange(h.facility_name); setQuery(h.facility_name); setIsOpen(false); }}
              className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-sm font-bold text-slate-700 border-b border-gray-50 last:border-0"
            >
              {h.facility_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface ProfilerProps {
  staffId: string | number;
  userRole: string;
  isIncharge?: boolean;
  hospitalName?: string;
  hospitals: any[];
  activeSubTab: 'basic' | 'service' | 'trainings';
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function Profiler({ staffId, userRole, isIncharge, hospitalName, hospitals, activeSubTab, onDirtyChange }: ProfilerProps) {
  const [loading, setLoading] = useState(true);
  const [initialProfile, setInitialProfile] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isActualHospitalChangeModalOpen, setIsActualHospitalChangeModalOpen] = useState(false);
  const [hospitalToDelete, setHospitalToDelete] = useState<any>(null);
  const [isSaveSuccessModalOpen, setIsSaveSuccessModalOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    fullName: '', designation: '', empId: '', mobile: '', password: '', fatherName: '',
    photograph: '', email: '', employmentClass: 'Class II', employmentType: 'Permanent' as 'Contractual' | 'Permanent' | 'Outsourced',
    gender: 'Male', dob: '', currentPostingJoiningDate: '', presentDistrict: '', bloodGroup: '',
    permanentAddress: '', currentResidentialAddress: '', system: '', hospitalConnectedName: '',
    hospitalConnectedId: '', bcpRegistrationNo: '', specialization: 'General', qualification: '',
    clinicalExperienceSince: '', keywords: '', trainings: [{ id: generateId(), title: '', year: '' }],
    dateOfFirstAppointment: '', dateOfFirstJoiningDepartment: '', firstPostingPlace: '', homeDistrict: '',
    longLeaves: [{ id: generateId(), fromDate: '', toDate: '', leaveType: '', totalDays: 0 }],
    postings: [{ id: generateId(), hospitalName: '', hospital_id: '', fromDate: '', toDate: '', status: 'Sugam', above7000: 'No', days: 0 }],
    attachments: [{ id: generateId(), hospital_id: '', hospital: '', from: '', to: '', status: 'Sugam', above7000: 'No', days: 0 }],
    mainPostingName: '', mainPostingId: '', attachedHospitals: [] as any[],
    is_verified: false, last_verified_on: '', verified_by_admin: '', last_edited_on: ''
  });

  // Utility Functions
  const maskDate = (value: string) => {
    const clean = value.replace(/[^a-zA-Z0-9]/g, '');
    let result = '';
    const day = clean.slice(0, 2).replace(/\D/g, '');
    result += day;
    if (clean.length > 2) {
      result += '-';
      let month = clean.slice(2, 5).replace(/[0-9]/g, '');
      if (month.length > 0) month = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
      result += month;
      if (clean.length > 5) {
        result += '-';
        const year = clean.slice(5, 9).replace(/\D/g, '');
        result += year;
      }
    }
    return result;
  };

  const parseDateStr = (d: string) => {
    if (!d) return new Date(NaN);
    if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(d)) {
      const [day, monthStr, year] = d.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
      if (monthIndex !== -1) return new Date(parseInt(year), monthIndex, parseInt(day));
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [day, month, year] = d.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return new Date(NaN);
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDaysToYMD = (totalDays: number) => {
    const years = Math.floor(totalDays / 365);
    const remainingDaysAfterYears = totalDays % 365;
    const months = Math.floor(remainingDaysAfterYears / 30);
    const days = remainingDaysAfterYears % 30;
    return `${years}Y ${months}M ${days}D`;
  };

  const calculateServiceDays = (postings: any[], attachments: any[] = [], longLeaves: any[] = [], currentJoiningDate: string = '', currentPostingType: string = 'Sugam', currentPostingAbove7000: string = 'No') => {
    let sugam = 0, durgamNoAbove7000 = 0, durgamAbove7000 = 0;
    let attachmentSugam = 0, attachmentDurgamNoAbove7000 = 0, attachmentDurgamAbove7000 = 0;
    let totalLeaves = 0;

    const getDays = (startStr: string, endStr: string) => {
      const start = parseDateStr(startStr);
      const end = parseDateStr(endStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    };

    const overlaps = (s1: Date, e1: Date, s2: Date, e2: Date) => s1 <= e2 && s2 <= e1;

    const allPostings = [...postings];
    if (currentJoiningDate) {
      const today = new Date();
      const todayStr = `${today.getDate().toString().padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][today.getMonth()]}-${today.getFullYear()}`;
      allPostings.push({ isAuto: true, fromDate: currentJoiningDate, toDate: todayStr, status: currentPostingType, above7000: currentPostingAbove7000 });
    }

    allPostings.forEach(p => {
      const start = parseDateStr(p.fromDate);
      const end = parseDateStr(p.toDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      let days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      let pSugam = 0, pDurgamNoAbove7000 = 0, pDurgamAbove7000 = 0;

      if (p.status === 'Sugam') pSugam = days;
      else {
        if (p.above7000 === 'Yes') pDurgamAbove7000 = days;
        else pDurgamNoAbove7000 = days;
      }

      longLeaves.forEach(l => {
        if (l.totalDays > 30) {
          const lStart = parseDateStr(l.fromDate);
          const lEnd = parseDateStr(l.toDate);
          if (overlaps(start, end, lStart, lEnd)) {
            const overlapStart = new Date(Math.max(start.getTime(), lStart.getTime()));
            const overlapEnd = new Date(Math.min(end.getTime(), lEnd.getTime()));
            const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (overlapDays > 0) {
              totalLeaves += overlapDays;
              if (p.status !== 'Sugam') {
                if (p.above7000 === 'Yes') pDurgamAbove7000 -= overlapDays;
                else pDurgamNoAbove7000 -= overlapDays;
                pSugam += overlapDays;
              }
            }
          }
        }
      });

      attachments.forEach(a => {
        const aStart = parseDateStr(a.from);
        const aEnd = parseDateStr(a.to);
        if (overlaps(start, end, aStart, aEnd)) {
          const overlapStart = new Date(Math.max(start.getTime(), aStart.getTime()));
          const overlapEnd = new Date(Math.min(end.getTime(), aEnd.getTime()));
          const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          if (overlapDays > 0) {
            const aAbove7000 = a.above7000 === 'Yes';
            let pCategory = p.status === 'Sugam' ? 'Sugam' : (p.above7000 === 'Yes' ? 'DurgamAbove7000' : 'DurgamNoAbove7000');
            let aCategory = a.status === 'Sugam' ? 'Sugam' : (aAbove7000 ? 'DurgamAbove7000' : 'DurgamNoAbove7000');
            if (pCategory === 'Sugam') pSugam -= overlapDays;
            else if (pCategory === 'DurgamAbove7000') pDurgamAbove7000 -= overlapDays;
            else pDurgamNoAbove7000 -= overlapDays;
            if (aCategory === 'Sugam') attachmentSugam += overlapDays;
            else if (aCategory === 'DurgamAbove7000') attachmentDurgamAbove7000 += overlapDays;
            else attachmentDurgamNoAbove7000 += overlapDays;
          }
        }
      });

      sugam += pSugam;
      durgamNoAbove7000 += pDurgamNoAbove7000;
      durgamAbove7000 += pDurgamAbove7000;
    });

    return { totalSugam: sugam + attachmentSugam, totalDurgam: durgamNoAbove7000 + attachmentDurgamNoAbove7000, totalDurgamAbove7000: durgamAbove7000 + attachmentDurgamAbove7000, attachmentSugam, attachmentDurgam: attachmentDurgamNoAbove7000, attachmentDurgamAbove7000, totalLeaves };
  };

  useEffect(() => {
    const fetchRoles = async () => {
      const { data } = await supabase.from('roles').select('role_name');
      if (data) setRoles(data.map(r => r.role_name));
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    if (initialProfile) {
      const dirty = JSON.stringify(profile) !== JSON.stringify(initialProfile);
      setIsDirty(dirty);
      if (onDirtyChange) onDirtyChange(dirty);
    }
  }, [profile, initialProfile]);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      if (!staffId) return;

      const formatDateForUI = (dateStr: string) => {
        if (!dateStr || dateStr === "") return "";
        if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(dateStr)) return dateStr;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [y, m, d] = dateStr.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${d}-${months[parseInt(m) - 1]}-${y}`;
        }
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
          const [d, m, y] = dateStr.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${d}-${months[parseInt(m) - 1]}-${y}`;
        }
        return dateStr;
      };

      const { data: staffData } = await supabase.from('staff').select('*').eq('id', staffId).maybeSingle();
      if (!staffData) { setLoading(false); return; }

      let hospitalInfo = null;
      if (staffData.hospital_id) {
        const { data: hData } = await supabase.from('hospitals').select('facility_name, system').eq('hospital_id', staffData.hospital_id).maybeSingle();
        hospitalInfo = hData;
      }

      const { data: docData } = await supabase.from('doctor_profiles').select('*').eq('staff_id', staffId).maybeSingle();

      const newProfile = {
        fullName: staffData.full_name || '',
        designation: staffData.role || staffData.designation || '',
        empId: staffData.employee_id || '',
        mobile: staffData.mobile_number || '',
        password: staffData.login_password || '',
        fatherName: staffData.father_name || '',
        photograph: staffData.photograph_url || '',
        email: staffData.email_id || '',
        employmentClass: staffData.employment_class || 'Class II',
        employmentType: staffData.employment_type || 'Permanent',
        gender: staffData.gender || 'Male',
        dob: formatDateForUI(staffData.dob || ''),
        currentPostingJoiningDate: formatDateForUI(staffData.current_posting_joining_date || ''),
        presentDistrict: staffData.present_district || '',
        bloodGroup: staffData.blood_group || '',
        permanentAddress: staffData.permanent_address || '',
        currentResidentialAddress: staffData.current_residential_address || '',
        system: hospitalInfo?.system || '',
        hospitalConnectedName: hospitalName || hospitalInfo?.facility_name || '',
        hospitalConnectedId: staffData.hospital_id || '',
        mainPostingName: hospitalInfo?.facility_name || '',
        mainPostingId: staffData.hospital_id || '',
        attachedHospitals: staffData.secondary_hospitals ? staffData.secondary_hospitals.map((h: any) => {
          const hosp = hospitals.find(hp => hp.hospital_id === h.hospital_id);
          return { id: h.hospital_id, name: hosp ? hosp.facility_name : h.hospital_id, assigned_modules: h.assigned_modules || [] };
        }) : [],
        bcpRegistrationNo: staffData.bcp_registration_no || '',
        specialization: docData?.specialization || 'General',
        qualification: docData?.highest_qualification || '',
        clinicalExperienceSince: docData?.clinical_experience_since || '',
        keywords: docData?.keywords || '',
        trainings: staffData.trainings && staffData.trainings.length > 0 ? staffData.trainings.map((t: any) => ({ ...t, id: generateId() })) : [{ id: generateId(), title: '', year: '' }],
        dateOfFirstAppointment: formatDateForUI(staffData.date_of_first_appointment || ''),
        dateOfFirstJoiningDepartment: formatDateForUI(staffData.first_joining_date || ''),
        firstPostingPlace: staffData.first_posting_place || '',
        homeDistrict: staffData.home_district || '',
        longLeaves: staffData.long_leaves && staffData.long_leaves.length > 0 ? staffData.long_leaves.map((l: any) => ({ ...l, id: generateId(), fromDate: formatDateForUI(l.fromDate), toDate: formatDateForUI(l.toDate) })) : [{ id: generateId(), fromDate: '', toDate: '', leaveType: '', totalDays: 0 }],
        postings: staffData.postings && staffData.postings.length > 0 ? staffData.postings.map((p: any) => {
          const latestHospital = hospitals.find(h => h.hospital_id === p.hospital_id);
          const start = parseDateStr(formatDateForUI(p.fromDate));
          const end = parseDateStr(formatDateForUI(p.toDate));
          const days = (!isNaN(start.getTime()) && !isNaN(end.getTime())) ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
          return { ...p, id: generateId(), hospitalName: latestHospital ? latestHospital.facility_name : p.hospitalName, fromDate: formatDateForUI(p.fromDate), toDate: formatDateForUI(p.toDate), above7000: p.above7000 || 'No', days: days > 0 ? days : 0 };
        }) : [{ id: generateId(), hospitalName: '', hospital_id: '', fromDate: '', toDate: '', status: 'Sugam', above7000: 'No', days: 0 }],
        attachments: staffData.attachments && staffData.attachments.length > 0 ? staffData.attachments.map((a: any) => {
          const latestHospital = hospitals.find(h => h.hospital_id === a.hospital_id);
          const start = parseDateStr(formatDateForUI(a.from));
          const end = parseDateStr(formatDateForUI(a.to));
          const days = (!isNaN(start.getTime()) && !isNaN(end.getTime())) ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
          return { ...a, id: generateId(), hospital_id: a.hospital_id || '', hospital: latestHospital ? latestHospital.facility_name : a.hospital, status: latestHospital ? (latestHospital.status || 'Sugam') : (a.status || 'Sugam'), above7000: latestHospital ? (latestHospital.above_7000_feet || 'No') : (a.above7000 || 'No'), from: formatDateForUI(a.from), to: formatDateForUI(a.to), days: days > 0 ? days : 0 };
        }) : [{ id: generateId(), hospital_id: '', hospital: '', from: '', to: '', status: 'Sugam', above7000: 'No', days: 0 }],
        is_verified: staffData.is_verified || false,
        last_verified_on: staffData.last_verified_on || '',
        verified_by_admin: staffData.verified_by_admin || '',
        last_edited_on: staffData.last_edited_on || ''
      };
      setProfile(newProfile);
      setInitialProfile(newProfile);
      setIsDirty(false);
      if (onDirtyChange) onDirtyChange(false);
      setLoading(false);
    };
    fetchProfileData();
  }, [staffId, hospitals]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const options = { maxSizeMB: 0.05, maxWidthOrHeight: 800, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const fileExt = file.name.split('.').pop();
      const fileName = `${staffId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('staff-photos').upload(fileName, compressedFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('staff-photos').getPublicUrl(fileName);
      setProfile(prev => ({ ...prev, photograph: publicUrl }));
      alert('Photo uploaded successfully! / फोटो सफलतापूर्वक अपलोड हो गई!');
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const serviceDays = calculateServiceDays(profile.postings.slice(1), profile.attachments, profile.longLeaves, profile.postings[0]?.fromDate, profile.postings[0]?.status, profile.postings[0]?.above7000);

  const validatePostings = () => {
    const sortedPostings = [...profile.postings].sort((a, b) => parseDateStr(b.fromDate).getTime() - parseDateStr(a.fromDate).getTime());
    for (let i = 0; i < sortedPostings.length - 1; i++) {
      if (parseDateStr(sortedPostings[i].fromDate) <= parseDateStr(sortedPostings[i+1].toDate)) {
        alert('Overlapping dates found in Posting History.');
        return false;
      }
    }
    const deptStart = parseDateStr(profile.dateOfFirstJoiningDepartment);
    if (!isNaN(deptStart.getTime())) {
      for (const p of profile.postings) {
        if (parseDateStr(p.fromDate) < deptStart) { alert('Posting date cannot be earlier than Date of 1st Joining in Dept.'); return false; }
      }
    }
    if (sortedPostings.length > 0 && parseDateStr(sortedPostings[sortedPostings.length - 1].fromDate).getTime() !== deptStart.getTime()) {
      alert('Service history is incomplete. It must start from your first joining date.');
      return false;
    }
    return true;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSubTab === 'service') {
      if (!validatePostings()) return;
      if (profile.employmentType === 'Permanent' && (!profile.dateOfFirstJoiningDepartment || !profile.firstPostingPlace)) {
        alert('Please fill "Date of 1st Joining in Dept" and "First Posting Place" in Service Record Details.');
        return;
      }
    }
    if (activeSubTab === 'basic' && (!profile.dob || !profile.dateOfFirstJoiningDepartment || !profile.homeDistrict)) {
      alert('Please fill DOB, Joining Date, and Home District before saving.');
      return;
    }

    try {
      const formatDateForDB = (dateStr: string) => {
        if (!dateStr || dateStr === "") return null;
        if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(dateStr)) {
          const [d, mStr, y] = dateStr.split('-');
          const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].findIndex(month => month.toLowerCase() === mStr.toLowerCase()) + 1;
          return m > 0 ? `${y}-${m.toString().padStart(2, '0')}-${d}` : null;
        }
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) { const [d, m, y] = dateStr.split('-'); return `${y}-${m}-${d}`; }
        return dateStr;
      };

      const { error: staffError } = await supabase.from('staff').upsert({
        id: staffId, full_name: profile.fullName, mobile_number: profile.mobile, employee_id: profile.empId || null,
        login_password: profile.password, father_name: profile.fatherName, photograph_url: profile.photograph, email_id: profile.email,
        employment_class: profile.employmentClass, employment_type: profile.employmentType, gender: profile.gender,
        dob: formatDateForDB(profile.dob), current_posting_joining_date: formatDateForDB(profile.currentPostingJoiningDate),
        present_district: profile.presentDistrict, blood_group: profile.bloodGroup, permanent_address: profile.permanentAddress,
        current_residential_address: profile.currentResidentialAddress, role: profile.designation,
        date_of_first_appointment: formatDateForDB(profile.dateOfFirstAppointment), first_joining_date: formatDateForDB(profile.dateOfFirstJoiningDepartment),
        first_posting_place: profile.firstPostingPlace || '', home_district: profile.homeDistrict || null, bcp_registration_no: profile.bcpRegistrationNo,
        long_leaves: profile.longLeaves.map(l => ({ ...l, fromDate: formatDateForDB(l.fromDate), toDate: formatDateForDB(l.toDate) })),
        trainings: profile.trainings, postings: profile.postings.map(p => ({ ...p, fromDate: formatDateForDB(p.fromDate), toDate: formatDateForDB(p.toDate) })),
        attachments: profile.attachments.map(a => ({ ...a, from: formatDateForDB(a.from), to: formatDateForDB(a.to) })),
        secondary_hospitals: profile.attachedHospitals.map((h: any) => ({ hospital_id: h.id, assigned_modules: h.assigned_modules })),
        long_leaves_count: serviceDays.totalLeaves, attachment_sugam_days: serviceDays.attachmentSugam, attachment_durgam_days: serviceDays.attachmentDurgam,
        attachment_durgam_above_7000_days: serviceDays.attachmentDurgamAbove7000, total_sugam_days: serviceDays.totalSugam,
        total_durgam_below_7000_days: serviceDays.totalDurgam, total_durgam_above_7000_days: serviceDays.totalDurgamAbove7000,
        last_edited_on: new Date().toISOString(),
        is_verified: profile.is_verified && (profile.last_verified_on && new Date(new Date().toISOString()) <= new Date(profile.last_verified_on))
      }, { onConflict: 'id' });
      if (staffError) throw new Error(`Staff Table Error: ${staffError.message}`);

      const { error: docError } = await supabase.from('doctor_profiles').upsert({
        staff_id: staffId, specialization: profile.specialization, highest_qualification: profile.qualification,
        clinical_experience_since: profile.clinicalExperienceSince || null, keywords: profile.keywords
      }, { onConflict: 'staff_id' });
      if (docError) throw new Error(`Doctor Profiles Error: ${docError.message}`);

      setIsDirty(false);
      setInitialProfile(profile);
      if (onDirtyChange) onDirtyChange(false);
      setIsSaveSuccessModalOpen(true);
      setTimeout(() => setIsSaveSuccessModalOpen(false), 3000);
    } catch (err: any) { alert(`Failed to save: ${err.message}`); }
  };

  // State Updates (Trainings, Leaves, Postings, Attachments)
  const addTraining = () => setProfile(prev => ({ ...prev, trainings: [...prev.trainings, { id: generateId(), title: '', year: '' }] }));
  const removeTraining = (id: string) => setProfile(prev => ({ ...prev, trainings: prev.trainings.filter(t => t.id !== id) }));
  const updateTraining = (id: string, field: string, value: string) => setProfile(prev => ({ ...prev, trainings: prev.trainings.map(t => t.id === id ? { ...t, [field]: value } : t) }));

  const addLongLeave = () => setProfile(prev => ({ ...prev, longLeaves: [...prev.longLeaves, { id: generateId(), fromDate: '', toDate: '', leaveType: '', totalDays: 0 }] }));
  const removeLongLeave = (id: string) => setProfile(prev => ({ ...prev, longLeaves: prev.longLeaves.filter(l => l.id !== id) }));
  const updateLongLeave = (id: string, field: string, value: any) => setProfile(prev => {
    const newLeaves = prev.longLeaves.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: value };
        if (field === 'fromDate' || field === 'toDate') {
          const from = field === 'fromDate' ? value : l.fromDate;
          const to = field === 'toDate' ? value : l.toDate;
          if (from && to && /^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(from) && /^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(to)) {
            const d1 = parseDateStr(from), d2 = parseDateStr(to);
            const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            updated.totalDays = diffDays > 0 ? diffDays : 0;
          }
        }
        return updated;
      }
      return l;
    });
    return { ...prev, longLeaves: newLeaves };
  });

  const addPosting = () => setProfile(prev => {
    const newPosting = { id: generateId(), hospitalName: '', hospital_id: '', fromDate: '', toDate: '', status: 'Sugam', above7000: 'No', days: 0 };
    if (prev.postings.length > 0 && prev.postings[prev.postings.length - 1].fromDate) {
      const fromDate = parseDateStr(prev.postings[prev.postings.length - 1].fromDate);
      if (!isNaN(fromDate.getTime())) {
        const toDate = new Date(fromDate); toDate.setDate(toDate.getDate() - 1);
        newPosting.toDate = formatDate(toDate);
      }
    }
    return { ...prev, postings: [...prev.postings, newPosting] };
  });
  const removePosting = (id: string) => setProfile(prev => ({ ...prev, postings: prev.postings.filter(p => p.id !== id) }));
  const updatePosting = (id: string, field: string, value: string) => setProfile(prev => {
    let newPostings = prev.postings.map(p => p.id === id ? { ...p, [field]: value } : p);
    if (field === 'hospital_id') {
      newPostings = newPostings.map(p => {
        if (p.id === id) { const h = hospitals.find(h => h.hospital_id === p.hospital_id); return { ...p, status: h ? (h.status || 'Sugam') : p.status, above7000: h ? (h.above_7000_feet || 'No') : p.above7000 }; }
        return p;
      });
    }
    const updatedPostings = newPostings.map(p => {
      if (p.id === id && (field === 'fromDate' || field === 'toDate')) {
        const startStr = field === 'fromDate' ? value : p.fromDate, endStr = field === 'toDate' ? value : p.toDate;
        if (startStr && endStr) {
          const start = parseDateStr(startStr), end = parseDateStr(endStr);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) { const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1; return { ...p, days: days > 0 ? days : 0 }; }
        }
      }
      return p;
    });
    const sorted = [...updatedPostings].sort((a, b) => parseDateStr(b.fromDate).getTime() - parseDateStr(a.fromDate).getTime());
    const recalculatedPostings = updatedPostings.map(p => {
      const index = sorted.findIndex(s => s.id === p.id);
      let toDate = '';
      if (index === 0) {
        const start = parseDateStr(prev.currentPostingJoiningDate);
        if (!isNaN(start.getTime())) { const d = new Date(start); d.setDate(d.getDate() - 1); toDate = formatDate(d); }
      } else {
        const prevPosting = sorted[index-1];
        if (!prevPosting.fromDate) toDate = 'Pending';
        else { const start = parseDateStr(prevPosting.fromDate); if (!isNaN(start.getTime())) { const d = new Date(start); d.setDate(d.getDate() - 1); toDate = formatDate(d); } else toDate = 'Pending'; }
      }
      return { ...p, toDate: toDate || 'Pending' };
    });
    return { ...prev, postings: recalculatedPostings };
  });

  const addAttachment = () => setProfile(prev => ({ ...prev, attachments: [...prev.attachments, { id: generateId(), hospital_id: '', hospital: '', from: '', to: '', status: 'Sugam', above7000: 'No', days: 0 }] }));
  const removeAttachment = (id: string) => setProfile(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== id) }));
  const updateAttachment = (id: string, field: string, value: string) => setProfile(prev => {
    let newAttachments = prev.attachments.map(a => a.id === id ? { ...a, [field]: value } : a);
    if (field === 'hospital') {
      newAttachments = newAttachments.map(a => {
        if (a.id === id) { const h = hospitals.find(h => h.facility_name === a.hospital); return { ...a, hospital_id: h ? h.hospital_id : '', status: h ? (h.status || 'Sugam') : a.status, above7000: h ? ((h.region_indicator === 'Above 7000' || h.above_7000_feet === 'Yes') ? 'Yes' : 'No') : a.above7000 }; }
        return a;
      });
    }
    const updatedAttachments = newAttachments.map(a => {
      if (a.id === id && (field === 'from' || field === 'to')) {
        const startStr = field === 'from' ? value : a.from, endStr = field === 'to' ? value : a.to;
        if (startStr && endStr) {
          const start = parseDateStr(startStr), end = parseDateStr(endStr);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) { const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1; return { ...a, days: days > 0 ? days : 0 }; }
        }
      }
      return a;
    });
    return { ...prev, attachments: updatedAttachments };
  });

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;

  return (
    <form onSubmit={handleSaveProfile} className="space-y-6 w-full">
      {activeSubTab === 'basic' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><User className="text-emerald-600" size={20} /> Basic Info</h2>
            {isIncharge && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full"><Shield className="text-emerald-600" size={14} /><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Incharge, {hospitalName}</span></div>}
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Photograph (Passport Size)</label>
              <div className="flex gap-6 items-center bg-slate-50 p-6 rounded-3xl border border-gray-100">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center">
                    {profile.photograph ? <img src={profile.photograph} alt="Profile" className="w-full h-full object-cover" /> : <UserCircle2 size={48} className="text-slate-400" />}
                  </div>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700 transition-all group-hover:scale-110"><Camera size={16} /></button>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Upload Photo</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB. Will be auto-compressed to 50KB.</p>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="mt-3 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                    {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} {uploading ? 'Uploading...' : 'Select File'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Full Name</label>
              <input value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Role / Designation</label>
              <select value={profile.designation} onChange={e => setProfile({...profile, designation: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option value="">Select Role</option>
                {roles.map((role, index) => <option key={role + index} value={role}>{role}</option>)}
              </select>
              {!(isIncharge || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && <p className="text-[10px] text-slate-400 ml-4 mt-1 italic">Only Incharge or Admin can modify your role.</p>}
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Login Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={profile.password} onChange={e => setProfile({...profile, password: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Employee ID</label>
              <input value={profile.empId} onChange={e => setProfile({...profile, empId: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">BCP Registration Number</label>
              <input value={profile.bcpRegistrationNo} onChange={e => setProfile({...profile, bcpRegistrationNo: e.target.value})} placeholder="Optional" className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Father's Name</label>
              <input value={profile.fatherName} onChange={e => setProfile({...profile, fatherName: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Email ID</label>
              <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">System of Medicine</label>
              <input value={profile.system} readOnly className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none cursor-not-allowed text-slate-500 font-bold" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Mobile</label>
              <input value={profile.mobile} onChange={e => setProfile({...profile, mobile: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>

            <div className="space-y-1 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 ml-4">Employment Type</label>
              <select value={profile.employmentType} onChange={e => setProfile({...profile, employmentType: e.target.value as any})} className="w-full bg-white border border-emerald-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option value="Permanent">Permanent</option><option value="Contractual">Contractual</option><option value="Outsourced">Outsourced</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Class</label>
              <select value={profile.employmentClass} onChange={e => setProfile({...profile, employmentClass: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option>Class I</option><option>Class II</option><option>Class III</option><option>Class IV</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Gender</label>
              <select value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Blood Group</label>
              <select value={profile.bloodGroup} onChange={e => setProfile({...profile, bloodGroup: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Present District</label>
              <select value={profile.presentDistrict} onChange={e => setProfile({...profile, presentDistrict: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option value="">Select District</option>
                {UTTARAKHAND_DISTRICTS.map((d, index) => <option key={d + index} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Permanent Address</label>
              <textarea value={profile.permanentAddress} onChange={e => setProfile({...profile, permanentAddress: e.target.value})} rows={2} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Current Residential Address</label>
              <textarea value={profile.currentResidentialAddress} onChange={e => setProfile({...profile, currentResidentialAddress: e.target.value})} rows={2} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          </div>
            
          {/* Hospital Details Section */}
          <div className="mt-8 pt-8 border-t border-gray-100 w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Hospital Details</h3>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Connected Hospital</label>
                <input value={profile.hospitalConnectedName || 'Not Set'} readOnly className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none cursor-not-allowed text-slate-500 font-bold" />
                <span className="text-xs text-slate-400 ml-4">ID: {profile.hospitalConnectedId || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Main Posting (Mool Tainati)</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <input value={profile.mainPostingName || 'Not Set'} readOnly className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none cursor-not-allowed text-slate-500 font-bold" />
                    <span className="text-xs text-slate-400 ml-4">ID: {profile.mainPostingId || 'N/A'}</span>
                  </div>
                  <button type="button" onClick={() => setIsActualHospitalChangeModalOpen(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all self-start">Change</button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Attached Hospitals</label>
                <div className="bg-slate-50 border border-gray-100 rounded-2xl p-4 space-y-2">
                  {profile.attachedHospitals && profile.attachedHospitals.length > 0 ? (
                    profile.attachedHospitals.map((h: any, index) => (
                      <div key={h.id || `hosp-${index}`} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                        <div>
                          <span className="font-bold text-slate-700">{h.name}</span>
                          <p className="text-xs text-slate-500">ID: {h.id} | Modules: {h.assigned_modules?.join(', ') || 'None'}</p>
                        </div>
                        <button type="button" onClick={() => setHospitalToDelete(h)} className="text-red-600 hover:text-red-800 font-bold text-sm">Delete</button>
                      </div>
                    ))
                  ) : <p className="text-slate-400 text-sm italic">No attached hospitals.</p>}
                </div>
              </div>

              {hospitalToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-2xl space-y-4 max-w-sm w-full">
                    <h3 className="font-bold text-lg">Confirm Deletion</h3>
                    <p>Are you sure you want to remove {hospitalToDelete.name}?</p>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setHospitalToDelete(null)} className="px-4 py-2 bg-gray-200 rounded-xl font-bold">Cancel</button>
                      <button onClick={() => { setProfile({...profile, attachedHospitals: profile.attachedHospitals.filter((h: any) => h.id !== hospitalToDelete.id)}); setHospitalToDelete(null); }} className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold">Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'service' && (
        <>
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="text-emerald-600" size={20} /> 
                Service Record Details
              </h2>
              {/* In the button render */}
              <div className="flex items-center gap-4">
                  {(profile.last_verified_on || profile.last_edited_on) && (
                    <div className="flex flex-col items-end gap-1">
                      {profile.last_verified_on && (
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">
                          Verified on: {new Date(profile.last_verified_on).toLocaleString()}
                        </span>
                      )}
                      {profile.last_edited_on && (
                        <span className="text-[10px] font-bold text-yellow-700 uppercase">
                          Last edited on: {new Date(profile.last_edited_on).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                  {userRole === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const { error } = await supabase
                          .from('staff')
                          .update({ 
                            is_verified: true,
                            last_verified_on: new Date().toISOString(),
                            verified_by_admin: staffId
                          })
                          .eq('id', staffId);
                        if (!error) {
                          toast.success('Verified Successfully');
                          setProfile(prev => ({ 
                             ...prev, 
                             is_verified: true, 
                             last_verified_on: new Date().toISOString(),
                             verified_by_admin: staffId 
                          }));
                        } else {
                          alert('Failed to verify record: ' + error.message);
                        }
                      }}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Verify Service Record
                    </button>
                  )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Date of First Appointment</label>
                <input type="text" placeholder="DD-MMM-YYYY" value={profile.dateOfFirstAppointment} onChange={e => setProfile({...profile, dateOfFirstAppointment: maskDate(e.target.value)})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Date of 1st Joining in Dept</label>
                <input type="text" placeholder="DD-MMM-YYYY" value={profile.dateOfFirstJoiningDepartment} onChange={e => setProfile({...profile, dateOfFirstJoiningDepartment: maskDate(e.target.value)})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">First Posting Place</label>
                <HospitalSearchInput value={profile.firstPostingPlace} onChange={(val: any) => setProfile({...profile, firstPostingPlace: val})} hospitals={hospitals} className="w-full bg-slate-50 border-gray-100 rounded-2xl py-3 px-4 h-20" isTextarea={true} />
                {profile.firstPostingPlace && (
                  <div className="flex gap-4 ml-4 mt-1">
                    {(() => {
                      const h = hospitals.find(h => h.facility_name === profile.firstPostingPlace);
                      if (!h) return null;
                      return (
                        <><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.status === 'Durgam' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{h.status || 'Sugam'}</span><span className="text-[10px] font-bold text-slate-400">Above 7000 ft: <span className="text-slate-600">{(h.region_indicator === 'Above 7000' || h.above_7000_feet === 'Yes') ? 'Yes' : 'No'}</span></span></>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Home District</label>
                <select value={profile.homeDistrict} onChange={e => setProfile({...profile, homeDistrict: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option value="">Select Home District</option>
                  {UTTARAKHAND_DISTRICTS.map((d, index) => <option key={d + index} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Date of Birth</label>
                <input type="text" placeholder="DD-MMM-YYYY" value={profile.dob} onChange={e => setProfile({...profile, dob: maskDate(e.target.value)})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
            </div>
          </div>

          {profile.employmentType === 'Permanent' && (
            <>
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 transition-all">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><MapPin className="text-emerald-600" size={20} /> Posting History (Permanent Only)</h2>
                <div className="space-y-4">
                  {/* Current Posting */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-2 border-emerald-200 p-4 rounded-2xl bg-emerald-50/30">
                    <div className="space-y-1 md:col-span-6">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Present Posting Place</label>
                      <HospitalSearchInput isTextarea value={profile.postings[0]?.hospitalName || ''} onChange={(val: any) => {
                        const h = hospitals.find(h => h.facility_name === val);
                        const newPostings = [...profile.postings];
                        newPostings[0] = { ...newPostings[0], hospitalName: val, hospital_id: h ? h.hospital_id : '', status: h ? (h.status || 'Sugam') : 'Sugam', above7000: h ? (h.region_indicator === 'Above 7000' || h.above_7000_feet === 'Yes' ? 'Yes' : 'No') : 'No' };
                        setProfile({ ...profile, postings: newPostings });
                      }} hospitals={hospitals} placeholder="Type hospital name..." />
                      <div className="flex gap-3 ml-2 mt-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${profile.postings[0]?.status === 'Durgam' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{profile.postings[0]?.status || 'Sugam'}</span>
                        <span className="text-[9px] font-bold text-slate-400">Above 7000 ft: <span className="text-slate-600">{profile.postings[0]?.above7000 || 'No'}</span></span>
                      </div>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">From Date</label>
                      <input type="text" placeholder="DD-MMM-YYYY" value={profile.postings[0]?.fromDate || ''} onChange={e => {
                        const newPostings = [...profile.postings];
                        newPostings[0] = { ...newPostings[0], fromDate: maskDate(e.target.value) };
                        setProfile({ ...profile, postings: newPostings });
                      }} className="w-full bg-white border border-emerald-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">To Date</label>
                      <div className="w-full bg-white border border-emerald-200 rounded-xl py-2 px-3 text-slate-600 font-bold italic">Present</div>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Days (Auto)</label>
                      <div className="w-full bg-white border border-emerald-200 rounded-xl py-2 px-3 text-center font-bold text-emerald-700">
                        {(() => {
                          const start = parseDateStr(profile.postings[0]?.fromDate || '');
                          if (isNaN(start.getTime())) return '---';
                          const days = Math.ceil((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                          return <div className="text-lg">{days > 0 ? days : 0} days</div>;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Past Postings */}
                  {(() => {
                    const sorted = [...profile.postings].sort((a, b) => parseDateStr(b.fromDate).getTime() - parseDateStr(a.fromDate).getTime());
                    const pastPostings = sorted.slice(1);
                    return pastPostings.map((posting, index) => {
                      const nextPosting = index < pastPostings.length - 1 ? pastPostings[index + 1] : null;
                      const gap = nextPosting ? (parseDateStr(posting.fromDate).getTime() - parseDateStr(nextPosting.toDate).getTime()) / (1000 * 60 * 60 * 24) - 1 : 0;
                      return (
                        <div key={posting.id} className="space-y-2">
                          {gap > 0 && <div className="text-red-500 text-xs font-bold text-center bg-red-50 py-1 rounded-lg border border-red-200">Gap detected: {gap} days</div>}
                          <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-start border p-4 rounded-2xl ${gap > 0 ? 'border-red-300 bg-red-50/20' : 'border-gray-100 bg-slate-50'}`}>
                            <div className="space-y-1 md:col-span-5">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Subsequent Posting</label>
                              <HospitalSearchInput isTextarea value={hospitals.find(h => h.hospital_id === posting.hospital_id)?.facility_name || ''} onChange={(val: any) => {
                                const h = hospitals.find(h => h.facility_name === val);
                                updatePosting(posting.id, 'hospital_id', h ? h.hospital_id : '');
                              }} hospitals={hospitals} placeholder="Type hospital name..." />
                              <div className="flex gap-3 ml-2 mt-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${hospitals.find(h => h.hospital_id === posting.hospital_id)?.status === 'Durgam' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{hospitals.find(h => h.hospital_id === posting.hospital_id)?.status || 'Sugam'}</span>
                                <span className="text-[9px] font-bold text-slate-400">Above 7000 ft: <span className="text-slate-600">{(hospitals.find(h => h.hospital_id === posting.hospital_id)?.region_indicator === 'Above 7000' || hospitals.find(h => h.hospital_id === posting.hospital_id)?.above_7000_feet === 'Yes') ? 'Yes' : 'No'}</span></span>
                              </div>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">From Date</label>
                              <input type="text" placeholder="DD-MMM-YYYY" value={posting.fromDate} onChange={e => updatePosting(posting.id, 'fromDate', maskDate(e.target.value))} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">To Date</label>
                              <input type="text" placeholder="Pending" value={posting.toDate} readOnly className="w-full bg-slate-50 border border-gray-200 rounded-xl py-2 px-3 text-slate-500 font-bold" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Days</label>
                              <div className="w-full bg-slate-100 border border-gray-200 rounded-xl py-2 px-3 text-center font-bold text-slate-600"><div className="text-lg">{posting.days || 0} days</div></div>
                            </div>
                            <div className="md:col-span-1 flex justify-center pt-6">
                              <button type="button" onClick={() => removePosting(posting.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={20} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  
                  {(() => {
                    const sorted = [...profile.postings].sort((a, b) => parseDateStr(b.fromDate).getTime() - parseDateStr(a.fromDate).getTime());
                    const lastPosting = sorted[sorted.length - 1];
                    const deptStart = parseDateStr(profile.dateOfFirstJoiningDepartment);
                    const isComplete = lastPosting && !isNaN(parseDateStr(lastPosting.fromDate).getTime()) && parseDateStr(lastPosting.fromDate).getTime() === deptStart.getTime();
                    return isComplete ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm px-4 py-2"><CheckCircle size={16} /> Service History Complete</div>
                    ) : (
                      <button type="button" onClick={addPosting} className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-all px-4 py-2"><Plus size={16} /> Add Another Posting</button>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Calendar className="text-emerald-600" size={20} /> Long Leaves ({'>'}30 Days)</h2>
                <div className="space-y-4">
                  {profile.longLeaves.map((leave, index) => (
                    <div key={leave.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end border border-gray-100 p-4 rounded-2xl bg-slate-50">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">From Date</label>
                        <input type="text" placeholder="DD-MMM-YYYY" value={leave.fromDate} onChange={e => updateLongLeave(leave.id, 'fromDate', maskDate(e.target.value))} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">To Date</label>
                        <input type="text" placeholder="DD-MMM-YYYY" value={leave.toDate} onChange={e => updateLongLeave(leave.id, 'toDate', maskDate(e.target.value))} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Leave Type</label>
                        <input value={leave.leaveType} onChange={e => updateLongLeave(leave.id, 'leaveType', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="e.g. Study Leave" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Total Days</label>
                        <div className="w-full bg-slate-100 border border-gray-200 rounded-xl py-2 px-3 text-center font-bold text-slate-600"><div className="text-lg">{leave.totalDays || 0} days</div></div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => removeLongLeave(leave.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all h-[42px]"><X size={20} /></button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addLongLeave} className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:bg-emerald-50 p-3 rounded-2xl transition-all w-full justify-center border-2 border-dashed border-emerald-100"><Plus size={18} /> Add Leave</button>
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Leaves Duration ({'>'}30 days)</span>
                    <div className="text-2xl font-black text-slate-700">{serviceDays.totalLeaves} days</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Upload className="text-emerald-600" size={20} /> Attachments (If any)</h2>
                <div className="space-y-4">
                  {profile.attachments.map((att, index) => (
                    <div key={att.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border border-gray-100 p-4 rounded-2xl bg-slate-50">
                      <div className="space-y-1 md:col-span-5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Attachment Place</label>
                        <HospitalSearchInput isTextarea value={att.hospital} onChange={(val: any) => updateAttachment(att.id, 'hospital', val)} hospitals={hospitals} placeholder="Search hospital..." />
                        <div className="flex gap-3 ml-2 mt-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${att.status === 'Durgam' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{att.status || 'Sugam'}</span>
                          <span className="text-[9px] font-bold text-slate-400">Above 7000 ft: <span className="text-slate-600">{att.above7000 || 'No'}</span></span>
                        </div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">From</label>
                        <input type="text" placeholder="DD-MMM-YYYY" value={att.from} onChange={e => updateAttachment(att.id, 'from', maskDate(e.target.value))} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">To</label>
                        <input type="text" placeholder="DD-MMM-YYYY" value={att.to} onChange={e => updateAttachment(att.id, 'to', maskDate(e.target.value))} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Days</label>
                        <div className="w-full bg-slate-100 border border-gray-200 rounded-xl py-2 px-3 text-center font-bold text-slate-600"><div className="text-lg">{att.days || 0} days</div></div>
                      </div>
                      <div className="md:col-span-1 flex justify-center pt-6">
                        <button type="button" onClick={() => removeAttachment(att.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={20} /></button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addAttachment} className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-all px-4 py-2"><Plus size={16} /> Add More Attachments</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Total Sugam Attachment Days</p>
                      <div className="text-2xl font-black text-emerald-700">{serviceDays.attachmentSugam} days</div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Total Durgam (Below 7000ft) Attachment Days</p>
                      <div className="text-2xl font-black text-amber-700">{serviceDays.attachmentDurgam} days</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-1">Total Durgam (Above 7000 ft: Yes) Attachment Days</p>
                      <div className="text-2xl font-black text-red-700">{serviceDays.attachmentDurgamAbove7000} days</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-100">
                <div className="space-y-1 text-center bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Total Sugam Days</p>
                  <div className="text-4xl font-black text-white"><div>{serviceDays.totalSugam}</div><div className="text-lg text-emerald-100">{formatDaysToYMD(serviceDays.totalSugam)}</div></div>
                </div>
                <div className="space-y-1 text-center bg-amber-500 p-6 rounded-3xl shadow-lg shadow-amber-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-50">Total Durgam (Below 7000ft) Days</p>
                  <div className="text-4xl font-black text-white"><div>{serviceDays.totalDurgam}</div><div className="text-lg text-amber-100">{formatDaysToYMD(serviceDays.totalDurgam)}</div></div>
                </div>
                <div className="space-y-1 text-center bg-red-600 p-6 rounded-3xl shadow-lg shadow-red-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-100">Total Durgam (Above 7000 ft: Yes) Days</p>
                  <div className="text-4xl font-black text-white"><div>{serviceDays.totalDurgamAbove7000}</div><div className="text-lg text-red-100">{formatDaysToYMD(serviceDays.totalDurgamAbove7000)}</div></div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeSubTab === 'trainings' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><GraduationCap className="text-emerald-600" size={20} /> Trainings Attended</h2>
          <div className="space-y-4">
            {profile.trainings.map((training, index) => (
              <div key={training.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border border-gray-100 p-4 rounded-2xl bg-slate-50">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Training Title</label>
                  <input value={training.title} onChange={e => updateTraining(training.id, 'title', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="e.g. Panchakarma Workshop" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Year</label>
                  <input value={training.year} onChange={e => updateTraining(training.id, 'year', e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="e.g. 2025" />
                </div>
                <div className="space-y-1 flex gap-2">
                  <button type="button" onClick={() => removeTraining(training.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all h-[42px] mt-auto w-full flex items-center justify-center"><X size={20} /></button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addTraining} className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-all px-4 py-2"><Plus size={16} /> Add Another Training</button>
          </div>
        </div>
      )}

      <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
        <Save size={24} /> Save Profile Details
      </button>

      {isActualHospitalChangeModalOpen && (
        <HospitalChangeModal 
          isOpen={isActualHospitalChangeModalOpen} 
          onClose={() => setIsActualHospitalChangeModalOpen(false)} 
          currentHospitalId={profile.hospitalConnectedId} 
          staffId={String(staffId)}
          onConfirm={(newId: string, newName: string) => setIsActualHospitalChangeModalOpen(false)}
          hospitals={hospitals}
        />
      )}

      {isSaveSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm text-center">
            <CheckCircle className="text-emerald-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold mb-2">Profile Saved Successfully!</h2>
          </div>
        </div>
      )}
    </form>
  );
}
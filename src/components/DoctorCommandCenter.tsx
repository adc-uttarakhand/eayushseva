import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, User, Users, Activity, FileText, Package, Plus, Save, UserCircle2, X, Check, Edit2, Shield, Building2, MapPin, Star, Eye, EyeOff, Upload, Calendar, Hash, Mail, Map, Droplets, Camera, Loader2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';

import PatientList from './PatientList';
import EParchi from './EParchi';
import HospitalProfile from './HospitalProfile';

interface DoctorCommandCenterProps {
  session: any;
  hospitalName?: string;
  hospitals?: any[];
  onOpenEParchi: () => void;
  onEditHospital?: () => void;
  hospitalDetails?: any;
}

const AVAILABLE_MODULES = [
  { id: 'e_parchi', label: 'E-Parchi Desk (OPD)' },
  { id: 'medicine_demand', label: 'Medicine Demand' },
  { id: 'equipment_demand', label: 'Equipment / Furniture Demand' },
  { id: 'yoga_management', label: 'Yoga Session Management' },
  { id: 'suggestion_module', label: 'Suggestion Module' },
  { id: 'communication_module', label: 'Communication Module' },
];

const UTTARAKHAND_DISTRICTS = [
  "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
  "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", 
  "Udham Singh Nagar", "Uttarkashi"
];

const STAFF_ROLES = [
  "Senior Medical Officer",
  "Medical Officer",
  "District Pharmacy Officer",
  "Chief Pharmacy Officer",
  "Pharmacy Officer",
  "Staff Nurse",
  "Panchkarma Sahayak (Male)",
  "Panchkarma Sahayak (Female)",
  "Yoga and Naturopathy Assistant",
  "Yoga Instructor (Male)",
  "Yoga Instructor (Female)",
  "Wardboy",
  "MPW",
  "Swacchak Cum Chowkidar"
];

export default function DoctorCommandCenter({ session, hospitalName, hospitals = [], onOpenEParchi, onEditHospital, hospitalDetails }: DoctorCommandCenterProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'hospital_profile' | 'staff' | 'patients' | 'eparchi'>('dashboard');

  const [showPassword, setShowPassword] = useState(false);

  const maskDate = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 8);
    if (clean.length <= 2) return clean;
    if (clean.length <= 4) return `${clean.slice(0, 2)}-${clean.slice(2)}`;
    return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4)}`;
  };

  // Profile State
  const [profile, setProfile] = useState({
    fullName: session?.name || '',
    designation: '',
    empId: '',
    mobile: '',
    password: '',
    aadhaarNumber: '',
    fatherName: '',
    photograph: '',
    email: '',
    employmentClass: 'Class II',
    employmentType: 'Permanent' as 'Contractual' | 'Permanent' | 'Outsourced',
    gender: 'Male',
    dob: '',
    currentPostingJoiningDate: '',
    presentDistrict: '',
    bloodGroup: '',
    permanentAddress: '',
    currentResidentialAddress: '',
    system: '',
    hospitalConnectedName: '',
    registrationNo: '',
    specialization: 'General',
    qualification: '',
    keywords: '',
    trainings: [{ id: Date.now().toString(), title: '', year: '' }],
    dateOfJoining: '',
    postings: [{ id: Date.now().toString(), hospitalName: '', fromDate: '', toDate: '', status: 'Sugam' }],
    attachments: [{ id: Date.now().toString(), hospital: '', from: '', to: '', status: 'Sugam', days: 0 }]
  });

  // Staff State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);

  // Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isHospitalChangeModalOpen, setIsHospitalChangeModalOpen] = useState(false);
  const [isStaffSearchOpen, setIsStaffSearchOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffSearchResults, setStaffSearchResults] = useState<any[]>([]);
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    mobile: '',
    employeeId: '',
    aadhaarNumber: '',
    role: 'Pharmacist',
    password: ''
  });
  const [selectedModules, setSelectedModules] = useState<string[]>(['profile']);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.id) return;

      const formatDateForUI = (dateStr: string) => {
        if (!dateStr || dateStr === "") return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [y, m, d] = dateStr.split('-');
          return `${d}-${m}-${y}`;
        }
        return dateStr;
      };
      
      // Fetch from staff table
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('id', session.id)
        .maybeSingle();

      let hospitalInfo = null;
      if (staffData?.hospital_id) {
        const { data: hData } = await supabase
          .from('hospitals')
          .select('facility_name, system')
          .eq('hospital_id', staffData.hospital_id)
          .maybeSingle();
        hospitalInfo = hData;
      }

      // Fetch from doctor_profiles table
      const { data: docData } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('staff_id', session.id)
        .maybeSingle();

      setProfile({
        fullName: staffData?.full_name || session?.name || '',
        designation: staffData?.role || staffData?.designation || '',
        empId: staffData?.employee_id || '',
        mobile: staffData?.mobile_number || '',
        password: staffData?.login_password || '',
        aadhaarNumber: staffData?.aadhaar_number || '',
        fatherName: staffData?.father_name || '',
        photograph: staffData?.photograph_url || '',
        email: staffData?.email_id || '',
        employmentClass: staffData?.employment_class || 'Class II',
        employmentType: staffData?.employment_type || 'Permanent',
        gender: staffData?.gender || 'Male',
        dob: formatDateForUI(staffData?.dob || ''),
        currentPostingJoiningDate: formatDateForUI(staffData?.current_posting_joining_date || ''),
        presentDistrict: staffData?.present_district || '',
        bloodGroup: staffData?.blood_group || '',
        permanentAddress: staffData?.permanent_address || '',
        currentResidentialAddress: staffData?.current_residential_address || '',
        system: hospitalInfo?.system || '',
        hospitalConnectedName: hospitalInfo?.facility_name || '',
        registrationNo: docData?.state_board_registration_no || '',
        specialization: docData?.specialization || 'General',
        qualification: docData?.highest_qualification || '',
        keywords: docData?.keywords || '',
        trainings: staffData?.trainings && staffData.trainings.length > 0 ? staffData.trainings : [{ id: Date.now().toString(), title: '', year: '' }],
        dateOfJoining: formatDateForUI(staffData?.date_of_joining || ''),
        postings: staffData?.postings && staffData.postings.length > 0 
          ? staffData.postings.map((p: any) => ({
              ...p,
              fromDate: formatDateForUI(p.fromDate),
              toDate: formatDateForUI(p.toDate)
            }))
          : [{ id: Date.now().toString(), hospitalName: '', fromDate: '', toDate: '', status: 'Sugam' }],
        attachments: staffData?.attachments && staffData.attachments.length > 0 
          ? staffData.attachments.map((a: any) => ({
              ...a,
              from: formatDateForUI(a.from),
              to: formatDateForUI(a.to)
            }))
          : [{ id: Date.now().toString(), hospital: '', from: '', to: '', status: 'Sugam', days: 0 }]
      });

      // Fetch reviews
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*')
        .eq('doctor_id', session.id)
        .order('created_at', { ascending: false });

      if (reviewData) {
        setReviews(reviewData);
        const total = reviewData.reduce((acc, r) => acc + r.rating, 0);
        setAvgRating(reviewData.length > 0 ? total / reviewData.length : 0);
      }
    };
    fetchProfile();
  }, [session?.id]);

  useEffect(() => {
    const fetchStaff = async () => {
      const targetHospitalId = session?.role === 'HOSPITAL' ? session.id : session?.hospitalId;
      if (!targetHospitalId) return;
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('hospital_id', targetHospitalId);

      if (data) {
        const loggedInUserMobile = profile.mobile;
        const filteredStaff = data.filter(s => s.mobile_number !== loggedInUserMobile && s.id.toString() !== session.id);
        
        setStaffList(filteredStaff.map(s => ({
          id: s.id,
          name: s.full_name,
          role: s.role,
          mobile: s.mobile_number,
          isActive: s.is_active,
          roleColor: s.role === 'Nurse' ? 'bg-pink-100 text-pink-700' : s.role === 'Pharmacist' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700',
          assigned_modules: s.assigned_modules || []
        })));
      }
    };
    if (activeTab === 'staff') fetchStaff();
  }, [session?.hospitalId, activeTab, profile.mobile, session?.id, session?.role]);

  const toggleStaffStatus = async (staffId: number, currentStatus: boolean) => {
    await supabase.from('staff').update({ is_active: !currentStatus }).eq('id', staffId);
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, isActive: !currentStatus } : s));
  };

  const parseDateStr = (d: string) => {
    if (!d) return new Date(NaN);
    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [day, month, year] = d.split('-');
      return new Date(`${year}-${month}-${day}`);
    }
    return new Date(d);
  };

  const calculateServiceDays = (postings: any[]) => {
    let sugam = 0;
    let durgam = 0;
    postings.forEach(p => {
      if (p.fromDate && p.toDate) {
        const start = parseDateStr(p.fromDate);
        const end = parseDateStr(p.toDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (p.status === 'Sugam') sugam += days;
          else durgam += days;
        }
      }
    });
    return { sugam, durgam };
  };

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      // 1. Image Compression (< 50KB)
      const options = {
        maxSizeMB: 0.05, // 50KB
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // 2. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.id}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-photos')
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('staff-photos')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, photograph: publicUrl }));
      alert('Photo uploaded successfully! / फोटो सफलतापूर्वक अपलोड हो गई!');
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err.message || 'Unknown error') + '\nअपलोड विफल रहा: ' + (err.message || 'अज्ञात त्रुटि'));
    } finally {
      setUploading(false);
    }
  };

  const serviceDays = calculateServiceDays(profile.postings);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Helper to sanitize and format dates for DB (DD-MM-YYYY -> YYYY-MM-DD)
      const formatDateForDB = (dateStr: string) => {
        if (!dateStr || dateStr === "") return null;
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
          const [d, m, y] = dateStr.split('-');
          return `${y}-${m}-${d}`;
        }
        return dateStr;
      };

      // Sanitize arrays
      const sanitizedPostings = profile.postings.map(p => ({
        ...p,
        fromDate: formatDateForDB(p.fromDate),
        toDate: formatDateForDB(p.toDate)
      }));

      const sanitizedAttachments = profile.attachments.map(a => ({
        ...a,
        from: formatDateForDB(a.from),
        to: formatDateForDB(a.to)
      }));

      // 1. Upsert staff table
      const { error: staffError } = await supabase.from('staff').upsert({
        id: session.id, // Primary Key
        full_name: profile.fullName,
        mobile_number: profile.mobile,
        employee_id: profile.empId,
        login_password: profile.password,
        aadhaar_number: profile.aadhaarNumber,
        father_name: profile.fatherName,
        photograph_url: profile.photograph,
        email_id: profile.email,
        employment_class: profile.employmentClass,
        employment_type: profile.employmentType,
        gender: profile.gender,
        dob: formatDateForDB(profile.dob),
        current_posting_joining_date: formatDateForDB(profile.currentPostingJoiningDate),
        present_district: profile.presentDistrict,
        blood_group: profile.bloodGroup,
        permanent_address: profile.permanentAddress,
        current_residential_address: profile.currentResidentialAddress,
        role: profile.designation,
        date_of_joining: formatDateForDB(profile.dateOfJoining),
        trainings: profile.trainings,
        postings: sanitizedPostings,
        attachments: sanitizedAttachments
      }, { onConflict: 'id' });

      if (staffError) {
        throw new Error(`Staff Table Error: ${staffError.message}`);
      }

      // 2. Upsert doctor_profiles table
      const { error: docError } = await supabase.from('doctor_profiles').upsert({
        staff_id: session.id, // Conflict target
        state_board_registration_no: profile.registrationNo,
        specialization: profile.specialization,
        highest_qualification: profile.qualification,
        keywords: profile.keywords
      }, { onConflict: 'staff_id' });

      if (docError) {
        throw new Error(`Doctor Profiles Table Error: ${docError.message}`);
      }

      alert('Profile saved successfully!');
    } catch (err: any) {
      console.error('Exception saving profile:', err);
      alert(`Failed to save: ${err.message}`);
    }
  };

  const addTraining = () => {
    setProfile(prev => ({
      ...prev,
      trainings: [...prev.trainings, { id: Date.now().toString(), title: '', year: '' }]
    }));
  };

  const removeTraining = (id: string) => {
    setProfile(prev => ({
      ...prev,
      trainings: prev.trainings.filter(t => t.id !== id)
    }));
  };

  const updateTraining = (id: string, field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      trainings: prev.trainings.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const addPosting = () => {
    setProfile(prev => ({
      ...prev,
      postings: [...prev.postings, { id: Date.now().toString(), hospitalName: '', fromDate: '', toDate: '', status: 'Sugam' }]
    }));
  };

  const removePosting = (id: string) => {
    setProfile(prev => ({
      ...prev,
      postings: prev.postings.filter(p => p.id !== id)
    }));
  };

  const updatePosting = (id: string, field: string, value: string) => {
    setProfile(prev => {
      const newPostings = prev.postings.map(p => p.id === id ? { ...p, [field]: value } : p);
      // Auto-calculate days if from/to dates are present
      const updatedPostings = newPostings.map(p => {
        if (p.id === id && (field === 'fromDate' || field === 'toDate')) {
          const startStr = field === 'fromDate' ? value : p.fromDate;
          const endStr = field === 'toDate' ? value : p.toDate;
          if (startStr && endStr) {
            const start = parseDateStr(startStr);
            const end = parseDateStr(endStr);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              return { ...p, days: days > 0 ? days : 0 };
            }
          }
        }
        return p;
      });
      return { ...prev, postings: updatedPostings };
    });
  };

  const addAttachment = () => {
    setProfile(prev => ({
      ...prev,
      attachments: [...prev.attachments, { id: Date.now().toString(), hospital: '', from: '', to: '', status: 'Sugam', days: 0 }]
    }));
  };

  const removeAttachment = (id: string) => {
    setProfile(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id)
    }));
  };

  const updateAttachment = (id: string, field: string, value: string) => {
    setProfile(prev => {
      const newAttachments = prev.attachments.map(a => a.id === id ? { ...a, [field]: value } : a);
      // Auto-calculate days if from/to dates are present
      const updatedAttachments = newAttachments.map(a => {
        if (a.id === id && (field === 'from' || field === 'to')) {
          const startStr = field === 'from' ? value : a.from;
          const endStr = field === 'to' ? value : a.to;
          if (startStr && endStr) {
            const start = parseDateStr(startStr);
            const end = parseDateStr(endStr);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              return { ...a, days: days > 0 ? days : 0 };
            }
          }
        }
        return a;
      });
      return { ...prev, attachments: updatedAttachments };
    });
  };

  const handleOpenEditStaff = (staff: any) => {
    setEditingStaffId(staff.id);
    setStaffForm({ 
      fullName: staff.full_name || staff.name, 
      mobile: staff.mobile_number || staff.mobile, 
      employeeId: staff.employee_id || '', 
      aadhaarNumber: staff.aadhaar_number || '',
      role: staff.role, 
      password: '' 
    });
    setSelectedModules(staff.assigned_modules || ['profile']);
    setIsStaffModalOpen(true);
  };

  const handleToggleModule = (moduleId: string) => {
    if (moduleId === 'profile') return; // Cannot toggle default module
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staffForm.fullName || !staffForm.mobile) {
      alert('Name and Mobile Number are compulsory! / नाम और मोबाइल नंबर अनिवार्य हैं!');
      return;
    }

    if (!staffForm.employeeId && !staffForm.aadhaarNumber) {
      alert('Either Employee ID or Aadhaar Number must be provided! / या तो कर्मचारी आईडी या आधार संख्या प्रदान की जानी चाहिए!');
      return;
    }

    if (!staffForm.role) {
      alert('Role must be assigned! / भूमिका सौंपी जानी चाहिए!');
      return;
    }

    // Check if staff already exists in DB
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id')
      .or(`mobile_number.eq.${staffForm.mobile}${staffForm.employeeId ? `,employee_id.eq.${staffForm.employeeId}` : ''}${staffForm.aadhaarNumber ? `,aadhaar_number.eq.${staffForm.aadhaarNumber}` : ''}`)
      .maybeSingle();

    if (existingStaff && !editingStaffId) {
      alert('Staff is already in the system, search it! / स्टाफ पहले से ही सिस्टम में है, इसे खोजें!');
      return;
    }

    const payload = {
      hospital_id: session.hospitalId,
      full_name: staffForm.fullName,
      mobile_number: staffForm.mobile,
      employee_id: staffForm.employeeId,
      aadhaar_number: staffForm.aadhaarNumber,
      role: staffForm.role,
      assigned_modules: selectedModules,
      login_password: staffForm.password || 'ayush@123',
      is_active: true
    };

    if (editingStaffId) {
      const { error } = await supabase.from('staff').update(payload).eq('id', editingStaffId);
      if (error) {
        alert('Update failed: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('staff').insert([payload]);
      if (error) {
        alert('Addition failed: ' + error.message);
        return;
      }
    }

    alert(`Staff ${editingStaffId ? 'updated' : 'added'} successfully!`);
    setIsStaffModalOpen(false);
    // Refresh staff list
    setActiveTab('dashboard');
    setTimeout(() => setActiveTab('staff'), 10);
  };

  const handleOpenAddStaff = () => {
    setIsStaffSearchOpen(true);
    setStaffSearchQuery('');
    setStaffSearchResults([]);
    setIsStaffModalOpen(false);
  };

  const handleStaffSearch = async () => {
    if (!staffSearchQuery.trim()) return;
    setIsSearchingStaff(true);
    
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .or(`full_name.ilike.%${staffSearchQuery}%,aadhaar_number.eq.${staffSearchQuery},employee_id.eq.${staffSearchQuery},mobile_number.eq.${staffSearchQuery}`);
      
      if (data) {
        setStaffSearchResults(data);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearchingStaff(false);
    }
  };

  const handleSendCorrection = async () => {
    // In a real app, this would send an email or create a notification record
    alert('A message has been sent to the Admin for correction. / सुधार के लिए एडमिन को एक संदेश भेज दिया गया है।');
    setIsCorrectionModalOpen(false);
  };

  const handleSendHospitalChangeRequest = async () => {
    alert('A message has been sent to the Admin and Super Admin for hospital change request. / अस्पताल परिवर्तन अनुरोध के लिए एडमिन और सुपर एडमिन को एक संदेश भेज दिया गया है।');
    setIsHospitalChangeModalOpen(false);
  };

  const userRole = session?.role;
  const assignedModules = session?.modules || [];

  const isHospital = userRole === 'HOSPITAL';
  const isIncharge = userRole === 'STAFF' && session.isIncharge;
  const isAssignedStaff = userRole === 'STAFF' && !isIncharge;

  const showDashboard = isHospital || isIncharge || (isAssignedStaff && assignedModules.includes('e_parchi'));
  const showProfile = !isHospital && (isIncharge || (isAssignedStaff && assignedModules.includes('profile')));
  const showStaff = isHospital || isIncharge;
  const showHospitalProfile = isIncharge;
  const showEParchi = isHospital || isIncharge || (isAssignedStaff && assignedModules.includes('e_parchi'));
  const showPatients = isHospital || isIncharge || (isAssignedStaff && assignedModules.includes('e_parchi'));

  // Set default active tab based on permissions
  React.useEffect(() => {
    if (!showDashboard && showProfile) {
      setActiveTab('profile');
    }
  }, [showDashboard, showProfile]);

  const calculateDuration = (startDateStr: string) => {
    if (!startDateStr) return '---';
    if (!/^\d{2}-\d{2}-\d{4}$/.test(startDateStr)) return '---';
    const [d, m, y] = startDateStr.split('-');
    const startDate = new Date(`${y}-${m}-${d}`);
    if (isNaN(startDate.getTime())) return '---';

    const today = new Date();
    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();
    let days = today.getDate() - startDate.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    if (years < 0) return '0 Days';

    const parts = [];
    if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Month${months > 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} Day${days > 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(', ') : '0 Days';
  };

  const isMedicalOfficer = profile.designation === 'Medical Officer' || profile.designation === 'Senior Medical Officer';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32 bg-slate-50 min-h-screen">
      {/* Header & Navigation */}
      <div className="mb-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Command Center</h1>
            <div className="flex flex-col">
              {isIncharge ? (
                <div className="flex flex-col">
                  <span className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md w-fit">Incharge</span>
                  <button 
                    onClick={() => setIsCorrectionModalOpen(true)}
                    className="text-[10px] text-emerald-600 hover:underline mt-1 font-bold"
                  >
                    Are you Not an Incharge?
                  </button>
                </div>
              ) : !isHospital && (
                <button 
                  onClick={() => setIsCorrectionModalOpen(true)}
                  className="text-[10px] text-slate-400 hover:text-emerald-600 hover:underline font-bold"
                >
                  Are you an Incharge?
                </button>
              )}
            </div>
          </div>
          {hospitalName && (
            <p className="text-emerald-600 font-medium mt-1 flex items-center gap-2">
              <Building2 size={16} />
              {hospitalName}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl shadow-sm w-fit border border-gray-100">
          {showDashboard && (
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutDashboard size={18} /> Hospital Dashboard
            </button>
          )}
          {showProfile && (
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <User size={18} /> My Profile
            </button>
          )}
          {showHospitalProfile && (
            <button 
              onClick={() => setActiveTab('hospital_profile')} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'hospital_profile' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Building2 size={18} /> Hospital Profile
            </button>
          )}
          {showStaff && (
            <button 
              onClick={() => setActiveTab('staff')} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'staff' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Users size={18} /> {isIncharge ? 'Manage Staff' : 'Hospital Staff'}
            </button>
          )}
          {showEParchi && (
            <button 
              onClick={() => setActiveTab('eparchi')} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'eparchi' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <FileText size={18} /> E-Parchi Desk
            </button>
          )}
          {showPatients && (
            <button 
              onClick={() => setActiveTab('patients')} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'patients' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Users size={18} /> Patients
            </button>
          )}
          {isAssignedStaff && assignedModules.includes('medicine_demand') && (
            <button 
              onClick={() => setActiveTab('medicine_demand' as any)} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'medicine_demand' as any ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Package size={18} /> Medicine Demand
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Bento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Today's OPD</p>
                  <p className="text-3xl font-bold text-slate-900">142</p>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Active Staff</p>
                  <p className="text-3xl font-bold text-slate-900">12</p>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-amber-50 w-14 h-14 rounded-2xl flex items-center justify-center text-amber-600">
                  <Package size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Pending Demands</p>
                  <p className="text-3xl font-bold text-slate-900">3</p>
                </div>
              </div>
            </div>

            {/* CTA Bento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center md:text-left flex flex-col justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Patient Registration</h2>
                  <p className="text-slate-500 mt-1">Access the e-Parchi desk to register new and returning patients.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('eparchi')} 
                  className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 whitespace-nowrap"
                >
                  <FileText size={24} />
                  Open e-Parchi Desk
                </button>
              </div>

              {isIncharge && (
                <div className="bg-slate-900 rounded-3xl p-8 shadow-sm text-white flex flex-col justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold">Administrative Actions</h2>
                    <p className="text-slate-400 mt-1">Manage your facility's staff and profile.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={() => setActiveTab('staff')} 
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Users size={18} />
                      Manage Staff
                    </button>
                    <button 
                      onClick={handleOpenAddStaff} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Add New Staff
                    </button>
                    {onEditHospital && (
                      <button 
                        onClick={onEditHospital} 
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 sm:col-span-2"
                      >
                        <Edit2 size={18} />
                        Edit Hospital Profile
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Basic Info Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <User className="text-emerald-600" size={20} /> Basic Info
                </h2>
                {isIncharge && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full">
                    <Shield className="text-emerald-600" size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Incharge, {hospitalName}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Photograph (Passport Size)</label>
                  <div className="flex gap-6 items-center bg-slate-50 p-6 rounded-3xl border border-gray-100">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center">
                        {profile.photograph ? (
                          <img src={profile.photograph} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle2 size={48} className="text-slate-400" />
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700 transition-all group-hover:scale-110"
                      >
                        <Camera size={16} />
                      </button>
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">Upload Photo</p>
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB. Will be auto-compressed to 50KB.</p>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                      >
                        {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                        {uploading ? 'Uploading...' : 'Select File'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Full Name</label>
                  <input 
                    value={profile.fullName} 
                    onChange={e => setProfile({...profile, fullName: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Role / Designation</label>
                  <select 
                    value={profile.designation} 
                    onChange={e => setProfile({...profile, designation: e.target.value})} 
                    disabled={!(isIncharge || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')}
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Role</option>
                    {STAFF_ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  {!(isIncharge || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                    <p className="text-[10px] text-slate-400 ml-4 mt-1 italic">Only Incharge or Admin can modify your role.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Login Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={profile.password} 
                      onChange={e => setProfile({...profile, password: e.target.value})} 
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Employee ID</label>
                  <input 
                    value={profile.empId} 
                    onChange={e => setProfile({...profile, empId: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Aadhaar Number</label>
                  <input 
                    value={profile.aadhaarNumber} 
                    onChange={e => setProfile({...profile, aadhaarNumber: e.target.value})} 
                    placeholder="12-digit Aadhaar"
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Father's Name</label>
                  <input 
                    value={profile.fatherName} 
                    onChange={e => setProfile({...profile, fatherName: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Email ID</label>
                  <input 
                    type="email"
                    value={profile.email} 
                    onChange={e => setProfile({...profile, email: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">System of Medicine</label>
                  <input 
                    value={profile.system} 
                    readOnly
                    className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none cursor-not-allowed text-slate-500 font-bold" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Connected Hospital</label>
                  <div className="relative">
                    <input 
                      value={profile.hospitalConnectedName} 
                      readOnly
                      className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none cursor-not-allowed text-slate-500 font-bold" 
                    />
                    <button 
                      type="button"
                      onClick={() => setIsHospitalChangeModalOpen(true)}
                      className="text-[10px] text-emerald-600 hover:underline mt-1 font-bold ml-4"
                    >
                      Change Hospital?
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Mobile</label>
                  <input 
                    value={profile.mobile} 
                    onChange={e => setProfile({...profile, mobile: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Employment Type</label>
                  <select 
                    value={profile.employmentType} 
                    onChange={e => setProfile({...profile, employmentType: e.target.value as any})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Contractual">Contractual</option>
                    <option value="Outsourced">Outsourced</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Class</label>
                  <select 
                    value={profile.employmentClass} 
                    onChange={e => setProfile({...profile, employmentClass: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option>Class I</option>
                    <option>Class II</option>
                    <option>Class III</option>
                    <option>Class IV</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Gender</label>
                  <select 
                    value={profile.gender} 
                    onChange={e => setProfile({...profile, gender: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Date of Birth</label>
                  <input 
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={profile.dob} 
                    onChange={e => setProfile({...profile, dob: maskDate(e.target.value)})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Blood Group</label>
                  <select 
                    value={profile.bloodGroup} 
                    onChange={e => setProfile({...profile, bloodGroup: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                    <option>O+</option>
                    <option>O-</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Present District</label>
                  <select 
                    value={profile.presentDistrict} 
                    onChange={e => setProfile({...profile, presentDistrict: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select District</option>
                    {UTTARAKHAND_DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Permanent Address</label>
                  <textarea 
                    value={profile.permanentAddress} 
                    onChange={e => setProfile({...profile, permanentAddress: e.target.value})} 
                    rows={2}
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Current Residential Address</label>
                  <textarea 
                    value={profile.currentResidentialAddress} 
                    onChange={e => setProfile({...profile, currentResidentialAddress: e.target.value})} 
                    rows={2}
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
              </div>
            </div>

            {/* Current Posting Info */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Building2 className="text-emerald-600" size={20} /> Current Posting Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Assigned Place</label>
                  <div className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 text-slate-600 font-bold">
                    {hospitalName || 'Not Assigned'}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Status</label>
                  <div className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 text-slate-600 font-bold">
                    {hospitalDetails?.status || '---'}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Joining Date at Current Place</label>
                  <input 
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={profile.currentPostingJoiningDate} 
                    onChange={e => setProfile({...profile, currentPostingJoiningDate: maskDate(e.target.value)})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">
                    {hospitalDetails?.status === 'Durgam' ? 'Durgam' : 'Sugam'} Days at Current Place
                  </label>
                  <div className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 text-slate-600 font-bold">
                    {calculateDuration(profile.currentPostingJoiningDate)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="space-y-1 text-center bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-600">Total Sugam Days</p>
                  <p className="text-xl font-black text-emerald-700">{serviceDays.sugam}</p>
                </div>
                <div className="space-y-1 text-center bg-amber-50 p-3 rounded-2xl border border-amber-100">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-amber-600">Total Durgam Days</p>
                  <p className="text-xl font-black text-amber-700">{serviceDays.durgam}</p>
                </div>
              </div>
            </div>

            {isMedicalOfficer && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Activity className="text-emerald-600" size={20} /> Deep Profile
                </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">State Medical Council Registration No</label>
                  <input 
                    value={profile.registrationNo} 
                    onChange={e => setProfile({...profile, registrationNo: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Specialization</label>
                  <select 
                    value={profile.specialization} 
                    onChange={e => setProfile({...profile, specialization: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option>Kayachikitsa</option>
                    <option>Panchakarma</option>
                    <option>Shalya</option>
                    <option>Shalakya</option>
                    <option>Prasuti & Stri Roga</option>
                    <option>Kaumarbhritya</option>
                    <option>General</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Highest Qualification</label>
                  <input 
                    value={profile.qualification} 
                    onChange={e => setProfile({...profile, qualification: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Expertise Keywords (e.g. Diabetes, NCD Reversal)</label>
                  <input 
                    value={profile.keywords} 
                    onChange={e => setProfile({...profile, keywords: e.target.value})} 
                    placeholder="Enter keywords separated by commas"
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Date of Joining</label>
                  <input 
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={profile.dateOfJoining} 
                    onChange={e => setProfile({...profile, dateOfJoining: maskDate(e.target.value)})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
              </div>
            </div>
            )}

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="text-emerald-600" size={20} /> Trainings Attended
              </h2>
              <div className="space-y-4">
                {profile.trainings.map((training, index) => (
                  <div key={training.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border border-gray-100 p-4 rounded-2xl bg-slate-50">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Training Title</label>
                      <input 
                        value={training.title} 
                        onChange={e => updateTraining(training.id, 'title', e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                        placeholder="e.g. Panchakarma Workshop"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Year</label>
                      <input 
                        value={training.year} 
                        onChange={e => updateTraining(training.id, 'year', e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                        placeholder="e.g. 2025"
                      />
                    </div>
                    <div className="space-y-1 flex gap-2">
                      <button 
                        type="button"
                        onClick={() => removeTraining(training.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all h-[42px] mt-auto w-full flex items-center justify-center"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={addTraining}
                  className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-all px-4 py-2"
                >
                  <Plus size={16} /> Add Another Training
                </button>
              </div>
            </div>

            <div className={`bg-white rounded-3xl p-8 shadow-sm border border-gray-100 transition-all ${profile.employmentType !== 'Permanent' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <MapPin className="text-emerald-600" size={20} /> Posting History (Permanent Only)
              </h2>
              <div className="space-y-4">
                {profile.postings.map((posting, index) => (
                  <div key={posting.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end border border-gray-100 p-4 rounded-2xl bg-slate-50">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">
                        {index === 0 ? 'First Posting Place' : 'Subsequent Posting'}
                      </label>
                      <input 
                        list="hospitals-list"
                        value={posting.hospitalName} 
                        onChange={e => updatePosting(posting.id, 'hospitalName', e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                        placeholder="Search hospital..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">From</label>
                      <input 
                        type="text"
                        placeholder="DD-MM-YYYY"
                        value={posting.fromDate} 
                        onChange={e => updatePosting(posting.id, 'fromDate', maskDate(e.target.value))} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">To</label>
                      <input 
                        type="text"
                        placeholder="DD-MM-YYYY"
                        value={posting.toDate} 
                        onChange={e => updatePosting(posting.id, 'toDate', maskDate(e.target.value))} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Status</label>
                      <select 
                        value={posting.status} 
                        onChange={e => updatePosting(posting.id, 'status', e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option>Sugam</option>
                        <option>Durgam</option>
                      </select>
                    </div>
                    <div className="space-y-1 flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Days</label>
                        <div className="w-full bg-slate-100 border border-gray-200 rounded-xl py-2 px-3 text-center font-bold text-slate-600">
                          {posting.days || 0}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removePosting(posting.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all h-[42px] mt-auto"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={addPosting}
                  className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-all px-4 py-2"
                >
                  <Plus size={16} /> Add Another Posting
                </button>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Upload className="text-emerald-600" size={20} /> Attachments (If any)
              </h2>
              <div className="space-y-4">
                {profile.attachments.map((att) => (
                  <div key={att.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end border border-gray-100 p-4 rounded-2xl bg-slate-50">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Attachment Hospital</label>
                      <input 
                        list="hospitals-list"
                        value={att.hospital} 
                        onChange={e => updateAttachment(att.id, 'hospital', e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                        placeholder="Search hospital..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">From</label>
                      <input 
                        type="text"
                        placeholder="DD-MM-YYYY"
                        value={att.from} 
                        onChange={e => updateAttachment(att.id, 'from', maskDate(e.target.value))} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">To</label>
                      <input 
                        type="text"
                        placeholder="DD-MM-YYYY"
                        value={att.to} 
                        onChange={e => updateAttachment(att.id, 'to', maskDate(e.target.value))} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Status</label>
                      <select 
                        value={att.status} 
                        onChange={e => updateAttachment(att.id, 'status', e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option>Sugam</option>
                        <option>Durgam</option>
                      </select>
                    </div>
                    <div className="space-y-1 flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Days</label>
                        <div className="w-full bg-slate-100 border border-gray-200 rounded-xl py-2 px-3 text-center font-bold text-slate-600">
                          {att.days || 0}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all h-[42px] mt-auto"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={addAttachment}
                  className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-all px-4 py-2"
                >
                  <Plus size={16} /> Add More Attachments
                </button>
              </div>
            </div>

            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Save size={24} />
              Save Profile Details
            </button>

            <datalist id="hospitals-list">
              {hospitals.map(h => (
                <option key={h.hospital_id} value={h.facility_name} />
              ))}
            </datalist>

            {/* Public Feedback Section */}
            {isMedicalOfficer && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mt-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Star className="text-amber-400 fill-amber-400" size={24} /> Public Feedback
                  </h2>
                  <p className="text-slate-500 mt-1">What patients are saying about your service.</p>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-[2rem] border border-gray-100 flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-slate-900">{avgRating.toFixed(1)}</div>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} className={`${avgRating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="w-px h-10 bg-gray-200" />
                  <div className="text-center">
                    <div className="text-3xl font-black text-slate-900">{reviews.length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reviews</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review, idx) => (
                    <div key={review.id || idx} className="p-6 rounded-2xl border border-gray-50 bg-slate-50/30">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={14} className={`${review.rating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-slate-700 italic font-medium leading-relaxed">
                        "{review.comments || 'No specific comments left.'}"
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {review.reviewer_name ? `Review by ${review.reviewer_name}` : 'Verified Patient'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-gray-200">
                    <Star size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 font-medium">No public feedback received yet.</p>
                  </div>
                )}
              </div>
            </div>
            )}
          </form>
        )}

        {activeTab === 'hospital_profile' && showHospitalProfile && (
          <HospitalProfile 
            hospitalDetails={hospitalDetails} 
            onUpdate={() => {
              // Optionally trigger a refresh of hospital details
            }} 
          />
        )}

        {activeTab === 'staff' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Hospital Staff</h2>
                <p className="text-sm text-slate-500 mt-1">{isIncharge ? 'Manage roles and access for your facility.' : 'View staff associated with your facility.'}</p>
              </div>
              {isIncharge && (
                <button 
                  onClick={handleOpenAddStaff}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> Add New Staff
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Staff Member</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Role</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Mobile</th>
                    {isIncharge && (
                      <>
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 text-right">Active Status</th>
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 text-right">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staffList.map(staff => (
                    <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <UserCircle2 size={24} />
                        </div>
                        <span className="font-bold text-slate-900">{staff.name}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${staff.roleColor}`}>
                          {staff.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-600">{staff.mobile}</td>
                      {isIncharge && (
                        <>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => toggleStaffStatus(staff.id, staff.isActive)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shadow-inner ${staff.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${staff.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={() => handleOpenEditStaff(staff)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <PatientList hospitalId={session.hospitalId || session.id} />
          </div>
        )}

        {activeTab === 'eparchi' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <EParchi 
              hospitalId={session.hospitalId || session.id} 
              hospitalName={hospitalName}
              district={hospitalDetails?.district}
              hospitalType={hospitalDetails?.type}
              regionIndicator={hospitalDetails?.region_indicator}
              session={session}
            />
          </div>
        )}
      </motion.div>

      {/* Add / Edit Staff Modal */}
      <AnimatePresence>
        {isStaffModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-6 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{editingStaffId ? 'Edit Staff Member' : 'Add New Staff'}</h2>
                  <p className="text-sm text-slate-500 mt-1">Configure details and assign module access.</p>
                </div>
                <button 
                  onClick={() => setIsStaffModalOpen(false)}
                  className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveStaff} className="p-8 space-y-8">
                {/* Basic Details */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <User size={16} /> Basic Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Full Name</label>
                      <input 
                        required
                        value={staffForm.fullName} 
                        onChange={e => setStaffForm({...staffForm, fullName: e.target.value})} 
                        className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Mobile Number</label>
                      <input 
                        required
                        value={staffForm.mobile} 
                        onChange={e => setStaffForm({...staffForm, mobile: e.target.value})} 
                        className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Employee ID</label>
                      <input 
                        value={staffForm.employeeId} 
                        onChange={e => setStaffForm({...staffForm, employeeId: e.target.value})} 
                        className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Role</label>
                      <select 
                        value={staffForm.role} 
                        onChange={e => setStaffForm({...staffForm, role: e.target.value})} 
                        className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {STAFF_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Aadhaar Number</label>
                      <input 
                        value={staffForm.aadhaarNumber} 
                        onChange={e => setStaffForm({...staffForm, aadhaarNumber: e.target.value})} 
                        placeholder="12-digit Aadhaar"
                        className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
                      <input 
                        type="password"
                        placeholder={editingStaffId ? "Leave blank to keep current" : "Default: ayush@123"}
                        value={staffForm.password} 
                        onChange={e => setStaffForm({...staffForm, password: e.target.value})} 
                        className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>
                  </div>
                </div>

                {/* Module Assignment */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <Shield size={16} /> Module Assignment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Default Profile Module */}
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 opacity-70 cursor-not-allowed">
                      <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span className="font-bold text-sm text-slate-700">My Profile & Service Record</span>
                    </div>

                    {/* Dynamic Modules */}
                    {AVAILABLE_MODULES.map(module => {
                      const isChecked = selectedModules.includes(module.id);
                      return (
                        <div
                          key={module.id}
                          onClick={() => handleToggleModule(module.id)}
                          className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                            isChecked 
                              ? 'border-emerald-500 bg-emerald-50/30' 
                              : 'border-gray-200 hover:border-emerald-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-100 border border-slate-300 text-transparent'
                          }`}>
                            <Check size={14} strokeWidth={3} />
                          </div>
                          <span className={`font-bold text-sm ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                            {module.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Save size={18} />
                    {editingStaffId ? 'Update Staff' : 'Save Staff'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staff Search Modal */}
      <AnimatePresence>
        {isStaffSearchOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStaffSearchOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[40px] p-8 shadow-2xl max-w-2xl w-full"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Search Existing Staff</h3>
                <button onClick={() => setIsStaffSearchOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text"
                  placeholder="Search by Name, Aadhaar, Emp ID, or Mobile..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStaffSearch()}
                  className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-lg font-medium"
                />
                <button 
                  onClick={handleStaffSearch}
                  disabled={isSearchingStaff}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {isSearchingStaff ? <Loader2 className="animate-spin" size={18} /> : 'Search'}
                </button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-8">
                {staffSearchResults.length > 0 ? (
                  staffSearchResults.map(staff => (
                    <div key={staff.id} className="p-4 rounded-2xl border border-gray-100 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-900">{staff.full_name}</h4>
                        <p className="text-xs text-slate-500">{staff.role} • {staff.employee_id || 'No ID'}</p>
                      </div>
                      <button 
                        onClick={() => {
                          handleOpenEditStaff(staff);
                          setIsStaffSearchOpen(false);
                        }}
                        className="text-emerald-600 font-bold text-sm hover:underline"
                      >
                        Select & Edit
                      </button>
                    </div>
                  ))
                ) : staffSearchQuery && !isSearchingStaff ? (
                  <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-gray-200">
                    <Users size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No staff found matching your search.</p>
                    <button 
                      onClick={() => {
                        setEditingStaffId(null);
                        setStaffForm({ fullName: '', mobile: '', employeeId: '', aadhaarNumber: '', role: 'Pharmacist', password: '' });
                        setSelectedModules(['profile']);
                        setIsStaffModalOpen(true);
                        setIsStaffSearchOpen(false);
                      }}
                      className="mt-4 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                    >
                      Add as New Staff
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-10">Enter search criteria to find existing staff</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hospital Change Modal */}
      <AnimatePresence>
        {isHospitalChangeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHospitalChangeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[40px] p-10 shadow-2xl max-w-md w-full text-center"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="text-emerald-600" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Hospital Change Request</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                A message will be sent to the Admin and Super Admin for hospital change request. Do you want to proceed?
                <br />
                <span className="text-xs mt-2 block font-medium">अस्पताल परिवर्तन अनुरोध के लिए एडमिन और सुपर एडमिन को एक संदेश भेजा जाएगा। क्या आप आगे बढ़ना चाहते हैं?</span>
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSendHospitalChangeRequest}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  Yes, Send Message
                </button>
                <button 
                  onClick={() => setIsHospitalChangeModalOpen(false)}
                  className="w-full bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                >
                  No, Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Correction Modal */}
      <AnimatePresence>
        {isCorrectionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCorrectionModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[40px] p-10 shadow-2xl max-w-md w-full text-center"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="text-emerald-600" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Role Correction Request</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                A message will be sent to the Admin for correction of your Incharge status. Do you want to proceed?
                <br />
                <span className="text-xs mt-2 block font-medium">सुधार के लिए एडमिन को एक संदेश भेजा जाएगा। क्या आप आगे बढ़ना चाहते हैं?</span>
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSendCorrection}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  Yes, Send the Message
                </button>
                <button 
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="w-full bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                >
                  No, Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


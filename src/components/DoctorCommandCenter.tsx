import Profiler from './Profiler';
import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, User, Users, Activity, FileText, Package, Plus, Save, UserCircle2, X, Check, Edit2, Shield, Building2, MapPin, Star, Eye, EyeOff, Upload, Calendar, Hash, Mail, Map, Droplets, Camera, Loader2, Search, ClipboardList, Truck, CheckCircle, Trash2, Hand, Sun, Stethoscope } from 'lucide-react';
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';
import PostingDeleteConfirmationModal from './PostingDeleteConfirmationModal';
import StaffDeleteConfirmationModal from './StaffDeleteConfirmationModal';
import HospitalChangeModal from './HospitalChangeModal';
import AddEmployeeModal from './AddEmployeeModal';

import PatientList from './PatientList';
import EParchi from './EParchi';
import HospitalProfile from './HospitalProfile';
import InventoryManager from './InventoryManager';
import MedicineDemandSystem from './MedicineDemandSystem';
import HospitalSupplyPull from './HospitalSupplyPull';
import RegistrationRequests from './RegistrationRequests';
import PanchakarmaModule from './PanchakarmaModule';
import YogaModule from './YogaModule';
import RapidTests from './RapidTests';
import SpecialTherapyModule from './SpecialTherapyModule';
import CertificateModule from './CertificateModule';
import Sthananataran from './Sthananataran';

interface DoctorCommandCenterProps {
  session: any;
  hospitalName?: string;
  hospitals?: any[];
  onOpenEParchi: () => void;
  onEditHospital?: () => void;
  onUpdateHospital?: () => void;
  hospitalDetails?: any;
  onHospitalProfileDirtyChange?: (isDirty: boolean) => void;
}

const AVAILABLE_MODULES = [
  { id: 'e_parchi', label: 'E-Parchi Desk (OPD) - All Access' },
  { id: 'eparchi_registration', label: 'E-Parchi: Registration' },
  { id: 'eparchi_consultation', label: 'E-Parchi: Consultation' },
  { id: 'eparchi_queue', label: 'E-Parchi: Queue' },
  { id: 'eparchi_pharmacy', label: 'E-Parchi: Pharmacy Dispensing' },
  { id: 'eparchi_fees', label: 'E-Parchi: Fees Collection' },
  { id: 'inventory', label: 'Inventory Management' },
  { id: 'medicine_demand', label: 'Medicine Demand' },
  { id: 'equipment_demand', label: 'Equipment / Furniture Demand' },
  { id: 'yoga_instructor', label: 'Yoga Instructor' },
  { id: 'yoga_control', label: 'Yoga Session Control' },
  { id: 'suggestion_module', label: 'Suggestion Module' },
  { id: 'communication_module', label: 'Communication Module' },
  { id: 'panchakarma', label: 'Panchakarma Management' },
  { id: 'rapid_tests', label: 'Rapid Tests Management' },
  { id: 'special_therapy', label: 'Special Therapy Management' },
  { id: 'certificate', label: 'Certificate Module' },
  { id: 'sthananataran', label: 'Sthananataran (Transfer) Module' },
];

const UTTARAKHAND_DISTRICTS = [
  "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
  "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", 
  "Udham Singh Nagar", "Uttarkashi", "Outside Uttarakhand"
];

const HospitalSearchInput = ({ 
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
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const filteredHospitals = (hospitals || [])
    .filter(h => (h.facility_name || '').toLowerCase().includes((query || '').toLowerCase()))
    .slice(0, 10);

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
          value={query || ''}
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
          value={query || ''}
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
      {isOpen && query && filteredHospitals.length > 0 && (
        <div className="absolute z-[100] w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto">
          {filteredHospitals.map(h => (
            <button
              key={h.hospital_id}
              type="button"
              onClick={() => {
                onChange(h.facility_name);
                setQuery(h.facility_name);
                setIsOpen(false);
              }}
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

// OfficeSearchInput removed as requested

let _idCounter = 0;
const generateId = () => `gen_${Date.now()}_${++_idCounter}_${Math.random().toString(36).slice(2)}`;

const EXPERTISE_KEYWORDS = [
  "Marma Chikitsa", "Ayurvedic Neurotherapy", "Leech Therapy", "Ayurvedic Antenatal Care", "Panchakarma Therapies", 
  "Uttar Vasti", "Siravedh", "Viddhakarma", "NCD Reversal", "Panchakarma Procedures", "Agnikarma", "Kshar Karma", 
  "Kshar Sutra", "Netra Kriya Kalpa", "Pediatric Disorders", "Rheumatism", "Hyperuricemia", "Liver Disorders", 
  "Gynecological Disorders", "ENT Disorders", "Eye Disorders", "GI Disorders", "Skin Diseases", "Psoriasis", 
  "Auto immune Disorders", "Chronic Pain Management", "Osteoarthritis", "Neurological Disorders", "Spine Disorders", 
  "Reproductive System Disorders", "Infertility", "Psychiatry", "Endocrine Disorders", "Preventive Medicine", 
  "Cancer Rehab", "Cancer Management", "Yoga", "Naadi Pareekshan"
];

export default function DoctorCommandCenter({ session, hospitalName, hospitals = [], onOpenEParchi, onEditHospital, onUpdateHospital, hospitalDetails, onHospitalProfileDirtyChange }: DoctorCommandCenterProps) {
  const [activeTab, _setActiveTab] = useState<'dashboard' | 'profile' | 'deep_profile' | 'hospital_profile' | 'staff' | 'patients' | 'eparchi' | 'inventory' | 'medicine_demand' | 'district_supply' | 'role_management' | 'doctor_feedback' | 'panchakarma' | 'yoga' | 'rapid_tests' | 'special_therapy' | 'certificate' | 'sthananataran'>('dashboard');
  const setActiveTab = (newTab: 'dashboard' | 'profile' | 'deep_profile' | 'hospital_profile' | 'staff' | 'patients' | 'eparchi' | 'inventory' | 'medicine_demand' | 'district_supply' | 'role_management' | 'doctor_feedback' | 'panchakarma' | 'yoga' | 'rapid_tests' | 'special_therapy' | 'certificate' | 'sthananataran') => {
    if (isDirty && activeTab === 'profile' && newTab !== 'profile') {
      setPendingTab(newTab);
      setIsUnsavedChangesModalOpen(true);
    } else if (isHospitalProfileDirty && activeTab === 'hospital_profile' && newTab !== 'hospital_profile') {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
    } else {
      _setActiveTab(newTab);
      setIsHospitalProfileDirty(false);
    }
  };
  const [profileSubTab, setProfileSubTab] = useState<'basic' | 'service' | 'trainings'>('basic');
  const [staffSubTab, setStaffSubTab] = useState<'list' | 'registration_requests'>('list');
  const [eparchiSubTab, setEparchiSubTab] = useState<'registration' | 'queue' | 'dispensing'>('registration');
  const [inventorySubTab, setInventorySubTab] = useState<'receive' | 'add_request' | 'main' | 'indent' | 'indent_logs' | 'consumption'>('receive');
  const [isDirty, setIsDirty] = useState(false);
  const [initialProfile, setInitialProfile] = useState<any>(null);
  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<number | null>(null);
  const [isSaveSuccessModalOpen, setIsSaveSuccessModalOpen] = useState(false);
  const [isHospitalProfileDirty, setIsHospitalProfileDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [isKeywordsModalOpen, setIsKeywordsModalOpen] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const maskDate = (value: string) => {
    // Remove all characters that are not digits or letters
    const clean = value.replace(/[^a-zA-Z0-9]/g, '');
    
    let result = '';
    
    // Day (first 2 digits)
    const day = clean.slice(0, 2).replace(/\D/g, '');
    result += day;
    
    if (clean.length > 2) {
      result += '-';
      // Month (next 3 letters)
      let month = clean.slice(2, 5).replace(/[0-9]/g, '');
      if (month.length > 0) {
        // Capitalize first letter, lowercase others
        month = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
      }
      result += month;
      
      if (clean.length > 5) {
        result += '-';
        // Year (next 4 digits)
        const year = clean.slice(5, 9).replace(/\D/g, '');
        result += year;
      }
    }
    
    return result;
  };

  // Profile State
  const [postingToDelete, setPostingToDelete] = useState<string | null>(null);
  const [hospitalToDelete, setHospitalToDelete] = useState<any>(null);
  const [profile, setProfile] = useState({
    fullName: session?.name || '',
    designation: '',
    empId: '',
    mobile: '',
    password: '',
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
    hospitalConnectedId: '',
    bcpRegistrationNo: '',
    specialization: 'General',
    qualification: '',
    clinicalExperienceSince: '',
    keywords: '',
    trainings: [{ id: generateId(), title: '', year: '' }],
    dateOfFirstAppointment: '',
    dateOfFirstJoiningDepartment: '',
    firstPostingPlace: '',
    homeDistrict: '',
    longLeaves: [{ id: generateId(), fromDate: '', toDate: '', leaveType: '', totalDays: 0 }],
    postings: [{ id: generateId(), hospitalName: '', hospital_id: '', fromDate: '', toDate: '', status: 'Sugam', above7000: 'No', days: 0 }],
    attachments: [{ id: generateId(), hospital_id: '', hospital: '', from: '', to: '', status: 'Sugam', above7000: 'No', days: 0 }]
  });

  // Staff State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [hospitalReviews, setHospitalReviews] = useState<any[]>([]);
  const [hospitalAvgRating, setHospitalAvgRating] = useState(0);

  // Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isHospitalChangeModalOpen, setIsHospitalChangeModalOpen] = useState(false);
  const [isActualHospitalChangeModalOpen, setIsActualHospitalChangeModalOpen] = useState(false);
  const [isStaffSearchOpen, setIsStaffSearchOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffSearchResults, setStaffSearchResults] = useState<any[]>([]);
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    mobile: '',
    role: 'Pharmacist'
  });
  const [isMobileRegistered, setIsMobileRegistered] = useState(false);
  const [isCheckingMobile, setIsCheckingMobile] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(session.activeModules || ['profile']);
  const [isModuleActive, setIsModuleActive] = useState(true);
  const [transferModuleActive, setTransferModuleActive] = useState(false);
  const [sthananataranModuleActive, setSthananataranModuleActive] = useState(false);
  const [loadingTransferStatus, setLoadingTransferStatus] = useState(true);

  // Dashboard Stats State
  const [todayOpd, setTodayOpd] = useState<number | null>(null);
  const [activeStaffCount, setActiveStaffCount] = useState<number | null>(null);
  const [feeGeneratedThisMonth, setFeeGeneratedThisMonth] = useState<number | null>(null);

  useEffect(() => {
    const checkMobile = async () => {
      const trimmedMobile = staffForm.mobile.trim();
      if (trimmedMobile && trimmedMobile.length >= 10) {
        setIsCheckingMobile(true);
        const { data } = await supabase
          .from('staff')
          .select('id')
          .eq('mobile_number', trimmedMobile)
          .neq('id', editingStaffId || -1)
          .maybeSingle();
        setIsMobileRegistered(!!data);
        setIsCheckingMobile(false);
      } else {
        setIsMobileRegistered(false);
      }
    };
    
    const timeoutId = setTimeout(checkMobile, 500);
    return () => clearTimeout(timeoutId);
  }, [staffForm.mobile, editingStaffId]);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data } = await supabase.from('roles').select('role_name');
      if (data) setRoles(data.map(r => r.role_name));
    };
    fetchRoles();
    
    const fetchModuleStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('global_settings')
          .select('is_active')
          .eq('setting_key', 'medicine_demand_active')
          .single();
        
        if (error) {
          console.error('Error fetching module status in DoctorCommandCenter:', error);
        }
        
        if (data) {
          setIsModuleActive(data.is_active);
        }
      } catch (err) {
        console.error('Exception fetching module status:', err);
      }
    };
    fetchModuleStatus();

    const fetchModuleStatuses = async () => {
      try {
        const { data: transferData } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'transfer_module_active')
          .maybeSingle();

        if (transferData) {
          setTransferModuleActive(Boolean(transferData.setting_value));
        }

        const { data: sthanData } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'sthananataran_module_active')
          .maybeSingle();

        console.log('Fetched sthananataran module status:', sthanData);
        if (sthanData) {
          setSthananataranModuleActive(Boolean(sthanData.setting_value));
        }
      } catch (err) {
        console.error('Error fetching module statuses:', err);
      } finally {
        setLoadingTransferStatus(false);
      }
    };
    fetchModuleStatuses();
  }, []);

  useEffect(() => {
    if (initialProfile) {
      setIsDirty(JSON.stringify(profile) !== JSON.stringify(initialProfile));
    }
  }, [profile, initialProfile]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.id) return;

      const formatDateForUI = (dateStr: string) => {
        if (!dateStr || dateStr === "") return "";
        
        // If it's already in DD-MMM-YYYY format, return it
        if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(dateStr)) return dateStr;
        
        // If it's in YYYY-MM-DD format (from DB)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [y, m, d] = dateStr.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthStr = months[parseInt(m) - 1];
          return `${d}-${monthStr}-${y}`;
        }
        
        // If it's in DD-MM-YYYY format
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
          const [d, m, y] = dateStr.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthStr = months[parseInt(m) - 1];
          return `${d}-${monthStr}-${y}`;
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
          .select('facility_name, system, district')
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

      const newProfile = {
        fullName: staffData?.full_name || session?.name || '',
        designation: staffData?.role || staffData?.designation || '',
        empId: staffData?.employee_id || '',
        mobile: staffData?.mobile_number || '',
        password: staffData?.login_password || '',
        fatherName: staffData?.father_name || '',
        photograph: staffData?.photograph_url || '',
        email: staffData?.email_id || '',
        employmentClass: staffData?.employment_class || 'Class II',
        employmentType: staffData?.employment_type || 'Permanent',
        gender: staffData?.gender || 'Male',
        dob: formatDateForUI(staffData?.dob || ''),
        currentPostingJoiningDate: formatDateForUI(staffData?.current_posting_joining_date || ''),
        presentDistrict: hospitalInfo?.district || staffData?.present_district || '',
        bloodGroup: staffData?.blood_group || '',
        permanentAddress: staffData?.permanent_address || '',
        currentResidentialAddress: staffData?.current_residential_address || '',
        system: hospitalInfo?.system || '',
        hospitalConnectedName: hospitalName || hospitalInfo?.facility_name || '',
        hospitalConnectedId: session.activeHospitalId || session.hospitalId || staffData?.hospital_id || '',
        mainPostingName: hospitalInfo?.facility_name || '',
        mainPostingId: staffData?.hospital_id || '',
        currentPostingType: staffData?.postings?.[staffData.postings.length - 1]?.status || 'Sugam',
        currentPostingAbove7000: staffData?.postings?.[staffData.postings.length - 1]?.above7000 || 'No',
        totalAttachmentSugam: staffData?.attachment_sugam_days || 0,
        totalAttachmentDurgamBelow7000: staffData?.attachment_durgam_below_7000_days || 0,
        totalAttachmentDurgamAbove7000: staffData?.attachment_durgam_above_7000_days || 0,
        longLeavesDays: staffData?.long_leaves_days || 0,
        totalSugamDays: staffData?.total_sugam_days || 0,
        totalDurgamBelow7000Days: staffData?.total_durgam_below_7000_days || 0,
        totalDurgamAbove7000Days: staffData?.total_durgam_above_7000_days || 0,
        attachedHospitals: staffData?.secondary_hospitals ? staffData.secondary_hospitals.map((h: any) => {
          const hosp = hospitals.find(hp => hp.hospital_id === h.hospital_id);
          return {
            id: h.hospital_id,
            name: hosp ? hosp.facility_name : h.hospital_id,
            assigned_modules: h.assigned_modules || []
          };
        }) : [],
        bcpRegistrationNo: staffData?.bcp_registration_no || '',
        specialization: docData?.specialization || 'General',
        qualification: docData?.highest_qualification || '',
        clinicalExperienceSince: docData?.clinical_experience_since || '',
        keywords: docData?.keywords || '',
        trainings: staffData?.trainings && staffData.trainings.length > 0 
          ? staffData.trainings.map((t: any) => ({
              ...t,
              id: generateId(),
              title: t.title || '',
              year: t.year || ''
            }))
          : [{ id: generateId(), title: '', year: '' }],
        dateOfFirstAppointment: formatDateForUI(staffData?.date_of_first_appointment || ''),
        dateOfFirstJoiningDepartment: formatDateForUI(staffData?.first_joining_date || ''),
        firstPostingPlace: staffData?.first_posting_place || '',
        homeDistrict: staffData?.home_district || '',
        longLeaves: staffData?.long_leaves && staffData.long_leaves.length > 0 
          ? staffData.long_leaves.map((l: any) => ({
              ...l,
              id: generateId(),
              leaveType: l.leaveType || '',
              totalDays: l.totalDays || 0,
              fromDate: formatDateForUI(l.fromDate),
              toDate: formatDateForUI(l.toDate)
            }))
          : [{ id: generateId(), fromDate: '', toDate: '', leaveType: '', totalDays: 0 }],
        postings: staffData?.postings && staffData.postings.length > 0 
          ? staffData.postings.map((p: any) => {
              const latestHospital = hospitals.find(h => h.hospital_id === p.hospital_id);
              const start = parseDateStr(formatDateForUI(p.fromDate));
              const end = parseDateStr(formatDateForUI(p.toDate));
              const days = (!isNaN(start.getTime()) && !isNaN(end.getTime())) ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
              return {
                ...p,
                id: generateId(),
                hospitalName: latestHospital ? latestHospital.facility_name : p.hospitalName,
                fromDate: formatDateForUI(p.fromDate),
                toDate: formatDateForUI(p.toDate),
                above7000: p.above7000 || 'No',
                days: days > 0 ? days : 0
              };
            })
          : [{ id: generateId(), hospitalName: '', hospital_id: '', fromDate: '', toDate: '', status: 'Sugam', above7000: 'No', days: 0 }],
        attachments: staffData?.attachments && staffData.attachments.length > 0 
          ? staffData.attachments.map((a: any) => {
              const latestHospital = hospitals.find(h => h.hospital_id === a.hospital_id);
              const start = parseDateStr(formatDateForUI(a.from));
              const end = parseDateStr(formatDateForUI(a.to));
              const days = (!isNaN(start.getTime()) && !isNaN(end.getTime())) ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
              return {
                ...a,
                id: generateId(),
                hospital_id: a.hospital_id || '',
                hospital: latestHospital ? latestHospital.facility_name : a.hospital,
                status: latestHospital ? (latestHospital.status || 'Sugam') : (a.status || 'Sugam'),
                above7000: latestHospital ? (latestHospital.above_7000_feet || 'No') : (a.above7000 || 'No'),
                from: formatDateForUI(a.from),
                to: formatDateForUI(a.to),
                days: days > 0 ? days : 0
              };
            })
          : [{ id: generateId(), hospital_id: '', hospital: '', from: '', to: '', status: 'Sugam', above7000: 'No', days: 0 }]
      };
      setProfile(newProfile);
      setInitialProfile(newProfile);
      setIsDirty(false);

      // Fetch reviews
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*')
        .eq('doctor_id', session.id)
        .order('created_at', { ascending: false });

      if (reviewData) {
        setReviews(reviewData);
        const total = reviewData.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        const avg = reviewData.length > 0 ? total / reviewData.length : 0;
        setAvgRating(isNaN(avg) ? 0 : avg);
      }

      // Fetch hospital reviews if user is incharge
      if (session?.role === 'HOSPITAL' || session?.hospitalId) {
        const targetHospitalId = session?.role === 'HOSPITAL' ? session.id : session?.hospitalId;
        const { data: hospReviewData } = await supabase
          .from('reviews')
          .select('*')
          .eq('hospital_id', targetHospitalId)
          .is('doctor_id', null)
          .order('created_at', { ascending: false });

        if (hospReviewData) {
          setHospitalReviews(hospReviewData);
          const total = hospReviewData.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
          const avg = hospReviewData.length > 0 ? total / hospReviewData.length : 0;
          setHospitalAvgRating(isNaN(avg) ? 0 : avg);
        }
      }
    };
    fetchProfile();
  }, [session?.id, session?.role, session?.hospitalId]);

  useEffect(() => {
    const fetchStaff = async () => {
      const targetHospitalId = session?.role === 'HOSPITAL' ? session.id : session?.hospitalId;
      if (!targetHospitalId) return;
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .or(`hospital_id.eq.${targetHospitalId},secondary_hospitals.cs.[{"hospital_id":"${targetHospitalId}"}]`)
        .range(0, 5000);

      if (data) {
        const loggedInUserMobile = profile.mobile;
        const seen = new Set();
        const filteredStaff = data.filter(s => {
          if (s.mobile_number === loggedInUserMobile || s.id.toString() === session.id) return false;
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        
        setStaffList(filteredStaff.map(s => {
          // Determine the correct modules for this hospital
          let modules = s.assigned_modules || [];
          let staffType = 'Main Posting';
          
          if (s.hospital_id !== targetHospitalId && s.secondary_hospitals) {
            const secAssignment = s.secondary_hospitals.find((h: any) => h.hospital_id === targetHospitalId);
            if (secAssignment) {
              staffType = 'Attachment';
              if (secAssignment.assigned_modules) {
                modules = secAssignment.assigned_modules;
              }
            }
          }

          return {
            id: s.id,
            name: s.full_name,
            full_name: s.full_name,
            role: s.role,
            employee_id: s.employee_id,
            mobile: s.mobile_number,
            mobile_number: s.mobile_number,
            hospital_id: s.hospital_id,
            secondary_hospitals: s.secondary_hospitals,
            isActive: s.is_active,
            roleColor: s.role === 'Nurse' ? 'bg-pink-100 text-pink-700' : s.role === 'Pharmacist' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700',
            assigned_modules: modules,
            staffType: staffType
          };
        }));
      }
    };
    if (activeTab === 'staff' || activeTab === 'dashboard') fetchStaff();
  }, [session?.hospitalId, activeTab, profile.mobile, session?.id, session?.role]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      const targetHospitalId = session?.role === 'HOSPITAL' ? session.id : session?.hospitalId;
      if (!targetHospitalId) return;

      const today = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const todayDateObj = new Date(today);
      todayDateObj.setHours(0, 0, 0, 0);
      const startOfDay = todayDateObj.toISOString();
      const endOfDayObj = new Date(todayDateObj);
      endOfDayObj.setHours(23, 59, 59, 999);
      const endOfDay = endOfDayObj.toISOString();

      const startOfMonthObj = new Date(todayDateObj);
      startOfMonthObj.setDate(1);
      const startOfMonth = startOfMonthObj.toISOString();

      try {
        // Fetch Today's OPD count
        const { count: opdCount } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('hospital_id', targetHospitalId)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);
        setTodayOpd(opdCount || 0);

        // Fetch Active Staff count
        const { count: activeStaff } = await supabase
          .from('staff')
          .select('*', { count: 'exact', head: true })
          .eq('hospital_id', targetHospitalId)
          .eq('is_active', true);
        setActiveStaffCount(activeStaff || 0);

        // Fetch Fee Generated this Month
        const { data: monthPatients } = await supabase
          .from('patients')
          .select('fee_amount')
          .eq('hospital_id', targetHospitalId)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfDay);
        
        const feeGenerated = monthPatients?.reduce((sum, p) => sum + (p.fee_amount || 0), 0) || 0;
        setFeeGeneratedThisMonth(feeGenerated);

      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };

    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [session?.role, session?.id, session?.hospitalId, activeTab]);

  const toggleStaffStatus = async (staffId: number, currentStatus: boolean) => {
    await supabase.from('staff').update({ is_active: !currentStatus }).eq('id', staffId);
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, isActive: !currentStatus } : s));
  };

  const parseDateStr = (d: string) => {
    if (!d) return new Date(NaN);
    
    // Handle DD-MMM-YYYY (strict: year must be exactly 4 digits)
    if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(d)) {
      const [day, monthStr, year] = d.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
      if (monthIndex !== -1) {
        return new Date(parseInt(year), monthIndex, parseInt(day));
      }
    }
    
    // Handle DD-MM-YYYY (strict: year must be exactly 4 digits)
    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [day, month, year] = d.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // IMPORTANT: Do NOT use new Date(d) fallback here.
    // Incomplete dates like "01-Jan-20" (2-digit year being typed)
    // would be parsed as valid dates by JS and trigger unwanted
    // recalculation of all posting toDate values while user is still typing.
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
    let sugam = 0;
    let durgamNoAbove7000 = 0;
    let durgamAbove7000 = 0;
    
    let attachmentSugam = 0;
    let attachmentDurgamNoAbove7000 = 0;
    let attachmentDurgamAbove7000 = 0;

    let totalLeaves = 0;

    // Helper to get days between dates
    const getDays = (startStr: string, endStr: string) => {
      const start = parseDateStr(startStr);
      const end = parseDateStr(endStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    };

    // Helper to check if a range overlaps with another
    const overlaps = (s1: Date, e1: Date, s2: Date, e2: Date) => s1 <= e2 && s2 <= e1;

    // Process all postings (including current)
    const allPostings = [...postings];
    if (currentJoiningDate) {
      const today = new Date();
      const dd = today.getDate().toString().padStart(2, '0');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const mm = months[today.getMonth()];
      const yyyy = today.getFullYear();
      const todayStr = `${dd}-${mm}-${yyyy}`; // DD-MMM-YYYY format, same as parseDateStr expects
      allPostings.push({
        isAuto: true,
        fromDate: currentJoiningDate,
        toDate: todayStr,
        status: currentPostingType,
        above7000: currentPostingAbove7000
      });
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

      // Rule A & B: Leaves
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

      // Rule C: Attachments
      attachments.forEach(a => {
        const aStart = parseDateStr(a.from);
        const aEnd = parseDateStr(a.to);
        if (overlaps(start, end, aStart, aEnd)) {
          const overlapStart = new Date(Math.max(start.getTime(), aStart.getTime()));
          const overlapEnd = new Date(Math.min(end.getTime(), aEnd.getTime()));
          const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          if (overlapDays > 0) {
            const aAbove7000 = a.above7000 === 'Yes';
            
            // Determine posting category
            let pCategory = p.status === 'Sugam' ? 'Sugam' : (p.above7000 === 'Yes' ? 'DurgamAbove7000' : 'DurgamNoAbove7000');
            
            // Determine attachment category
            let aCategory = a.status === 'Sugam' ? 'Sugam' : (aAbove7000 ? 'DurgamAbove7000' : 'DurgamNoAbove7000');

            // Subtract from posting category
            if (pCategory === 'Sugam') pSugam -= overlapDays;
            else if (pCategory === 'DurgamAbove7000') pDurgamAbove7000 -= overlapDays;
            else pDurgamNoAbove7000 -= overlapDays;

            // Add to attachment category
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

    return { 
        totalSugam: sugam + attachmentSugam, 
        totalDurgam: durgamNoAbove7000 + attachmentDurgamNoAbove7000, 
        totalDurgamAbove7000: durgamAbove7000 + attachmentDurgamAbove7000,
        attachmentSugam,
        attachmentDurgam: attachmentDurgamNoAbove7000,
        attachmentDurgamAbove7000,
        totalLeaves
    };
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

  const serviceDays = calculateServiceDays(profile.postings.slice(1), profile.attachments, profile.longLeaves, profile.postings[0]?.fromDate, profile.postings[0]?.status, profile.postings[0]?.above7000);

  const validatePostings = () => {
    const sortedPostings = [...profile.postings].sort((a, b) => parseDateStr(b.fromDate).getTime() - parseDateStr(a.fromDate).getTime());
    
    // 1. No Overlap
    for (let i = 0; i < sortedPostings.length - 1; i++) {
      const current = sortedPostings[i];
      const next = sortedPostings[i+1];
      if (parseDateStr(current.fromDate) <= parseDateStr(next.toDate)) {
        alert('Overlapping dates found in Posting History.');
        return false;
      }
    }

    // 2. Department Start Limit
    const deptStart = parseDateStr(profile.dateOfFirstJoiningDepartment);
    if (!isNaN(deptStart.getTime())) {
      for (const p of profile.postings) {
        if (parseDateStr(p.fromDate) < deptStart) {
          alert('Posting date cannot be earlier than Date of 1st Joining in Dept.');
          return false;
        }
      }
    }

    // 3. Closing the Loop
    if (sortedPostings.length > 0) {
      const lastPosting = sortedPostings[sortedPostings.length - 1];
      if (parseDateStr(lastPosting.fromDate).getTime() !== deptStart.getTime()) {
        alert('Service history is incomplete. It must start from your first joining date.');
        return false;
      }
    }
    
    return true;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only validate if we are in the relevant tab
    if (profileSubTab === 'service') {
      if (!validatePostings()) return;

      // Validation for Permanent Employees
      if (profile.employmentType === 'Permanent') {
        if (!profile.dateOfFirstJoiningDepartment || !profile.firstPostingPlace) {
          alert('Please fill "Date of 1st Joining in Dept" and "First Posting Place" in Service Record Details.\nकृपया सेवा रिकॉर्ड विवरण में "विभाग में प्रथम कार्यभार ग्रहण करने की तिथि" और "प्रथम तैनाती स्थल" भरें।');
          return;
        }
      }
    }

    if (profileSubTab === 'basic') {
      // Mandatory Field Validation
      if (!profile.dob || !profile.dateOfFirstJoiningDepartment || !profile.homeDistrict) {
        alert('Please fill DOB, Joining Date, and Home District before saving.');
        return;
      }
    }

    try {
      // Helper to sanitize and format dates for DB (DD-MM-YYYY -> YYYY-MM-DD)
      const formatDateForDB = (dateStr: string) => {
        if (!dateStr || dateStr === "") return null;
        
        // Handle DD-MMM-YYYY
        if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(dateStr)) {
          const [d, mStr, y] = dateStr.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const m = months.findIndex(month => month.toLowerCase() === mStr.toLowerCase()) + 1;
          if (m > 0) {
            return `${y}-${m.toString().padStart(2, '0')}-${d}`;
          }
        }
        
        // Handle DD-MM-YYYY
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

      const sanitizedLongLeaves = profile.longLeaves.map(l => ({
        ...l,
        fromDate: formatDateForDB(l.fromDate),
        toDate: formatDateForDB(l.toDate)
      }));

      // 1. Upsert staff table
      const { error: staffError } = await supabase.from('staff').upsert({
        id: session.id, // Primary Key
        full_name: profile.fullName,
        mobile_number: profile.mobile,
        employee_id: profile.empId || null,
        login_password: profile.password,
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
        date_of_first_appointment: formatDateForDB(profile.dateOfFirstAppointment),
        first_joining_date: formatDateForDB(profile.dateOfFirstJoiningDepartment),
        first_posting_place: profile.firstPostingPlace || '',
        home_district: profile.homeDistrict || null,
        bcp_registration_no: profile.bcpRegistrationNo,
        long_leaves: sanitizedLongLeaves,
        trainings: profile.trainings,
        postings: sanitizedPostings,
        attachments: sanitizedAttachments,
        secondary_hospitals: profile.attachedHospitals.map((h: any) => ({
          hospital_id: h.id,
          assigned_modules: h.assigned_modules
        })),
        long_leaves_count: serviceDays.totalLeaves,
        attachment_sugam_days: serviceDays.attachmentSugam,
        attachment_durgam_days: serviceDays.attachmentDurgam,
        attachment_durgam_above_7000_days: serviceDays.attachmentDurgamAbove7000,
        total_sugam_days: serviceDays.totalSugam,
        total_durgam_below_7000_days: serviceDays.totalDurgam,
        total_durgam_above_7000_days: serviceDays.totalDurgamAbove7000,
        last_edited_on: new Date().toISOString(),
        is_verified: new Date().toISOString() > (staffData?.last_verified_on || '1970-01-01')
      }, { onConflict: 'id' });

      if (staffError) {
        throw new Error(`Staff Table Error: ${staffError.message}`);
      }

      // 2. Upsert doctor_profiles table
      const { error: docError } = await supabase.from('doctor_profiles').upsert({
        staff_id: session.id, // Conflict target
        specialization: profile.specialization,
        highest_qualification: profile.qualification,
        clinical_experience_since: profile.clinicalExperienceSince || null,
        keywords: profile.keywords
      }, { onConflict: 'staff_id' });

      if (docError) {
        throw new Error(`Doctor Profiles Table Error: ${docError.message}`);
      }

      setIsDirty(false);
      setInitialProfile(profile);
      setIsSaveSuccessModalOpen(true);
      setTimeout(() => setIsSaveSuccessModalOpen(false), 3000);
    } catch (err: any) {
      console.error('Exception saving profile:', err);
      alert(`Failed to save: ${err.message}`);
    }
  };

  const addTraining = () => {
    setProfile(prev => ({
      ...prev,
      trainings: [...prev.trainings, { id: Date.now().toString() + Math.random().toString(36), title: '', year: '' }]
    }));
  };

  const removeTraining = (id: string) => {
    setProfile(prev => ({
      ...prev,
      trainings: prev.trainings.filter(t => t.id !== id)
    }));
  };

  const addLongLeave = () => {
    setProfile(prev => ({
      ...prev,
      longLeaves: [...prev.longLeaves, { id: Date.now().toString() + Math.random().toString(36), fromDate: '', toDate: '', leaveType: '', totalDays: 0 }]
    }));
  };

  const removeLongLeave = (id: string) => {
    setProfile(prev => ({
      ...prev,
      longLeaves: prev.longLeaves.filter(l => l.id !== id)
    }));
  };

  const updateLongLeave = (id: string, field: string, value: any) => {
    setProfile(prev => {
      const newLeaves = prev.longLeaves.map(l => {
        if (l.id === id) {
          const updated = { ...l, [field]: value };
          
          // Auto-calculate days if both dates are present
          if (field === 'fromDate' || field === 'toDate') {
            const from = field === 'fromDate' ? value : l.fromDate;
            const to = field === 'toDate' ? value : l.toDate;
            
            if (from && to && /^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(from) && /^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(to)) {
              const parseDate = (s: string) => {
                const [d, mStr, y] = s.split('-');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const m = months.indexOf(mStr);
                return new Date(parseInt(y), m, parseInt(d));
              };
              const d1 = parseDate(from);
              const d2 = parseDate(to);
              const diffTime = d2.getTime() - d1.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              updated.totalDays = diffDays > 0 ? diffDays : 0;
            }
          }
          return updated;
        }
        return l;
      });
      return { ...prev, longLeaves: newLeaves };
    });
  };

  const updateTraining = (id: string, field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      trainings: prev.trainings.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const addPosting = () => {
    setProfile(prev => {
      const newPosting = { 
        id: Date.now().toString() + Math.random().toString(36), 
        hospitalName: '', 
        hospital_id: '', 
        fromDate: '', 
        toDate: '', 
        status: 'Sugam', 
        above7000: 'No', 
        days: 0 
      };

      // If there are existing postings, auto-fill the new posting's To Date
      if (prev.postings.length > 0) {
        const lastPosting = prev.postings[prev.postings.length - 1];
        if (lastPosting.fromDate) {
          const fromDate = parseDateStr(lastPosting.fromDate);
          if (!isNaN(fromDate.getTime())) {
            const toDate = new Date(fromDate);
            toDate.setDate(toDate.getDate() - 1);
            newPosting.toDate = `${toDate.getDate().toString().padStart(2, '0')}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][toDate.getMonth()]}-${toDate.getFullYear()}`;
          }
        }
      }

      return {
        ...prev,
        postings: [...prev.postings, newPosting]
      };
    });
  };

  const removePosting = (id: string) => {
    console.log('Removing posting:', id);
    setProfile(prev => ({
      ...prev,
      postings: prev.postings.filter(p => p.id !== id)
    }));
  };

  const updatePosting = (id: string, field: string, value: string) => {
    setProfile(prev => {
      let newPostings = prev.postings.map(p => p.id === id ? { ...p, [field]: value } : p);
      
      // Auto-fetch hospital details if id changes
      if (field === 'hospital_id') {
        newPostings = newPostings.map(p => {
          if (p.id === id) {
            const h = hospitals.find(h => h.hospital_id === p.hospital_id);
            return { 
              ...p, 
              status: h ? (h.status || 'Sugam') : p.status, 
              above7000: h ? (h.above_7000_feet || 'No') : p.above7000
            };
          }
          return p;
        });
      }

      // Auto-calculate days if from/to dates are present
      const updatedPostings = newPostings.map(p => {
        if (p.id === id && (field === 'fromDate' || field === 'toDate')) {
          const startStr = field === 'fromDate' ? value : p.fromDate;
          const endStr = field === 'toDate' ? value : p.toDate;
          if (startStr && endStr) {
            const start = parseDateStr(startStr);
            const end = parseDateStr(endStr);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return { ...p, days: days > 0 ? days : 0 };
            }
          }
        }
        return p;
      });

      // Recalculate To Dates
      const sorted = [...updatedPostings].sort((a, b) => parseDateStr(b.fromDate).getTime() - parseDateStr(a.fromDate).getTime());
      
      const recalculatedPostings = updatedPostings.map(p => {
        const index = sorted.findIndex(s => s.id === p.id);
        let toDate = '';
        if (index === 0) {
          // 1 day before currentPostingJoiningDate
           const start = parseDateStr(prev.currentPostingJoiningDate);
           if (!isNaN(start.getTime())) {
              const d = new Date(start);
              d.setDate(d.getDate() - 1);
              toDate = formatDate(d);
           }
        } else {
          // 1 day before sorted[index-1].fromDate
          const prevPosting = sorted[index-1];
          if (!prevPosting.fromDate) {
              toDate = 'Pending';
          } else {
              const start = parseDateStr(prevPosting.fromDate);
              if (!isNaN(start.getTime())) {
                  const d = new Date(start);
                  d.setDate(d.getDate() - 1);
                  toDate = formatDate(d);
              } else {
                  toDate = 'Pending';
              }
          }
        }
        return { ...p, toDate: toDate || 'Pending' };
      });

      return { ...prev, postings: recalculatedPostings };
    });
  };

  const addAttachment = () => {
    setProfile(prev => ({
      ...prev,
      attachments: [...prev.attachments, { id: Date.now().toString() + Math.random().toString(36), hospital_id: '', hospital: '', from: '', to: '', status: 'Sugam', above7000: 'No', days: 0 }]
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
      let newAttachments = prev.attachments.map(a => a.id === id ? { ...a, [field]: value } : a);
      
      // Auto-fetch hospital details if name changes
      if (field === 'hospital') {
        newAttachments = newAttachments.map(a => {
          if (a.id === id) {
            const h = hospitals.find(h => h.facility_name === a.hospital);
            return { 
              ...a, 
              hospital_id: h ? h.hospital_id : '',
              status: h ? (h.status || 'Sugam') : a.status, 
              above7000: h ? ((h.region_indicator === 'Above 7000' || h.above_7000_feet === 'Yes') ? 'Yes' : 'No') : a.above7000
            };
          }
          return a;
        });
      }

      // Auto-calculate days if from/to dates are present
      const updatedAttachments = newAttachments.map(a => {
        if (a.id === id && (field === 'from' || field === 'to')) {
          const startStr = field === 'from' ? value : a.from;
          const endStr = field === 'to' ? value : a.to;
          if (startStr && endStr) {
            const start = parseDateStr(startStr);
            const end = parseDateStr(endStr);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return { ...a, days: days > 0 ? days : 0 };
            }
          }
        }
        return a;
      });
      return { ...prev, attachments: updatedAttachments };
    });
  };

  const handleRemoveAttachment = async (staffId: number) => {
    setStaffToDelete(staffId);
    setIsDeleteModalOpen(true);
  };

  const confirmRemoveAttachment = async () => {
    if (staffToDelete === null) return;
    
    const staffId = staffToDelete;
    
    toast.promise(
      (async () => {
        const targetHospitalId = session?.role === 'HOSPITAL' ? session.id : session?.hospitalId;
        
        // 1. Get current staff data
        const { data: staffData, error: fetchError } = await supabase
          .from('staff')
          .select('secondary_hospitals')
          .eq('id', staffId)
          .single();
          
        if (fetchError || !staffData) {
          throw new Error('Error fetching staff for removal');
        }
        
        // 2. Filter out the current hospital
        const updatedSecondaryHospitals = (staffData.secondary_hospitals || []).filter(
          (h: any) => String(h.hospital_id) !== String(targetHospitalId)
        );
        
        // 3. Update Supabase
        const { error: updateError } = await supabase
          .from('staff')
          .update({ secondary_hospitals: updatedSecondaryHospitals })
          .eq('id', staffId);
          
        if (updateError) {
          throw new Error('Error removing attachment');
        }
        
        // 4. Update local state
        setStaffList(prev => prev.filter(s => s.id !== staffId));
      })(),
      {
        loading: 'Removing attachment...',
        success: 'Attachment removed successfully',
        error: (err) => err.message || 'Error removing attachment',
      }
    );
    setStaffToDelete(null);
  };

  const handleOpenEditStaff = (staff: any) => {
    setEditingStaffId(staff.id);
    setStaffForm({ 
      fullName: staff.full_name || staff.name || '', 
      mobile: staff.mobile_number || staff.mobile || '', 
      role: staff.role || 'Pharmacist', 
      password: '',
      firstPostingPlace: staff.first_posting_place || ''
    });

    const currentHospitalId = session.activeHospitalId || session.hospitalId;
    console.log('Loading modules for staff:', staff.id, 'at hospital:', currentHospitalId);
    let modules = ['profile'];

    if (staff.hospital_id === currentHospitalId) {
      modules = staff.assigned_modules || ['profile'];
      console.log('Primary hospital assignment found:', modules);
    } else if (staff.secondary_hospitals && Array.isArray(staff.secondary_hospitals)) {
      const secAssignment = staff.secondary_hospitals.find((h: any) => h.hospital_id === currentHospitalId);
      if (secAssignment && secAssignment.assigned_modules) {
        modules = secAssignment.assigned_modules;
        console.log('Secondary hospital assignment found:', modules);
      } else {
        console.log('No assignment found for this hospital');
      }
    }

    if (modules.includes('eparchi_consultation') && !modules.includes('eparchi_queue')) {
      modules = [...modules, 'eparchi_queue'];
    }

    // Auto-include modules based on role
    if (staff.role === 'Panchkarma Sahayak (Male)' || staff.role === 'Panchkarma Sahayak (Female)') {
      if (!modules.includes('panchakarma')) {
        modules = [...modules, 'panchakarma'];
      }
    }
    if (staff.role === 'Yoga Instructor (Male)' || staff.role === 'Yoga Instructor (Female)') {
      if (!modules.includes('yoga_instructor')) {
        modules = [...modules, 'yoga_instructor'];
      }
    }

    setSelectedModules(modules);
    setIsStaffModalOpen(true);
  };

  const handleToggleModule = (moduleId: string) => {
    console.log('Toggling module:', moduleId);
    if (moduleId === 'profile') return; // Cannot toggle default module
    setSelectedModules(prev => {
      let next;
      if (prev.includes(moduleId)) {
        next = prev.filter(id => id !== moduleId);
      } else {
        next = [...prev, moduleId];
      }
      
      // Enforce Consultation -> Queue dependency
      if (next.includes('eparchi_consultation') && !next.includes('eparchi_queue')) {
        next.push('eparchi_queue');
      }
      
      return next;
    });
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staffForm.fullName) {
      alert('Name is compulsory! / नाम अनिवार्य है!');
      return;
    }

    if (!staffForm.mobile) {
      alert('Mobile Number is compulsory! / मोबाइल नंबर अनिवार्य है!');
      return;
    }

    if (isMobileRegistered) {
      alert('Mobile Number Already Registered! / मोबाइल नंबर पहले से पंजीकृत है!');
      return;
    }

    if (!staffForm.role) {
      alert('Role must be assigned! / भूमिका सौंपी जानी चाहिए!');
      return;
    }

    const payload: any = {
      hospital_id: session.activeHospitalId || session.hospitalId,
      full_name: staffForm.fullName,
      mobile_number: staffForm.mobile.trim(),
      role: staffForm.role,
      assigned_modules: selectedModules,
      login_password: 'ayush@123',
      is_active: true
    };

    console.log('Saving staff with modules:', selectedModules);
    if (editingStaffId) {
      const currentHospitalId = session.activeHospitalId || session.hospitalId;
      
      // Check if staff is being transferred from another hospital or just assigned secondarily
      const { data: currentStaff } = await supabase
        .from('staff')
        .select('*')
        .eq('id', editingStaffId)
        .single();

      if (currentStaff && currentStaff.hospital_id !== currentHospitalId) {
        // Staff belongs primarily to another hospital. Update secondary_hospitals.
        const currentSecondary = currentStaff.secondary_hospitals || [];
        const otherSecondary = currentSecondary.filter((h: any) => h.hospital_id !== currentHospitalId);
        
        const newSecondaryHospitals = [
          ...otherSecondary,
          {
            hospital_id: currentHospitalId,
            assigned_modules: selectedModules
          }
        ];
        console.log('Updating secondary_hospitals with:', newSecondaryHospitals);

        const { error } = await supabase
          .from('staff')
          .update({ secondary_hospitals: newSecondaryHospitals })
          .eq('id', editingStaffId);

        if (error) {
          alert('Update failed: ' + error.message);
          return;
        }
      } else {
        // Staff belongs primarily to THIS hospital. Update their main details.
        const updatePayload = {
          full_name: staffForm.fullName,
          mobile_number: staffForm.mobile.trim(),
          role: staffForm.role,
          assigned_modules: selectedModules,
          is_active: true
        };
        console.log('Sending update payload to Supabase:', updatePayload);
        const { error } = await supabase.from('staff').update(updatePayload).eq('id', editingStaffId);
        if (error) {
          if (error.code === '23505' || error.message?.includes('unique constraint')) {
            setIsMobileRegistered(true);
            alert('Mobile Number or Employee ID Already Registered! / मोबाइल नंबर या कर्मचारी आईडी पहले से पंजीकृत है!');
          } else {
            alert('Update failed: ' + error.message);
          }
          return;
        }
      }
    } else {
      const { error } = await supabase.from('staff').insert([payload]);
      if (error) {
        if (error.code === '23505' || error.message?.includes('unique constraint')) {
          setIsMobileRegistered(true);
          alert('Mobile Number or Employee ID Already Registered! / मोबाइल नंबर या कर्मचारी आईडी पहले से पंजीकृत है!');
        } else {
          alert('Addition failed: ' + error.message);
        }
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
        .or(`full_name.ilike.%${staffSearchQuery}%,employee_id.eq.${staffSearchQuery},mobile_number.eq.${staffSearchQuery}`);
      
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
  const [activeModules, setActiveModules] = useState<string[]>(session.activeModules || []);

  useEffect(() => {
    const fetchMyModules = async () => {
      if (!isAssignedStaff) return;

      const { data } = await supabase
        .from('staff')
        .select('hospital_id, assigned_modules, secondary_hospitals, role')
        .eq('id', session.id)
        .single();

      if (!data) return;

      const currentHospitalId = session.activeHospitalId || session.hospitalId;
      let modules: string[] = ['profile'];

      if (data.hospital_id === currentHospitalId) {
        // Main Posting staff — use assigned_modules directly
        modules = data.assigned_modules || ['profile'];
      } else if (data.secondary_hospitals && Array.isArray(data.secondary_hospitals)) {
        // Attachment staff — find modules from secondary_hospitals
        const match = data.secondary_hospitals.find(
          (h: any) => h.hospital_id === currentHospitalId
        );
        modules = (match && match.assigned_modules) ? match.assigned_modules : ['profile'];
      }

      // Auto-assign panchakarma
      if (data.role === 'Panchkarma Sahayak (Male)' || data.role === 'Panchkarma Sahayak (Female)') {
        if (!modules.includes('panchakarma')) {
          modules = [...modules, 'panchakarma'];
        }
      }

      // Auto-assign yoga_instructor
      if (data.role === 'Yoga Instructor (Male)' || data.role === 'Yoga Instructor (Female)') {
        if (!modules.includes('yoga_instructor')) {
          modules = [...modules, 'yoga_instructor'];
        }
      }
      
      setActiveModules(modules);
    };
    fetchMyModules();
  }, [isAssignedStaff, session.id]);

  const showDashboard = isHospital || isIncharge || (isAssignedStaff && activeModules.includes('e_parchi'));
  const showProfile = !isHospital && (isIncharge || (isAssignedStaff && activeModules.includes('profile')));
  const showStaff = isHospital || isIncharge;
  const showHospitalProfile = isIncharge;
  const showEParchi = isHospital || isIncharge || (isAssignedStaff && (
    activeModules.includes('e_parchi') || 
    activeModules.includes('eparchi_registration') || 
    activeModules.includes('eparchi_consultation') || 
    activeModules.includes('eparchi_queue') || 
    activeModules.includes('eparchi_pharmacy')
  ));
  const showPatients = isHospital || isIncharge || (isAssignedStaff && (
    activeModules.includes('e_parchi') || 
    activeModules.includes('eparchi_registration') || 
    activeModules.includes('eparchi_consultation') || 
    activeModules.includes('eparchi_queue') || 
    activeModules.includes('eparchi_pharmacy')
  ));
  const showMedicineManagement = !isHospital && (isIncharge || (isAssignedStaff && activeModules.includes('inventory')));
  const showMedicineDemand = (isIncharge || (isAssignedStaff && activeModules.includes('medicine_demand'))) && isModuleActive;
  const currentHospitalId = session.activeHospitalId || session.hospitalId;
  const currentHospitalInfo = hospitals.find(h => h.hospital_id === currentHospitalId);
  const showPanchakarma = (isIncharge || (isAssignedStaff && activeModules.includes('panchakarma'))) 
    && (hospitalDetails?.panchakarma_centre || currentHospitalInfo?.panchakarma_centre);
  const showYoga = isIncharge || (isAssignedStaff && (activeModules.includes('yoga_instructor') || activeModules.includes('yoga_control')));
  const showRapidTests = isIncharge || (isAssignedStaff && activeModules.includes('rapid_tests'));
  const showSpecialTherapy = isIncharge || (isAssignedStaff && activeModules.includes('special_therapy'));
  const showDistrictSupply = userRole === 'DISTRICT_ADMIN';

  const canRegister = isIncharge || isHospital || activeModules.includes('e_parchi') || activeModules.includes('eparchi_registration');
  const canConsult = isIncharge || isHospital || activeModules.includes('e_parchi') || activeModules.includes('eparchi_consultation');
  const canViewQueue = isIncharge || isHospital || activeModules.includes('e_parchi') || activeModules.includes('eparchi_queue');
  const canDispense = isIncharge || isHospital || activeModules.includes('e_parchi') || activeModules.includes('eparchi_pharmacy');

  // Set default active tab based on permissions
  React.useEffect(() => {
    if (activeTab === 'dashboard' && !showDashboard && showProfile) {
      setActiveTab('profile');
    }
    if (activeTab === 'medicine_demand' && !showMedicineDemand) {
      setActiveTab(showDashboard ? 'dashboard' : 'profile');
    }
    if (activeTab === 'inventory' && !showMedicineManagement) {
      setActiveTab(showDashboard ? 'dashboard' : 'profile');
    }
    if (activeTab === 'special_therapy' && !showSpecialTherapy) {
      setActiveTab(showDashboard ? 'dashboard' : 'profile');
    }
  }, [showDashboard, showProfile, showMedicineDemand, showMedicineManagement, showSpecialTherapy]);

  const calculateDuration = (startDateStr: string) => {
    if (!startDateStr) return '---';
    
    let startDate: Date;
    
    // Handle DD-MMM-YYYY
    if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(startDateStr)) {
      const [day, monthStr, year] = startDateStr.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
      if (monthIndex !== -1) {
        startDate = new Date(parseInt(year), monthIndex, parseInt(day));
      } else {
        return '---';
      }
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(startDateStr)) {
      const [d, m, y] = startDateStr.split('-');
      startDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else {
      startDate = new Date(startDateStr);
    }

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

  const isMedicalOfficer = ['Medical Officer', 'Senior Medical Officer', 'SMO / ADAUO', 'DAUO', 'JD'].includes(profile.designation);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32 bg-slate-50 min-h-screen">
      <Toaster />
      {/* Header & Navigation */}
      <div className="mb-8">
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Command Center</h1>
            <div className="flex flex-col">
              {isIncharge ? (
                <div className="flex flex-col">
                  <span className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md w-fit">Incharge</span>
                  <button 
                    onClick={() => setIsCorrectionModalOpen(true)}
                    className="text-[10px] text-emerald-600 hover:underline mt-1 font-bold text-left"
                  >
                    Are you Not an Incharge?
                  </button>
                </div>
              ) : !isHospital && (
                <button 
                  onClick={() => setIsCorrectionModalOpen(true)}
                  className="text-[10px] text-slate-400 hover:text-emerald-600 hover:underline font-bold text-left"
                >
                  Are you an Incharge?
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Main Tabs - Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-lg flex p-1 gap-1 overflow-x-auto w-full">
          <div className="flex gap-1">
            {showDashboard && (
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <LayoutDashboard size={16} /> Dash
              </button>
            )}
            {showProfile && (
              <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <User size={16} /> Profile
              </button>
            )}
            {isMedicalOfficer && (
              <button onClick={() => setActiveTab('deep_profile')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'deep_profile' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <UserCircle2 size={16} /> Deep
              </button>
            )}
            {isMedicalOfficer && (
              <button onClick={() => setActiveTab('doctor_feedback')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'doctor_feedback' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <Star size={16} /> Feedback
              </button>
            )}
            {showHospitalProfile && (
              <button onClick={() => setActiveTab('hospital_profile')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'hospital_profile' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <Building2 size={16} /> Hosp
              </button>
            )}
            {showStaff && (
              <button onClick={() => setActiveTab('staff')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'staff' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <Users size={16} /> Staff
              </button>
            )}
            {showEParchi && (
              <button onClick={() => setActiveTab('eparchi')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'eparchi' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <FileText size={16} /> OPD
              </button>
            )}
            {showPatients && (
              <button onClick={() => setActiveTab('patients')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'patients' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <Users size={16} /> Pats
              </button>
            )}
            {showMedicineDemand && (
              <button onClick={() => setActiveTab('medicine_demand')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'medicine_demand' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <ClipboardList size={16} /> Demand
              </button>
            )}
            {showMedicineManagement && (
              <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <Package size={16} /> Inv
              </button>
            )}
            {showPanchakarma && (
              <button onClick={() => setActiveTab('panchakarma')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'panchakarma' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <Hand size={16} /> Pancha
              </button>
            )}
            {showYoga && (
              <button onClick={() => setActiveTab('yoga')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'yoga' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <Sun size={16} /> Yoga
              </button>
            )}
            {showSpecialTherapy && (
              <button onClick={() => setActiveTab('special_therapy')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'special_therapy' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <Stethoscope size={16} /> Therap
              </button>
            )}
            {sthananataranModuleActive && (
              <button onClick={() => setActiveTab('sthananataran')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'sthananataran' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <Truck size={16} /> Sthan
              </button>
            )}
            {isIncharge && (
              <button onClick={() => setActiveTab('certificate')} className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-[10px] transition-all whitespace-nowrap ${activeTab === 'certificate' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                <FileText size={16} /> Cert
              </button>
            )}
          </div>
        </div>
        
        {/* Sub-Tabs Container */}
        {(activeTab === 'profile' || activeTab === 'staff' || activeTab === 'eparchi' || activeTab === 'inventory') && (
          <div className="fixed bottom-[40px] md:bottom-[72px] left-0 right-0 z-40 flex justify-center">
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg rounded-full overflow-x-auto flex p-1 gap-1 max-w-[90vw]">
              {activeTab === 'profile' && (
                <>
                  <button onClick={() => setProfileSubTab('basic')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all ${profileSubTab === 'basic' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Basic</button>
                  {profile.employmentType === 'Permanent' && (
                    <button onClick={() => setProfileSubTab('service')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all ${profileSubTab === 'service' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Service</button>
                  )}
                  <button onClick={() => setProfileSubTab('trainings')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all ${profileSubTab === 'trainings' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Trainings</button>
                </>
              )}
              {activeTab === 'staff' && isIncharge && (
                <>
                  <button onClick={() => setStaffSubTab('list')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all ${staffSubTab === 'list' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>List</button>
                  <button onClick={() => setStaffSubTab('registration_requests')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all ${staffSubTab === 'registration_requests' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Requests</button>
                </>
              )}
              {activeTab === 'eparchi' && (
                <>
                  {canRegister && <button onClick={() => setEparchiSubTab('registration')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${eparchiSubTab === 'registration' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Registration</button>}
                  {(canViewQueue || canConsult) && <button onClick={() => setEparchiSubTab('queue')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${eparchiSubTab === 'queue' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Consultation Queue</button>}
                  {canDispense && <button onClick={() => setEparchiSubTab('dispensing')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${eparchiSubTab === 'dispensing' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Pharmacy Dispensing</button>}
                </>
              )}
              {activeTab === 'inventory' && (
                <>
                  <button onClick={() => setInventorySubTab('receive')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${inventorySubTab === 'receive' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Receive Stock</button>
                  <button onClick={() => setInventorySubTab('add_request')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${inventorySubTab === 'add_request' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Add/Request Stock</button>
                  <button onClick={() => setInventorySubTab('main')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${inventorySubTab === 'main' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Main Inventory</button>
                  <button onClick={() => setInventorySubTab('indent_logs')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${inventorySubTab === 'indent_logs' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Indent Logs</button>
                  <button onClick={() => setInventorySubTab('indent')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${inventorySubTab === 'indent' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Indent</button>
                  <button onClick={() => setInventorySubTab('consumption')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${inventorySubTab === 'consumption' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Daily Consumption</button>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Desktop Tabs */}
        <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-50 justify-center pb-4">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-full overflow-x-auto flex p-1.5 gap-1 max-w-[90vw]">
            {showDashboard && (
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <LayoutDashboard size={18} /> {activeTab === 'dashboard' && 'Hospital Dashboard'}
              </button>
            )}
            {showProfile && (
              <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <User size={18} /> {activeTab === 'profile' && 'My Profile'}
              </button>
            )}
            {isMedicalOfficer && (
              <button onClick={() => setActiveTab('deep_profile')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'deep_profile' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <UserCircle2 size={18} /> {activeTab === 'deep_profile' && 'Deep Profile'}
              </button>
            )}
            {isMedicalOfficer && (
              <button onClick={() => setActiveTab('doctor_feedback')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'doctor_feedback' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Star size={18} /> {activeTab === 'doctor_feedback' && 'Doctor Feedback'}
              </button>
            )}
            {showHospitalProfile && (
              <button onClick={() => setActiveTab('hospital_profile')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'hospital_profile' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Building2 size={18} /> {activeTab === 'hospital_profile' && 'Hospital Profile'}
              </button>
            )}
            {showStaff && (
              <button onClick={() => setActiveTab('staff')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'staff' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Users size={18} /> {activeTab === 'staff' && (isIncharge ? 'Manage Staff' : 'Hospital Staff')}
              </button>
            )}
            {showEParchi && (
              <button onClick={() => setActiveTab('eparchi')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'eparchi' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <FileText size={18} /> {activeTab === 'eparchi' && 'E-Parchi Desk'}
              </button>
            )}
            {showPatients && (
              <button onClick={() => setActiveTab('patients')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'patients' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Users size={18} /> {activeTab === 'patients' && 'Patients'}
              </button>
            )}
            {showMedicineDemand && (
              <button onClick={() => setActiveTab('medicine_demand')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'medicine_demand' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <ClipboardList size={18} /> {activeTab === 'medicine_demand' && 'Medicine Demand'}
              </button>
            )}
            {showMedicineManagement && (
              <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Package size={18} /> {activeTab === 'inventory' && 'Medicine Management'}
              </button>
            )}
            {showPanchakarma && (
              <button onClick={() => setActiveTab('panchakarma')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'panchakarma' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Hand size={18} /> {activeTab === 'panchakarma' && 'Panchakarma Centre'}
              </button>
            )}
            {showYoga && (
              <button onClick={() => setActiveTab('yoga')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'yoga' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Sun size={18} /> {activeTab === 'yoga' && 'Yoga Session'}
              </button>
            )}
            {showRapidTests && (
              <button onClick={() => setActiveTab('rapid_tests')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'rapid_tests' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Activity size={18} /> {activeTab === 'rapid_tests' && 'Rapid Tests'}
              </button>
            )}
            {showSpecialTherapy && (
              <button onClick={() => setActiveTab('special_therapy')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'special_therapy' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Stethoscope size={18} /> {activeTab === 'special_therapy' && 'Special Therapy'}
              </button>
            )}
            {sthananataranModuleActive && (
              <button onClick={() => setActiveTab('sthananataran')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'sthananataran' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Truck size={18} /> {activeTab === 'sthananataran' && 'Sthananataran'}
              </button>
            )}
            {isIncharge && (
              <button onClick={() => setActiveTab('certificate')} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'certificate' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                <FileText size={18} /> {activeTab === 'certificate' && 'Certificate Module'}
              </button>
            )}
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Today's OPD</p>
                  <p className="text-3xl font-bold text-slate-900">{todayOpd !== null ? todayOpd : '--'}</p>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Active Staff</p>
                  <p className="text-3xl font-bold text-slate-900">{activeStaffCount !== null ? activeStaffCount : '--'}</p>
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
              <button className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left">
                <div className="bg-purple-50 w-14 h-14 rounded-2xl flex items-center justify-center text-purple-600">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Total Fee</p>
                  <p className="text-3xl font-bold text-slate-900">₹{feeGeneratedThisMonth !== null ? feeGeneratedThisMonth : '--'}</p>
                </div>
              </button>
            </div>

              {/* CTA Bento */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

              {showMedicineManagement && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center md:text-left flex flex-col justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Inventory Management</h2>
                    <p className="text-slate-500 mt-1">Manage medicine stock, indent, and daily consumption logs.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('inventory')} 
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 whitespace-nowrap"
                  >
                    <Package size={24} />
                    Open Inventory
                  </button>
                </div>
              )}

              {isIncharge && (
                <div className="bg-slate-900 rounded-3xl p-8 shadow-sm text-white flex flex-col gap-6">
                  <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">Facility Staff</h2>
                      <p className="text-slate-400 mt-1">Manage your facility's staff members.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {staffList.length > 0 ? (
                      staffList.map((staff, index) => (
                        <div key={staff.id || `staff-${index}`} className="bg-white/5 rounded-xl p-4 flex justify-between items-center border border-white/10">
                          <div>
                            <p className="font-bold text-white">{staff.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{staff.role}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-slate-400 text-sm">No staff members found.</p>
                      </div>
                    )}
                  </div>

                  {onEditHospital && (
                    <button 
                      onClick={() => setActiveTab('staff')} 
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 w-full mt-auto"
                    >
                      <Users size={18} />
                      Manage Staff
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <Profiler 
            staffId={session.id} 
            userRole={session.role}
            isIncharge={isIncharge}
            hospitalName={hospitalName}
            hospitals={hospitals}
            activeSubTab={profileSubTab}
            onDirtyChange={(dirty) => setIsDirty(dirty)}
          />
        )}

        {activeTab === 'deep_profile' && isMedicalOfficer && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="text-emerald-600" size={20} /> Deep Profile
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">BCP Registration Number</label>
                  <input 
                    value={profile.bcpRegistrationNo} 
                    onChange={e => setProfile({...profile, bcpRegistrationNo: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Degree / Highest Qualification</label>
                  <input 
                    value={profile.qualification} 
                    onChange={e => setProfile({...profile, qualification: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Clinical Experience since year</label>
                  <input 
                    type="number"
                    placeholder="YYYY"
                    value={profile.clinicalExperienceSince} 
                    onChange={e => setProfile({...profile, clinicalExperienceSince: e.target.value})} 
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Specialization If any</label>
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Expertise Keywords (e.g. Diabetes, NCD Reversal)</label>
                  <div 
                    onClick={() => setIsKeywordsModalOpen(true)}
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 min-h-[50px] cursor-pointer hover:bg-slate-100 transition-colors flex flex-wrap gap-2"
                  >
                    {profile.keywords ? (
                      profile.keywords.split(',').map(kw => (
                        <span key={kw} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-xs font-bold border border-emerald-100">
                          {kw.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-sm">Select expertise keywords...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Save size={24} />
              Save Deep Profile Details
            </button>
          </form>
        )}

        {activeTab === 'doctor_feedback' && isMedicalOfficer && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Star className="text-amber-400 fill-amber-400" size={24} /> Doctor Feedback
                </h2>
                <p className="text-slate-500 mt-1">What patients are saying about your service.</p>
              </div>
              <div className="bg-slate-50 px-6 py-4 rounded-[2rem] border border-gray-100 flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-black text-slate-900">{(avgRating || 0).toFixed(1)}</div>
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
                  <div key={review.id !== undefined && review.id !== null ? review.id : `review-${idx}`} className="p-6 rounded-2xl border border-gray-50 bg-slate-50/30">
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

        {activeTab === 'hospital_profile' && showHospitalProfile && (
          <div className="space-y-8">
            <HospitalProfile 
              hospitalDetails={hospitalDetails} 
              onUpdate={() => onUpdateHospital?.()} 
              session={session}
              onDirtyChange={(dirty) => {
                setIsHospitalProfileDirty(dirty);
                onHospitalProfileDirtyChange?.(dirty);
              }}
            />

            {/* Hospital Feedback Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Star className="text-amber-400 fill-amber-400" size={24} /> Hospital Ratings
                  </h2>
                  <p className="text-slate-500 mt-1">What patients are saying about your facility.</p>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-[2rem] border border-gray-100 flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-slate-900">{(hospitalAvgRating || 0).toFixed(1)}</div>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} className={`${hospitalAvgRating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="w-px h-10 bg-gray-200" />
                  <div className="text-center">
                    <div className="text-3xl font-black text-slate-900">{hospitalReviews.length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reviews</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {hospitalReviews.length > 0 ? (
                  hospitalReviews.map((review, idx) => (
                    <div key={review.id || `h-review-${idx}`} className="p-6 rounded-2xl border border-gray-50 bg-slate-50/30">
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
                    <p className="text-slate-400 font-medium">No hospital feedback received yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Hospital Staff</h2>
                <p className="text-sm text-slate-500 mt-1">{isIncharge ? 'Manage roles and access for your facility.' : 'View staff associated with your facility.'}</p>
              </div>
              {isIncharge && (
                <div className="flex items-center">
                  <button 
                    onClick={() => {
                      toast((t) => (
                        <div className="flex flex-col gap-3">
                          <p className="text-sm font-medium">Use this button only to attach an employee</p>
                          <div className="flex gap-2">
                            <button onClick={() => { handleOpenAddStaff(); toast.dismiss(t.id); }} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Ok, I want to Attach</button>
                            <button onClick={() => toast.dismiss(t.id)} className="bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold">No Go Back</button>
                          </div>
                        </div>
                      ));
                    }}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-l-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2"
                  >
                    <Plus size={16} /> Attach existing staff
                  </button>
                  
                  <button 
                    onClick={() => {
                      toast((t) => (
                        <div className="flex flex-col gap-3">
                          <p className="text-sm font-medium">Are you sure, You want to create a new employee?</p>
                          <div className="flex gap-2">
                            <button onClick={() => { setIsAddEmployeeModalOpen(true); toast.dismiss(t.id); }} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Yes</button>
                            <button onClick={() => toast.dismiss(t.id)} className="bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold">No Go back</button>
                          </div>
                        </div>
                      ));
                    }}
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-r-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 border-l border-emerald-700"
                  >
                    <Plus size={16} /> Add New Employee
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8">
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">Instructions</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>किसी अन्य चिकित्सालय में मूल रूप से तैनात कार्मिक को अपने चिकित्सालय में तैनात अटैच करने के लिए <strong>Attach Existing Staff</strong> बटन का प्रयोग करें।</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>किसी नए कार्मिक को अपने चिकित्सालय में जोड़ने हेतु <strong>Add New Employee</strong> बटन का प्रयोग करें।</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>किसी अटैच कर्मचारी को अपने चिकित्सालय से हटाने के लिए कर्मचारी के सामने वाली रो में <strong>Delete</strong> का आइकॉन दबायें।</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>किसी कर्मचारी का स्थानांतरण होने पर उस कर्मचारी को लॉगिन करके सबसे ऊपर की लाइन में लिखे अस्पताल के नाम पर क्लिक करते हुए <strong>Change Hospital</strong> पर क्लिक करने हेतु निर्देशित करें, जिसके पश्चात नवीन चिकित्सालय जहाँ तैनाती हुई है, उस जिले के DAUO के अनुमोदन के उपरांत उक्त कार्मिक स्वतः ही आपके चिकित्सालय में जुड़ जायेंगे।</span>
                </li>
              </ul>
            </div>

            {staffSubTab === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Staff Member</th>
                      <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Role</th>
                      <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Staff Type</th>
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
                    {staffList.map((staff, index) => (
                      <tr key={staff.id || `staff-tr-${index}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <UserCircle2 size={24} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{staff.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">ID: {staff.employee_id || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${staff.roleColor}`}>
                            {staff.role}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {staff.staffType}
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
                              <div className="flex justify-end gap-2">
                                {staff.staffType === 'Attachment' && (
                                  <button 
                                    onClick={() => handleRemoveAttachment(staff.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Remove Attachment"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleOpenEditStaff(staff)}
                                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                {console.log('RegistrationRequests session prop:', session)}
                <RegistrationRequests session={session} />
              </>
            )}
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <PatientList hospitalId={session.selectedHospitalId || session.hospitalId || session.id} />
          </div>
        )}

        {activeTab === 'eparchi' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <EParchi 
              hospitalId={session.selectedHospitalId || session.hospitalId || session.id} 
              hospitalName={hospitalName}
              district={hospitalDetails?.district}
              hospitalType={hospitalDetails?.type}
              regionIndicator={hospitalDetails?.region_indicator}
              session={session}
              activeSubTab={eparchiSubTab}
              onNavigateToIndent={() => {
                setActiveTab('inventory');
                setInventorySubTab('indent');
              }}
            />
          </div>
        )}

        {showMedicineManagement && activeTab === 'inventory' && (
          <div className="bg-white rounded-3xl p-2 sm:p-4 md:p-8 shadow-sm border border-gray-100">
            <InventoryManager hospitalId={session.selectedHospitalId || session.hospitalId || session.id} district={profile.presentDistrict} activeSubTab={inventorySubTab} />
          </div>
        )}

        {showMedicineDemand && activeTab === 'medicine_demand' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <MedicineDemandSystem session={session} />
          </div>
        )}
        {activeTab === 'panchakarma' && (
          <div className="bg-white rounded-3xl p-2 sm:p-4 md:p-8 shadow-sm border border-gray-100">
            <PanchakarmaModule session={session} />
          </div>
        )}
        {activeTab === 'yoga' && (
          <div className="bg-white rounded-3xl p-2 sm:p-4 md:p-8 shadow-sm border border-gray-100">
            <YogaModule session={session} />
          </div>
        )}
        {activeTab === 'rapid_tests' && (
          <div className="bg-white rounded-3xl p-2 sm:p-4 md:p-8 shadow-sm border border-gray-100">
            <RapidTests hospitalId={session.selectedHospitalId || session.hospitalId || session.id} staffId={session.id} />
          </div>
        )}
        {activeTab === 'special_therapy' && (
          <div className="bg-white rounded-3xl p-2 sm:p-4 md:p-8 shadow-sm border border-gray-100">
            <SpecialTherapyModule session={session} />
          </div>
        )}
        {activeTab === 'sthananataran' && (
          <div className="bg-white rounded-3xl p-2 sm:p-4 md:p-8 shadow-sm border border-gray-100">
            <Sthananataran session={session} profile={profile} />
          </div>
        )}
        {activeTab === 'certificate' && (
          <div className="bg-white rounded-3xl p-2 sm:p-4 md:p-8 shadow-sm border border-gray-100">
            <CertificateModule session={session} hospitalName={hospitalName} />
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
                        type="tel"
                        pattern="[0-9]{10}"
                        title="Please enter a valid 10-digit mobile number"
                        value={staffForm.mobile} 
                        onChange={e => setStaffForm({...staffForm, mobile: e.target.value})} 
                        className={`w-full bg-slate-50 border ${isMobileRegistered ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-emerald-500/20'} rounded-2xl py-3 px-4 focus:outline-none focus:ring-2`} 
                      />
                      {isCheckingMobile && <p className="text-xs text-slate-500 ml-4 mt-1">Checking mobile number...</p>}
                      {isMobileRegistered && <p className="text-xs text-red-500 font-bold ml-4 mt-1">Mobile Number Already Registered</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Role</label>
                      <select 
                        value={staffForm.role} 
                        onChange={e => {
                          const newRole = e.target.value;
                          setStaffForm({...staffForm, role: newRole});
                          
                          let newModules = [...selectedModules];
                          if (newRole === 'Panchkarma Sahayak (Male)' || newRole === 'Panchkarma Sahayak (Female)') {
                            if (!newModules.includes('panchakarma')) newModules.push('panchakarma');
                          } else if (newRole === 'Yoga Instructor (Male)' || newRole === 'Yoga Instructor (Female)') {
                            if (!newModules.includes('yoga_instructor')) newModules.push('yoga_instructor');
                          }
                          setSelectedModules(newModules);
                        }}
                        className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {roles.map((role, index) => (
                          <option key={role + index} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    {/* Password field removed */}
                  </div>
                </div>

                {/* Module Assignment */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <Shield size={16} /> Module Assignment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Default Profile Module */}
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 opacity-70 cursor-not-allowed">
                      <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span className="font-bold text-sm text-slate-700">My Profile & Service Record</span>
                    </div>

                    {/* Dynamic Modules */}
                    {AVAILABLE_MODULES.map((module, index) => {
                      const isChecked = selectedModules.includes(module.id);
                      return (
                        <div
                          key={module.id || `mod-${index}`}
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
                    disabled={isMobileRegistered}
                    className={`${isMobileRegistered ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95'} px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2`}
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
                  staffSearchResults.map((staff, index) => (
                    <div key={staff.id || `staff-div-${index}`} className="p-4 rounded-2xl border border-gray-100 bg-slate-50/50 flex justify-between items-center">
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
        {isActualHospitalChangeModalOpen && (
          <HospitalChangeModal 
            isOpen={isActualHospitalChangeModalOpen} 
            onClose={() => setIsActualHospitalChangeModalOpen(false)} 
            currentHospitalId={profile.hospitalConnectedId} 
            staffId={session.id}
            onConfirm={(newHospitalId: string, newHospitalName: string) => {
              // Handle hospital change confirmation
              console.log('Hospital changed to:', newHospitalName, newHospitalId);
              setIsActualHospitalChangeModalOpen(false);
            }}
            hospitals={hospitals}
          />
        )}
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

      <AnimatePresence>
        {isUnsavedChangesModalOpen && (
          <div key="unsaved-changes-modal" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm">
              <h2 className="text-xl font-bold mb-4">Unsaved Changes</h2>
              <p className="mb-6">You have unsaved changes in your Profile. Please save before switching.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsUnsavedChangesModalOpen(false)}
                  className="flex-1 bg-slate-100 py-2 rounded-xl font-bold"
                >
                  Go Back
                </button>
                <button 
                  onClick={() => {
                    setIsUnsavedChangesModalOpen(false);
                    setIsDirty(false);
                    if (pendingTab) _setActiveTab(pendingTab as any);
                  }}
                  className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSaveSuccessModalOpen && (
          <div key="save-success-modal" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm text-center">
              <CheckCircle className="text-emerald-500 mx-auto mb-4" size={48} />
              <h2 className="text-xl font-bold mb-2">Profile Saved Successfully!</h2>
            </div>
          </div>
        )}
      </AnimatePresence>
      {/* Unsaved Changes Modal */}
      <AnimatePresence>
        {showUnsavedModal && (
          <div key="show-unsaved-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-gray-100"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                <Shield size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Want to Save Profile Before Leaving?</h3>
              <p className="text-slate-500 mb-8">You have unsaved changes in the hospital profile. What would you like to do?</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowUnsavedModal(false);
                    setPendingTab(null);
                  }}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                >
                  Yes, Go back
                </button>
                <button
                  onClick={() => {
                    setIsHospitalProfileDirty(false);
                    setShowUnsavedModal(false);
                    if (pendingTab) _setActiveTab(pendingTab as any);
                    setPendingTab(null);
                  }}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-[0.98]"
                >
                  No, discard changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div key="staff-delete">
            <StaffDeleteConfirmationModal 
              isOpen={isDeleteModalOpen} 
              onClose={() => setIsDeleteModalOpen(false)} 
              onConfirm={confirmRemoveAttachment} 
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!!postingToDelete && (
          <div key="posting-delete">
            <PostingDeleteConfirmationModal 
              isOpen={!!postingToDelete} 
              onClose={() => setPostingToDelete(null)} 
              onConfirm={() => {
                if (postingToDelete) {
                  removePosting(postingToDelete);
                  setPostingToDelete(null);
                }
              }} 
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isKeywordsModalOpen && (
          <div key="keywords-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Expertise Keywords</h2>
                  <p className="text-slate-500 text-sm mt-1">Select your areas of specialization</p>
                </div>
                <button 
                  onClick={() => setIsKeywordsModalOpen(false)}
                  className="p-3 hover:bg-white rounded-2xl transition-colors shadow-sm"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {EXPERTISE_KEYWORDS.map(keyword => {
                    const isSelected = (profile.keywords || "").split(',').map(k => k.trim()).filter(k => k !== '').includes(keyword);
                    return (
                      <label 
                        key={keyword}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer group ${
                          isSelected 
                            ? 'bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-100/50' 
                            : 'bg-white border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-emerald-600 border-emerald-600' 
                            : 'bg-white border-gray-200 group-hover:border-emerald-300'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        <input 
                          type="checkbox"
                          className="hidden"
                          checked={isSelected}
                          onChange={() => {
                            let currentKeywords = profile.keywords ? profile.keywords.split(',').map(k => k.trim()).filter(k => k !== '') : [];
                            if (isSelected) {
                              currentKeywords = currentKeywords.filter(k => k !== keyword);
                            } else {
                              currentKeywords.push(keyword);
                            }
                            setProfile({ ...profile, keywords: currentKeywords.join(', ') });
                          }}
                        />
                        <span className={`text-sm font-bold transition-colors ${
                          isSelected ? 'text-emerald-700' : 'text-slate-600 group-hover:text-emerald-600'
                        }`}>
                          {keyword}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-8 border-t border-gray-100 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsKeywordsModalOpen(false)}
                  className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddEmployeeModalOpen && (
          <div key="add-employee">
            <AddEmployeeModal 
              isOpen={isAddEmployeeModalOpen} 
              onClose={() => setIsAddEmployeeModalOpen(false)} 
              onAdd={() => {
                setIsAddEmployeeModalOpen(false);
                // Optionally refresh staff list
              }}
              hospitals={hospitals || []}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


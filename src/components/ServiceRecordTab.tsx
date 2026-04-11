import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Calendar, Shield, Plus, X, Loader2, Save, CheckCircle, User, Camera, UserCircle2, Upload, Eye, EyeOff, GraduationCap, Activity, Printer, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HospitalSearchInput } from './SearchInputs';
import imageCompression from 'browser-image-compression';
import { useRef } from 'react';
import EmployeeDetailsPanel from './EmployeeDetailsPanel';
import HospitalChangeModal from './HospitalChangeModal';

const UTTARAKHAND_DISTRICTS = [
  'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar',
  'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal',
  'Udham Singh Nagar', 'Uttarkashi'
];

interface ServiceRecordTabProps {
  targetStaffId: string;
  isAdminMode: boolean;
  onBack?: () => void;
}

export default function ServiceRecordTab({ targetStaffId, isAdminMode, onBack }: ServiceRecordTabProps) {
  const [profile, setProfile] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showPrintPanel, setShowPrintPanel] = useState(false);
  const [rawStaffData, setRawStaffData] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'posting' | 'leave' | 'attachment', id: string } | null>(null);
  const [hospitalDetails, setHospitalDetails] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'service'>('basic');
  const [isActualHospitalChangeModalOpen, setIsActualHospitalChangeModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [roles, setRoles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateDays = (fromDate: string, toDate: string) => {
    const start = parseDateStr(fromDate);
    const end = toDate === 'Present' ? new Date() : parseDateStr(toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 0;
  };

  useEffect(() => {
    fetchData();
  }, [targetStaffId]);

  useEffect(() => {
    if (!profile) return;
    
    const presentStart = parseDateStr(profile.currentPostingJoiningDate);
    const presentEnd = new Date();
    
    let error = null;
    profile.postings.forEach((p: any) => {
      const start = parseDateStr(p.fromDate);
      const end = parseDateStr(p.toDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
      
      if (presentStart <= end && start <= presentEnd) {
        error = 'Overlapping dates detected between Present Posting and Posting History.';
      }
    });
    setOverlapError(error);
  }, [profile?.postings, profile?.currentPostingJoiningDate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const options = {
        maxSizeMB: 0.05,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const fileExt = file.name.split('.').pop();
      const fileName = `${targetStaffId}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-photos')
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('staff-photos')
        .getPublicUrl(filePath);

      setProfile((prev: any) => ({ ...prev, photograph: publicUrl }));
      setHasUnsavedChanges(true);
      alert('Photo uploaded successfully!');
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const addTraining = () => {
    setProfile((prev: any) => ({
      ...prev,
      trainings: [...prev.trainings, { id: Date.now().toString(), title: '', year: '' }]
    }));
    setHasUnsavedChanges(true);
  };

  const removeTraining = (id: string) => {
    setProfile((prev: any) => ({
      ...prev,
      trainings: prev.trainings.filter((t: any) => t.id !== id)
    }));
    setHasUnsavedChanges(true);
  };

  const updateTraining = (id: string, field: string, value: string) => {
    setProfile((prev: any) => ({
      ...prev,
      trainings: prev.trainings.map((t: any) => t.id === id ? { ...t, [field]: value } : t)
    }));
    setHasUnsavedChanges(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all hospitals for search inputs
      const { data: hospitalsData } = await supabase.from('hospitals').select('*');
      if (hospitalsData) setHospitals(hospitalsData);

      // Fetch roles
      const { data: rolesData } = await supabase.from('roles').select('role_name');
      if (rolesData) setRoles(rolesData.map((r: any) => r.role_name));

      // Fetch staff details
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', targetStaffId)
        .single();

      if (staffError) throw staffError;

      if (staffData) {
        setRawStaffData(staffData);
        // Fetch current hospital details
        if (staffData.hospital_id) {
          const { data: hData } = await supabase
            .from('hospitals')
            .select('*')
            .eq('hospital_id', staffData.hospital_id)
            .maybeSingle();
          if (hData) setHospitalDetails(hData);
        }

        // Fetch doctor profile for specialization etc.
        const { data: docData } = await supabase
          .from('doctor_profiles')
          .select('*')
          .eq('staff_id', targetStaffId)
          .maybeSingle();

        const presentPosting = (staffData.postings || []).find((p: any) => p.toDate === 'Present' || p.toDate === 'present');
        let presentHospitalId = staffData.present_hospital_id || (presentPosting ? presentPosting.hospital_id : '');
        
        let presentHospitalObj = hospitalsData.find(h => h.hospital_id === presentHospitalId);
        if (!presentHospitalObj && staffData.present_hospital) {
          presentHospitalObj = hospitalsData.find(h => h.facility_name === staffData.present_hospital);
          if (presentHospitalObj) {
            presentHospitalId = presentHospitalObj.hospital_id;
          }
        }
        
        const presentHospitalName = presentHospitalObj ? presentHospitalObj.facility_name : (staffData.present_hospital || '');
        const firstHospitalObj = hospitalsData.find(h => h.facility_name === staffData.first_posting_place);

        setProfile({
          fullName: staffData.full_name || '',
          designation: staffData.role || '',
          empId: staffData.employee_id || '',
          mobile: staffData.mobile_number || '',
          password: staffData.login_password || '',
          fatherName: staffData.father_name || '',
          photograph: staffData.photograph_url || '',
          email: staffData.email_id || '',
          employmentClass: staffData.employment_class || 'Class II',
          employmentType: staffData.employment_type || 'Permanent',
          gender: staffData.gender || 'Male',
          dob: formatDateForUI(staffData.dob),
          currentPostingJoiningDate: formatDateForUI(staffData.current_posting_joining_date || (presentPosting ? presentPosting.fromDate : '')),
          presentDistrict: staffData.present_district || '',
          presentHospital: presentHospitalName,
          presentHospitalId: presentHospitalId,
          presentPostingType: presentHospitalObj ? (presentHospitalObj.status || 'Sugam') : (presentPosting ? presentPosting.status : 'Sugam'),
          presentPostingAbove7000: presentHospitalObj ? (presentHospitalObj.region_indicator === 'Above 7000' || presentHospitalObj.above_7000_feet === 'Yes' ? 'Yes' : 'No') : (presentPosting ? presentPosting.above7000 : 'No'),
          bloodGroup: staffData.blood_group || '',
          permanentAddress: staffData.permanent_address || '',
          currentResidentialAddress: staffData.current_residential_address || '',
          dateOfFirstAppointment: formatDateForUI(staffData.date_of_first_appointment),
          dateOfFirstJoiningDepartment: formatDateForUI(staffData.first_joining_date),
          firstPostingPlace: staffData.first_posting_place || '',
          firstPostingType: firstHospitalObj?.status || 'N/A',
          firstPostingAbove7000: firstHospitalObj?.above_7000_feet || 'No',
          homeDistrict: staffData.home_district || '',
          bcpRegistrationNo: staffData.bcp_registration_no || '',
          longLeaves: staffData.long_leaves || [],
          trainings: staffData.trainings || [],
          postings: (staffData.postings || []).filter((p: any) => p.toDate !== 'Present' && p.toDate !== 'present'),
          attachments: staffData.attachments || [],
          isVerified: staffData.is_verified || false,
          lastVerifiedOn: staffData.last_verified_on || '',
          // Doctor profile fields
          specialization: docData?.specialization || '',
          qualification: docData?.highest_qualification || '',
          clinicalExperienceSince: docData?.clinical_experience_since || '',
          keywords: docData?.keywords || ''
        });
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForUI = (dateStr: string) => {
    if (!dateStr || dateStr === "") return "";
    if (/^\d{2}-[A-Z]{3}-\d{4}$/i.test(dateStr)) {
        const [d, m, y] = dateStr.split('-');
        return `${d}-${m.toUpperCase()}-${y}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const [y, m, d] = dateStr.split('-');
      return `${d}-${months[parseInt(m) - 1]}-${y}`;
    }
    return dateStr;
  };

  const formatDateForDB = (dateStr: string) => {
    if (!dateStr || dateStr === "") return null;
    if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(dateStr)) {
      const [d, mStr, y] = dateStr.split('-');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const m = months.findIndex(month => month.toLowerCase() === mStr.toLowerCase()) + 1;
      if (m > 0) return `${y}-${m.toString().padStart(2, '0')}-${d}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split('-');
      return `${y}-${m}-${d}`;
    }
    return dateStr;
  };

  const parseDateStr = (d: string) => {
    if (!d) return new Date(NaN);
    if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(d)) {
      const [day, monthStr, year] = d.split('-');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthIndex = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
      if (monthIndex !== -1) return new Date(parseInt(year), monthIndex, parseInt(day));
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [day, month, year] = d.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return new Date(d);
  };

  const maskDate = (value: string) => {
    const v = value.replace(/[^0-9a-zA-Z]/g, '');
    if (v.length <= 2) return v;
    if (v.length <= 5) return `${v.slice(0, 2)}-${v.slice(2)}`;
    return `${v.slice(0, 2)}-${v.slice(2, 5)}-${v.slice(5, 9)}`;
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

    const overlaps = (s1: Date, e1: Date, s2: Date, e2: Date) => s1 <= e2 && s2 <= e1;

    const allPostings = [...postings];
    const hasPresent = allPostings.some(p => p.toDate === 'Present' || p.toDate === 'present');
    if (currentJoiningDate && !hasPresent) {
      allPostings.push({
        isAuto: true,
        fromDate: currentJoiningDate,
        toDate: new Date().toISOString().split('T')[0],
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

  const updateProfile = (updates: any) => {
    setProfile((prev: any) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (activeSubTab === 'basic') {
        // Check if employee_id is already taken by another staff member
        if (profile.empId && profile.empId !== rawStaffData.employee_id) {
          const { data: existingStaff, error: checkError } = await supabase
            .from('staff')
            .select('id')
            .eq('employee_id', profile.empId)
            .neq('id', targetStaffId)
            .maybeSingle();
          
          if (checkError) throw checkError;
          if (existingStaff) {
            throw new Error(`Employee ID ${profile.empId} is already in use by another staff member.`);
          }
        }

        if (!profile.homeDistrict) {
          setToast({ show: true, message: 'Please select Home District', type: 'error' });
          setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
          setSaving(false);
          return;
        }

        const { error: staffError } = await supabase.from('staff').update({
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
          present_district: profile.presentDistrict,
          blood_group: profile.bloodGroup,
          permanent_address: profile.permanentAddress,
          current_residential_address: profile.currentResidentialAddress,
          role: profile.designation,
          home_district: profile.homeDistrict,
          bcp_registration_no: profile.bcpRegistrationNo,
          last_edited_on: new Date().toISOString(),
        }).eq('id', targetStaffId);
        
        if (staffError) throw staffError;
        
        const { error: docError } = await supabase.from('doctor_profiles').upsert({
          staff_id: targetStaffId,
          specialization: profile.specialization,
          highest_qualification: profile.qualification,
          clinical_experience_since: profile.clinicalExperienceSince ? parseInt(profile.clinicalExperienceSince) : null,
          keywords: profile.keywords
        }, { onConflict: 'staff_id' });
        
        if (docError) throw docError;
      } else if (activeSubTab === 'service') {
        if (profile.employmentType === 'Permanent') {
          if (!profile.dateOfFirstJoiningDepartment || !profile.firstPostingPlace) {
            alert('Please fill "Date of 1st Joining in Dept" and "First Posting Place" in Service Record Details.');
            setSaving(false);
            return;
          }
        }
        
        const serviceDays = calculateServiceDays(profile.postings, profile.attachments, profile.longLeaves, profile.currentPostingJoiningDate, profile.presentPostingType, profile.presentPostingAbove7000);
        
        const sanitizedPostings = profile.postings.map((p: any) => ({
          ...p,
          hospital_id: p.hospital_id,
          fromDate: formatDateForDB(p.fromDate),
          toDate: formatDateForDB(p.toDate)
        }));
        
        sanitizedPostings.push({
          hospital_id: profile.presentHospitalId,
          fromDate: formatDateForDB(profile.currentPostingJoiningDate),
          toDate: 'Present',
          status: profile.presentPostingType,
          above7000: profile.presentPostingAbove7000
        });
        
        const sanitizedAttachments = profile.attachments.map((a: any) => ({
          ...a,
          from: formatDateForDB(a.from),
          to: formatDateForDB(a.to)
        }));
        
        const sanitizedLongLeaves = profile.longLeaves.map((l: any) => ({
          ...l,
          fromDate: formatDateForDB(l.fromDate),
          toDate: formatDateForDB(l.toDate)
        }));
        
        const { error: staffError } = await supabase.from('staff').update({
          current_posting_joining_date: formatDateForDB(profile.currentPostingJoiningDate),
          date_of_first_appointment: formatDateForDB(profile.dateOfFirstAppointment),
          first_joining_date: formatDateForDB(profile.dateOfFirstJoiningDepartment),
          first_posting_place: profile.firstPostingPlace || '',
          long_leaves: sanitizedLongLeaves,
          trainings: profile.trainings,
          postings: sanitizedPostings,
          attachments: sanitizedAttachments,
          long_leaves_count: serviceDays.totalLeaves,
          attachment_sugam_days: serviceDays.attachmentSugam,
          attachment_durgam_days: serviceDays.attachmentDurgam,
          attachment_durgam_above_7000_days: serviceDays.attachmentDurgamAbove7000,
          total_sugam_days: serviceDays.totalSugam,
          total_durgam_below_7000_days: serviceDays.totalDurgam,
          total_durgam_above_7000_days: serviceDays.totalDurgamAbove7000,
          last_edited_on: new Date().toISOString(),
        }).eq('id', targetStaffId);
        
        if (staffError) throw staffError;
      }
      
      setHasUnsavedChanges(false);
      setToast({ show: true, message: 'Profile Save Successfully', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      fetchData();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setToast({ show: true, message: `Failed to save: ${err.message}`, type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyStaff = async () => {
    setVerifying(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('staff')
        .update({ 
          is_verified: true, 
          last_verified_on: now 
        })
        .eq('id', targetStaffId);

      if (error) throw error;
      setProfile({ ...profile, isVerified: true, lastVerifiedOn: now });
      alert('Staff verified successfully!');
    } catch (err: any) {
      console.error('Error verifying staff:', err);
      alert(`Failed to verify: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const recalculatePostings = (postings: any[], currentPostingJoiningDate: string) => {
    const sorted = [...postings].sort((a, b) => {
      const dateA = new Date(formatDateForDB(a.fromDate) || 0).getTime();
      const dateB = new Date(formatDateForDB(b.fromDate) || 0).getTime();
      return dateB - dateA; // Sort descending
    });

    return sorted.map((p, index) => {
      const prevPostingFromDate = index === 0 
        ? currentPostingJoiningDate 
        : sorted[index - 1].fromDate;

      const fromDate = new Date(formatDateForDB(prevPostingFromDate) || 0);
      
      if (!isNaN(fromDate.getTime())) {
        const toDate = new Date(fromDate);
        toDate.setDate(toDate.getDate() - 1);
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const day = toDate.getDate().toString().padStart(2, '0');
        const month = months[toDate.getMonth()];
        const year = toDate.getFullYear();
        const newToDate = `${day}-${month}-${year}`;
        return { ...p, toDate: newToDate };
      }
      return { ...p, toDate: 'Pending' };
    });
  };

  const addPosting = () => {
    const newPosting = { 
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9), 
        hospitalName: '', 
        hospital_id: '', 
        fromDate: '', 
        toDate: '', 
        status: 'Sugam', 
        above7000: 'No', 
        days: 0, 
        isLocked: true 
    };

    let newPostings = recalculatePostings([...profile.postings, newPosting], profile.currentPostingJoiningDate);
    newPostings = newPostings.map((p: any) => {
      if (p.fromDate && p.toDate) {
        const start = parseDateStr(p.fromDate);
        const end = parseDateStr(p.toDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return { ...p, days: days > 0 ? days : 0 };
        }
      }
      return p;
    });

    setProfile({
      ...profile,
      postings: newPostings
    });
    setHasUnsavedChanges(true);
  };

  const removePosting = (id: string) => {
    setDeleteConfirm({ type: 'posting', id });
  };

  const confirmRemovePosting = (id: string) => {
    let newPostings = recalculatePostings(profile.postings.filter((p: any) => p.id !== id), profile.currentPostingJoiningDate);
    newPostings = newPostings.map((p: any) => {
      if (p.fromDate && p.toDate) {
        const start = parseDateStr(p.fromDate);
        const end = parseDateStr(p.toDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return { ...p, days: days > 0 ? days : 0 };
        }
      }
      return p;
    });

    setProfile({
      ...profile,
      postings: newPostings
    });
    setHasUnsavedChanges(true);
  };

  const updatePosting = (id: string, field: string, value: any) => {
    let newPostings = profile.postings.map((p: any) => p.id === id ? { ...p, [field]: value } : p);
    
    if (field === 'hospital_id') {
      newPostings = newPostings.map((p: any) => {
        if (p.id === id) {
          const h = hospitals.find(h => h.hospital_id === p.hospital_id);
          return { 
            ...p, 
            status: h ? (h.status || 'Sugam') : p.status, 
            above7000: h ? (h.region_indicator === 'Above 7000' || h.above_7000_feet === 'Yes' ? 'Yes' : 'No') : p.above7000
          };
        }
        return p;
      });
    }

    // Recalculate toDates
    newPostings = recalculatePostings(newPostings, profile.currentPostingJoiningDate);

    // Recalculate days
    newPostings = newPostings.map((p: any) => {
      if (p.fromDate && p.toDate) {
        const start = parseDateStr(p.fromDate);
        const end = parseDateStr(p.toDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return { ...p, days: days > 0 ? days : 0 };
        }
      }
      return p;
    });

    setProfile({ ...profile, postings: newPostings });
    setHasUnsavedChanges(true);
  };

  const addAttachment = () => {
    setProfile({
      ...profile,
      attachments: [...profile.attachments, { id: Date.now().toString(), hospital_id: '', hospital: '', from: '', to: '', status: 'Sugam', above7000: 'No', days: 0 }]
    });
    setHasUnsavedChanges(true);
  };

  const removeAttachment = (id: string) => {
    setDeleteConfirm({ type: 'attachment', id });
  };

  const confirmRemoveAttachment = (id: string) => {
    setProfile({
      ...profile,
      attachments: profile.attachments.filter((a: any) => a.id !== id)
    });
    setHasUnsavedChanges(true);
  };

  const updateAttachment = (id: string, field: string, value: any) => {
    let newAttachments = profile.attachments.map((a: any) => a.id === id ? { ...a, [field]: value } : a);
    if (field === 'hospital') {
      newAttachments = newAttachments.map((a: any) => {
        if (a.id === id) {
          const h = hospitals.find(h => h.facility_name === a.hospital);
          return { 
            ...a, 
            hospital_id: h ? h.hospital_id : '',
            status: h ? (h.status || 'Sugam') : a.status, 
            above7000: h ? (h.region_indicator === 'Above 7000' || h.above_7000_feet === 'Yes' ? 'Yes' : 'No') : a.above7000
          };
        }
        return a;
      });
    }
    if (field === 'from' || field === 'to') {
      newAttachments = newAttachments.map((a: any) => {
        if (a.id === id) {
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
    }
    setProfile({ ...profile, attachments: newAttachments });
    setHasUnsavedChanges(true);
  };

  const addLongLeave = () => {
    setProfile({
      ...profile,
      longLeaves: [...profile.longLeaves, { id: Date.now().toString(), fromDate: '', toDate: '', leaveType: '', totalDays: 0 }]
    });
    setHasUnsavedChanges(true);
  };

  const removeLongLeave = (id: string) => {
    setDeleteConfirm({ type: 'leave', id });
  };

  const confirmRemoveLongLeave = (id: string) => {
    setProfile({
      ...profile,
      longLeaves: profile.longLeaves.filter((l: any) => l.id !== id)
    });
    setHasUnsavedChanges(true);
  };

  const updateLongLeave = (id: string, field: string, value: any) => {
    let newLeaves = profile.longLeaves.map((l: any) => {
      if (l.id === id) {
        const updated = { ...l, [field]: value };
        if (field === 'fromDate' || field === 'toDate') {
          const from = field === 'fromDate' ? value : l.fromDate;
          const to = field === 'toDate' ? value : l.toDate;
          if (from && to) {
            const d1 = parseDateStr(from);
            const d2 = parseDateStr(to);
            if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
              const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              updated.totalDays = diffDays > 0 ? diffDays : 0;
            }
          }
        }
        return updated;
      }
      return l;
    });
    setProfile({ ...profile, longLeaves: newLeaves });
    setHasUnsavedChanges(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-slate-400 font-medium">Loading service record...</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-20 text-slate-500">Staff profile not found.</div>;
  }

  const serviceDays = calculateServiceDays(profile.postings, profile.attachments, profile.longLeaves, profile.currentPostingJoiningDate, profile.presentPostingType, profile.presentPostingAbove7000);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {onBack && (
        <button 
          onClick={() => {
            if (hasUnsavedChanges) {
              setShowUnsavedModal(true);
            } else {
              onBack();
            }
          }} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all mb-4"
        >
          <X size={20} /> Back
        </button>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Service Record: {profile.fullName}</h1>
        <div className="flex gap-3">
          {isAdminMode && (
            <>
              <button 
                onClick={() => setShowPrintPanel(true)}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-2.5 rounded-full font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                Print Service Record
              </button>
              <button 
                onClick={handleVerifyStaff}
                disabled={verifying || profile.isVerified}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all ${profile.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'}`}
              >
                {verifying ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
                {profile.isVerified ? 'Verified' : 'Verify Staff'}
              </button>
            </>
          )}
          <button 
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveSubTab('basic')}
          className={`pb-3 font-bold text-sm ${activeSubTab === 'basic' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Basic Info
        </button>
        {profile.employmentType === 'Permanent' && (
          <button 
            onClick={() => setActiveSubTab('service')}
            className={`pb-3 font-bold text-sm ${activeSubTab === 'service' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Service Record
          </button>
        )}
      </div>

      {overlapError && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 font-bold mb-6">
          {overlapError}
        </div>
      )}

      {activeSubTab === 'basic' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="text-emerald-600" size={20} /> Basic Info
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Photograph</label>
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
                readOnly={!isAdminMode}
                value={profile.fullName} 
                onChange={e => updateProfile({ fullName: e.target.value })} 
                className={`w-full bg-slate-50 border rounded-2xl py-3 px-4 focus:outline-none ${isAdminMode ? 'border-emerald-500' : 'border-gray-100'}`} 
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Role / Designation</label>
              <select 
                disabled={!isAdminMode}
                value={profile.designation} 
                onChange={e => updateProfile({ designation: e.target.value })} 
                className={`w-full bg-slate-50 border rounded-2xl py-3 px-4 focus:outline-none ${isAdminMode ? 'border-emerald-500' : 'border-gray-100'}`} 
              >
                <option value="">Select Role</option>
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Login Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={profile.password} 
                  onChange={e => updateProfile({ password: e.target.value })} 
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
                value={profile.employmentType === 'Permanent' ? profile.empId : ''} 
                onChange={e => updateProfile({ empId: e.target.value })} 
                readOnly={profile.employmentType !== 'Permanent'}
                className={`w-full bg-slate-50 border rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${profile.employmentType !== 'Permanent' ? 'border-gray-100 text-slate-400' : 'border-emerald-500'}`} 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Aadhaar Number</label>
              <input 
                readOnly
                value={profile.aadhaarNumber} 
                onChange={e => updateProfile({ aadhaarNumber: e.target.value })} 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">BCP Registration Number</label>
              <input 
                readOnly
                value={profile.bcpRegistrationNo} 
                onChange={e => updateProfile({ bcpRegistrationNo: e.target.value })} 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Father's Name</label>
              <input 
                readOnly
                value={profile.fatherName} 
                onChange={e => updateProfile({ fatherName: e.target.value })} 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Email ID</label>
              <input 
                readOnly
                type="email"
                value={profile.email} 
                onChange={e => updateProfile({ email: e.target.value })} 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Mobile</label>
              <input 
                value={profile.mobile} 
                onChange={e => updateProfile({ mobile: e.target.value })} 
                className="w-full bg-emerald-50 border border-emerald-500 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Gender</label>
              <select 
                disabled={!isAdminMode}
                value={profile.gender} 
                onChange={e => updateProfile({ gender: e.target.value })} 
                className={`w-full bg-slate-50 border rounded-2xl py-3 px-4 focus:outline-none ${isAdminMode ? 'border-emerald-500' : 'border-gray-100'}`}
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Blood Group</label>
              <select 
                disabled
                value={profile.bloodGroup} 
                onChange={e => updateProfile({ bloodGroup: e.target.value })} 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none"
              >
                <option value="">Select</option>
                <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Date of Birth</label>
              <input 
                type="text"
                placeholder="DD-MMM-YYYY"
                value={profile.dob} 
                onChange={e => updateProfile({ dob: maskDate(e.target.value) })} 
                className="w-full bg-emerald-50 border border-emerald-500 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Home District</label>
              <select 
                value={profile.homeDistrict} 
                onChange={e => updateProfile({ homeDistrict: e.target.value })} 
                className="w-full bg-emerald-50 border border-emerald-500 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Select District</option>
                {[
                  "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", 
                  "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", 
                  "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi",
                  "Outside Uttarakhand"
                ].map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Employment Type</label>
              <select 
                value={profile.employmentType} 
                onChange={e => {
                  const newType = e.target.value;
                  updateProfile({ employmentType: newType });
                  if (newType !== 'Permanent' && activeSubTab === 'service') {
                    setActiveSubTab('basic');
                  }
                }} 
                className="w-full bg-emerald-50 border border-emerald-500 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Permanent">Permanent</option>
                <option value="Contractual">Contractual</option>
                <option value="Outsourced">Outsourced</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Permanent Address</label>
                <textarea 
                  readOnly
                  value={profile.permanentAddress} 
                  onChange={e => updateProfile({ permanentAddress: e.target.value })} 
                  rows={2}
                  className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Current Residential Address</label>
                <textarea 
                  readOnly
                  value={profile.currentResidentialAddress} 
                  onChange={e => updateProfile({ currentResidentialAddress: e.target.value })} 
                  rows={2}
                  className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none" 
                />
              </div>
            </div>
            
            {/* Hospital Details Section */}
            <div className="mt-8 pt-8 border-t border-gray-100 w-full md:col-span-2">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Hospital Details</h3>
              <div className="space-y-6">
                <div className="w-full">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Connected Hospital</label>
                  <input 
                    value={hospitalDetails?.facility_name || 'Not Set'} 
                    readOnly
                    className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 pl-[17px] pr-4 focus:outline-none cursor-not-allowed text-slate-500 font-bold mt-1 truncate" 
                  />
                  <span className="text-xs text-slate-400 ml-4">ID: {hospitalDetails?.hospital_id || 'N/A'}</span>
                </div>
                
                <div className="w-full">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Main Posting (Mool Tainati)</label>
                  <div className="flex gap-2 mt-1 w-full">
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <input 
                        value={profile.presentHospital || 'Not Set'} 
                        readOnly
                        className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none cursor-not-allowed text-slate-500 font-bold truncate" 
                      />
                      <span className="text-xs text-slate-400 ml-4">ID: {profile.presentHospitalId || 'N/A'}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsActualHospitalChangeModalOpen(true)}
                      className="bg-emerald-600 text-white pl-6 pr-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all self-start whitespace-nowrap"
                    >
                      Change
                    </button>
                  </div>
                </div>
                
                <div className="w-full">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Attached Hospitals</label>
                  <div className="bg-slate-50 border border-gray-100 rounded-2xl p-4 space-y-2 mt-1 w-full">
                    {profile.attachments && profile.attachments.length > 0 ? (
                      profile.attachments.map((h: any) => (
                        <div key={h.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 w-full gap-4">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-700 block truncate">{h.hospital}</span>
                            <p className="text-xs text-slate-500">ID: {h.hospital_id}</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to remove this attached hospital?')) {
                                confirmRemoveAttachment(h.id);
                                setToast({ show: true, message: 'Attached hospital removed', type: 'success' });
                                setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
                              }
                            }}
                            className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl font-bold hover:bg-rose-100 transition-all text-sm whitespace-nowrap"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white p-4 rounded-xl border border-gray-100 text-sm text-slate-500 text-center">
                        No attached hospitals.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'professional' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="text-emerald-600" size={20} /> Professional Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">BCP Registration Number</label>
              <input 
                value={profile.bcpRegistrationNo} 
                onChange={e => updateProfile({ bcpRegistrationNo: e.target.value })} 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Degree / Highest Qualification</label>
              <input 
                value={profile.qualification} 
                onChange={e => updateProfile({ qualification: e.target.value })} 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Clinical Experience since year</label>
              <input 
                type="number"
                placeholder="YYYY"
                value={profile.clinicalExperienceSince} 
                onChange={e => updateProfile({ clinicalExperienceSince: e.target.value })} 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Specialization If any</label>
              <select 
                value={profile.specialization} 
                onChange={e => updateProfile({ specialization: e.target.value })} 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Select Specialization</option>
                <option>Kayachikitsa</option>
                <option>Panchakarma</option>
                <option>Shalya</option>
                <option>Shalakya</option>
                <option>Prasuti & Stri Roga</option>
                <option>Kaumarbhritya</option>
                <option>General</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Expertise Keywords (e.g. Diabetes, NCD Reversal)</label>
              <input 
                value={profile.keywords} 
                onChange={e => updateProfile({ keywords: e.target.value })} 
                placeholder="Enter keywords separated by commas"
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'trainings' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <GraduationCap className="text-emerald-600" size={20} /> Professional Trainings
          </h2>
          <div className="space-y-4">
            {profile.trainings.map((training: any) => (
              <div key={training.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Training Title</label>
                    <input 
                      value={training.title}
                      onChange={e => updateTraining(training.id, 'title', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Year</label>
                    <input 
                      value={training.year}
                      onChange={e => updateTraining(training.id, 'year', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => removeTraining(training.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all mt-6"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={addTraining}
              className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-all px-4 py-2"
            >
              <Plus size={16} /> Add Training
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'service' && profile.employmentType === 'Permanent' && (
        <>
          {/* Service Details */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="text-emerald-600" size={20} /> Service Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Date of Joining at Present Posting</label>
                <input 
                  type="text"
                  placeholder="DD-MMM-YYYY"
                  value={formatDateForUI(profile.currentPostingJoiningDate)} 
                  onChange={e => setProfile({...profile, currentPostingJoiningDate: maskDate(e.target.value)})} 
                  className="w-full bg-slate-50 border border-emerald-500 rounded-2xl py-3 px-4 text-emerald-600 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Date of First Joining</label>
                <input 
                  type="text"
                  placeholder="DD-MMM-YYYY"
                  value={formatDateForUI(profile.dateOfFirstJoiningDepartment)} 
                  onChange={e => setProfile({...profile, dateOfFirstJoiningDepartment: maskDate(e.target.value)})} 
                  className="w-full bg-slate-50 border border-emerald-500 rounded-2xl py-3 px-4 text-emerald-600 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">First Posting Place</label>
                <HospitalSearchInput
                  isTextarea
                  value={profile.firstPostingPlace || ''}
                  onChange={(val: string) => {
                    const h = hospitals.find(h => h.facility_name === val);
                    updateProfile({ 
                      firstPostingPlace: val,
                      firstPostingType: h ? (h.status || 'Sugam') : 'Sugam',
                      firstPostingAbove7000: h ? (h.region_indicator === 'Above 7000' || h.above_7000_feet === 'Yes' ? 'Yes' : 'No') : 'No'
                    });
                  }}
                  hospitals={hospitals}
                  placeholder="Type hospital name..."
                />
                <div className="flex gap-2 mt-1 ml-4">
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-black font-bold">{profile.firstPostingType || 'N/A'}</span>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-black font-bold">Above 7000ft: {profile.firstPostingAbove7000 || 'No'}</span>
                </div>
              </div>
            </div>
          </div>


      {/* Posting History */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <MapPin className="text-emerald-600" size={20} /> Posting History
        </h2>
        
        <div className="space-y-4">
          {/* Present Posting (Top Row) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-2 border-emerald-500 bg-emerald-50 p-4 rounded-2xl">
            <div className="space-y-1 md:col-span-6">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Present Posting Place</label>
              <HospitalSearchInput
                isTextarea
                value={profile.presentHospital || ''}
                onChange={(val: string) => {
                  const h = hospitals.find(h => h.facility_name === val);
                  updateProfile({ 
                    presentHospital: val,
                    presentHospitalId: h ? h.hospital_id : '',
                    presentPostingType: h ? (h.status || 'Sugam') : 'Sugam',
                    presentPostingAbove7000: h ? (h.region_indicator === 'Above 7000' || h.above_7000_feet === 'Yes' ? 'Yes' : 'No') : 'No'
                  });
                }}
                hospitals={hospitals}
                placeholder="Type hospital name..."
              />
              <div className="flex gap-2 mt-1 ml-4">
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-black font-bold">{profile.presentPostingType || 'N/A'}</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-black font-bold">Above 7000ft: {profile.presentPostingAbove7000 || 'No'}</span>
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">From Date</label>
              <input 
                type="text"
                placeholder="DD-MMM-YYYY"
                value={profile.currentPostingJoiningDate || ''}
                onChange={e => updateProfile({ currentPostingJoiningDate: maskDate(e.target.value) })}
                className="w-full bg-white border border-emerald-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">To Date</label>
              <div className="w-full bg-white border border-emerald-200 rounded-xl py-2 px-3 text-slate-800 font-bold italic">
                Present
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-4">Duration (Days)</label>
              <div className="w-full bg-white border border-emerald-200 rounded-xl py-2 px-3 text-slate-800 font-bold">
                {calculateDays(profile.currentPostingJoiningDate, new Date().toISOString().split('T')[0])}
              </div>
            </div>
          </div>

          {/* Previous Postings (Reverse Chronological) */}
          {profile.postings && [...profile.postings].sort((a, b) => new Date(formatDateForDB(b.fromDate) || 0).getTime() - new Date(formatDateForDB(a.fromDate) || 0).getTime()).map((posting: any, index: number) => (
            <div key={posting.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border border-gray-100 bg-slate-50 p-4 rounded-2xl">
              <div className="space-y-1 md:col-span-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Previous Posting</label>
                <HospitalSearchInput
                  isTextarea
                  value={hospitals.find(h => h.hospital_id === posting.hospital_id)?.facility_name || ''}
                  onChange={(val: string) => {
                    const h = hospitals.find(h => h.facility_name === val);
                    updatePosting(posting.id, 'hospital_id', h ? h.hospital_id : '');
                  }}
                  hospitals={hospitals}
                  placeholder="Type hospital name..."
                />
                <div className="flex gap-2 mt-1 ml-4">
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-black font-bold">{hospitals.find(h => h.hospital_id === posting.hospital_id)?.status || 'N/A'}</span>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-black font-bold">Above 7000ft: {hospitals.find(h => h.hospital_id === posting.hospital_id)?.above_7000_feet === 'Yes' ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">From Date</label>
                <input 
                  type="text"
                  placeholder="DD-MMM-YYYY"
                  value={formatDateForUI(posting.fromDate)} 
                  onChange={e => updatePosting(posting.id, 'fromDate', maskDate(e.target.value))} 
                  className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">To Date</label>
                <input 
                  type="text"
                  placeholder="DD-MMM-YYYY"
                  value={formatDateForUI(posting.toDate)} 
                  readOnly={posting.isLocked}
                  onChange={e => updatePosting(posting.id, 'toDate', maskDate(e.target.value))} 
                  className={`w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${posting.isLocked ? 'bg-slate-100 text-slate-500' : ''}`}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Days</label>
                <div className="w-full bg-slate-100 border border-gray-200 rounded-xl py-2 px-3 text-center font-bold text-slate-600">
                  {posting.days || 0}
                </div>
              </div>
              <div className="md:col-span-2 flex justify-center pt-6 gap-2">
                <button 
                  type="button"
                  onClick={() => removePosting(posting.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}

          {/* Validation Warning */}
          {profile.postings.some(p => p.fromDate && profile.dateOfFirstJoiningDepartment && new Date(formatDateForDB(p.fromDate)!) < new Date(formatDateForDB(profile.dateOfFirstJoiningDepartment)!)) && (
            <div className="text-red-500 font-bold text-sm">Historical data cannot precede the First Joining Date</div>
          )}

          {profile.postings.some(p => p.fromDate && profile.dateOfFirstJoiningDepartment && formatDateForDB(p.fromDate) === formatDateForDB(profile.dateOfFirstJoiningDepartment)) && (
            <div className="text-emerald-800 font-bold text-sm">Service History Complete</div>
          )}

          <button 
            type="button"
            onClick={addPosting}
            disabled={profile.postings.some(p => p.fromDate && profile.dateOfFirstJoiningDepartment && new Date(formatDateForDB(p.fromDate)!) < new Date(formatDateForDB(profile.dateOfFirstJoiningDepartment)!)) || profile.postings.some(p => p.fromDate && profile.dateOfFirstJoiningDepartment && formatDateForDB(p.fromDate) === formatDateForDB(profile.dateOfFirstJoiningDepartment))}
            className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-all px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Add New Posting
          </button>
        </div>
      </div>

      {/* Long Leaves */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Calendar className="text-emerald-600" size={20} /> Long Leaves (&gt; 30 Days)
        </h2>
        <div className="space-y-4">
          {profile.longLeaves.map((leave: any) => (
            <div key={leave.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border border-gray-100 bg-slate-50 p-4 rounded-2xl">
              <div className="space-y-1 md:col-span-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Leave Type</label>
                <input 
                  type="text"
                  value={leave.leaveType}
                  onChange={e => updateLongLeave(leave.id, 'leaveType', e.target.value)}
                  placeholder="e.g. Study, Medical"
                  className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1 md:col-span-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">From Date</label>
                <input 
                  type="text"
                  placeholder="DD-MMM-YYYY"
                  value={formatDateForUI(leave.fromDate)}
                  onChange={e => updateLongLeave(leave.id, 'fromDate', maskDate(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1 md:col-span-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">To Date</label>
                <input 
                  type="text"
                  placeholder="DD-MMM-YYYY"
                  value={formatDateForUI(leave.toDate)}
                  onChange={e => updateLongLeave(leave.id, 'toDate', maskDate(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Total Days</label>
                <div className="w-full bg-slate-100 border border-gray-200 rounded-xl py-2 px-3 text-center font-bold text-slate-600">
                  {leave.totalDays || 0}
                </div>
              </div>
              <div className="md:col-span-1 flex justify-center pt-6">
                <button 
                  type="button"
                  onClick={() => removeLongLeave(leave.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}
          <button 
            type="button"
            onClick={addLongLeave}
            className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-all px-4 py-2"
          >
            <Plus size={16} /> Add Long Leave
          </button>
          <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-sm font-bold text-emerald-800">
              Total Duration of Leaves (&gt; 30 Days): {profile.longLeaves
                .filter((l: any) => (l.totalDays || 0) > 30)
                .reduce((sum: number, l: any) => sum + (l.totalDays || 0), 0)} Days
            </p>
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Shield className="text-emerald-600" size={20} /> Attachments (Sambadhikaran)
        </h2>
        <div className="space-y-4">
          {profile.attachments.map((a: any) => (
            <div key={a.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border border-gray-100 bg-slate-50 p-4 rounded-2xl">
              <div className="space-y-1 md:col-span-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Attached Hospital</label>
                <HospitalSearchInput
                  value={a.hospital}
                  onChange={(val: string) => updateAttachment(a.id, 'hospital', val)}
                  hospitals={hospitals}
                  placeholder="Search hospital..."
                />
                <div className="flex gap-2 mt-2">
                  <div className="text-xs bg-slate-100 p-1 px-2 rounded-lg">{a.status}</div>
                  <div className="text-xs bg-slate-100 p-1 px-2 rounded-lg">Above 7000ft: {a.above7000}</div>
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">From Date</label>
                <input 
                  type="text"
                  placeholder="DD-MMM-YYYY"
                  value={formatDateForUI(a.from)}
                  onChange={e => updateAttachment(a.id, 'from', maskDate(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">To Date</label>
                <input 
                  type="text"
                  placeholder="DD-MMM-YYYY"
                  value={formatDateForUI(a.to)}
                  onChange={e => updateAttachment(a.id, 'to', maskDate(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Days</label>
                <div className="w-full bg-slate-100 border border-gray-200 rounded-xl py-2 px-3 text-center font-bold text-slate-600">
                  {a.days || 0}
                </div>
              </div>
              <div className="md:col-span-1 flex justify-center pt-6">
                <button 
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
            <Plus size={16} /> Add Attachment
          </button>
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl text-sm font-bold">
              Total Sugam Attachment Days: {profile.attachments
                .filter((a: any) => a.status === 'Sugam')
                .reduce((sum: number, a: any) => sum + (a.days || 0), 0)}
            </div>
            <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl text-sm font-bold">
              Total Durgam (&lt;7000ft) Attachment Days: {profile.attachments
                .filter((a: any) => a.status === 'Durgam' && a.above7000 === 'No')
                .reduce((sum: number, a: any) => sum + (a.days || 0), 0)}
            </div>
            <div className="bg-rose-100 text-rose-800 px-4 py-2 rounded-xl text-sm font-bold">
              Total Durgam (&gt;7000ft) Attachment Days: {profile.attachments
                .filter((a: any) => a.status === 'Durgam' && a.above7000 === 'Yes')
                .reduce((sum: number, a: any) => sum + (a.days || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Service Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 text-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Total Sugam Days</p>
          <p className="text-3xl font-black text-emerald-700 mt-1">{serviceDays.totalSugam}</p>
          <p className="text-[10px] text-emerald-500 mt-1">{formatDaysToYMD(serviceDays.totalSugam)}</p>
        </div>
        <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 text-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Total Durgam Days</p>
          <p className="text-3xl font-black text-amber-700 mt-1">{serviceDays.totalDurgam}</p>
          <p className="text-[10px] text-amber-500 mt-1">{formatDaysToYMD(serviceDays.totalDurgam)}</p>
        </div>
        <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 text-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Total Durgam (Above 7000 ft) Days</p>
          <p className="text-3xl font-black text-rose-700 mt-1">{serviceDays.totalDurgamAbove7000}</p>
          <p className="text-[10px] text-rose-500 mt-1">{formatDaysToYMD(serviceDays.totalDurgamAbove7000)}</p>
        </div>
      </div>

      <div className="flex justify-end items-center mt-12 pt-8 border-t border-slate-100 gap-4">
        {isAdminMode && (
          <button 
            onClick={handleVerifyStaff}
            disabled={verifying || profile.isVerified}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all ${profile.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'}`}
          >
            {verifying ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
            {profile.isVerified ? 'Verified' : 'Verify Staff'}
          </button>
        )}
        <button 
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Changes
        </button>
      </div>
    </>
  )}

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-50 border-t border-amber-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 flex justify-center items-center animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between w-full max-w-7xl px-4">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertTriangle size={20} />
              <span className="font-bold">You have unsaved changes. Please save or discard them.</span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => fetchData()}
                className="px-6 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all"
              >
                Discard
              </button>
              <button 
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-emerald-100"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <Shield size={24} />
              <h3 className="text-xl font-bold">Unsaved Changes</h3>
            </div>
            <p className="text-slate-600 mb-6">
              You have unsaved changes. Would you like to save them before leaving?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  await handleSaveProfile();
                  setShowUnsavedModal(false);
                  onBack?.();
                }}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
              >
                Yes, Save and Go back
              </button>
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  onBack?.();
                }}
                className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                No, Discard Changes
              </button>
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="w-full bg-white border border-slate-200 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Go back to Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <X size={24} className="bg-rose-100 p-1 rounded-full" />
              <h3 className="text-xl font-bold">Confirm Delete</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this {deleteConfirm.type} record? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'posting') confirmRemovePosting(deleteConfirm.id);
                  if (deleteConfirm.type === 'leave') confirmRemoveLongLeave(deleteConfirm.id);
                  if (deleteConfirm.type === 'attachment') confirmRemoveAttachment(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isActualHospitalChangeModalOpen && (
        <HospitalChangeModal
          isOpen={isActualHospitalChangeModalOpen}
          onClose={() => setIsActualHospitalChangeModalOpen(false)}
          onConfirm={(newHospitalId: string, newHospitalName: string) => {
            updateProfile({
              presentHospital: newHospitalName,
              presentHospitalId: newHospitalId,
            });
            setIsActualHospitalChangeModalOpen(false);
          }}
          hospitals={hospitals}
        />
      )}

      {showPrintPanel && rawStaffData && (
        <EmployeeDetailsPanel 
          employee={rawStaffData} 
          onClose={() => setShowPrintPanel(false)} 
        />
      )}

      {toast.show && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`}>
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl animate-in fade-in zoom-in duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <p className="font-bold">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

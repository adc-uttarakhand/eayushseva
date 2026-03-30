import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, CheckCircle, Clock, Loader2, Building2, Shield, UserCircle2, Camera, Upload, Eye, EyeOff, Save, Activity, MapPin, X, Star, Plus, BookOpen, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';

const UTTARAKHAND_DISTRICTS = [
  'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar',
  'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal',
  'Udham Singh Nagar', 'Uttarkashi'
];

interface Staff {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
  employee_id?: string;
  is_active: boolean;
  hospital_id: string;
  photograph_url?: string;
  email?: string;
  is_verified?: boolean;
  last_verified_on?: string;
  verified_by_admin?: string;
  current_posting_joining_date?: string;
  father_name?: string;
  aadhaar_number?: string;
  employment_class?: string;
  employment_type?: string;
  gender?: string;
  dob?: string;
  present_district?: string;
  blood_group?: string;
  permanent_address?: string;
  current_residential_address?: string;
  trainings?: { id: string; title: string; year: string }[];
  postings?: { id: string; hospitalName: string; fromDate: string; toDate: string; status: string; days?: number }[];
  attachments?: { id: string; hospital: string; from: string; to: string; status: string; days: number }[];
}

interface EmployeeDetailsPageProps {
  staffId: string;
  onBack: () => void;
  session?: UserSession | null;
  hospitals?: any[];
}

export default function EmployeeDetailsPage({ staffId, onBack, session, hospitals = [] }: EmployeeDetailsPageProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState<'basic' | 'service' | 'trainings'>('basic');
  const [isEditing, setIsEditing] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalDetails, setHospitalDetails] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    fetchStaffDetails();
  }, [staffId]);

  const formatDateForUI = (dateStr: string) => {
    if (!dateStr || dateStr === "") return "";
    
    // If already in DD-MMM-YYYY format
    if (/^\d{2}-[A-Z]{3}-\d{4}$/i.test(dateStr)) return dateStr;

    // Convert from YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const [y, m, d] = dateStr.split('-');
      return `${d}-${months[parseInt(m) - 1]}-${y}`;
    }
    
    // Convert from DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const [d, m, y] = dateStr.split('-');
      return `${d}-${months[parseInt(m) - 1]}-${y}`;
    }

    return dateStr;
  };

  const parseDateStr = (d: string) => {
    if (!d) return new Date(NaN);
    
    // Handle DD-MMM-YYYY
    if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(d)) {
      const [day, monthStr, year] = d.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
      if (monthIndex !== -1) {
        return new Date(parseInt(year), monthIndex, parseInt(day));
      }
    }
    
    // Handle DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [day, month, year] = d.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return new Date(d);
  };

  const calculateDuration = (startDateStr: string) => {
    if (!startDateStr) return '---';
    const startDate = parseDateStr(startDateStr);
    if (!startDate || isNaN(startDate.getTime())) return '---';

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

  const fetchStaffDetails = async () => {
    setLoading(true);
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .single();
      
      if (staffError) throw staffError;

      if (staffData) {
        console.log('staffData:', staffData);
        
        let hData = null;
        if (staffData.hospital_id) {
          const { data } = await supabase
            .from('hospitals')
            .select('*')
            .eq('hospital_id', staffData.hospital_id)
            .maybeSingle();
          hData = data;
          if (hData) {
            setHospitalName(hData.facility_name);
            setHospitalDetails(hData);
          }
        }

        // Fetch doctor profile
        const { data: docData } = await supabase
          .from('doctor_profiles')
          .select('*')
          .eq('staff_id', staffId)
          .maybeSingle();

        // Fetch reviews
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('*')
          .eq('doctor_id', staffId)
          .order('created_at', { ascending: false });

        if (reviewData) {
          setReviews(reviewData);
          const total = reviewData.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
          const avg = reviewData.length > 0 ? total / reviewData.length : 0;
          setAvgRating(isNaN(avg) ? 0 : avg);
        }

        setProfile({
          fullName: staffData?.full_name || '',
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
          system: hData?.system || '',
          hospitalConnectedName: hData?.facility_name || '',
          bcpRegistrationNo: staffData?.bcp_registration_no || '',
          specialization: docData?.specialization || 'General',
          qualification: docData?.highest_qualification || '',
          clinicalExperienceSince: docData?.clinical_experience_since || '',
          keywords: docData?.keywords || '',
          trainings: staffData?.trainings && staffData.trainings.length > 0 ? staffData.trainings : [{ id: Date.now().toString(), title: '', year: '' }],
          dateOfFirstAppointment: formatDateForUI(staffData?.date_of_first_appointment || ''),
          dateOfFirstJoiningDepartment: formatDateForUI(staffData?.first_joining_date || ''),
          firstPostingPlace: staffData?.first_posting_place || '',
          homeDistrict: staffData?.home_district || '',
          longLeaves: staffData?.long_leaves && staffData.long_leaves.length > 0 
            ? staffData.long_leaves.map((l: any) => ({
                ...l,
                fromDate: formatDateForUI(l.fromDate),
                toDate: formatDateForUI(l.toDate)
              }))
            : [{ id: Date.now().toString(), fromDate: '', toDate: '', leaveType: '', totalDays: 0 }],
          postings: staffData?.postings && staffData.postings.length > 0 
            ? staffData.postings.map((p: any) => {
                const latestHospital = hospitals.find(h => h.hospital_id === p.hospital_id);
                const start = parseDateStr(formatDateForUI(p.fromDate));
                const end = parseDateStr(formatDateForUI(p.toDate));
                const days = (!isNaN(start?.getTime() || NaN) && !isNaN(end?.getTime() || NaN)) ? Math.ceil((end!.getTime() - start!.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
                return {
                  ...p,
                  hospitalName: latestHospital ? latestHospital.facility_name : p.hospitalName,
                  fromDate: formatDateForUI(p.fromDate),
                  toDate: formatDateForUI(p.toDate),
                  above7000: p.above7000 || 'No',
                  days: days > 0 ? days : 0
                };
              })
            : [{ id: Date.now().toString(), hospitalName: '', hospital_id: '', fromDate: '', toDate: '', status: 'Sugam', above7000: 'No', days: 0 }],
          attachments: staffData?.attachments && staffData.attachments.length > 0 
            ? staffData.attachments.map((a: any) => {
                const latestHospital = hospitals.find(h => h.hospital_id === a.hospital_id);
                const start = parseDateStr(formatDateForUI(a.from));
                const end = parseDateStr(formatDateForUI(a.to));
                const days = (!isNaN(start?.getTime() || NaN) && !isNaN(end?.getTime() || NaN)) ? Math.ceil((end!.getTime() - start!.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
                return {
                  ...a,
                  hospital: latestHospital ? latestHospital.facility_name : a.hospital,
                  status: latestHospital ? (latestHospital.status || 'Sugam') : (a.status || 'Sugam'),
                  above7000: latestHospital ? (latestHospital.above_7000_feet || 'No') : (a.above7000 || 'No'),
                  from: formatDateForUI(a.from),
                  to: formatDateForUI(a.to),
                  days: days > 0 ? days : 0
                };
              })
            : [{ id: Date.now().toString(), hospital: '', from: '', to: '', status: 'Sugam', days: 0 }],
          is_verified: staffData.is_verified,
          verified_by_admin: staffData.verified_by_admin,
          last_verified_on: staffData.last_verified_on,
          last_edited_timestamp: staffData.updated_at
        });
      }
    } catch (err) {
      console.error('Error fetching staff details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from('staff')
      .update({
        employee_id: profile.empId,
        mobile_number: profile.mobile,
        employment_type: profile.employmentType,
        dob: profile.dob,
        date_of_first_appointment: profile.dateOfFirstAppointment,
        first_joining_date: profile.dateOfFirstJoiningDepartment,
        first_posting_place: profile.firstPostingPlace,
        home_district: profile.homeDistrict,
        present_district: profile.presentDistrict,
        current_posting_joining_date: profile.currentPostingJoiningDate,
        postings: profile.postings.map((p: any) => ({ hospital_id: p.hospital_id, fromDate: p.fromDate, toDate: p.toDate, status: p.status, above7000: p.above7000 })),
        long_leaves: profile.longLeaves.map((l: any) => ({ fromDate: l.fromDate, toDate: l.toDate, leaveType: l.leaveType, totalDays: l.totalDays })),
        attachments: profile.attachments.map((a: any) => ({ hospital_id: a.hospital_id, from: a.from, to: a.to, status: a.status, above7000: a.above7000 })),
      })
      .eq('id', staffId);
    
    if (!error) {
      setIsEditing(false);
      fetchStaffDetails();
    } else {
      alert('Error saving staff details: ' + error.message);
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!profile || !session) return;
    setVerifying(true);
    const { error } = await supabase
      .from('staff')
      .update({
        is_verified: true,
        last_verified_on: new Date().toISOString(),
        verified_by_admin: session.name
      })
      .eq('id', staffId);
    
    if (!error) {
      fetchStaffDetails();
    } else {
      alert('Error verifying staff: ' + error.message);
    }
    setVerifying(false);
  };

  if (loading) return <div className="flex justify-center py-40"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;
  if (!profile) return <div className="p-20 text-center text-slate-500">Staff not found.</div>;

  const isMedicalOfficer = ['Medical Officer', 'Senior Medical Officer', 'SMO / ADAUO', 'DAUO', 'JD'].includes(profile.designation);

  const calculateServiceDays = (postings: any[], attachments: any[] = [], longLeaves: any[] = [], currentJoiningDate: string = '', hDetails: any = null) => {
    let sugam = 0;
    let durgamNoAbove7000 = 0;
    let durgamAbove7000 = 0;
    
    let attachmentSugam = 0;
    let attachmentDurgamNoAbove7000 = 0;
    let attachmentDurgamAbove7000 = 0;

    // Helper to check if a range overlaps with another
    const overlaps = (s1: Date, e1: Date, s2: Date, e2: Date) => s1 <= e2 && s2 <= e1;

    // Process all postings (including current)
    const allPostings = [...postings];
    if (currentJoiningDate) {
      allPostings.push({
        isAuto: true,
        fromDate: currentJoiningDate,
        toDate: new Date().toISOString().split('T')[0],
        status: hDetails?.status || 'Sugam',
        above7000: (hDetails?.region_indicator === 'Above 7000' || hDetails?.above_7000_feet === 'Yes') ? 'Yes' : 'No'
      });
    }

    allPostings.forEach(p => {
      const start = parseDateStr(p.fromDate);
      const end = parseDateStr(p.toDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      let days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + (p.isAuto ? 0 : 1);
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
      sugam: sugam + attachmentSugam, 
      durgam: durgamNoAbove7000 + attachmentDurgamNoAbove7000,
      durgamNoAbove7000: durgamNoAbove7000 + attachmentDurgamNoAbove7000,
      durgamAbove7000: durgamAbove7000 + attachmentDurgamAbove7000
    };
  };

  const calculateTotalDays = (startDateStr: string) => {
    if (!startDateStr) return 0;
    const startDate = parseDateStr(startDateStr);
    if (!startDate || isNaN(startDate.getTime())) return 0;
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const serviceDays = calculateServiceDays(
    Array.isArray(profile.postings) ? profile.postings : [], 
    Array.isArray(profile.attachments) ? profile.attachments : [], 
    Array.isArray(profile.longLeaves) ? profile.longLeaves : [], 
    profile.currentPostingJoiningDate, 
    hospitalDetails
  );
  const isAdmin = session?.role === 'SUPER_ADMIN' || session?.role === 'DISTRICT_ADMIN' || session?.role === 'STATE_ADMIN';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32 bg-slate-50 min-h-screen">
      <div className="mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 font-bold">
          <ArrowLeft size={20} /> Back to Directory
        </button>

        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center">
                {profile.photograph ? (
                  <img src={profile.photograph} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle2 size={48} className="text-slate-400" />
                )}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{profile.fullName}</h1>
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest">{profile.designation}</p>
              <div className="flex items-center gap-4 mt-2">
                {profile.is_verified && (!profile.last_edited_timestamp || new Date(profile.last_edited_timestamp) <= new Date(profile.last_verified_on)) && (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <CheckCircle size={14} /> Verified by {profile.verified_by_admin}
                  </div>
                )}
                {profile.last_verified_on && (
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium text-xs">
                    <Clock size={14} /> Last Verified: {new Date(profile.last_verified_on).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {(isAdmin || !profile.is_verified) && (
            <div className="flex gap-2">
              {isEditing ? (
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  <Save size={20} /> Save Changes
                </button>
              ) : null}
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                {isEditing ? 'Cancel' : 'Edit Details'}
              </button>
              <button 
                onClick={handleVerify}
                disabled={verifying}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                {verifying ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                {profile.is_verified ? 'Re-Verify Staff' : 'Verify Staff'}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm w-fit border border-gray-100">
          <button 
            onClick={() => setProfileSubTab('basic')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${profileSubTab === 'basic' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <User size={18} /> Basic Info
          </button>
          <button 
            onClick={() => setProfileSubTab('service')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${profileSubTab === 'service' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Activity size={18} /> Service Record
          </button>
          <button 
            onClick={() => setProfileSubTab('trainings')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${profileSubTab === 'trainings' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BookOpen size={18} /> Trainings
          </button>
        </div>
      </div>

      <motion.div
        key={profileSubTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {profileSubTab === 'basic' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Photograph</label>
                <div className="flex gap-6 items-center bg-slate-50 p-6 rounded-3xl border border-gray-100">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center">
                    {profile.photograph ? (
                      <img src={profile.photograph} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle2 size={48} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Full Name</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.fullName}</p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Role / Designation</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.designation}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Employee ID</label>
                {isEditing ? (
                  <input type="text" value={profile.empId} onChange={(e) => setProfile({...profile, empId: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                ) : (
                  <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.empId || 'N/A'}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Aadhaar Number</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.aadhaarNumber || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">BCP Registration Number</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.bcpRegistrationNo || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Father's Name</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.fatherName || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Email ID</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.email || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">System of Medicine</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.system || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Connected Hospital</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.hospitalConnectedName || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Mobile</label>
                {isEditing ? (
                  <input type="text" value={profile.mobile} onChange={(e) => setProfile({...profile, mobile: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                ) : (
                  <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.mobile || 'N/A'}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Employment Type</label>
                {isEditing ? (
                  <input type="text" value={profile.employmentType} onChange={(e) => setProfile({...profile, employmentType: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                ) : (
                  <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.employmentType}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Class</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.employmentClass}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Gender</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.gender}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Date of Birth</label>
                {isEditing ? (
                  <input type="date" value={profile.dob} onChange={(e) => setProfile({...profile, dob: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                ) : (
                  <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.dob || 'N/A'}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Blood Group</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.bloodGroup || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Present District</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.presentDistrict || 'N/A'}</p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Permanent Address</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.permanentAddress || 'N/A'}</p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Current Residential Address</label>
                <p className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 font-bold text-slate-900">{profile.currentResidentialAddress || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {profileSubTab === 'service' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Building2 className="text-emerald-600" size={20} /> Service Record Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date of First Appointment</label>
                  {isEditing ? (
                    <input type="date" value={profile.dateOfFirstAppointment} onChange={(e) => setProfile({...profile, dateOfFirstAppointment: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                  ) : (
                    <p className="text-lg font-bold text-slate-900">{profile.dateOfFirstAppointment || '---'}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date of 1st Joining in Dept</label>
                  {isEditing ? (
                    <input type="date" value={profile.dateOfFirstJoiningDepartment} onChange={(e) => setProfile({...profile, dateOfFirstJoiningDepartment: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                  ) : (
                    <p className="text-lg font-bold text-slate-900">{profile.dateOfFirstJoiningDepartment || '---'}</p>
                  )}
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">First Posting Place</label>
                  {isEditing ? (
                    <input type="text" value={profile.firstPostingPlace} onChange={(e) => setProfile({...profile, firstPostingPlace: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                  ) : (
                    <p className="text-lg font-bold text-slate-900 leading-tight">{profile.firstPostingPlace || '---'}</p>
                  )}
                  {profile.firstPostingPlace && (
                    <div className="flex gap-4 mt-1">
                      {(() => {
                        const h = hospitals.find(h => h.facility_name === profile.firstPostingPlace);
                        if (!h) return null;
                        return (
                          <>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.status === 'Durgam' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {h.status || 'Sugam'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              Above 7000 ft: <span className="text-slate-600">{h.region_indicator === 'Above 7000' ? 'Yes' : 'No'}</span>
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Present Posting Place</label>
                  <p className="text-lg font-bold text-slate-900 leading-tight">{hospitalName || 'Not Assigned'}</p>
                  {hospitalDetails && (
                    <div className="flex gap-4 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hospitalDetails.status === 'Durgam' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {hospitalDetails.status || 'Sugam'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Above 7000 ft: <span className="text-slate-600">{hospitalDetails.region_indicator === 'Above 7000' ? 'Yes' : 'No'}</span>
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Home District</label>
                  {isEditing ? (
                    <input type="text" value={profile.homeDistrict} onChange={(e) => setProfile({...profile, homeDistrict: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                  ) : (
                    <p className="text-lg font-bold text-slate-900">{profile.homeDistrict || '---'}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Present Posting District</label>
                  {isEditing ? (
                    <input type="text" value={profile.presentDistrict} onChange={(e) => setProfile({...profile, presentDistrict: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                  ) : (
                    <p className="text-lg font-bold text-slate-900">{profile.presentDistrict || '---'}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">From Date</label>
                  {isEditing ? (
                    <input type="date" value={profile.currentPostingJoiningDate} onChange={(e) => setProfile({...profile, currentPostingJoiningDate: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                  ) : (
                    <p className="text-lg font-bold text-slate-900">{profile.currentPostingJoiningDate || '---'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="text-emerald-600" size={20} /> Posting History
                </div>
                {isEditing && (
                  <button 
                    onClick={() => setProfile({...profile, postings: [...profile.postings, { id: Date.now().toString(), hospitalName: '', hospital_id: '', fromDate: '', toDate: '', status: 'Sugam', above7000: 'No', days: 0 }]})}
                    className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold hover:bg-emerald-200"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                )}
              </h2>
              <div className="space-y-4">
                {profile.postings.length > 0 ? (
                  profile.postings.map((p: any, index: number) => (
                    <div key={p.id} className="p-6 bg-slate-50 rounded-3xl border border-gray-100">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                          <div className="md:col-span-6">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">{index === 0 ? 'First Posting Place' : 'Subsequent Posting Place'}</label>
                            <select 
                              value={p.hospital_id} 
                              onChange={(e) => {
                                const newPostings = [...profile.postings];
                                const selectedHospital = hospitals.find(h => h.hospital_id === e.target.value);
                                newPostings[index] = { ...p, hospital_id: e.target.value, hospitalName: selectedHospital?.facility_name || '' };
                                setProfile({...profile, postings: newPostings});
                              }}
                              className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900"
                            >
                              <option value="">Select Hospital</option>
                              {hospitals.map(h => <option key={h.hospital_id} value={h.hospital_id}>{h.facility_name}</option>)}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">From Date</label>
                            <input type="date" value={p.fromDate} onChange={(e) => { const newPostings = [...profile.postings]; newPostings[index] = { ...p, fromDate: e.target.value }; setProfile({...profile, postings: newPostings}); }} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">To Date</label>
                            <input type="date" value={p.toDate} onChange={(e) => { const newPostings = [...profile.postings]; newPostings[index] = { ...p, toDate: e.target.value }; setProfile({...profile, postings: newPostings}); }} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                          </div>
                          <div className="md:col-span-2 text-right">
                            <button onClick={() => setProfile({...profile, postings: profile.postings.filter((_: any, i: number) => i !== index)})} className="text-rose-500 hover:text-rose-700"><X size={20} /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                          <div className="md:col-span-6">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">{index === 0 ? 'First Posting Place' : 'Subsequent Posting Place'}</label>
                            <p className="font-bold text-slate-900 leading-tight min-h-[2.5rem] flex items-center">{p.hospitalName}</p>
                            <div className="flex gap-3 mt-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${p.status === 'Durgam' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {p.status || 'Sugam'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                Above 7000 ft: <span className="text-slate-600">{p.above7000 || 'No'}</span>
                              </span>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">From Date</label>
                            <p className="text-sm font-bold text-slate-700">{p.fromDate}</p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">To Date</label>
                            <p className="text-sm font-bold text-slate-700">{p.toDate}</p>
                          </div>
                          <div className="md:col-span-2 text-right">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Days</label>
                            <p className="text-sm font-bold text-emerald-600">{p.days || 0}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No posting history recorded.</p>
                )}

                {/* Current Posting Row */}
                <div className="p-6 bg-emerald-50/50 rounded-3xl border-2 border-emerald-100">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-6">
                      <label className="text-[8px] font-bold uppercase tracking-widest text-emerald-600 block">Present Posting Place</label>
                      <p className="font-bold text-slate-900 leading-tight min-h-[2.5rem] flex items-center">{hospitalName || 'Not Assigned'}</p>
                      {hospitalDetails && (
                        <div className="flex gap-3 mt-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${hospitalDetails.status === 'Durgam' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {hospitalDetails.status || 'Sugam'}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            Above 7000 ft: <span className="text-slate-600">{hospitalDetails.region_indicator === 'Above 7000' ? 'Yes' : 'No'}</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[8px] font-bold uppercase tracking-widest text-emerald-600 block">From Date</label>
                      <p className="text-sm font-bold text-slate-700">{profile.currentPostingJoiningDate || '---'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[8px] font-bold uppercase tracking-widest text-emerald-600 block">To Date</label>
                      <p className="text-sm font-bold text-slate-700">{formatDateForUI(new Date().toISOString().split('T')[0])}</p>
                    </div>
                    <div className="md:col-span-2 text-right">
                      <label className="text-[8px] font-bold uppercase tracking-widest text-emerald-600 block">Days</label>
                      <p className="text-sm font-bold text-emerald-600">{calculateTotalDays(profile.currentPostingJoiningDate)} Days</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="text-emerald-600" size={20} /> Long Leaves ({'>'}30 Days)
                </div>
                {isEditing && (
                  <button 
                    onClick={() => setProfile({...profile, longLeaves: [...profile.longLeaves, { id: Date.now().toString(), fromDate: '', toDate: '', leaveType: '', totalDays: 0 }]})}
                    className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold hover:bg-emerald-200"
                  >
                    <Plus size={14} /> Add Leave
                  </button>
                )}
              </h2>
              <div className="space-y-4">
                {profile.longLeaves && profile.longLeaves.length > 0 ? (
                  profile.longLeaves.map((l: any, index: number) => (
                    <div key={l.id} className="p-6 bg-slate-50 rounded-3xl border border-gray-100">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          <div>
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">From Date</label>
                            <input type="date" value={l.fromDate} onChange={(e) => { const newLeaves = [...profile.longLeaves]; newLeaves[index] = { ...l, fromDate: e.target.value }; setProfile({...profile, longLeaves: newLeaves}); }} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">To Date</label>
                            <input type="date" value={l.toDate} onChange={(e) => { const newLeaves = [...profile.longLeaves]; newLeaves[index] = { ...l, toDate: e.target.value }; setProfile({...profile, longLeaves: newLeaves}); }} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Leave Type</label>
                            <input type="text" value={l.leaveType} onChange={(e) => { const newLeaves = [...profile.longLeaves]; newLeaves[index] = { ...l, leaveType: e.target.value }; setProfile({...profile, longLeaves: newLeaves}); }} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Total Days</label>
                            <input type="number" value={l.totalDays} onChange={(e) => { const newLeaves = [...profile.longLeaves]; newLeaves[index] = { ...l, totalDays: parseInt(e.target.value) || 0 }; setProfile({...profile, longLeaves: newLeaves}); }} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                          </div>
                          <div className="text-right">
                            <button onClick={() => setProfile({...profile, longLeaves: profile.longLeaves.filter((_: any, i: number) => i !== index)})} className="text-rose-500 hover:text-rose-700"><X size={20} /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div>
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">From Date</label>
                            <p className="text-sm font-bold text-slate-700">{l.fromDate}</p>
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">To Date</label>
                            <p className="text-sm font-bold text-slate-700">{l.toDate}</p>
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Leave Type</label>
                            <p className="text-sm font-bold text-slate-900">{l.leaveType}</p>
                          </div>
                          <div className="text-right">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Total Days</label>
                            <p className="text-sm font-bold text-emerald-600">{l.totalDays || 0}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No long leaves recorded.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="text-emerald-600" size={20} /> Attachments
                </div>
                {isEditing && (
                  <button 
                    onClick={() => setProfile({...profile, attachments: [...profile.attachments, { id: Date.now().toString(), hospital: '', from: '', to: '', status: 'Sugam', days: 0 }]})}
                    className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold hover:bg-emerald-200"
                  >
                    <Plus size={14} /> Add Attachment
                  </button>
                )}
              </h2>
              <div className="space-y-4">
                {profile.attachments.length > 0 ? (
                  profile.attachments.map((a: any, index: number) => (
                    <div key={a.id} className="p-6 bg-slate-50 rounded-3xl border border-gray-100">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                          <div className="md:col-span-6">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Attachment Place</label>
                            <select 
                              value={a.hospital_id || ''} 
                              onChange={(e) => {
                                const newAttachments = [...profile.attachments];
                                const selectedHospital = hospitals.find(h => h.hospital_id === e.target.value);
                                newAttachments[index] = { ...a, hospital_id: e.target.value, hospital: selectedHospital?.facility_name || '' };
                                setProfile({...profile, attachments: newAttachments});
                              }}
                              className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900"
                            >
                              <option value="">Select Hospital</option>
                              {hospitals.map(h => <option key={h.hospital_id} value={h.hospital_id}>{h.facility_name}</option>)}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">From Date</label>
                            <input type="date" value={a.from} onChange={(e) => { const newAttachments = [...profile.attachments]; newAttachments[index] = { ...a, from: e.target.value }; setProfile({...profile, attachments: newAttachments}); }} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">To Date</label>
                            <input type="date" value={a.to} onChange={(e) => { const newAttachments = [...profile.attachments]; newAttachments[index] = { ...a, to: e.target.value }; setProfile({...profile, attachments: newAttachments}); }} className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 font-bold text-slate-900" />
                          </div>
                          <div className="md:col-span-2 text-right">
                            <button onClick={() => setProfile({...profile, attachments: profile.attachments.filter((_: any, i: number) => i !== index)})} className="text-rose-500 hover:text-rose-700"><X size={20} /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                          <div className="md:col-span-6">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Attachment Place</label>
                            <p className="font-bold text-slate-900 leading-tight min-h-[2.5rem] flex items-center">{a.hospital}</p>
                            <div className="flex gap-3 mt-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${a.status === 'Durgam' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {a.status || 'Sugam'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                Above 7000 ft: <span className="text-slate-600">{a.above7000 || 'No'}</span>
                              </span>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">From Date</label>
                            <p className="text-sm font-bold text-slate-700">{a.from}</p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">To Date</label>
                            <p className="text-sm font-bold text-slate-700">{a.to}</p>
                          </div>
                          <div className="md:col-span-2 text-right">
                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Days</label>
                            <p className="text-sm font-bold text-emerald-600">{a.days || 0}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No attachments recorded.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Total Sugam Days</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{serviceDays.sugam}</p>
              </div>
              <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Total Durgam (Below 7000ft) Days</p>
                <p className="text-3xl font-black text-amber-700 mt-1">{serviceDays.durgam}</p>
              </div>
              <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Total Durgam (Above 7000 ft) Days</p>
                <p className="text-3xl font-black text-rose-700 mt-1">{serviceDays.durgamAbove7000}</p>
              </div>
            </div>
          </div>
        )}

        {profileSubTab === 'trainings' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="text-emerald-600" size={20} /> Trainings Attended
            </h2>
            <div className="space-y-4">
              {profile.trainings.length > 0 ? (
                profile.trainings.map((t: any) => (
                  <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-gray-100">
                    <p className="font-bold text-slate-900">{t.title}</p>
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-gray-200">{t.year}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic">No trainings recorded.</p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

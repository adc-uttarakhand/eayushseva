import React, { useState, useEffect, useRef } from 'react';
import { User, FileText, MapPin, UploadCloud, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const DISTRICTS = [
  'Almora', 'Bageshwar', 'Champawat', 'Chamoli', 'Dehradun',
  'Haridwar', 'Nainital', 'Pauri', 'Pithoragarh', 'Rudraprayag',
  'Tehri', 'US Nagar', 'Uttarkashi'
];

const PRESENT_POSTINGS = [
  ...DISTRICTS,
  'Rishikul Pharmacy',
  'State DTL'
];

const EXEMPTION_CATEGORIES = [
  'Varishtha Karmik',
  'Durgam services 10 years or more',
  'Gambheer Rogi / Vikalang',
  'Physically Challenged Child',
  'Spouse of Military / Paramilitary Person',
  'Sangh Adhyaksha/ Sachiv'
];

const TRANSFER_CATEGORIES = [
  'Gambir Rogi / Viklangta',
  'Parent of Mentally Challenged Kids',
  'Parent of Physically Challenged Kids',
  'Dampatya Neeti',
  'Divorcee / Widow / Single Parent / Senior Personnel',
  'Durgam to Durgam',
  'Sugam to Durgam'
];

const APPLICATION_TYPES = [
  'Anivarya Sthananataran',
  'Anurodh',
  'Need Exemption from Transfer'
];

// ─── Hospital Search Input ───────────────────────────────────────────────────
const HospitalSearchInput = ({ value, onChange, hospitals, placeholder = 'Search hospital...', className = '', readOnly = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  const filteredHospitals = (hospitals || [])
    .filter((h: any) => {
      const facilityName = (h.facility_name || '').toLowerCase();
      const searchTerm = String(query || '').toLowerCase();
      return searchTerm.length > 0 && facilityName.includes(searchTerm);
    })
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
      <input
        type="text"
        value={query}
        readOnly={readOnly}
        onChange={(e) => {
          if (readOnly) return;
          const val = e.target.value;
          setQuery(val);
          onChange(val);
          setIsOpen(val.trim().length > 0);
        }}
        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${className}`}
        placeholder={placeholder}
      />
      {!readOnly && isOpen && filteredHospitals.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredHospitals.map((h: any) => (
            <div
              key={h.hospital_id}
              className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm"
              onClick={() => {
                setQuery(h.facility_name);
                onChange(h.facility_name);
                setIsOpen(false);
              }}
            >
              {h.facility_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── A4 Live Preview Component ───────────────────────────────────────────────
const A4Preview = ({
  applicantName, fatherHusbandName, dob, empId, role, mobileNumber, email,
  homeDistrict, presentDistrict, mainPostingName, currentPostingJoiningDate,
  currentPostingType, currentPostingAbove7000,
  applicationType, transferCategory, exemptionCategory, mandatoryTransferSubOption,
  choices, hospitals, calculatedWeightedSugam, calculatedWeightedDurgamBelow, calculatedWeightedDurgamAbove
}: any) => {

  const transferYear = new Date().getFullYear();

  const formatDob = (d: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  const getSubCategory = () => {
    if (applicationType === 'Anurodh') return transferCategory;
    if (applicationType === 'Need Exemption from Transfer') return exemptionCategory;
    if (applicationType === 'Anivarya Sthananataran') return mandatoryTransferSubOption;
    return '';
  };

  const getChoiceHospital = (name: string) => {
    if (!name) return null;
    return hospitals?.find((h: any) => h.facility_name === name) || null;
  };

  const Field = ({ label, value }: { label: string; value?: string | number }) => (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>{label}</div>
      <div style={{
        borderBottom: '1px solid #bbb',
        minHeight: '20px',
        padding: '2px 3px',
        fontSize: '10.5px',
        color: value !== undefined && value !== null ? '#1a1a1a' : '#bbb',
        fontWeight: value !== undefined && value !== null ? 500 : 400,
        fontStyle: value !== undefined && value !== null ? 'normal' : 'italic',
        display: 'flex',
        alignItems: 'center',
      }}>
        {value !== undefined && value !== null ? value : '—'}
      </div>
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div style={{
      background: '#1a7a4a',
      color: 'white',
      padding: '5px 12px',
      fontSize: '10px',
      fontWeight: 'bold',
      letterSpacing: '0.3px'
    }}>
      {title}
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ border: '1px solid #d0d0d0', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
      <SectionHeader title={title} />
      <div style={{ padding: '10px 12px' }}>
        {children}
      </div>
    </div>
  );

  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' };
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' };

  return (
    <div style={{
      width: '100%',
      boxSizing: 'border-box' as const,
      background: 'white',
      padding: '28px 32px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#1a1a1a',
      border: '1px solid #d0d0d0',
      borderRadius: '6px',
      minHeight: '900px'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2.5px solid #1a7a4a', paddingBottom: '12px', marginBottom: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1a7a4a', letterSpacing: '0.5px' }}>
          TRANSFER Application (विकल्प पत्र)
        </div>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>
          Ayurvedic &amp; Unani Services, Uttarakhand
        </div>
        <div style={{
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#1a7a4a',
          marginTop: '6px'
        }}>
          Transfer Year: {transferYear}
        </div>
      </div>

      {/* Section 1: Personal Information */}
      <Section title="1. Personal Information">
        <div style={grid3}>
          <Field label="Applicant Name" value={applicantName} />
          <Field label="Father / Husband Name" value={fatherHusbandName} />
          <Field label="Date of Birth" value={formatDob(dob)} />
          <Field label="Employee ID" value={empId} />
          <Field label="Role / Designation" value={role || 'Medical Officer'} />
          <Field label="Employee Type" value="Permanent" />
          <Field label="Mobile Number" value={mobileNumber} />
          <Field label="Email Address" value={email} />
          <Field label="Home District" value={homeDistrict} />
        </div>
      </Section>

      {/* Section 2.1: Present Posting Details */}
      <Section title="2.1 Present Posting Details">
        <div style={grid2}>
          <Field label="Present District" value={presentDistrict} />
          <Field label="Present Posting Hospital" value={mainPostingName} />
          <Field label="Present Posting Since" value={currentPostingJoiningDate} />
          <Field label="Posting Place Type" value={currentPostingType} />
        </div>
        {currentPostingAbove7000 && (
          <div style={{ marginTop: '4px' }}>
            <Field label="Above 7000 Feet" value={currentPostingAbove7000} />
          </div>
        )}
      </Section>

      {/* Section 2.2: Calculated Service Details */}
      <Section title="2.2 Calculated Service Details (As on 31st May)">
        <div style={grid3}>
          <Field label="Calculated Sugam days" value={calculatedWeightedSugam} />
          <Field label="Calculated Durgam days (Below 7000ft)" value={calculatedWeightedDurgamBelow} />
          <Field label="Calculated Durgam days (Above 7000ft)" value={calculatedWeightedDurgamAbove} />
        </div>
      </Section>

      {/* Section 3: Application Type & Category */}
      <Section title="3. Application Type &amp; Category">
        <div style={{ marginBottom: '8px', fontSize: '10px', color: '#1a7a4a', fontWeight: 'bold' }}>
           {applicationType}
        </div>
        {getSubCategory() && (
          <div style={{ marginTop: '6px' }}>
            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase' }}>Sub-Category: </span>
            <span style={{
              color: '#b06000',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {getSubCategory()}
            </span>
          </div>
        )}
      </Section>

      {/* Section 4: Transfer Preferences (hidden for Exemption type) */}
      {applicationType !== 'Need Exemption from Transfer' && (
        <Section title="4. Preferences for Transfer Choice">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ background: '#f0f0f0', border: '1px solid #ddd', padding: '4px 6px', textAlign: 'center', width: '32px', fontSize: '9px', color: '#555' }}>No.</th>
                <th style={{ background: '#f0f0f0', border: '1px solid #ddd', padding: '4px 6px', textAlign: 'left', fontSize: '9px', color: '#555' }}>Preferred Posting / Hospital</th>
                <th style={{ background: '#f0f0f0', border: '1px solid #ddd', padding: '4px 6px', textAlign: 'center', width: '60px', fontSize: '9px', color: '#555' }}>Type</th>
                <th style={{ background: '#f0f0f0', border: '1px solid #ddd', padding: '4px 6px', textAlign: 'center', width: '80px', fontSize: '9px', color: '#555' }}>Above 7000ft</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, i) => {
                const choiceName = choices[i] || '';
                const hosp = getChoiceHospital(choiceName);
                return (
                  <tr key={i}>
                    <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', color: '#888', fontWeight: 'bold' }}>{i + 1}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px 6px', verticalAlign: 'middle', color: choiceName ? '#1a1a1a' : '#bbb', fontStyle: choiceName ? 'normal' : 'italic', fontWeight: choiceName ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {choiceName || '—'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {hosp ? (
                        <span style={{
                          background: hosp.status === 'Durgam' ? '#fff3e0' : '#e6f7ef',
                          color: hosp.status === 'Durgam' ? '#b06000' : '#1a7a4a',
                          borderRadius: '3px',
                          padding: '1px 6px',
                          fontSize: '9px',
                          fontWeight: 'bold'
                        }}>{hosp.status}</span>
                      ) : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', color: hosp ? '#555' : '#bbb' }}>
                      {hosp ? hosp.above_7000_feet || '—' : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: '8.5px', color: '#888', fontStyle: 'italic', marginTop: '5px' }}>
            Note: Type (Sugam/Durgam) &amp; altitude details are fetched from the hospital database.
          </div>
        </Section>
      )}

      {/* Section 5: Declaration */}
      <Section title="5. Declaration">
        <div style={{
          border: '1px solid #1a7a4a',
          background: '#f6fcf9',
          borderRadius: '4px',
          padding: '10px 12px',
          fontSize: '9.5px',
          color: '#333',
          lineHeight: '1.7',
          marginBottom: '20px'
        }}>
          <strong style={{ color: '#1a7a4a' }}>मैं एतद्द्वारा प्रमाणित करता / करती हूँ कि असत्य जानकारी प्रस्तुत करने पर मेरा स्थानांतरण आवेदन निरस्त कर दिया जाएगा तथा एक्ट के नियमानुसार अनुशासनात्मक कार्यवाही की जा सकती है। मेरे द्वारा भरी गई उपरोक्त सभी जानकारी एवं श्रेणियां मेरी जानकारी के अनुसार पूर्णतः सत्य हैं तथा इनके साथ वैध प्रमाण संलग्न हैं।</strong>
          <br /><br />
          <strong style={{ color: '#1a7a4a' }}>I hereby Certify that</strong> submitting False information will lead to cancellation of my transfer application and disciplinary action may be taken as per government rules. All preferences and categories selected are true to my knowledge and accompanied by valid proofs.
        </div>

        {/* Signature Box */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ borderTop: '1.5px solid #1a1a1a', paddingTop: '6px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: applicantName ? '#1a1a1a' : '#bbb',
                fontStyle: applicantName ? 'normal' : 'italic',
                minHeight: '16px'
              }}>
                {applicantName || '(Applicant Name)'}
              </div>
              <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>(Applicant's Signature)</div>
            </div>
          </div>
        </div>
      </Section>

    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Sthananataran({ session, profile }: { session?: any; profile?: any }) {

  // Section 1 State
  const [staffId, setStaffId] = useState(session?.id || session?.user?.id || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [mobileNumber, setMobileNumber] = useState('');
  const [role, setRole] = useState('Medical Officer');
  const [applicantName, setApplicantName] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
  const [dob, setDob] = useState('');
  const [homeDistrict, setHomeDistrict] = useState('');
  const [presentDistrict, setPresentDistrict] = useState('');
  const mainPostingName = profile?.mainPostingName || '';

  useEffect(() => {
    const fetchStaffData = async () => {
      if (profile) {
          // Pre-fill form from profile object passed by admin view
          setApplicantName(profile.applicant_name || '');
          setFatherHusbandName(profile.father_husband_name || '');
          setDob(profile.dob || '');
          setHomeDistrict(profile.home_district || '');
          setPresentDistrict(profile.present_posting || '');
          // ... populate other fields similarly ...
          
          // Mark as locked
          setIsLocked(true);
      }
      if (profile && (profile.empId || profile.fullName)) {
        if (!staffId && session?.id) setStaffId(session.id);
        setMobileNumber(profile.mobile_number || profile.mobile || '');
        if (profile.email_id || profile.email) setEmail(profile.email_id || profile.email || email);
        if (profile.role || profile.designation) setRole(profile.role || profile.designation);
        if (profile.full_name || profile.fullName) setApplicantName(profile.full_name || profile.fullName);
        if (profile.father_name || profile.fatherName) setFatherHusbandName(profile.father_name || profile.fatherName);
        if (profile.dob) {
          try {
            const d = new Date(profile.dob);
            if (!isNaN(d.getTime())) setDob(d.toISOString().split('T')[0]);
            else setDob(profile.dob);
          } catch { setDob(profile.dob); }
        }
        if (profile.home_district || profile.homeDistrict) setHomeDistrict(profile.home_district || profile.homeDistrict);
        if (profile.present_district || profile.presentDistrict) setPresentDistrict(profile.present_district || profile.presentDistrict);
        return;
      }

      if (session?.user?.email) {
        try {
          const { data: staffData } = await supabase
            .from('staff')
            .select('*')
            .eq('email_id', session.user.email)
            .maybeSingle();

          if (staffData) {
            setStaffId(staffData.id || '');
            setMobileNumber(staffData.mobile_number || '');
            if (staffData.email_id) setEmail(staffData.email_id);
            if (staffData.role) setRole(staffData.role);
            if (staffData.full_name) setApplicantName(staffData.full_name);
            if (staffData.father_name) setFatherHusbandName(staffData.father_name);
            if (staffData.dob) {
              try {
                const d = new Date(staffData.dob);
                if (!isNaN(d.getTime())) setDob(d.toISOString().split('T')[0]);
                else setDob(staffData.dob);
              } catch { setDob(staffData.dob); }
            }
            if (staffData.home_district) setHomeDistrict(staffData.home_district);
            if (staffData.present_district) setPresentDistrict(staffData.present_district);
          }
        } catch (err) {
          console.error('Error fetching staff data:', err);
        }
      }
    };
    fetchStaffData();
  }, [session, profile]);

  // Section 2 State
  const [applicationType, setApplicationType] = useState('Anurodh');
  const [mandatoryTransferSubOption, setMandatoryTransferSubOption] = useState('');
  const [exemptionCategory, setExemptionCategory] = useState('');
  const [transferCategory, setTransferCategory] = useState('');
  const [hospitals, setHospitals] = useState<any[]>([]);

  useEffect(() => {
    const fetchHospitals = async () => {
      const { data } = await supabase.from('hospitals').select('hospital_id, facility_name, status, above_7000_feet');
      if (data) setHospitals(data);
    };
    fetchHospitals();
  }, []);

  // A4 Preview ref for PDF download
  const a4PreviewRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!a4PreviewRef.current) return;
    const toastId = toast.loading('Preparing PDF...');

    // Off-screen fixed-width container — 794px = A4 at 96dpi
    // This ensures html2canvas always renders the full width
    // regardless of the current browser panel size
    const A4_PX = 794;
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:fixed;top:0;left:-9999px;width:${A4_PX}px;background:#fff;z-index:-1;box-sizing:border-box;overflow:visible;`;

    const clone = a4PreviewRef.current.cloneNode(true) as HTMLElement;
    clone.style.width = `${A4_PX}px`;
    clone.style.minWidth = `${A4_PX}px`;
    clone.style.maxWidth = `${A4_PX}px`;
    clone.style.boxSizing = 'border-box';
    clone.style.overflow = 'visible';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: A4_PX,
        windowWidth: A4_PX,
        onclone: (clonedDoc) => {
          // Strip Tailwind — oklch colors break html2canvas
          clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove());
        }
      });

      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();   // 210mm
      const pdfH = pdf.internal.pageSize.getHeight();  // 297mm
      const marginLR = 10;                              // 10mm each side
      const usableW = pdfW - marginLR * 2;             // 190mm
      const ratio = canvas.height / canvas.width;
      const imgH = usableW * ratio;

      if (imgH <= pdfH) {
        pdf.addImage(imgData, 'PNG', marginLR, 0, usableW, imgH);
      } else {
        const marginTB = 5;
        const usableH = pdfH - marginTB * 2;
        const scale = usableH / imgH;
        const scaledW = usableW * scale;
        const xOffset = (pdfW - scaledW) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, marginTB, scaledW, usableH);
      }

      const fileName = `Transfer_Application_${(applicantName || 'Form').replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`;
      pdf.save(fileName);
      toast.success('PDF downloaded!', { id: toastId });
    } catch (err) {
      if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
      console.error('PDF Error:', err);
      toast.error('Could not generate PDF. Please try again.', { id: toastId });
    }
  };

  // Section 3 State
  const [choices, setChoices] = useState<string[]>(Array(10).fill(''));

  // Section 4 State
  const [proofDocument, setProofDocument] = useState<File | null>(null);
  const [vikalpPatra, setVikalpPatra] = useState<File | null>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocal, setIsFetchingLocal] = useState(false);
  const [profileData, setProfileData] = useState(profile);
  const [isLocked, setIsLocked] = useState(false);
  const isFormLocked = isLocked || !!profile;
  const [submittedData, setSubmittedData] = useState<any>(null);

  useEffect(() => {
    setProfileData(profile);
    setIsLocked(!!profile);
  }, [profile]);

  const fetchLatestStaffData = async () => {
    if (isLocked) return;
    setIsFetchingLocal(true);
    try {
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .maybeSingle();
      if (staffData) {
        setProfileData(staffData);
        toast.success('Service details updated from server.');
      }
    } catch (err) {
      console.error('Error fetching staff data:', err);
      toast.error('Failed to fetch latest data.');
    } finally {
      setIsFetchingLocal(false);
    }
  };

  useEffect(() => {
    const loadApplicationStatus = async () => {
      if (!staffId) return;
      const currentYear = new Date().getFullYear().toString();
      
      // 1. Check for SUBMITTED application first
      const { data: submittedApp, error: subError } = await supabase
        .from('transfer_applications')
        .select('*')
        .eq('staff_id', staffId)
        .eq('form_submitted', true)
        .eq('transfer_year', currentYear)
        .maybeSingle();

      if (submittedApp) {
        setIsLocked(true);
        setSubmittedData(submittedApp);
        
        // Populate fields with submitted data
        if (submittedApp.mobile_number) setMobileNumber(submittedApp.mobile_number);
        if (submittedApp.email) setEmail(submittedApp.email);
        if (submittedApp.category) setRole(submittedApp.category);
        if (submittedApp.applicant_name) setApplicantName(submittedApp.applicant_name);
        if (submittedApp.father_husband_name) setFatherHusbandName(submittedApp.father_husband_name);
        if (submittedApp.dob) setDob(submittedApp.dob);
        if (submittedApp.home_district) setHomeDistrict(submittedApp.home_district);
        if (submittedApp.present_posting) setPresentDistrict(submittedApp.present_posting);
        if (submittedApp.application_type) setApplicationType(submittedApp.application_type);
        if (submittedApp.transfer_category) {
           if (submittedApp.application_type === 'Anivarya Sthananataran') setMandatoryTransferSubOption(submittedApp.transfer_category);
           if (submittedApp.application_type === 'Anurodh') setTransferCategory(submittedApp.transfer_category);
           if (submittedApp.application_type === 'Need Exemption from Transfer') setExemptionCategory(submittedApp.transfer_category);
        }
        
        const newChoices = [...choices];
        for (let i = 0; i < 10; i++) {
          const raw = submittedApp[`choice_${i + 1}`];
          if (raw && typeof raw === 'object') newChoices[i] = raw.hospital_name || '';
          else newChoices[i] = raw || '';
        }
        setChoices(newChoices);
        setDeclarationAccepted(true);
        return; // Don't look for drafts if already submitted
      }

      // 2. If no submitted app, load DRAFT
      const { data, error } = await supabase
        .from('transfer_applications')
        .select('*')
        .eq('staff_id', staffId)
        .eq('form_submitted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        if (data.mobile_number) setMobileNumber(data.mobile_number);
        if (data.email) setEmail(data.email);
        if (data.category) setRole(data.category);
        if (data.applicant_name) setApplicantName(data.applicant_name);
        if (data.father_husband_name) setFatherHusbandName(data.father_husband_name);
        if (data.dob) setDob(data.dob);
        if (data.home_district) setHomeDistrict(data.home_district);
        if (data.present_posting) setPresentDistrict(data.present_posting);
        if (data.application_type) setApplicationType(data.application_type);
        if (data.application_type === 'Anivarya Sthananataran') setMandatoryTransferSubOption(data.transfer_category || '');
        if (data.application_type === 'Anurodh') setTransferCategory(data.transfer_category || '');
        if (data.application_type === 'Need Exemption from Transfer') setExemptionCategory(data.transfer_category || '');

        const newChoices = [...choices];
        for (let i = 0; i < 10; i++) {
          const raw = data[`choice_${i + 1}`];
          // DB stores choices as objects {hospital_name, status, above_7000ft} — extract the name string
          if (raw && typeof raw === 'object') newChoices[i] = raw.hospital_name || '';
          else newChoices[i] = raw || '';
        }
        setChoices(newChoices);
        toast.success('Draft loaded successfully!');
      }
    };
    loadApplicationStatus();
  }, [staffId]);

  const handleChoiceChange = (index: number, value: string) => {
    if (isLocked) return;
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const getChoiceData = (hospName: string) => {
    if (!hospName) return null;
    const hosp = hospitals.find(x => x.facility_name === hospName);
    return { hospital_name: hospName, status: hosp?.status || null, above_7000ft: hosp?.above_7000_feet || null };
  };

  const getCalculatedWeightedDays = () => {
    if (isLocked && submittedData) {
      return {
        weightedSugam: submittedData.calculated_sugam_days || 0,
        weightedDurgamBelow: submittedData.calculated_durgam_below_7000_days || 0,
        weightedDurgamAbove: submittedData.calculated_durgam_above_7000_days || 0
      };
    }
    let sugam = Number(profileData?.totalSugamDays || profileData?.total_sugam_days) || 0;
    let durgamBelow = Number(profileData?.totalDurgamBelow7000Days || profileData?.total_durgam_below_7000_days) || 0;
    let durgamAbove = Number(profileData?.totalDurgamAbove7000Days || profileData?.total_durgam_above_7000_days) || 0;

    if (profileData?.last_edited_on && profileData?.last_edited_on !== 'N/A') {
      const lastEditedDate = new Date(profileData.last_edited_on);
      const currentYear = new Date().getFullYear();
      const may31Date = new Date(currentYear, 4, 31);

      if (lastEditedDate < may31Date) {
        const diffTime = may31Date.getTime() - lastEditedDate.getTime();
        const extraDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const postingType = profile?.currentPostingType;
        const above7000 = profile?.currentPostingAbove7000;

        if (postingType === 'Sugam') sugam += extraDays;
        else if (postingType === 'Durgam' && above7000 !== 'Yes') durgamBelow += extraDays;
        else if (postingType === 'Durgam' && above7000 === 'Yes') durgamAbove += extraDays;
      }
    }
    return {
      weightedSugam: sugam,
      weightedDurgamBelow: durgamBelow * 1.25,
      weightedDurgamAbove: durgamAbove * 2
    };
  };

  const handleSaveDraft = async () => {
    if (isLocked) return;
    const empType = profile?.employmentType || 'Permanent';
    if (empType === 'Contractual' || empType === 'Outsourced') {
      toast.error('This form is for Permanent Employee only');
      return;
    }
    try {
      const timestamp = new Date().toISOString();
      const calcDays = getCalculatedWeightedDays();
      const submissionData = {
        staff_id: staffId, user_id: staffId,
        employee_id: profile?.empId || null,
        employment_type: profile?.employmentType || 'Permanent',
        transfer_year: new Date().getFullYear().toString(),
        mobile_number: mobileNumber, email, category: role,
        applicant_name: applicantName, father_husband_name: fatherHusbandName,
        dob, home_district: homeDistrict, present_posting: presentDistrict,
        present_posting_place: mainPostingName,
        present_posting_since: profile?.currentPostingJoiningDate || '',
        present_posting_place_status: profile?.currentPostingType || '',
        present_posting_place_above_7000: profile?.currentPostingAbove7000 || '',
        profile_last_edited_on: profileData?.last_edited_on || null,
        application_type: applicationType,
        transfer_category:
          applicationType === 'Anivarya Sthananataran' ? mandatoryTransferSubOption :
          applicationType === 'Anurodh' ? transferCategory :
          applicationType === 'Need Exemption from Transfer' ? exemptionCategory : null,
        choice_1: getChoiceData(choices[0]), choice_2: getChoiceData(choices[1]),
        choice_3: getChoiceData(choices[2]), choice_4: getChoiceData(choices[3]),
        choice_5: getChoiceData(choices[4]), choice_6: getChoiceData(choices[5]),
        choice_7: getChoiceData(choices[6]), choice_8: getChoiceData(choices[7]),
        choice_9: getChoiceData(choices[8]), choice_10: getChoiceData(choices[9]),
        calculated_sugam_days: calcDays.weightedSugam,
        calculated_durgam_below_7000_days: calcDays.weightedDurgamBelow,
        calculated_durgam_above_7000_days: calcDays.weightedDurgamAbove,
        attachment_sugam_days: profileData?.totalAttachmentSugam || profileData?.attachment_sugam_days || 0,
        attachment_durgam_days: profileData?.totalAttachmentDurgamBelow7000 || profileData?.attachment_durgam_below_7000_days || 0,
        attachment_durgam_above_7000_days: profileData?.totalAttachmentDurgamAbove7000 || profileData?.attachment_durgam_above_7000_days || 0,
        total_sugam_days: profileData?.totalSugamDays || profileData?.total_sugam_days || 0,
        total_durgam_below_7000_days: profileData?.totalDurgamBelow7000Days || profileData?.total_durgam_below_7000_days || 0,
        total_durgam_above_7000_days: profileData?.totalDurgamAbove7000Days || profileData?.total_durgam_above_7000_days || 0,
        long_leaves_count: profileData?.longLeavesDays || profileData?.long_leaves_days || 0,
        form_submitted: false, save_draft_at: timestamp
      };

      const { data: existingDraft } = await supabase
        .from('transfer_applications').select('id')
        .eq('staff_id', staffId).eq('form_submitted', false).maybeSingle();

      if (existingDraft?.id) {
        const { error } = await supabase.from('transfer_applications').update(submissionData).eq('id', existingDraft.id);
        if (error) throw new Error('Failed to update draft: ' + error.message);
      } else {
        const { error } = await supabase.from('transfer_applications').insert([submissionData]);
        if (error) throw new Error('Failed to save draft: ' + error.message);
      }
      toast.success('Your transfer application draft has been saved!');
    } catch (err: any) {
      console.error('Draft Save Error:', err);
      toast.error(err.message || 'An error occurred while saving draft.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    const empType = profile?.employmentType || 'Permanent';
    if (empType === 'Contractual' || empType === 'Outsourced') {
      toast.error('This form is for Permanent Employee only'); return;
    }
    if (!declarationAccepted) {
      toast.error('Please accept the declaration to submit your application.'); return;
    }
    if (!applicantName || !dob || !homeDistrict || !presentDistrict || !email) {
      toast.error('Please fill in all mandatory personal information.'); return;
    }
    if (!vikalpPatra) {
      toast.error('Please upload your signed Vikalp Patra.'); return;
    }
    setIsSubmitting(true);
    try {
      let proofDocPath = null;
      let vikalpPatraPath = null;
      const timestamp = Date.now();

      if (proofDocument) {
        const fileExt = proofDocument.name.split('.').pop();
        const fileName = `${applicantName.replace(/\s+/g, '_')}_proof_${timestamp}.${fileExt}`;
        const { data: proofUpload, error: proofError } = await supabase.storage
          .from('transfer_documents').upload(`proofs/${fileName}`, proofDocument);
        if (proofError) throw new Error('Failed to upload proof document: ' + proofError.message);
        proofDocPath = proofUpload.path;
      }

      if (vikalpPatra) {
        const fileExt = vikalpPatra.name.split('.').pop();
        const fileName = `${applicantName.replace(/\s+/g, '_')}_vikalp_${timestamp}.${fileExt}`;
        const { data: vikalpUpload, error: vikalpError } = await supabase.storage
          .from('transfer_documents').upload(`vikalp_patras/${fileName}`, vikalpPatra);
        if (vikalpError) throw new Error('Failed to upload Vikalp Patra: ' + vikalpError.message);
        vikalpPatraPath = vikalpUpload.path;
      }

      const calcDays = getCalculatedWeightedDays();

      const submissionData = {
        staff_id: staffId, user_id: staffId,
        employee_id: profile?.empId || null,
        employment_type: profile?.employmentType || 'Permanent',
        transfer_year: new Date().getFullYear().toString(),
        mobile_number: mobileNumber, email, category: role,
        applicant_name: applicantName, father_husband_name: fatherHusbandName,
        dob, home_district: homeDistrict, present_posting: presentDistrict,
        present_posting_place: mainPostingName,
        present_posting_since: profile?.currentPostingJoiningDate || '',
        present_posting_place_status: profile?.currentPostingType || '',
        present_posting_place_above_7000: profile?.currentPostingAbove7000 || '',
        profile_last_edited_on: profileData?.last_edited_on || null,
        application_type: applicationType,
        transfer_category:
          applicationType === 'Anivarya Sthananataran' ? mandatoryTransferSubOption :
          applicationType === 'Anurodh' ? transferCategory :
          applicationType === 'Need Exemption from Transfer' ? exemptionCategory : null,
        choice_1: getChoiceData(choices[0]), choice_2: getChoiceData(choices[1]),
        choice_3: getChoiceData(choices[2]), choice_4: getChoiceData(choices[3]),
        choice_5: getChoiceData(choices[4]), choice_6: getChoiceData(choices[5]),
        choice_7: getChoiceData(choices[6]), choice_8: getChoiceData(choices[7]),
        choice_9: getChoiceData(choices[8]), choice_10: getChoiceData(choices[9]),
        calculated_sugam_days: calcDays.weightedSugam,
        calculated_durgam_below_7000_days: calcDays.weightedDurgamBelow,
        calculated_durgam_above_7000_days: calcDays.weightedDurgamAbove,
        attachment_sugam_days: profileData?.totalAttachmentSugam || profileData?.attachment_sugam_days || 0,
        attachment_durgam_days: profileData?.totalAttachmentDurgamBelow7000 || profileData?.attachment_durgam_below_7000_days || 0,
        attachment_durgam_above_7000_days: profileData?.totalAttachmentDurgamAbove7000 || profileData?.attachment_durgam_above_7000_days || 0,
        total_sugam_days: profileData?.totalSugamDays || profileData?.total_sugam_days || 0,
        total_durgam_below_7000_days: profileData?.totalDurgamBelow7000Days || profileData?.total_durgam_below_7000_days || 0,
        total_durgam_above_7000_days: profileData?.totalDurgamAbove7000Days || profileData?.total_durgam_above_7000_days || 0,
        long_leaves_count: profileData?.longLeavesDays || profileData?.long_leaves_days || 0,
        proof_document_path: proofDocPath,
        vikalp_patra_path: vikalpPatraPath,
        form_submitted: true,
        submitted_at: new Date().toISOString(),
        declaration_accepted: true
      };

      const { data: existingDraft } = await supabase
        .from('transfer_applications').select('id')
        .eq('staff_id', staffId).eq('form_submitted', false).maybeSingle();

      if (existingDraft?.id) {
        const { error } = await supabase.from('transfer_applications').update(submissionData).eq('id', existingDraft.id);
        if (error) throw new Error('Failed to update and submit application: ' + error.message);
      } else {
        const { error } = await supabase.from('transfer_applications').insert([submissionData]);
        if (error) throw new Error('Failed to submit application: ' + error.message);
      }
      
      const { data: finalApp } = await supabase
        .from('transfer_applications')
        .select('*')
        .eq('staff_id', staffId)
        .eq('form_submitted', true)
        .eq('transfer_year', new Date().getFullYear().toString())
        .maybeSingle();
      
      if (finalApp) {
        setSubmittedData(finalApp);
        setIsLocked(true);
      } else {
        setIsLocked(true);
      }

      toast.success('Your transfer application has been submitted successfully!');
    } catch (err: any) {
      console.error('Submission Error:', err);
      toast.error(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      
      {isLocked && (
        <div className="max-w-[1400px] mx-auto mb-6">
          <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-center gap-3 animate-pulse">
            <CheckCircle size={24} />
            <span className="text-lg font-bold">FORM SUBMITTED FOR TRANSFER SESSION ({new Date().getFullYear()})</span>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">Transfer Application</h1>
        <p className="text-slate-500 mt-2">Ayurvedic &amp; Unani Services, Uttarakhand</p>
      </div>

      {/* Two-column layout: Form (left) + A4 Preview (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-[1400px] mx-auto items-start">

        {/* ── LEFT: FORM ── */}
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Top action buttons */}
          <div className="flex justify-end gap-3">
            {!isLocked && !isFormLocked && (
              <button
                type="button"
                onClick={handleSaveDraft}
                className="py-2.5 px-6 rounded-lg font-semibold flex items-center gap-2 bg-white text-emerald-600 border-2 border-emerald-600 hover:bg-emerald-50 transition-all shadow-sm"
              >
                Save Draft
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="py-2.5 px-6 rounded-lg font-semibold flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
            >
              Download PDF
            </button>
          </div>

          {/* Notes */}
          <div className="bg-amber-50 rounded-2xl shadow-sm border border-amber-200 p-6 text-sm text-amber-900">
            <h3 className="font-bold mb-3">Important Instructions:</h3>
            <ul className="list-decimal list-outside ml-4 space-y-2">
              <li>Form can be filled one-time only and no correction is posssibel after you submit the form.</li>
              <li>After Filling the Form data properly, check it and press save draft, then download the pdf and sign the form and re-upload in Mandatory Documents & Declaration section, before submitting the form.</li>
              <li>No physical form need to send to office.</li>
              <li>Submitting the application after uploading all the required document is very essential. After Submission, you will be shown Form Summited message at the top</li>
            </ul>
          </div>

          {/* SECTION 1: Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg"><User size={24} /></div>
              <h2 className="text-xl font-bold text-slate-800">Personal Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Transfer Year</label>
                <input type="text" value={new Date().getFullYear()} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">ID</label>
                <input type="text" value={staffId} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" placeholder="Auto-populated ID" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employee ID</label>
                <input type="text" value={profile?.empId || ''} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" placeholder="Auto-populated Employee ID" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employee Type</label>
                <input type="text" value={profile?.employmentType || 'Permanent'} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} 
                  readOnly={isLocked}
                  className={`w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`} 
                  placeholder="Enter your email" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile Number</label>
                <input type="text" value={mobileNumber} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" placeholder="Auto-populated Mobile" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
                <input type="text" value={role} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Applicant Name</label>
                <input type="text" value={applicantName} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" placeholder="Full Name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Father's / Husband's Name</label>
                <input type="text" value={fatherHusbandName} 
                  readOnly={isFormLocked}
                  onChange={(e) => setFatherHusbandName(e.target.value)} 
                  className={`w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${isFormLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`} 
                  placeholder="Father or Husband's Name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                <input type="date" value={dob} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Home District</label>
                <input type="text" value={homeDistrict} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" placeholder="Home District" />
              </div>
            </div>
          </div>

          {/* SECTION: Present Posting Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg"><MapPin size={24} /></div>
              <h2 className="text-xl font-bold text-slate-800">Present Posting Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Present District</label>
                <input type="text" value={presentDistrict} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" placeholder="Present District" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Present Posting Hospital</label>
                <input type="text" value={profile?.mainPostingName || ''} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" placeholder="Auto-populated Posting Name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Present Posting Since</label>
                <input type="text" value={profile?.currentPostingJoiningDate || 'N/A'} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Present Posting Place Type</label>
                <input type="text" value={profile?.currentPostingType || ''} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" placeholder="Sugam / Durgam" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Present Posting Place Above 7000 Feet</label>
                <input type="text" value={profile?.currentPostingAbove7000 || ''} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" placeholder="Yes / No" />
              </div>
            </div>
          </div>

          {/* SECTION: Service Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg"><FileText size={24} /></div>
                <h2 className="text-xl font-bold text-slate-800">Service Details</h2>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={fetchLatestStaffData} disabled={isFetchingLocal}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all flex items-center gap-2">
                  {isFetchingLocal ? <Loader2 size={16} className="animate-spin" /> : 'Fetch Latest'}
                </button>
                <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 ${profileData?.is_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {profileData?.is_verified ? <CheckCircle size={16} /> : null}
                  {profileData?.is_verified ? 'Verified' : 'Unverified'}
                </div>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-900 mb-6 px-8">
              Press Fetch Latest Button in above section first to get accurate data. 
              Please ensure your service record is complete, accurate and verified before pressing Fetch Latest Button.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Edited On</label>
                <input type="text" value={profileData?.last_edited_on || 'N/A'} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {[
                { label: 'Total Attachment days (Sugam)', value: profileData?.totalAttachmentSugam || profileData?.attachment_sugam_days || 0 },
                { label: 'Total Attachment days (Durgam < 7000ft)', value: profileData?.totalAttachmentDurgamBelow7000 || profileData?.attachment_durgam_below_7000_days || 0 },
                { label: 'Total Attachment days (Durgam > 7000ft)', value: profileData?.totalAttachmentDurgamAbove7000 || profileData?.attachment_durgam_above_7000_days || 0 },
                { label: 'Long Leaves days', value: profileData?.longLeavesDays || profileData?.long_leaves_days || 0 },
              ].map((item, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{item.label}</label>
                  <input type="number" value={item.value} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Total Sugam days', value: profileData?.totalSugamDays || profileData?.total_sugam_days || 0 },
                { label: 'Total Durgam days (Below 7000ft)', value: profileData?.totalDurgamBelow7000Days || profileData?.total_durgam_below_7000_days || 0 },
                { label: 'Total Durgam days (Above 7000ft)', value: profileData?.totalDurgamAbove7000Days || profileData?.total_durgam_above_7000_days || 0 },
              ].map((item, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{item.label}</label>
                  <input type="number" value={item.value} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-slate-500 bg-amber-50 p-4 rounded-lg border border-amber-100">
              <strong>Note:</strong> This data is finalized after calculating attachment days and leaves days of (more than 30 days). This data is for reference and fetched from the portal. It will be verified by DAUO.
            </p>
          </div>

          {/* Calculated Service Details */}
          <div className="bg-indigo-50 rounded-2xl shadow-sm border border-indigo-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg"><FileText size={24} /></div>
              <h2 className="text-xl font-bold text-indigo-800">Calculated Service Details (As on 31st May)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Total Calculated Sugam days', value: getCalculatedWeightedDays().weightedSugam },
                { label: 'Total Calculated Durgam days (Below 7000ft)', value: getCalculatedWeightedDays().weightedDurgamBelow },
                { label: 'Total Calculated Durgam days (Above 7000ft)', value: getCalculatedWeightedDays().weightedDurgamAbove },
              ].map((item, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-semibold text-indigo-700 mb-1.5">{item.label}</label>
                  <input type="number" value={item.value} readOnly className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-lg text-indigo-600 font-medium cursor-not-allowed" />
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: Application Type & Categories */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg"><FileText size={24} /></div>
              <h2 className="text-xl font-bold text-slate-800">Application Type &amp; Categories</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {APPLICATION_TYPES.map((type) => (
                <div key={type}
                  onClick={() => { if (!isLocked) { setApplicationType(type); if (type !== 'Anivarya Sthananataran') setMandatoryTransferSubOption(''); } }}
                  className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${applicationType === type ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-600'} ${isLocked ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${applicationType === type ? 'border-emerald-500' : 'border-slate-300'}`}>
                      {applicationType === type && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>}
                    </div>
                    <span className="font-semibold text-sm">{type}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
              {applicationType === 'Need Exemption from Transfer' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exemption Sub Category</label>
                  <select value={exemptionCategory} onChange={(e) => setExemptionCategory(e.target.value)} 
                    disabled={isLocked}
                    className={`w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}>
                    <option value="">Select Exemption Category</option>
                    {EXEMPTION_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              )}
              {applicationType === 'Anurodh' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Anurodh Sub-Category</label>
                  <select value={transferCategory} onChange={(e) => setTransferCategory(e.target.value)} 
                    disabled={isLocked}
                    className={`w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}>
                    <option value="">Select Applying Under</option>
                    {TRANSFER_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              )}
              {applicationType === 'Anivarya Sthananataran' && (
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <p className="text-slate-500 text-sm">No special proof documents required for Mandatory Transfer. Provide choices below.</p>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Anivaryta Sub-Category</label>
                    <div className="flex gap-4">
                      {['Sugam to Durgam', 'Durgam to Sugam'].map(option => (
                        <button key={option} type="button" 
                          onClick={() => { if (!isLocked) setMandatoryTransferSubOption(option); }}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border ${mandatoryTransferSubOption === option ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300'} ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: Preferences for Transfer Choice */}
          {applicationType !== 'Need Exemption from Transfer' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg"><MapPin size={24} /></div>
                <h2 className="text-xl font-bold text-slate-800">Preferences for Transfer Choice</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {choices.map((choice, index) => {
                  const selectedHospital = hospitals.find(h => h.facility_name === choice);
                  const status = selectedHospital ? (selectedHospital.status || 'Sugam') : null;
                  const above7000 = selectedHospital ? (selectedHospital.above_7000_feet || 'No') : null;
                  return (
                    <div key={`choice-${index}`} className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Choice {index + 1}</label>
                        <HospitalSearchInput
                          value={choice}
                          onChange={(value: string) => handleChoiceChange(index, value)}
                          hospitals={hospitals}
                          placeholder={`Location preference ${index + 1}`}
                          className={isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
                          readOnly={isLocked}
                        />
                      </div>
                      {selectedHospital && (
                        <div className="flex items-center gap-3 sm:mb-[5px]">
                          <span className={`text-xs font-bold px-3 py-2 rounded-lg ${status === 'Durgam' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{status}</span>
                          <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200">Above 7000 ft: {above7000}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save Draft Button */}
          {!isLocked && (
            <button type="button" onClick={handleSaveDraft}
              className="w-full py-4 text-center rounded-xl font-semibold text-lg flex items-center justify-center gap-2 bg-white text-emerald-600 border-2 border-emerald-600 hover:bg-emerald-50 transition-all shadow-sm">
              Save Draft
            </button>
          )}

          {/* SECTION 4: Mandatory Documents & Declaration */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg"><UploadCloud size={24} /></div>
              <h2 className="text-xl font-bold text-slate-800">Mandatory Documents &amp; Declaration</h2>
            </div>

            <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-800 mb-2">Upload Signed copy of Physical Vikalp Patra <span className="text-red-500">*</span></label>
              <p className="text-xs text-slate-500 mb-3">Please print the physical copy, sign it, and upload the scanned version here.</p>
              <input type="file" onChange={(e) => setVikalpPatra(e.target.files?.[0] || null)}
                disabled={isLocked}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-70" required={!isLocked} />
            </div>

            {(applicationType === 'Need Exemption from Transfer' || applicationType === 'Anurodh') && (
              <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  {applicationType === 'Need Exemption from Transfer' ? 'Upload Proof for Exemption' : 'Proof For Anurodh Request'}
                </label>
                <p className="text-xs text-slate-500 mb-3">Please provide the supporting document for your request.</p>
                <input type="file" onChange={(e) => setProofDocument(e.target.files?.[0] || null)}
                  disabled={isLocked}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-70" />
              </div>
            )}

            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center h-6">
                <input id="declaration" type="checkbox" checked={declarationAccepted} 
                  disabled={isLocked}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed" />
              </div>
              <label htmlFor="declaration" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                <strong className="text-slate-800">I hereby Certify that</strong> submitting False information will lead to cancellation of my transfer application and disciplinary action may be taken as per government rules. All preferences and categories selected are true to my knowledge and accompanied by valid proofs.
              </label>
            </div>
          </div>

          {/* Submit Button */}
          {!isLocked && (
            <button type="submit" disabled={!declarationAccepted || isSubmitting}
              className={`w-full py-4 text-center rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${(!declarationAccepted || isSubmitting) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl'}`}>
              {isSubmitting ? (
                <><Loader2 size={24} className="animate-spin" />Submitting Application...</>
              ) : (
                <><CheckCircle size={24} />Submit Transfer Application</>
              )}
            </button>
          )}
        </form>

        {/* ── RIGHT: A4 LIVE PREVIEW ── */}
        <div className="xl:sticky xl:top-6 xl:max-h-screen xl:overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-700">Live Preview (A4)</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Updates as you fill the form</span>
          </div>
          <div ref={a4PreviewRef} id="a4-preview-print-target">
          <A4Preview
            applicantName={applicantName}
            fatherHusbandName={fatherHusbandName}
            dob={dob}
            empId={profile?.empId}
            role={role}
            mobileNumber={mobileNumber}
            email={email}
            homeDistrict={homeDistrict}
            presentDistrict={presentDistrict}
            mainPostingName={profile?.mainPostingName}
            currentPostingJoiningDate={profile?.currentPostingJoiningDate}
            currentPostingType={profile?.currentPostingType}
            currentPostingAbove7000={profile?.currentPostingAbove7000}
            applicationType={applicationType}
            transferCategory={transferCategory}
            exemptionCategory={exemptionCategory}
            mandatoryTransferSubOption={mandatoryTransferSubOption}
            choices={choices}
            hospitals={hospitals}
            calculatedWeightedSugam={getCalculatedWeightedDays().weightedSugam}
            calculatedWeightedDurgamBelow={getCalculatedWeightedDays().weightedDurgamBelow}
            calculatedWeightedDurgamAbove={getCalculatedWeightedDays().weightedDurgamAbove}
          />
          </div>
        </div>

      </div>
    </div>
  );
}

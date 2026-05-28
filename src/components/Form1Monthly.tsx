import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Save, Send, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertCircle, Loader2,
  Building2, Calendar, BarChart3, Users, Activity,
  Eye, Download, Filter, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────
interface Form1Data {
  id?: string;
  hospital_id: string;
  hospital_name?: string;
  district: string;
  ayush_stream?: string;
  reporting_month: number;
  reporting_year: number;
  financial_year: string;
  submitted_by?: string;
  submitted_by_id?: string;
  status: string;
  submitted_at?: string;

  // Section 1: Local Coordination
  dpmu_formed?: string;
  mou_with_nhm?: string;
  mou_with_private?: string;
  mou_partner_name?: string;
  intersectoral_convergence?: string;

  // Section 2: Infrastructure
  branding_done?: string;
  infrastructure_completed?: string;
  herbal_garden_available?: string;
  herbal_garden_plants?: number | string;
  medicine_available?: string;
  it_network_available?: string;
  cho_posted?: string;
  yoga_instructor_appointed?: string;
  progressive_functional_hwcs?: number | string;

  // Section 3: Training
  cho_training_completed?: string;
  cho_trained_count?: number | string;
  yoga_instructor_training_completed?: string;
  yoga_instructors_trained?: number | string;
  asha_anm_training_completed?: string;
  ashas_trained?: number | string;
  anms_trained?: number | string;

  // Section 4: OPD
  opd_started?: string;
  opd_footfall_male_current_month?: number | string;
  opd_footfall_female_current_month?: number | string;
  opd_footfall_other_current_month?: number | string;
  opd_footfall_current_month?: number | string;
  opd_footfall_cumulative?: number | string;
  medicines_distributed_cumulative?: number | string;

  // Section 5: Stage-I
  lab_services_available?: string;
  laptop_desktop_purchased?: string;
  functional_stage1_hwcs?: number | string;

  // Section 6: Family & CBAC
  family_empanelment_started?: string;
  people_empanelled?: number | string;
  cbac_survey_started?: string;
  cbac_survey_current_month?: number | string;
  cbac_survey_cumulative?: number | string;

  // Section 7: DM
  screening_dm?: string;
  screened_dm_current_month?: number | string;
  screened_dm_cumulative?: number | string;
  dm_on_treatment?: number | string;

  // Section 8: HT
  screening_ht?: string;
  screened_ht_current_month?: number | string;
  screened_ht_cumulative?: number | string;
  ht_on_treatment?: number | string;

  // Section 9: Cancer
  screening_oral_cancer?: string;
  screened_oral_cancer_cumulative?: number | string;
  referred_oral_cancer?: number | string;
  screened_breast_cancer_cumulative?: number | string;
  referred_breast_cancer?: number | string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function getFinancialYear(month: number, year: number): string {
  return month >= 4 ? `${year}-${(year+1).toString().slice(2)}` : `${year-1}-${year.toString().slice(2)}`;
}

function getReportingMonthYear() {
  const now = new Date();
  let m = now.getMonth(); // 0-indexed, so this is previous month
  let y = now.getFullYear();
  if (m === 0) { m = 12; y -= 1; } 
  return { month: m, year: y };
}

function isSuperOrState(s: any) { return ['SUPER_ADMIN', 'STATE_ADMIN'].includes(s?.role); }
function isDistrictAdmin(s: any) { return s?.role === 'DISTRICT_ADMIN'; }
function isIncharge(s: any) { return s?.role === 'STAFF' || s?.role === 'DOCTOR'; }

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, color = 'emerald', children, defaultOpen = true }: any) {
  const [open, setOpen] = useState(defaultOpen);
  const colors: Record<string, string> = {
    emerald: 'from-emerald-600 to-emerald-700',
    blue: 'from-blue-600 to-blue-700',
    purple: 'from-purple-600 to-purple-700',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-600 to-red-700',
    slate: 'from-slate-600 to-slate-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-4">
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${colors[color]} text-white`}>
        <Icon size={18} />
        <span className="font-bold text-sm flex-1 text-left">{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function YesNoField({ label, fieldKey, value, onChange, disabled }: any) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
      <div className="flex gap-2">
        {['Yes', 'No'].map(opt => (
          <button key={opt} type="button" disabled={disabled}
            onClick={() => onChange(fieldKey, opt)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
              value === opt
                ? opt === 'Yes' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-600'
                : 'border-slate-200 text-slate-400 hover:border-slate-300'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberField({ label, fieldKey, value, onChange, disabled, highlight }: any) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 block mb-1.5">
        {label}
        {highlight && <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">Cumulative</span>}
      </label>
      <input type="number" min={0} disabled={disabled}
        value={value ?? ''}
        onChange={e => onChange(fieldKey, e.target.value)}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-all ${
          highlight ? 'border-blue-300 bg-blue-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400'
        } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}`} />
    </div>
  );
}

function TextField({ label, fieldKey, value, onChange, disabled, placeholder }: any) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
      <input type="text" disabled={disabled} placeholder={placeholder}
        value={value ?? ''}
        onChange={e => onChange(fieldKey, e.target.value)}
        className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}`} />
    </div>
  );
}

// ── Form View (Incharge fills) ────────────────────────────────────────────────
function Form1View({ session, hospital }: any) {
  const defaultMonth = getReportingMonthYear();
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth.month);
  const [selectedYear, setSelectedYear] = useState(defaultMonth.year);
  const [formData, setFormData] = useState<Partial<Form1Data>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cumulativeData, setCumulativeData] = useState<Record<string, number>>({});
  const [subTab, setSubTab] = useState<'fill' | 'history'>('fill');
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [viewingOld, setViewingOld] = useState<any | null>(null);

  const financialYear = getFinancialYear(selectedMonth, selectedYear);

  // Fetch all submitted forms for this hospital
  const fetchMySubmissions = useCallback(async () => {
    const { data } = await supabase
      .from('form1_monthly')
      .select('id, reporting_month, reporting_year, financial_year, status, submitted_at, opd_footfall_cumulative, screened_dm_cumulative, screened_ht_cumulative')
      .eq('hospital_id', hospital.hospital_id)
      .order('reporting_year', { ascending: false })
      .order('reporting_month', { ascending: false });
    setMySubmissions(data || []);
  }, [hospital.hospital_id]);

  // Cumulative fields list
  const cumulativeFields = [
    'opd_footfall_male_cumulative', 'opd_footfall_female_cumulative', 'opd_footfall_other_cumulative',
    'opd_footfall_cumulative', 'medicines_distributed_cumulative',
    'cbac_survey_cumulative', 'screened_dm_cumulative',
    'screened_ht_cumulative', 'screened_oral_cancer_cumulative',
    'screened_breast_cancer_cumulative', 'screened_cervix_cancer_cumulative',
    'prakriti_parikshan_cumulative', 'yoga_sessions_cumulative',
    'counselled_after_prakriti_cumulative'
  ];

  // Fetch existing form + cumulative data
  const fetchForm = useCallback(async () => {
    setLoading(true);
    try {
      // Current month form
      const { data } = await supabase
        .from('form1_monthly')
        .select('*')
        .eq('hospital_id', hospital.hospital_id)
        .eq('reporting_month', selectedMonth)
        .eq('reporting_year', selectedYear)
        .maybeSingle();

      if (data) {
        setFormData(data);
        setExistingId(data.id);
        setIsSubmitted(data.status === 'submitted');
      } else {
        setFormData({});
        setExistingId(null);
        setIsSubmitted(false);
      }

      // Cumulative — sum previous months in same financial year
      const fyStartMonth = 4;
      const fyStartYear = selectedMonth >= 4 ? selectedYear : selectedYear - 1;

      const { data: prevForms } = await supabase
        .from('form1_monthly')
        .select('*')
        .eq('hospital_id', hospital.hospital_id)
        .eq('financial_year', financialYear)
        .lt('reporting_month', selectedMonth === 4 ? 999 : selectedMonth)
        .eq('status', 'submitted');

      if (prevForms && prevForms.length > 0) {
        const cumulative: Record<string, number> = {};
        cumulativeFields.forEach(field => {
          const nonCumField = field.replace('_cumulative', '_current_month');
          cumulative[field] = prevForms.reduce((sum, f) => sum + (Number(f[nonCumField]) || 0), 0);
        });
        setCumulativeData(cumulative);
      } else {
        setCumulativeData({});
      }
    } finally {
      setLoading(false);
    }
  }, [hospital.hospital_id, selectedMonth, selectedYear, financialYear]);

  useEffect(() => { fetchForm(); }, [fetchForm]);
  useEffect(() => { fetchMySubmissions(); }, [fetchMySubmissions]);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const buildPayload = (status: string) => {
    const payload: any = {
      ...formData,
      hospital_id: hospital.hospital_id,
      hospital_name: hospital.facility_name,
      district: hospital.district,
      ayush_stream: hospital.system,
      reporting_month: selectedMonth,
      reporting_year: selectedYear,
      financial_year: financialYear,
      submitted_by: session?.name || session?.id,
      submitted_by_id: session?.id,
      status,
      updated_at: new Date().toISOString(),
    };

    // Auto-calculate cumulative fields
    cumulativeFields.forEach(cf => {
      const monthField = cf.replace('_cumulative', '_current_month');
      payload[cf] = (cumulativeData[cf] || 0) + (Number(formData[monthField as keyof Form1Data]) || 0);
    });

    if (status === 'submitted') payload.submitted_at = new Date().toISOString();
    return payload;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const payload = buildPayload('draft');
      if (existingId) {
        await supabase.from('form1_monthly').update(payload).eq('id', existingId);
      } else {
        const { data } = await supabase.from('form1_monthly').insert(payload).select('id').single();
        if (data) setExistingId(data.id);
      }
      setToast('Draft saved successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setToast('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const handleSubmit = async () => {
    setShowSubmitConfirm(false);
    setSubmitting(true);
    try {
      const payload = buildPayload('submitted');
      if (existingId) {
        await supabase.from('form1_monthly').update(payload).eq('id', existingId);
      } else {
        await supabase.from('form1_monthly').insert(payload);
      }
      setIsSubmitted(true);
      setToast('✅ Form submitted successfully!');
      setTimeout(() => setToast(''), 4000);
      fetchForm();
      fetchMySubmissions();
    } catch (err: any) {
      setToast('❌ Error: ' + err.message);
      setTimeout(() => setToast(''), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = isSubmitted;

  // Cannot fill form before 1st of next month
  // e.g. May 2026 form can only be filled from 1 June 2026 onwards
  const today = new Date();
  const fillableFrom = new Date(selectedYear, selectedMonth, 1); // 1st of next month
  const isTooEarly = today < fillableFrom;
  const fillableFromStr = fillableFrom.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const getCumulative = (monthField: string) => {
    const cumField = monthField.replace('_current_month', '_cumulative');
    // Agar form submitted hai to saved cumulative value use karo — dobara calculate mat karo
    if (isSubmitted && formData[cumField as keyof Form1Data] !== undefined && formData[cumField as keyof Form1Data] !== null) {
      return Number(formData[cumField as keyof Form1Data]) || 0;
    }
    const prev = cumulativeData[cumField] || 0;
    const curr = Number(formData[monthField as keyof Form1Data]) || 0;
    return prev + curr;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="text-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">

      {/* Sub Tabs */}
      <div className="flex gap-1.5 mb-5 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm">
        <button onClick={() => setSubTab('fill')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${subTab === 'fill' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <FileText size={15} />Fill Form
        </button>
        <button onClick={() => setSubTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${subTab === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Clock size={15} />My Submissions
          {mySubmissions.filter(s => s.status === 'submitted').length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${subTab === 'history' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
              {mySubmissions.filter(s => s.status === 'submitted').length}
            </span>
          )}
        </button>
      </div>

      {/* History Tab */}
      {subTab === 'history' && (
        <div>
          {mySubmissions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
              <FileText size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No forms submitted yet</p>
              <button onClick={() => setSubTab('fill')} className="mt-3 text-emerald-600 text-sm font-semibold hover:underline">
                Fill your first form →
              </button>
            </div>
          ) : (
            <>
              {/* Group by Financial Year */}
              {[...new Set(mySubmissions.map(s => s.financial_year))].map(fy => (
                <div key={fy} className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">FY {fy}</p>
                  <div className="space-y-2">
                    {mySubmissions.filter(s => s.financial_year === fy).map(form => (
                      <div key={form.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${form.status === 'submitted' ? 'bg-green-100' : 'bg-amber-100'}`}>
                          {form.status === 'submitted'
                            ? <CheckCircle size={18} className="text-green-600" />
                            : <Clock size={18} className="text-amber-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800">{MONTHS[form.reporting_month - 1]} {form.reporting_year}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {form.status === 'submitted'
                              ? `Submitted — ${form.submitted_at ? new Date(form.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`
                              : 'Draft — not yet submitted'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 hidden md:block">
                          <p className="text-xs text-slate-400">OPD Cumulative</p>
                          <p className="font-bold text-emerald-600">{(form.opd_footfall_cumulative || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedMonth(form.reporting_month);
                            setSelectedYear(form.reporting_year);
                            setSubTab('fill');
                          }}
                          className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium flex-shrink-0">
                          <Eye size={13} />View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Fill Form Tab */}
      {subTab === 'fill' && (
      <div>
      {/* Month Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Reporting Month</label>
            <select value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Year</label>
            <select value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Financial Year</label>
            <div className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-500 font-mono">
              FY {financialYear}
            </div>
          </div>
          <div className="flex items-end">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
              isSubmitted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isSubmitted ? <CheckCircle size={16} /> : <Clock size={16} />}
              {isSubmitted ? 'Submitted' : 'Draft'}
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-start gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            Reporting for <strong>{MONTHS[selectedMonth-1]} {selectedYear}</strong> data.
            Cumulative fields auto-calculate from April {selectedMonth >= 4 ? selectedYear : selectedYear-1}.
            {Object.keys(cumulativeData).length > 0 && ` Previous months data included.`}
          </span>
        </div>

        {isTooEarly && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong>Cannot fill this form yet.</strong> {MONTHS[selectedMonth-1]} {selectedYear} report can only be submitted from <strong>{fillableFromStr}</strong> onwards.
            </span>
          </div>
        )}

        {isSubmitted && (
          <div className="mt-3 p-3 bg-green-50 border-2 border-green-300 rounded-xl flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-700 text-sm">Form Submitted Successfully</p>
              <p className="text-green-600 text-xs mt-0.5">
                {MONTHS[selectedMonth-1]} {selectedYear} — Submitted by {formData.submitted_by}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Progressive Functional HWC Infrastructure */}
      <SectionCard title="Progressive Functional HWC — Infrastructure (Criteria 1-6)" icon={Activity} color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YesNoField label="1. Branding Done" fieldKey="branding_done" value={formData.branding_done} onChange={handleChange} disabled={disabled} />
          <YesNoField label="2. Infrastructure Completed" fieldKey="infrastructure_completed" value={formData.infrastructure_completed} onChange={handleChange} disabled={disabled} />
          <YesNoField label="3. Herbal Garden Available" fieldKey="herbal_garden_available" value={formData.herbal_garden_available} onChange={handleChange} disabled={disabled} />
          {formData.herbal_garden_available === 'Yes' && (
            <NumberField label="No. of Plants in Herbal Garden" fieldKey="herbal_garden_plants" value={formData.herbal_garden_plants} onChange={handleChange} disabled={disabled} />
          )}
          <YesNoField label="4. Medicine Available" fieldKey="medicine_available" value={formData.medicine_available} onChange={handleChange} disabled={disabled} />
          <YesNoField label="5. IT Network / Internet Available" fieldKey="it_network_available" value={formData.it_network_available} onChange={handleChange} disabled={disabled} />
          <YesNoField label="6. CHO Posted" fieldKey="cho_posted" value={formData.cho_posted} onChange={handleChange} disabled={disabled} />
          <YesNoField label="Yoga Instructor Appointed" fieldKey="yoga_instructor_appointed" value={formData.yoga_instructor_appointed} onChange={handleChange} disabled={disabled} />
        </div>
      </SectionCard>

      {/* SECTION 3: Training */}
      <SectionCard title="Training Status" icon={Users} color="purple">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YesNoField label="Training of CHOs Completed" fieldKey="cho_training_completed" value={formData.cho_training_completed}
            onChange={(key: string, val: string) => {
              handleChange(key, val);
              if (val === 'Yes') handleChange('cho_trained_count', 1);
              else handleChange('cho_trained_count', '');
            }}
            disabled={disabled} />
          <YesNoField label="Training of Yoga Instructors Completed" fieldKey="yoga_instructor_training_completed" value={formData.yoga_instructor_training_completed} onChange={handleChange} disabled={disabled} />
          {formData.yoga_instructor_training_completed === 'Yes' && (
            <NumberField label="No. of Yoga Instructors Trained" fieldKey="yoga_instructors_trained" value={formData.yoga_instructors_trained} onChange={handleChange} disabled={disabled} />
          )}
          <YesNoField label="Training of ASHAs/ANMs Completed" fieldKey="asha_anm_training_completed" value={formData.asha_anm_training_completed} onChange={handleChange} disabled={disabled} />
          {formData.asha_anm_training_completed === 'Yes' && (
            <>
              <NumberField label="No. of ASHAs Trained in AYUSH" fieldKey="ashas_trained" value={formData.ashas_trained} onChange={handleChange} disabled={disabled} />
              <NumberField label="No. of ANMs Trained in AYUSH" fieldKey="anms_trained" value={formData.anms_trained} onChange={handleChange} disabled={disabled} />
            </>
          )}
        </div>
      </SectionCard>

      {/* SECTION 4: OPD */}
      <SectionCard title="OPD Services" icon={Activity} color="orange">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YesNoField label="OPD Started" fieldKey="opd_started" value={formData.opd_started} onChange={handleChange} disabled={disabled} />
          {formData.opd_started === 'Yes' && (
            <>
              {/* Male / Female / Other fields */}
              <NumberField label="No. of Male Footfall — Current Month" fieldKey="opd_footfall_male_current_month" value={(formData as any).opd_footfall_male_current_month} onChange={(key: string, val: string) => {
                handleChange(key, val);
                // Auto-calculate total
                const m = Number(val) || 0;
                const f = Number((formData as any).opd_footfall_female_current_month) || 0;
                const o = Number((formData as any).opd_footfall_other_current_month) || 0;
                handleChange('opd_footfall_current_month', m + f + o);
              }} disabled={disabled} />

              <NumberField label="No. of Female Footfall — Current Month" fieldKey="opd_footfall_female_current_month" value={(formData as any).opd_footfall_female_current_month} onChange={(key: string, val: string) => {
                handleChange(key, val);
                const m = Number((formData as any).opd_footfall_male_current_month) || 0;
                const f = Number(val) || 0;
                const o = Number((formData as any).opd_footfall_other_current_month) || 0;
                handleChange('opd_footfall_current_month', m + f + o);
              }} disabled={disabled} />

              <NumberField label="No. of Other Footfall — Current Month" fieldKey="opd_footfall_other_current_month" value={(formData as any).opd_footfall_other_current_month} onChange={(key: string, val: string) => {
                handleChange(key, val);
                const m = Number((formData as any).opd_footfall_male_current_month) || 0;
                const f = Number((formData as any).opd_footfall_female_current_month) || 0;
                const o = Number(val) || 0;
                handleChange('opd_footfall_current_month', m + f + o);
              }} disabled={disabled} />

              {/* Total Footfall — auto-calculated */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700">No. of Footfall — Current Month (Auto Total)</span>
                <span className="text-lg font-bold text-emerald-700">
                  {(Number((formData as any).opd_footfall_male_current_month) || 0) +
                   (Number((formData as any).opd_footfall_female_current_month) || 0) +
                   (Number((formData as any).opd_footfall_other_current_month) || 0)}
                </span>
              </div>

              {/* Male Cumulative */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700">Male Footfall — Cumulative (FY {financialYear})</span>
                <span className="text-lg font-bold text-blue-700">{getCumulative('opd_footfall_male_current_month').toLocaleString('en-IN')}</span>
              </div>

              {/* Female Cumulative */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700">Female Footfall — Cumulative (FY {financialYear})</span>
                <span className="text-lg font-bold text-blue-700">{getCumulative('opd_footfall_female_current_month').toLocaleString('en-IN')}</span>
              </div>

              {/* Other Cumulative */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700">Other Footfall — Cumulative (FY {financialYear})</span>
                <span className="text-lg font-bold text-blue-700">{getCumulative('opd_footfall_other_current_month').toLocaleString('en-IN')}</span>
              </div>

              {/* Total Cumulative */}
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">No. of Footfall — Cumulative (FY {financialYear})</span>
                  <span className="text-lg font-bold text-blue-700">{getCumulative('opd_footfall_current_month').toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">No. of Beneficiaries — Medicines Distributed (Cumulative FY {financialYear})</span>
                  <span className="text-lg font-bold text-blue-700">
                    {isSubmitted
                      ? (Number(formData.medicines_distributed_cumulative) || 0).toLocaleString('en-IN')
                      : ((cumulativeData['medicines_distributed_cumulative'] || 0) + (Number((formData as any).medicines_distributed_current_month) || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <NumberField label="Medicines Distributed — Current Month" fieldKey="medicines_distributed_current_month" value={(formData as any).medicines_distributed_current_month} onChange={handleChange} disabled={disabled} />
            </>
          )}
        </div>
      </SectionCard>

      {/* SECTION 5: Stage-I */}
      <SectionCard title="Functional HWC Stage-I (Criteria 7-12)" icon={CheckCircle} color="slate">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YesNoField label="7. Lab Services Available" fieldKey="lab_services_available" value={formData.lab_services_available} onChange={handleChange} disabled={disabled} />
          <YesNoField label="8. Laptop/Desktop Purchased" fieldKey="laptop_desktop_purchased" value={formData.laptop_desktop_purchased} onChange={handleChange} disabled={disabled} />
        </div>
      </SectionCard>

      {/* SECTION 6: Family Empanelment & CBAC */}
      <SectionCard title="Stage-II — Family Empanelment & CBAC Survey" icon={Users} color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YesNoField label="Family Empanelment Started" fieldKey="family_empanelment_started" value={formData.family_empanelment_started} onChange={handleChange} disabled={disabled} />
          {formData.family_empanelment_started === 'Yes' && (
            <NumberField label="No. of People Empanelled" fieldKey="people_empanelled" value={formData.people_empanelled} onChange={handleChange} disabled={disabled} />
          )}
          <YesNoField label="CBAC Survey Started (30+ age)" fieldKey="cbac_survey_started" value={formData.cbac_survey_started} onChange={handleChange} disabled={disabled} />
          {formData.cbac_survey_started === 'Yes' && (
            <>
              <NumberField label="No. Underwent CBAC — Current Month" fieldKey="cbac_survey_current_month" value={formData.cbac_survey_current_month} onChange={handleChange} disabled={disabled} />
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">CBAC Survey — Cumulative (FY {financialYear})</span>
                  <span className="text-lg font-bold text-blue-700">{getCumulative('cbac_survey_current_month').toLocaleString('en-IN')}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* SECTION 7: DM Screening */}
      <SectionCard title="Screening — Diabetes Mellitus (DM)" icon={Activity} color="red">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YesNoField label="Screening for DM Started" fieldKey="screening_dm" value={formData.screening_dm} onChange={handleChange} disabled={disabled} />
          {formData.screening_dm === 'Yes' && (
            <>
              <NumberField label="No. Screened for DM — Current Month" fieldKey="screened_dm_current_month" value={formData.screened_dm_current_month} onChange={handleChange} disabled={disabled} />
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">DM Screening — Cumulative (FY {financialYear})</span>
                  <span className="text-lg font-bold text-blue-700">{getCumulative('screened_dm_current_month').toLocaleString('en-IN')}</span>
                </div>
              </div>
              <NumberField label="No. of DM Cases on Treatment/Follow-up" fieldKey="dm_on_treatment" value={formData.dm_on_treatment} onChange={handleChange} disabled={disabled} />
            </>
          )}
        </div>
      </SectionCard>

      {/* SECTION 8: HT Screening */}
      <SectionCard title="Screening — Hypertension (HT)" icon={Activity} color="red">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YesNoField label="Screening for HT Started" fieldKey="screening_ht" value={formData.screening_ht} onChange={handleChange} disabled={disabled} />
          {formData.screening_ht === 'Yes' && (
            <>
              <NumberField label="No. Screened for HT — Current Month" fieldKey="screened_ht_current_month" value={formData.screened_ht_current_month} onChange={handleChange} disabled={disabled} />
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">HT Screening — Cumulative (FY {financialYear})</span>
                  <span className="text-lg font-bold text-blue-700">{getCumulative('screened_ht_current_month').toLocaleString('en-IN')}</span>
                </div>
              </div>
              <NumberField label="No. of HT Cases on Treatment/Follow-up" fieldKey="ht_on_treatment" value={formData.ht_on_treatment} onChange={handleChange} disabled={disabled} />
            </>
          )}
        </div>
      </SectionCard>

      {/* SECTION 9: Cancer Screening */}
      <SectionCard title="Cancer Screening" icon={Activity} color="purple">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YesNoField label="Screening for Oral Cancer" fieldKey="screening_oral_cancer" value={formData.screening_oral_cancer} onChange={handleChange} disabled={disabled} />
          {formData.screening_oral_cancer === 'Yes' && (
            <>
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">Oral Cancer Screening — Cumulative (FY {financialYear})</span>
                  <span className="text-lg font-bold text-blue-700">{getCumulative('screened_oral_cancer_current_month' as any).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <NumberField label="No. Screened for Oral Cancer — Current Month" fieldKey="screened_oral_cancer_current_month" value={(formData as any).screened_oral_cancer_current_month} onChange={handleChange} disabled={disabled} />
              <NumberField label="No. of Oral Cancer Cases Referred" fieldKey="referred_oral_cancer" value={formData.referred_oral_cancer} onChange={handleChange} disabled={disabled} />
            </>
          )}

          <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Breast Cancer</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700">Breast Cancer Screening — Cumulative (FY {financialYear})</span>
                <span className="text-lg font-bold text-blue-700">{getCumulative('screened_breast_cancer_current_month' as any).toLocaleString('en-IN')}</span>
              </div>
              <NumberField label="No. Screened for Breast Cancer — Current Month" fieldKey="screened_breast_cancer_current_month" value={(formData as any).screened_breast_cancer_current_month} onChange={handleChange} disabled={disabled} />
              <NumberField label="No. of Breast Cancer Cases Referred" fieldKey="referred_breast_cancer" value={formData.referred_breast_cancer} onChange={handleChange} disabled={disabled} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* SECTION 10: Cervix Cancer, Prakriti, Yoga, IEC, Medicinal Plants, Performance */}
      <SectionCard title="Additional Indicators" icon={Activity} color="purple">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Cervix Cancer */}
          <div className="md:col-span-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cervix Cancer Screening</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumberField label="No. of Cases Screened for Cervix Cancer — Current Month" fieldKey="screened_cervix_cancer_current_month" value={(formData as any).screened_cervix_cancer_current_month} onChange={handleChange} disabled={disabled} />
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700">Cervix Cancer Screening — Cumulative (FY {financialYear})</span>
                <span className="text-lg font-bold text-blue-700">{getCumulative('screened_cervix_cancer_current_month').toLocaleString('en-IN')}</span>
              </div>
              <NumberField label="No. of Referrals for Cervix Cancer" fieldKey="referred_cervix_cancer" value={(formData as any).referred_cervix_cancer} onChange={handleChange} disabled={disabled} />
            </div>
          </div>

          {/* Prakriti Parikshan */}
          <div className="md:col-span-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Prakriti Parikshan</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <YesNoField label="Prakriti Parikshan Started (18+ age population)" fieldKey="prakriti_parikshan_started" value={(formData as any).prakriti_parikshan_started} onChange={handleChange} disabled={disabled} />
              {(formData as any).prakriti_parikshan_started === 'Yes' && (
                <>
                  <NumberField label="No. of People Underwent Prakriti Parikshan — Current Month" fieldKey="prakriti_parikshan_current_month" value={(formData as any).prakriti_parikshan_current_month} onChange={handleChange} disabled={disabled} />
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700">Prakriti Parikshan — Cumulative (FY {financialYear})</span>
                    <span className="text-lg font-bold text-blue-700">{getCumulative('prakriti_parikshan_current_month').toLocaleString('en-IN')}</span>
                  </div>
                  <NumberField label="No. of People Counselled for Lifestyle after Prakriti Parikshan — Current Month" fieldKey="counselled_after_prakriti_current_month" value={(formData as any).counselled_after_prakriti_current_month} onChange={handleChange} disabled={disabled} />
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700">Counselled after Prakriti — Cumulative (FY {financialYear})</span>
                    <span className="text-lg font-bold text-blue-700">{getCumulative('counselled_after_prakriti_current_month').toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* IEC Activity */}
          <div className="md:col-span-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">IEC Activity</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <YesNoField label="IEC Activity Done at Community Level" fieldKey="iec_activity_done" value={(formData as any).iec_activity_done} onChange={handleChange} disabled={disabled} />
              {(formData as any).iec_activity_done === 'Yes' && (
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">What kind of IEC activities undertaken (mention any 3 activities)</label>
                  <textarea disabled={disabled}
                    value={(formData as any).iec_activities_description ?? ''}
                    onChange={e => handleChange('iec_activities_description', e.target.value)}
                    rows={3} placeholder="e.g. Health mela, Wall painting, Nukkad natak..."
                    className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none transition-all ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}`} />
                </div>
              )}
            </div>
          </div>

          {/* Yoga Sessions */}
          <div className="md:col-span-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yoga Sessions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <YesNoField label="Yoga Sessions Started" fieldKey="yoga_sessions_started" value={(formData as any).yoga_sessions_started} onChange={handleChange} disabled={disabled} />
              {(formData as any).yoga_sessions_started === 'Yes' && (
                <>
                  <NumberField label="No. of Yoga Sessions Conducted — Current Month" fieldKey="yoga_sessions_current_month" value={(formData as any).yoga_sessions_current_month} onChange={handleChange} disabled={disabled} />
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700">Yoga Sessions — Cumulative (FY {financialYear})</span>
                    <span className="text-lg font-bold text-blue-700">{getCumulative('yoga_sessions_current_month').toLocaleString('en-IN')}</span>
                  </div>
                  <YesNoField label="If Yes, Yoga Sessions Conducted at HWC and Community Level" fieldKey="yoga_sessions_at_community" value={(formData as any).yoga_sessions_at_community} onChange={handleChange} disabled={disabled} />
                </>
              )}
            </div>
          </div>

          {/* Medicinal Plants */}
          <div className="md:col-span-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Medicinal Plants Distribution</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <YesNoField label="Distribution of Brochure on Medicinal Plants / Or Medicinal Plant Started to Families" fieldKey="medicinal_plant_brochure" value={(formData as any).medicinal_plant_brochure} onChange={handleChange} disabled={disabled} />
              {(formData as any).medicinal_plant_brochure === 'Yes' && (
                <>
                  <NumberField label="No. of Families Distributed Medicinal Plants OR Brochure in Catchment Area" fieldKey="families_medicinal_plant_distributed" value={(formData as any).families_medicinal_plant_distributed} onChange={handleChange} disabled={disabled} />
                </>
              )}
            </div>
          </div>

          {/* Performance Based Incentives */}
          <div className="md:col-span-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Performance Based Incentives</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <YesNoField label="Performance Based Incentives Received to CHOs" fieldKey="incentive_cho" value={(formData as any).incentive_cho} onChange={handleChange} disabled={disabled} />
              <YesNoField label="Performance Based Incentives Received to ASHAs" fieldKey="incentive_asha" value={(formData as any).incentive_asha} onChange={handleChange} disabled={disabled} />
              <YesNoField label="Performance Based Incentives Received to HWC Team" fieldKey="incentive_hwc_team" value={(formData as any).incentive_hwc_team} onChange={handleChange} disabled={disabled} />
            </div>
          </div>

          {/* Challenges */}
          <div className="md:col-span-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Challenges</p>
            <div className="grid grid-cols-1 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">Major Challenges in Operationalization of HWCs (Mention three major key challenges)</label>
                <textarea disabled={disabled}
                  value={(formData as any).major_challenges ?? ''}
                  onChange={e => handleChange('major_challenges', e.target.value)}
                  rows={3} placeholder="1. ...\n2. ...\n3. ..."
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none transition-all ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}`} />
              </div>
            </div>
          </div>

        </div>
      </SectionCard>

      {/* Action Buttons */}
      {!isSubmitted && (
        <div className="flex gap-3 mt-4 pb-8">
          <button onClick={handleSaveDraft} disabled={saving || submitting || isTooEarly}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-emerald-300 text-emerald-700 bg-emerald-50 rounded-2xl font-bold text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : <><Save size={16} />Save Draft</>}
          </button>
          <button onClick={() => setShowSubmitConfirm(true)} disabled={saving || submitting || isTooEarly}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <><Loader2 size={16} className="animate-spin" />Submitting...</> : <><Send size={16} />Submit Form</>}
          </button>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={24} className="text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Submit Form 1?</h3>
              <p className="text-slate-500 text-sm mb-1">
                <strong>{MONTHS[selectedMonth - 1]} {selectedYear}</strong>
              </p>
              <p className="text-slate-400 text-xs mb-6">Once submitted, this form cannot be edited.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-2xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-colors">
                  Yes, Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-xl z-[200]">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      )}
    </div>
  );
}

// ── Admin View (District/State sees submitted forms) ──────────────────────────
function AdminView({ session }: any) {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [viewingForm, setViewingForm] = useState<any | null>(null);
  const [districts, setDistricts] = useState<string[]>([]);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('form1_monthly')
      .select('*')
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });

    if (isDistrictAdmin(session)) {
      console.log("DEBUG: Admin ID:", session.id, "Session Object:", session);
      // District multiple sources se try karo
      let adminDistrict = session?.district ||
        session?.present_district ||
        session?.activeDistrict ||
        session?.hospitalDistrict ||
        (session?.access_districts && session.access_districts.length > 0 ? session.access_districts[0] : null);

      // Agar session mein nahi mila to staff table se fetch karo
      if (!adminDistrict && session?.id) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('present_district, district, home_district')
          .eq('id', session.id)
          .maybeSingle();
        console.log("DEBUG: Admin ID:", session.id, "Staff Table Data:", staffData);
        adminDistrict = staffData?.present_district || staffData?.district || staffData?.home_district;
      }

      if (adminDistrict) {
        const trimmedDistrict = adminDistrict.toString().trim();
        console.log("DEBUG: Admin ID:", session.id, "Filtering by district (raw):", adminDistrict, "Trimmed:", trimmedDistrict);
        query = query.ilike('district', `%${trimmedDistrict}%`);
      } else {
        console.log("DEBUG: Admin ID:", session.id, "No admin district found in session or staff table.");
        // District nahi mila — koi bhi record mat dikhao
        setForms([]);
        setLoading(false);
        return;
      }
    }
    if (filterDistrict !== 'all') query = query.eq('district', filterDistrict);
    if (filterMonth !== 'all') query = query.eq('reporting_month', Number(filterMonth));
    if (filterYear) query = query.eq('reporting_year', filterYear);

    const { data } = await query;
    setForms(data || []);

    // Districts list
    const dists = [...new Set((data || []).map((f: any) => f.district).filter(Boolean))].sort();
    setDistricts(dists as string[]);
    setLoading(false);
  }, [session, filterDistrict, filterMonth, filterYear]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const downloadCSV = () => {
    if (forms.length === 0) { alert('No forms to download'); return; }

    const headers = [
      // Metadata
      'Hospital Name', 'District', 'AYUSH Stream', 'Month', 'Year', 'Financial Year',
      'Status', 'Submitted By', 'Submitted At',
      // Section 1: Local Coordination
      'DPMU/District AYUSH Society Formed', 'MOU with NHM', 'MOU with Private Partners', 'MOU Partner Name',
      'Inter-sectoral Convergence (VHSNC/VHND)',
      // Section 2: Infrastructure
      'Branding Done', 'Infrastructure Completed', 'Herbal Garden Available', 'No. of Plants in Herbal Garden',
      'Medicine Available', 'IT Network/Internet Available', 'CHO Posted', 'Yoga Instructor Appointed',
      // Section 3: Training
      'Training of CHOs Completed', 'CHOs Trained Count',
      'Training of Yoga Instructors Completed', 'No. of Yoga Instructors Trained',
      'Training of ASHAs/ANMs Completed', 'No. of ASHAs Trained', 'No. of ANMs Trained',
      // Section 4: OPD
      'OPD Started',
      'OPD Male Footfall - Current Month', 'OPD Female Footfall - Current Month', 'OPD Other Footfall - Current Month',
      'OPD Total Footfall - Current Month', 'OPD Footfall - Cumulative',
      'OPD Male Footfall - Cumulative', 'OPD Female Footfall - Cumulative', 'OPD Other Footfall - Cumulative',
      'Medicines Distributed - Current Month', 'Medicines Distributed - Cumulative',
      // Section 5: Stage-I
      'Lab Services Available', 'Laptop/Desktop Purchased',
      // Section 6: Family & CBAC
      'Family Empanelment Started', 'No. of People Empanelled',
      'CBAC Survey Started', 'CBAC Survey - Current Month', 'CBAC Survey - Cumulative',
      // Section 7: DM
      'DM Screening Started', 'Screened for DM - Current Month', 'Screened for DM - Cumulative', 'DM Cases on Treatment/Follow-up',
      // Section 8: HT
      'HT Screening Started', 'Screened for HT - Current Month', 'Screened for HT - Cumulative', 'HT Cases on Treatment/Follow-up',
      // Section 9: Cancer
      'Oral Cancer Screening Started',
      'Screened for Oral Cancer - Current Month', 'Screened for Oral Cancer - Cumulative', 'Oral Cancer Cases Referred',
      'Screened for Breast Cancer - Current Month', 'Screened for Breast Cancer - Cumulative', 'Breast Cancer Cases Referred',
      // Section 10: Additional Indicators
      'Screened for Cervix Cancer - Current Month', 'Screened for Cervix Cancer - Cumulative', 'Cervix Cancer Cases Referred',
      'Prakriti Parikshan Started',
      'Prakriti Parikshan - Current Month', 'Prakriti Parikshan - Cumulative',
      'Counselled after Prakriti Parikshan - Current Month', 'Counselled after Prakriti Parikshan - Cumulative',
      'IEC Activity Done', 'IEC Activities Description',
      'Yoga Sessions Started',
      'Yoga Sessions - Current Month', 'Yoga Sessions - Cumulative',
      'Yoga Sessions at HWC & Community Level',
      'Medicinal Plant/Brochure Distribution Started',
      'No. of Families Distributed Medicinal Plants/Brochure',
      'Performance Incentives - CHOs', 'Performance Incentives - ASHAs', 'Performance Incentives - HWC Team',
      'Major Challenges'
    ];

    const rows = forms.map(f => [
      // Metadata
      f.hospital_name, f.district, f.ayush_stream,
      MONTHS[f.reporting_month - 1], f.reporting_year, f.financial_year,
      f.status,
      f.submitted_by,
      f.submitted_at ? new Date(f.submitted_at).toLocaleString('en-IN') : '',
      // Section 1
      f.dpmu_formed, f.mou_with_nhm, f.mou_with_private, f.mou_partner_name || '',
      f.intersectoral_convergence,
      // Section 2
      f.branding_done, f.infrastructure_completed,
      f.herbal_garden_available, f.herbal_garden_plants || '',
      f.medicine_available, f.it_network_available, f.cho_posted, f.yoga_instructor_appointed,
      // Section 3
      f.cho_training_completed, f.cho_trained_count || '',
      f.yoga_instructor_training_completed, f.yoga_instructors_trained || '',
      f.asha_anm_training_completed, f.ashas_trained || '', f.anms_trained || '',
      // Section 4
      f.opd_started,
      f.opd_footfall_male_current_month || '', f.opd_footfall_female_current_month || '', f.opd_footfall_other_current_month || '',
      f.opd_footfall_current_month || '', f.opd_footfall_cumulative || '',
      f.opd_footfall_male_cumulative || '', f.opd_footfall_female_cumulative || '', f.opd_footfall_other_cumulative || '',
      f.medicines_distributed_current_month || '', f.medicines_distributed_cumulative || '',
      // Section 5
      f.lab_services_available, f.laptop_desktop_purchased,
      // Section 6
      f.family_empanelment_started, f.people_empanelled || '',
      f.cbac_survey_started,
      f.cbac_survey_current_month || '', f.cbac_survey_cumulative || '',
      // Section 7: DM
      f.screening_dm,
      f.screened_dm_current_month || '', f.screened_dm_cumulative || '',
      f.dm_on_treatment || '',
      // Section 8: HT
      f.screening_ht,
      f.screened_ht_current_month || '', f.screened_ht_cumulative || '',
      f.ht_on_treatment || '',
      // Section 9: Cancer
      f.screening_oral_cancer,
      f.screened_oral_cancer_current_month || '', f.screened_oral_cancer_cumulative || '',
      f.referred_oral_cancer || '',
      f.screened_breast_cancer_current_month || '', f.screened_breast_cancer_cumulative || '',
      f.referred_breast_cancer || '',
      // Section 10: Additional
      f.screened_cervix_cancer_current_month || '', f.screened_cervix_cancer_cumulative || '',
      f.referred_cervix_cancer || '',
      f.prakriti_parikshan_started,
      f.prakriti_parikshan_current_month || '', f.prakriti_parikshan_cumulative || '',
      f.counselled_after_prakriti_current_month || '', f.counselled_after_prakriti_cumulative || '',
      f.iec_activity_done, f.iec_activities_description || '',
      f.yoga_sessions_started,
      f.yoga_sessions_current_month || '', f.yoga_sessions_cumulative || '',
      f.yoga_sessions_at_community || '',
      f.medicinal_plant_brochure,
      f.families_medicinal_plant_distributed || '',
      f.incentive_cho, f.incentive_asha, f.incentive_hwc_team,
      f.major_challenges || ''
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`));

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Form1_AAM_AYUSH_${filterMonth !== 'all' ? MONTHS[Number(filterMonth) - 1] + '_' : ''}${filterYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
        <div className="flex items-end gap-3 flex-wrap">
          {isSuperOrState(session) && (
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">District</label>
              <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                <option value="all">All Districts</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Month</label>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="min-w-[110px]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Year</label>
            <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2 ml-auto">
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">{forms.length}</p>
              <p className="text-xs text-slate-400">forms</p>
            </div>
            <button onClick={downloadCSV}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200">
              <Download size={15} />CSV
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-emerald-500 animate-spin" />
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <FileText size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No submitted forms found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {forms.map(form => (
            <div key={form.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{form.hospital_name}</p>
                <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{form.district}</span>
                  <span>•</span>
                  <span>{MONTHS[form.reporting_month-1]} {form.reporting_year}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-semibold">FY {form.financial_year}</span>
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-400">OPD</p>
                <p className="font-bold text-emerald-600">{(form.opd_footfall_cumulative || 0).toLocaleString('en-IN')}</p>
              </div>
              <button onClick={() => setViewingForm(form)}
                className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium flex-shrink-0">
                <Eye size={13} />View
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form Detail Modal */}
      <AnimatePresence>
        {viewingForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold">{viewingForm.hospital_name}</h2>
                  <p className="text-emerald-200 text-xs mt-0.5">
                    {MONTHS[viewingForm.reporting_month-1]} {viewingForm.reporting_year} — FY {viewingForm.financial_year}
                  </p>
                </div>
                <button onClick={() => setViewingForm(null)} className="text-emerald-200 hover:text-white p-1"><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['District', viewingForm.district],
                    ['AYUSH Stream', viewingForm.ayush_stream],
                    ['Submitted By', viewingForm.submitted_by],
                    ['Submitted At', viewingForm.submitted_at ? new Date(viewingForm.submitted_at).toLocaleString('en-IN') : '—'],
                    ['Branding Done', viewingForm.branding_done],
                    ['CHO Posted', viewingForm.cho_posted],
                    ['OPD Started', viewingForm.opd_started],
                    ['OPD This Month', viewingForm.opd_footfall_current_month || '—'],
                    ['OPD Cumulative', viewingForm.opd_footfall_cumulative || '—'],
                    ['CBAC Cumulative', viewingForm.cbac_survey_cumulative || '—'],
                    ['DM Screened Cumulative', viewingForm.screened_dm_cumulative || '—'],
                    ['HT Screened Cumulative', viewingForm.screened_ht_cumulative || '—'],
                    ['Oral Cancer Cumulative', viewingForm.screened_oral_cancer_cumulative || '—'],
                    ['Breast Cancer Cumulative', viewingForm.screened_breast_cancer_cumulative || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 font-semibold">{label}</p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Form1Monthly({ session }: { session: any }) {
  const [hospital, setHospital] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'form' | 'submitted'>('form');

  const canFillForm = isIncharge(session);
  const canViewReports = isSuperOrState(session) || isDistrictAdmin(session);
  const showBothTabs = canFillForm && (isSuperOrState(session) || isDistrictAdmin(session));

  useEffect(() => {
    const fetchHospital = async () => {
      if (!canFillForm) { setLoading(false); return; }

      const hospitalId = session?.activeHospitalId || session?.hospitalId || session?.id;
      if (!hospitalId) { setLoading(false); return; }

      const { data } = await supabase
        .from('hospitals')
        .select('hospital_id, facility_name, district, system, facility_type, type')
        .eq('hospital_id', hospitalId)
        .maybeSingle();

      setHospital(data);
      setLoading(false);
    };

    fetchHospital();
  }, [session]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="text-emerald-500 animate-spin" />
    </div>
  );

  // Check: Only AAM AYUSH type hospitals
  const isAAMHospital = hospital?.type === 'Ayushman Arogya Mandir (AYUSH)' ||
    hospital?.facility_type === 'Ayushman Arogya Mandir (AYUSH)' ||
    hospital?.type?.toLowerCase().includes('ayushman') ||
    hospital?.facility_type?.toLowerCase().includes('ayushman');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <FileText size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Form 1 — Monthly Report</h1>
            <p className="text-slate-400 text-sm">AYUSH Health & Wellness Centres (AAM)</p>
          </div>
        </div>

        {/* Tabs */}
        {(canFillForm || canViewReports) && (
          <div className="flex gap-1.5 mt-5 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm">
            {canFillForm && isAAMHospital && (
              <button onClick={() => setActiveTab('form')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'form' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                <FileText size={15} />Fill Form
              </button>
            )}
            {canViewReports && (
              <button onClick={() => setActiveTab('submitted')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'submitted' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                <BarChart3 size={15} />Submitted Forms
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'form' && canFillForm && (
        <>
          {!isAAMHospital ? (
            <div className="max-w-5xl mx-auto">
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <AlertCircle size={36} className="text-amber-400 mx-auto mb-3" />
                <h3 className="font-bold text-slate-600 text-lg">Form 1 Not Applicable</h3>
                <p className="text-slate-400 text-sm mt-2">
                  This form is only for <strong>Ayushman Arogya Mandir (AYUSH)</strong> facilities.
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Your facility type: <strong>{hospital?.type || hospital?.facility_type || 'Unknown'}</strong>
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Hospital Info Banner */}
              <div className="max-w-5xl mx-auto mb-5">
                <div className="bg-emerald-600 rounded-2xl p-4 flex items-center gap-4">
                  <Building2 size={20} className="text-emerald-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{hospital?.facility_name}</p>
                    <p className="text-emerald-200 text-xs">{hospital?.district} • {hospital?.system}</p>
                  </div>
                  <div className="bg-white/20 px-3 py-1.5 rounded-xl text-white text-xs font-bold flex-shrink-0">
                    AAM AYUSH
                  </div>
                </div>
              </div>
              <Form1View session={session} hospital={hospital} />
            </>
          )}
        </>
      )}

      {activeTab === 'submitted' && canViewReports && (
        <AdminView session={session} />
      )}

      {!canFillForm && !canViewReports && (
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <AlertCircle size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Access not available for your role</p>
          </div>
        </div>
      )}
    </div>
  );
}

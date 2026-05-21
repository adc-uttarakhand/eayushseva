import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calculator, Save, CheckCircle, Clock, AlertCircle,
  Loader2, Download, ChevronDown, ChevronUp,
  Users, Activity, Building2, BarChart3,
  IndianRupee, User, Eye, Filter, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────
interface IncentiveRecord {
  id: string;
  hospital_id: string;
  hospital_name?: string;
  district: string;
  reporting_month: number;
  reporting_year: number;
  financial_year: string;
  calculated_by?: string;
  catchment_population?: number;
  population_above_30?: number;
  total_families?: number;
  total_ht_patients?: number;
  total_dm_patients?: number;
  opd_actual?: number;
  prakriti_actual?: number;
  empanelment_actual?: number;
  ht_screening_actual?: number;
  dm_screening_actual?: number;
  ht_followup_actual?: number;
  dm_followup_actual?: number;
  lifestyle_session_actual?: number;
  medicinal_plants_actual?: number;
  intersectoral_meetings_actual?: number;
  ind1_pct?: number; ind2_pct?: number; ind3_pct?: number;
  ind4_pct?: number; ind5_pct?: number; ind6_pct?: number;
  ind7_pct?: number; ind8_pct?: number; ind9_pct?: number;
  ind10_pct?: number;
  cho_name?: string;
  cho_employee_id?: string;
  cho_incentive_total?: number;
  asha1_name?: string; asha1_incentive?: number;
  asha2_name?: string; asha2_incentive?: number;
  asha3_name?: string; asha3_incentive?: number;
  asha4_name?: string; asha4_incentive?: number;
  asha5_name?: string; asha5_incentive?: number;
  status: string;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const INDICATORS = [
  { id: 1, key: 'opd', label: 'OPD (New + Old Patients)', targetField: 'opd_target',
    targetFormula: (d: any) => Math.round((d.catchment_population || 0) * 0.10),
    hint: '10% of catchment population per month' },
  { id: 2, key: 'prakriti', label: 'Prakriti Pareekshan', targetField: 'prakriti_target',
    targetFormula: (d: any) => Math.round((d.catchment_population || 0) * 0.025),
    hint: '2.5% of catchment population per month' },
  { id: 3, key: 'empanelment', label: 'Family Empanelment via ASHA', targetField: 'empanelment_target',
    targetFormula: (d: any) => Math.round((d.total_families || 0) * 0.80),
    hint: '80% of total families in catchment' },
  { id: 4, key: 'ht_screening', label: 'HT Screening — New Patients (30+ yrs)', targetField: 'ht_screening_target',
    targetFormula: (d: any) => Math.round((d.population_above_30 || 0) * 0.02),
    hint: '2% of population above 30 years per month' },
  { id: 5, key: 'dm_screening', label: 'DM Screening — New Patients (30+ yrs)', targetField: 'dm_screening_target',
    targetFormula: (d: any) => Math.round((d.population_above_30 || 0) * 0.02),
    hint: '2% of population above 30 years per month' },
  { id: 6, key: 'ht_followup', label: 'HT Follow-up (Screened patients visiting for treatment/yoga)', targetField: 'ht_followup_target',
    targetFormula: (d: any) => d.total_ht_patients || 0,
    hint: 'All previously screened HT patients' },
  { id: 7, key: 'dm_followup', label: 'DM Follow-up (Screened patients visiting for treatment/yoga)', targetField: 'dm_followup_target',
    targetFormula: (d: any) => d.total_dm_patients || 0,
    hint: 'All previously screened DM patients' },
  { id: 8, key: 'lifestyle_session', label: '7-Day Lifestyle Modification Session (last 2 months, min 20 participants)', targetField: 'lifestyle_session_target',
    targetFormula: (_: any) => 1,
    hint: 'Minimum 1 session in last 2 months' },
  { id: 9, key: 'medicinal_plants', label: 'Families Received Medicinal Plants this month', targetField: 'medicinal_plants_target',
    targetFormula: (d: any) => Math.round((d.total_families || 0) * 0.02),
    hint: '2% of total families per month' },
  { id: 10, key: 'intersectoral_meetings', label: 'Intersectoral Meetings (public participated)', targetField: 'intersectoral_meetings_target',
    targetFormula: (_: any) => 1,
    hint: 'Minimum 1 meeting per month' },
];

function getFinancialYear(month: number, year: number): string {
  return month >= 4 ? `${year}-${(year+1).toString().slice(2)}` : `${year-1}-${year.toString().slice(2)}`;
}

function getPrevMonth() {
  const now = new Date();
  let m = now.getMonth(); // 0-indexed = previous month
  let y = now.getFullYear();
  if (m === 0) { m = 12; y -= 1; }
  return { month: m, year: y };
}

function calcPct(actual: number, target: number): number {
  if (!target || target === 0) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

function isSuperOrState(s: any) { return ['SUPER_ADMIN', 'STATE_ADMIN'].includes(s?.role); }
function isDistrictAdmin(s: any) { return s?.role === 'DISTRICT_ADMIN'; }
function isAdmin(s: any) { return isSuperOrState(s) || isDistrictAdmin(s); }

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, color = 'emerald', children, defaultOpen = true }: any) {
  const [open, setOpen] = useState(defaultOpen);
  const colors: Record<string, string> = {
    emerald: 'from-emerald-600 to-emerald-700',
    blue: 'from-blue-600 to-blue-700',
    purple: 'from-purple-600 to-purple-700',
    orange: 'from-orange-500 to-orange-600',
    rose: 'from-rose-600 to-rose-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-4">
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r ${colors[color]} text-white`}>
        <Icon size={17} />
        <span className="font-bold text-sm flex-1 text-left">{title}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function NumInput({ label, fieldKey, value, onChange, disabled, hint }: any) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
      {hint && <p className="text-[10px] text-slate-400 mb-1.5">{hint}</p>}
      <input type="number" min={0} disabled={disabled}
        value={value ?? ''}
        onChange={e => onChange(fieldKey, e.target.value === '' ? '' : Number(e.target.value))}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all ${disabled ? 'bg-slate-50 opacity-70 cursor-not-allowed' : 'border-slate-200'}`} />
    </div>
  );
}

function TextInput({ label, fieldKey, value, onChange, disabled, placeholder }: any) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
      <input type="text" disabled={disabled} placeholder={placeholder}
        value={value ?? ''}
        onChange={e => onChange(fieldKey, e.target.value)}
        className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all ${disabled ? 'bg-slate-50 opacity-70 cursor-not-allowed' : ''}`} />
    </div>
  );
}

// ── Indicator Row ─────────────────────────────────────────────────────────────
function IndicatorRow({ ind, target, actual, pct, onChange, disabled }: any) {
  const barColor = pct >= 100 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="bg-slate-50 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{ind.id}</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-700 leading-tight">{ind.label}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{ind.hint}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Target</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm font-bold text-blue-700">{target ?? '—'}</div>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Actual</p>
          <input type="number" min={0} disabled={disabled}
            value={actual ?? ''}
            onChange={e => onChange(`${ind.key}_actual`, e.target.value === '' ? '' : Number(e.target.value))}
            className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${disabled ? 'bg-slate-50 opacity-70 cursor-not-allowed' : 'bg-white'}`} />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Performance</p>
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" style={{ color: barColor }}>{pct}%</div>
        </div>
      </div>
      <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: barColor }}
          animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.4 }} />
      </div>
    </div>
  );
}

// ── Main Calculator View (Incharge) ───────────────────────────────────────────
function CalculatorView({ session, hospital }: any) {
  const def = getPrevMonth();
  const [selectedMonth, setSelectedMonth] = useState(def.month);
  const [selectedYear, setSelectedYear] = useState(def.year);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [view, setView] = useState<'calculator' | 'history'>('calculator');
  const [history, setHistory] = useState<IncentiveRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const financialYear = getFinancialYear(selectedMonth, selectedYear);

  // Calculate targets from base params
  const targets = INDICATORS.reduce((acc, ind) => {
    acc[ind.key] = ind.targetFormula(form);
    return acc;
  }, {} as Record<string, number>);

  // Calculate performance %
  const pcts = INDICATORS.reduce((acc, ind) => {
    acc[ind.key] = calcPct(Number(form[`${ind.key}_actual`]) || 0, targets[ind.key]);
    return acc;
  }, {} as Record<string, number>);

  // Calculate incentives
  const ashaCount = [1,2,3,4,5].filter(i => form[`asha${i}_name`]?.trim()).length;
  const choIncentive = INDICATORS.reduce((sum, ind) => sum + (pcts[ind.key] >= 100 ? 500 : Math.round((pcts[ind.key] / 100) * 500)), 0);
  const ashaIncentive = INDICATORS.reduce((sum, ind) => sum + (pcts[ind.key] >= 100 ? 100 : Math.round((pcts[ind.key] / 100) * 100)), 0);

  const fetchForm = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('incentive_records')
      .select('*')
      .eq('hospital_id', hospital.hospital_id)
      .eq('reporting_month', selectedMonth)
      .eq('reporting_year', selectedYear)
      .maybeSingle();

    if (data) {
      setForm(data);
      setExistingId(data.id);
    } else {
      setForm({});
      setExistingId(null);
    }
    setLoading(false);
  }, [hospital.hospital_id, selectedMonth, selectedYear]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('incentive_records')
      .select('*')
      .eq('hospital_id', hospital.hospital_id)
      .order('reporting_year', { ascending: false })
      .order('reporting_month', { ascending: false });
    setHistory(data || []);
    setLoadingHistory(false);
  }, [hospital.hospital_id]);

  useEffect(() => { fetchForm(); }, [fetchForm]);
  useEffect(() => { if (view === 'history') fetchHistory(); }, [view, fetchHistory]);

  const handleChange = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const buildPayload = () => ({
    hospital_id: hospital.hospital_id,
    hospital_name: hospital.facility_name,
    district: hospital.district,
    reporting_month: selectedMonth,
    reporting_year: selectedYear,
    financial_year: financialYear,
    calculated_by: session?.name || session?.id,
    calculated_by_id: session?.id,

    // Base params
    catchment_population: Number(form.catchment_population) || null,
    population_above_30: Number(form.population_above_30) || null,
    total_families: Number(form.total_families) || null,
    total_ht_patients: Number(form.total_ht_patients) || null,
    total_dm_patients: Number(form.total_dm_patients) || null,

    // Actuals
    opd_actual: Number(form.opd_actual) || null,
    prakriti_actual: Number(form.prakriti_actual) || null,
    empanelment_actual: Number(form.empanelment_actual) || null,
    ht_screening_actual: Number(form.ht_screening_actual) || null,
    dm_screening_actual: Number(form.dm_screening_actual) || null,
    ht_followup_actual: Number(form.ht_followup_actual) || null,
    dm_followup_actual: Number(form.dm_followup_actual) || null,
    lifestyle_session_actual: Number(form.lifestyle_session_actual) || null,
    medicinal_plants_actual: Number(form.medicinal_plants_actual) || null,
    intersectoral_meetings_actual: Number(form.intersectoral_meetings_actual) || null,

    // Performance %
    ind1_pct: pcts.opd, ind2_pct: pcts.prakriti, ind3_pct: pcts.empanelment,
    ind4_pct: pcts.ht_screening, ind5_pct: pcts.dm_screening,
    ind6_pct: pcts.ht_followup, ind7_pct: pcts.dm_followup,
    ind8_pct: pcts.lifestyle_session, ind9_pct: pcts.medicinal_plants,
    ind10_pct: pcts.intersectoral_meetings,

    // CHO
    cho_name: form.cho_name || null,
    cho_employee_id: form.cho_employee_id || null,
    cho_incentive_total: choIncentive,

    // ASHAs
    asha1_name: form.asha1_name || null, asha1_incentive: form.asha1_name ? ashaIncentive : null,
    asha2_name: form.asha2_name || null, asha2_incentive: form.asha2_name ? ashaIncentive : null,
    asha3_name: form.asha3_name || null, asha3_incentive: form.asha3_name ? ashaIncentive : null,
    asha4_name: form.asha4_name || null, asha4_incentive: form.asha4_name ? ashaIncentive : null,
    asha5_name: form.asha5_name || null, asha5_incentive: form.asha5_name ? ashaIncentive : null,

    status: 'calculated',
    updated_at: new Date().toISOString(),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (existingId) {
        await supabase.from('incentive_records').update(payload).eq('id', existingId);
      } else {
        const { data } = await supabase.from('incentive_records').insert(payload).select('id').single();
        if (data) setExistingId(data.id);
      }
      setToast('✅ Incentive calculation saved!');
      setTimeout(() => setToast(''), 3000);
      fetchHistory();
    } catch (err: any) {
      setToast('❌ Error: ' + err.message);
      setTimeout(() => setToast(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-emerald-500 animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Sub tabs */}
      <div className="flex gap-1.5 mb-5 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm">
        <button onClick={() => setView('calculator')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === 'calculator' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Calculator size={15} />Calculate Incentive
        </button>
        <button onClick={() => setView('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Clock size={15} />History
          {history.length > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${view === 'history' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>{history.length}</span>}
        </button>
      </div>

      {view === 'history' && (
        <div>
          {loadingHistory ? <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-emerald-500" /></div>
          : history.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
              <Calculator size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">No calculations yet</p>
              <button onClick={() => setView('calculator')} className="mt-3 text-emerald-600 text-sm font-semibold hover:underline">Calculate first incentive →</button>
            </div>
          ) : (
            <div>
              {[...new Set(history.map(r => r.financial_year))].map(fy => (
                <div key={fy} className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">FY {fy}</p>
                  <div className="space-y-2">
                    {history.filter(r => r.financial_year === fy).map(rec => (
                      <div key={rec.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <IndianRupee size={18} className="text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-800">{MONTHS[rec.reporting_month - 1]} {rec.reporting_year}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            CHO: <span className="font-semibold text-emerald-700">₹{rec.cho_incentive_total?.toLocaleString('en-IN')}</span>
                            {rec.asha1_name && <> • ASHA: <span className="font-semibold text-blue-600">₹{rec.asha1_incentive?.toLocaleString('en-IN')}/each</span></>}
                          </p>
                        </div>
                        <button onClick={() => { setSelectedMonth(rec.reporting_month); setSelectedYear(rec.reporting_year); setView('calculator'); }}
                          className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium">
                          <Eye size={13} />View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'calculator' && (
        <div>
          {/* Month selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 shadow-sm">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Month</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div className="min-w-[110px]">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Year</label>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-500">FY {financialYear}</div>
              </div>
            </div>
            {existingId && (
              <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                <CheckCircle size={14} className="text-green-600" />
                <p className="text-green-700 text-xs font-semibold">Previously saved — you can update and save again.</p>
              </div>
            )}
          </div>

          {/* Section 1: Base Parameters */}
          <SectionCard title="Catchment Area Parameters" icon={Building2} color="blue">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumInput label="Entire Population of Catchment Area" fieldKey="catchment_population" value={form.catchment_population} onChange={handleChange} hint="Total population served by this HWC" />
              <NumInput label="Population Above 30 Years" fieldKey="population_above_30" value={form.population_above_30} onChange={handleChange} hint="Used for HT/DM screening targets" />
              <NumInput label="Total Families in Catchment Area" fieldKey="total_families" value={form.total_families} onChange={handleChange} hint="Used for empanelment & medicinal plant targets" />
              <NumInput label="Total Hypertensive Patients Screened Till Date" fieldKey="total_ht_patients" value={form.total_ht_patients} onChange={handleChange} hint="Cumulative HT patients screened" />
              <NumInput label="Total Diabetes Patients Screened Till Date" fieldKey="total_dm_patients" value={form.total_dm_patients} onChange={handleChange} hint="Cumulative DM patients screened" />
            </div>
          </SectionCard>

          {/* Section 2: 10 Indicators */}
          <SectionCard title="Performance Indicators (10 Indicators)" icon={Activity} color="emerald">
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>Enter actual values for each indicator. Targets are auto-calculated from catchment parameters above.</span>
            </div>
            {INDICATORS.map(ind => (
              <IndicatorRow
                key={ind.id}
                ind={ind}
                target={targets[ind.key]}
                actual={form[`${ind.key}_actual`]}
                pct={pcts[ind.key]}
                onChange={handleChange}
                disabled={false}
              />
            ))}
          </SectionCard>

          {/* Section 3: CHO Details */}
          <SectionCard title="CHO (Community Health Officer) Details" icon={User} color="purple">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <TextInput label="CHO Name" fieldKey="cho_name" value={form.cho_name} onChange={handleChange} placeholder="Full name of CHO" />
              <TextInput label="CHO Employee ID" fieldKey="cho_employee_id" value={form.cho_employee_id} onChange={handleChange} placeholder="Employee ID" />
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">CHO Incentive Breakdown</p>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {INDICATORS.map(ind => {
                  const amount = Math.round((pcts[ind.key] / 100) * 500);
                  return (
                    <div key={ind.id} className="text-center bg-white rounded-xl p-2 border border-purple-100">
                      <p className="text-[9px] text-slate-400 font-bold">IND {ind.id}</p>
                      <p className="text-xs font-bold text-purple-700">₹{amount}</p>
                      <p className="text-[9px] text-purple-500">{pcts[ind.key]}%</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between bg-purple-700 rounded-xl px-5 py-3">
                <p className="text-purple-200 text-sm font-semibold">Total CHO Incentive</p>
                <p className="text-white text-2xl font-bold">₹{choIncentive.toLocaleString('en-IN')}</p>
              </div>
              <p className="text-[10px] text-purple-500 mt-2 text-center">₹500 per indicator at 100% performance • Proportional for partial performance</p>
            </div>
          </SectionCard>

          {/* Section 4: ASHA Details */}
          <SectionCard title="ASHA Details (Maximum 5 ASHAs)" icon={Users} color="orange">
            <div className="space-y-3 mb-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">A{i}</div>
                  <input type="text" value={form[`asha${i}_name`] ?? ''}
                    onChange={e => handleChange(`asha${i}_name`, e.target.value)}
                    placeholder={`ASHA ${i} name (optional)`}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                </div>
              ))}
            </div>
            {ashaCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">ASHA Incentive Breakdown (per ASHA)</p>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {INDICATORS.map(ind => {
                    const amount = Math.round((pcts[ind.key] / 100) * 100);
                    return (
                      <div key={ind.id} className="text-center bg-white rounded-xl p-2 border border-orange-100">
                        <p className="text-[9px] text-slate-400 font-bold">IND {ind.id}</p>
                        <p className="text-xs font-bold text-orange-700">₹{amount}</p>
                        <p className="text-[9px] text-orange-500">{pcts[ind.key]}%</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between bg-orange-600 rounded-xl px-5 py-3 mb-2">
                  <p className="text-orange-100 text-sm font-semibold">Per ASHA Incentive</p>
                  <p className="text-white text-2xl font-bold">₹{ashaIncentive.toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center justify-between bg-orange-800 rounded-xl px-5 py-3">
                  <p className="text-orange-200 text-sm font-semibold">Total for {ashaCount} ASHAs</p>
                  <p className="text-white text-xl font-bold">₹{(ashaIncentive * ashaCount).toLocaleString('en-IN')}</p>
                </div>
                <p className="text-[10px] text-orange-500 mt-2 text-center">₹100 per indicator at 100% performance • Proportional for partial performance</p>
              </div>
            )}
          </SectionCard>

          {/* Grand Total Summary */}
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 rounded-2xl p-5 mb-5 shadow-lg shadow-emerald-200">
            <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-4">Total Incentive Summary — {MONTHS[selectedMonth-1]} {selectedYear}</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-emerald-200 text-xs mb-1">CHO Incentive</p>
                <p className="text-white text-xl font-bold">₹{choIncentive.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-emerald-200 text-xs mb-1">Per ASHA</p>
                <p className="text-white text-xl font-bold">₹{ashaIncentive.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-emerald-200 text-xs mb-1">All ASHAs ({ashaCount})</p>
                <p className="text-white text-xl font-bold">₹{(ashaIncentive * ashaCount).toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="bg-white/20 rounded-xl px-5 py-3 flex items-center justify-between">
              <p className="text-white font-bold">Grand Total (CHO + All ASHAs)</p>
              <p className="text-white text-2xl font-black">₹{(choIncentive + ashaIncentive * ashaCount).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pb-8">
            <button onClick={handleSave} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50">
              {saving ? <><Loader2 size={18} className="animate-spin" />Saving...</> : <><Save size={18} />Save Incentive Calculation</>}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-xl z-[200]">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Admin View ────────────────────────────────────────────────────────────────
function AdminView({ session }: any) {
  const [records, setRecords] = useState<IncentiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [viewingRecord, setViewingRecord] = useState<IncentiveRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('incentive_records').select('*').order('created_at', { ascending: false });
    if (isDistrictAdmin(session) && session?.district) query = query.eq('district', session.district);
    if (filterDistrict !== 'all') query = query.eq('district', filterDistrict);
    if (filterMonth !== 'all') query = query.eq('reporting_month', Number(filterMonth));
    if (filterYear) query = query.eq('reporting_year', filterYear);
    const { data } = await query;
    setRecords(data || []);
    setLoading(false);
  }, [session, filterDistrict, filterMonth, filterYear]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const districts = [...new Set(records.map(r => r.district).filter(Boolean))].sort();

  const downloadCSV = () => {
    if (records.length === 0) { alert('No records to download'); return; }
    const headers = [
      'Hospital', 'District', 'Month', 'Year', 'Financial Year', 'Calculated By',
      'Catchment Population', 'Pop 30+', 'Total Families', 'HT Patients', 'DM Patients',
      'OPD Actual', 'Prakriti Actual', 'Empanelment Actual',
      'HT Screening Actual', 'DM Screening Actual', 'HT Followup Actual', 'DM Followup Actual',
      'Lifestyle Sessions Actual', 'Medicinal Plants Actual', 'Intersectoral Meetings Actual',
      'Ind1%', 'Ind2%', 'Ind3%', 'Ind4%', 'Ind5%', 'Ind6%', 'Ind7%', 'Ind8%', 'Ind9%', 'Ind10%',
      'CHO Name', 'CHO Employee ID', 'CHO Incentive (₹)',
      'ASHA1 Name', 'ASHA1 Incentive', 'ASHA2 Name', 'ASHA2 Incentive',
      'ASHA3 Name', 'ASHA3 Incentive', 'ASHA4 Name', 'ASHA4 Incentive',
      'ASHA5 Name', 'ASHA5 Incentive'
    ];
    const rows = records.map(r => [
      r.hospital_name, r.district, MONTHS[r.reporting_month-1], r.reporting_year, r.financial_year, r.calculated_by,
      r.catchment_population || '', r.population_above_30 || '', r.total_families || '',
      r.total_ht_patients || '', r.total_dm_patients || '',
      r.opd_actual || '', r.prakriti_actual || '', r.empanelment_actual || '',
      r.ht_screening_actual || '', r.dm_screening_actual || '', r.ht_followup_actual || '',
      r.dm_followup_actual || '', r.lifestyle_session_actual || '',
      r.medicinal_plants_actual || '', r.intersectoral_meetings_actual || '',
      r.ind1_pct || 0, r.ind2_pct || 0, r.ind3_pct || 0, r.ind4_pct || 0, r.ind5_pct || 0,
      r.ind6_pct || 0, r.ind7_pct || 0, r.ind8_pct || 0, r.ind9_pct || 0, r.ind10_pct || 0,
      r.cho_name || '', r.cho_employee_id || '', r.cho_incentive_total || 0,
      r.asha1_name || '', r.asha1_incentive || '', r.asha2_name || '', r.asha2_incentive || '',
      r.asha3_name || '', r.asha3_incentive || '', r.asha4_name || '', r.asha4_incentive || '',
      r.asha5_name || '', r.asha5_incentive || '',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`));

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Incentive_Records_${filterMonth !== 'all' ? MONTHS[Number(filterMonth)-1] + '_' : ''}${filterYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 shadow-sm">
        <div className="flex items-end gap-3 flex-wrap">
          {isSuperOrState(session) && (
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">District</label>
              <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                <option value="all">All Districts</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          <div className="flex-1 min-w-[130px]">
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
              <p className="text-2xl font-bold text-slate-800">{records.length}</p>
              <p className="text-xs text-slate-400">records</p>
            </div>
            <button onClick={downloadCSV}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200">
              <Download size={15} />CSV
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <IndianRupee size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">No incentive records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => {
            const avgPct = Math.round(([rec.ind1_pct, rec.ind2_pct, rec.ind3_pct, rec.ind4_pct, rec.ind5_pct,
              rec.ind6_pct, rec.ind7_pct, rec.ind8_pct, rec.ind9_pct, rec.ind10_pct]
              .filter(Boolean) as number[]).reduce((a, b) => a + b, 0) / 10);
            const barColor = avgPct >= 80 ? '#16a34a' : avgPct >= 50 ? '#f59e0b' : '#ef4444';
            return (
              <div key={rec.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <IndianRupee size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{rec.hospital_name}</p>
                    <p className="text-xs text-slate-400">
                      {rec.district} • {MONTHS[rec.reporting_month-1]} {rec.reporting_year}
                    </p>
                    <div className="mt-1.5 h-1 w-32 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${avgPct}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">CHO</p>
                    <p className="font-bold text-emerald-700">₹{rec.cho_incentive_total?.toLocaleString('en-IN')}</p>
                    {rec.asha1_name && <p className="text-xs text-blue-600">ASHA: ₹{rec.asha1_incentive?.toLocaleString('en-IN')}</p>}
                  </div>
                  <button onClick={() => setViewingRecord(rec)}
                    className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium flex-shrink-0">
                    <Eye size={13} />Detail
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {viewingRecord && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold">{viewingRecord.hospital_name}</h2>
                  <p className="text-emerald-200 text-xs">{MONTHS[viewingRecord.reporting_month-1]} {viewingRecord.reporting_year} • FY {viewingRecord.financial_year}</p>
                </div>
                <button onClick={() => setViewingRecord(null)} className="text-emerald-200 hover:text-white p-1">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {/* Indicators */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Indicator Performance</p>
                  <div className="grid grid-cols-5 gap-2">
                    {INDICATORS.map((ind, i) => {
                      const pct = [viewingRecord.ind1_pct, viewingRecord.ind2_pct, viewingRecord.ind3_pct,
                        viewingRecord.ind4_pct, viewingRecord.ind5_pct, viewingRecord.ind6_pct,
                        viewingRecord.ind7_pct, viewingRecord.ind8_pct, viewingRecord.ind9_pct,
                        viewingRecord.ind10_pct][i] || 0;
                      const c = pct >= 100 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444';
                      return (
                        <div key={ind.id} className="text-center bg-slate-50 rounded-xl p-2 border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold">IND {ind.id}</p>
                          <p className="text-sm font-bold" style={{ color: c }}>{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* CHO */}
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-purple-600 mb-2">CHO Incentive</p>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{viewingRecord.cho_name || '—'}</p>
                      {viewingRecord.cho_employee_id && <p className="text-xs text-slate-500">EMP: {viewingRecord.cho_employee_id}</p>}
                    </div>
                    <p className="text-2xl font-black text-purple-700">₹{viewingRecord.cho_incentive_total?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                {/* ASHAs */}
                {[1,2,3,4,5].filter(i => (viewingRecord as any)[`asha${i}_name`]).length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-orange-600 mb-2">ASHA Incentives</p>
                    {[1,2,3,4,5].filter(i => (viewingRecord as any)[`asha${i}_name`]).map(i => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-orange-100 last:border-0">
                        <p className="text-sm text-slate-700">{(viewingRecord as any)[`asha${i}_name`]}</p>
                        <p className="font-bold text-orange-700">₹{(viewingRecord as any)[`asha${i}_incentive`]?.toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function IncentiveCalculator({ session }: { session: any }) {
  const [hospital, setHospital] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calculator' | 'records'>('calculator');

  const isAAMHospital = (h: any) =>
    h?.type?.toLowerCase().includes('ayushman') ||
    h?.facility_type?.toLowerCase().includes('ayushman');

  useEffect(() => {
    const load = async () => {
      if (isAdmin(session)) { setLoading(false); return; }
      const hospitalId = session?.activeHospitalId || session?.hospitalId || session?.id;
      if (!hospitalId) { setLoading(false); return; }
      const { data } = await supabase.from('hospitals')
        .select('hospital_id, facility_name, district, system, facility_type, type')
        .eq('hospital_id', hospitalId).maybeSingle();
      setHospital(data);
      setLoading(false);
    };
    load();
  }, [session]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-emerald-500 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/20 p-4 md:p-6">
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-700 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Calculator size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Incentive Calculator</h1>
            <p className="text-slate-400 text-sm">AYUSH HWC — CHO & ASHA Performance Incentives</p>
          </div>
        </div>

        {isAdmin(session) && (
          <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm">
            <button onClick={() => setActiveTab('records')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'records' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              <BarChart3 size={15} />All Records
            </button>
          </div>
        )}
      </div>

      {isAdmin(session) ? (
        <AdminView session={session} />
      ) : !isAAMHospital(hospital) ? (
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <AlertCircle size={36} className="text-amber-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-600 text-lg">Not Applicable</h3>
            <p className="text-slate-400 text-sm mt-2">This calculator is only for <strong>Ayushman Arogya Mandir (AYUSH)</strong> facilities.</p>
            <p className="text-slate-400 text-sm mt-1">Your facility type: <strong>{hospital?.type || hospital?.facility_type || 'Unknown'}</strong></p>
          </div>
        </div>
      ) : (
        <CalculatorView session={session} hospital={hospital} />
      )}
    </div>
  );
}

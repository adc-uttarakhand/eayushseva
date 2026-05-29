import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calculator, Save, CheckCircle, Clock, AlertCircle,
  Loader2, Download, ChevronDown, ChevronUp,
  Users, Activity, Building2, BarChart3,
  IndianRupee, User, Eye, Filter, X, Printer
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
  ht_followup_actual?: number;   // repurposed: HTN patients on AYUSH treatment (numerator)
  dm_followup_actual?: number;   // repurposed: DM patients on AYUSH treatment (numerator)
  lifestyle_session_actual?: number;
  lifestyle_session_prev_month?: number;  // manually entered prev month count
  medicinal_plants_actual?: number;
  intersectoral_meetings_actual?: number;
  ind1_pct?: number; ind2_pct?: number; ind3_pct?: number;
  ind4_pct?: number; ind5_pct?: number; ind6_pct?: number;
  ind7_pct?: number; ind8_pct?: number; ind9_pct?: number;
  ind10_pct?: number;
  cho_name?: string;
  cho_employee_id?: string;
  cho_mobile?: string;
  cho_bank_name?: string;
  cho_acc_no?: string;
  cho_ifsc?: string;
  cho_incentive_total?: number;
  asha1_name?: string; asha1_mobile?: string; asha1_bank_name?: string; asha1_acc_no?: string; asha1_ifsc?: string; asha1_incentive?: number;
  asha2_name?: string; asha2_mobile?: string; asha2_bank_name?: string; asha2_acc_no?: string; asha2_ifsc?: string; asha2_incentive?: number;
  asha3_name?: string; asha3_mobile?: string; asha3_bank_name?: string; asha3_acc_no?: string; asha3_ifsc?: string; asha3_incentive?: number;
  asha4_name?: string; asha4_mobile?: string; asha4_bank_name?: string; asha4_acc_no?: string; asha4_ifsc?: string; asha4_incentive?: number;
  asha5_name?: string; asha5_mobile?: string; asha5_bank_name?: string; asha5_acc_no?: string; asha5_ifsc?: string; asha5_incentive?: number;
  status: string;
  created_at: string;
}

interface IndicatorDef {
  id: number;
  key: string;
  label: string;
  targetFormula: (d: any) => number;
  hint: string;
  isProportional?: boolean;   // IND 6 & 7: ratio-based, not target-based
  denominatorField?: string;  // base-param field used as denominator
  denominatorLabel?: string;
  // slabType drives which effectivePct function to use:
  // 'opd'        → absolute count thresholds (IND 1)
  // 'stepped'    → <30%→0, 30-50%→prop, 51-70%→75, 71%+→100 (IND 2,3,4,5,9)
  // 'proportion' → <20%→0, 20-30%→prop30-50, 31-40%→75, 41%+→100 (IND 6,7)
  // 'session'    → binary: current OR previous month session > 0 → 100%, else 0% (IND 8)
  // 'standard'   → <30%→0, proportional above (IND 10)
  slabType: 'standard' | 'stepped' | 'proportion' | 'opd' | 'session';
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

// ── UPDATED INDICATORS (all 10) ───────────────────────────────────────────────
const INDICATORS: IndicatorDef[] = [
  {
    id: 1, key: 'opd',
    label: 'OPD (New + Old Patients)',
    targetFormula: (_: any) => 400,
    hint: '<200 = No incentive • 200–300 = 30–50% • 301–400 = 75% • 401+ = 100%',
    slabType: 'opd',
  },
  {
    id: 2, key: 'prakriti',
    label: 'Prakriti Pareekshan',
    targetFormula: (_: any) => 100,
    hint: 'Fixed target: 100/month • <30% = No incentive • 51–70% = 75% • 71%+ = 100%',
    slabType: 'stepped',
  },
  {
    id: 3, key: 'empanelment',
    label: 'Individual Empanelment',
    targetFormula: (d: any) => Math.round((d.catchment_population || 0) * 0.08),
    hint: '8% of catchment population • <30% = No incentive • 51–70% = 75% • 71%+ = 100%',
    slabType: 'stepped',
  },
  {
    id: 4, key: 'ht_screening',
    label: 'HTN Screening — New Patients (30+ yrs)',
    targetFormula: (d: any) => Math.round((d.population_above_30 || 0) * 0.08),
    hint: '8% of population above 30 years • <30% = No incentive • 51–70% = 75% • 71%+ = 100%',
    slabType: 'stepped',
  },
  {
    id: 5, key: 'dm_screening',
    label: 'DM Screening — New Patients (30+ yrs)',
    targetFormula: (d: any) => Math.round((d.population_above_30 || 0) * 0.08),
    hint: '8% of population above 30 years • <30% = No incentive • 51–70% = 75% • 71%+ = 100%',
    slabType: 'stepped',
  },
  {
    id: 6, key: 'ht_followup',
    label: 'Proportion of HTN Patients on AYUSH Follow-up',
    targetFormula: (_: any) => 0,
    isProportional: true,
    denominatorField: 'total_ht_patients',
    denominatorLabel: 'Total HTN Patients Identified in Screening Till Date',
    hint: 'HTN on AYUSH Tx ÷ Total identified • <20% = No incentive • 31–40% = 75% • 41%+ = 100%',
    slabType: 'proportion',
  },
  {
    id: 7, key: 'dm_followup',
    label: 'Proportion of DM Patients on AYUSH Follow-up',
    targetFormula: (_: any) => 0,
    isProportional: true,
    denominatorField: 'total_dm_patients',
    denominatorLabel: 'Total DM Patients Identified in Screening Till Date',
    hint: 'DM on AYUSH Tx ÷ Total identified • <20% = No incentive • 31–40% = 75% • 41%+ = 100%',
    slabType: 'proportion',
  },
  {
    id: 8, key: 'lifestyle_session',
    label: 'Life Style Modification Counseling Camps (7-day, min 20 persons)',
    targetFormula: (_: any) => 1,
    hint: '100% if session in THIS month or PREVIOUS month • 0% if neither • Annual 50%/75%/100% emerges naturally',
    slabType: 'session',
  },
  {
    id: 9, key: 'medicinal_plants',
    label: 'Distribution of Medicinal Plants to Families',
    targetFormula: (d: any) => Math.round((d.total_families || 0) * 0.08),
    hint: '8% of total families • <30% = No incentive • 51–70% = 75% • 71%+ = 100%',
    slabType: 'stepped',
  },
  {
    id: 10, key: 'intersectoral_meetings',
    label: 'Intersectoral Meetings Organised',
    targetFormula: (_: any) => 1,
    hint: 'Target: 1 meeting per month • Achieve target = 100% incentive',
    slabType: 'standard',
  },
];

// ── Slab sets (one per slabType) ──────────────────────────────────────────────

// OPD (IND 1): absolute OPD count thresholds
const OPD_SLABS = [
  { label: '<200',    min: 0,   max: 199,      hexColor: '#dc2626', chipClass: 'bg-red-100 text-red-700',       note: 'No Incentive' },
  { label: '200–300', min: 200, max: 300,      hexColor: '#ea580c', chipClass: 'bg-orange-100 text-orange-700',  note: '30–50% Inc.'  },
  { label: '301–400', min: 301, max: 400,      hexColor: '#d97706', chipClass: 'bg-amber-100 text-amber-700',    note: '75% Inc.'     },
  { label: '401+',    min: 401, max: Infinity, hexColor: '#16a34a', chipClass: 'bg-green-100 text-green-700',    note: '100% Inc.'    },
];

// Stepped (IND 2,3,4,5,9): % of target, stepped incentive
const STEPPED_SLABS = [
  { label: '<30%',    min: 0,  max: 29,  hexColor: '#dc2626', chipClass: 'bg-red-100 text-red-700',       note: 'No Incentive' },
  { label: '30–50%',  min: 30, max: 50,  hexColor: '#ea580c', chipClass: 'bg-orange-100 text-orange-700',  note: '30–50% Inc.'  },
  { label: '51–70%',  min: 51, max: 70,  hexColor: '#d97706', chipClass: 'bg-amber-100 text-amber-700',    note: '75% Inc.'     },
  { label: '71–100%', min: 71, max: 100, hexColor: '#16a34a', chipClass: 'bg-green-100 text-green-700',    note: '100% Inc.'    },
];

// Proportion (IND 6,7): achievement %, lower threshold at 20%
const PROPORTION_SLABS = [
  { label: '<20%',   min: 0,  max: 19,  hexColor: '#dc2626', chipClass: 'bg-red-100 text-red-700',       note: 'No Incentive' },
  { label: '20–30%', min: 20, max: 30,  hexColor: '#ea580c', chipClass: 'bg-orange-100 text-orange-700',  note: '30–50% Inc.'  },
  { label: '31–40%', min: 31, max: 40,  hexColor: '#d97706', chipClass: 'bg-amber-100 text-amber-700',    note: '75% Inc.'     },
  { label: '41%+',   min: 41, max: 100, hexColor: '#16a34a', chipClass: 'bg-green-100 text-green-700',    note: '100% Inc.'    },
];

// Standard (IND 10): binary target, proportional above 30%
const SLABS = [
  { label: '<30%',    min: 0,  max: 29,  hexColor: '#dc2626', chipClass: 'bg-red-100 text-red-700',       note: 'No Incentive' },
  { label: '30–70%',  min: 30, max: 70,  hexColor: '#d97706', chipClass: 'bg-amber-100 text-amber-700',    note: 'Partial'      },
  { label: '71–100%', min: 71, max: 100, hexColor: '#16a34a', chipClass: 'bg-green-100 text-green-700',    note: 'Full / 100%'  },
];

// Session (IND 8): binary — session in current OR previous month
const SESSION_SLABS = [
  { label: 'No Session', min: 0, max: 0,   hexColor: '#dc2626', chipClass: 'bg-red-100 text-red-700',    note: '0% — No Incentive' },
  { label: 'Session ✓',  min: 1, max: 100, hexColor: '#16a34a', chipClass: 'bg-green-100 text-green-700', note: '100% Incentive'    },
];

function getSlabSet(slabType: IndicatorDef['slabType']) {
  switch(slabType) {
    case 'opd':        return OPD_SLABS;
    case 'stepped':    return STEPPED_SLABS;
    case 'proportion': return PROPORTION_SLABS;
    case 'session':    return SESSION_SLABS;
    default:           return SLABS;
  }
}

function getSlabInfo(rawPct: number) {
  return SLABS.find(s => rawPct >= s.min && rawPct <= s.max) ?? SLABS[0];
}

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

// Raw % achievement — no floor applied, capped at 100
function calcRawPct(actual: number, target: number): number {
  if (!target || target === 0) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

// Effective % — returns 0 if below 30% floor; otherwise rawPct
// This drives ALL incentive math (IND 8, 10 — binary indicators)
function toEffectivePct(raw: number): number {
  return raw < 30 ? 0 : raw;
}

// IND 1 (OPD): absolute count thresholds
// <200 → 0, 200–300 → proportional 30–50%, 301–400 → 75%, 401+ → 100%
function toEffectivePctOPD(actual: number): number {
  if (actual < 200)  return 0;
  if (actual <= 300) return Math.round(30 + ((actual - 200) / 100) * 20); // 200→30%, 300→50%
  if (actual <= 400) return 75;
  return 100;
}

// IND 2,3,4,5,9: % of target, stepped incentive
// <30% → 0, 30–50% → proportional, 51–70% → fixed 75%, 71%+ → 100%
function toEffectivePctStepped(raw: number): number {
  if (raw < 30)  return 0;
  if (raw <= 50) return raw;   // proportional within 30–50% range
  if (raw <= 70) return 75;
  return 100;
}

// IND 6 & 7: proportion-based, lower threshold at 20%
// <20% → 0, 20–30% → proportional 30–50%, 31–40% → fixed 75%, 41%+ → 100%
function toEffectivePctProportion(raw: number): number {
  if (raw < 20)  return 0;
  if (raw <= 30) return Math.round(30 + ((raw - 20) / 10) * 20); // 20→30%, 30→50%
  if (raw <= 40) return 75;
  return 100;
}

// Single dispatcher — picks correct function per indicator slabType
function computeEffectivePct(
  slabType: IndicatorDef['slabType'],
  rawPct: number,
  actualValue: number
): number {
  switch (slabType) {
    case 'opd':        return toEffectivePctOPD(actualValue);
    case 'stepped':    return toEffectivePctStepped(rawPct);
    case 'proportion': return toEffectivePctProportion(rawPct);
    case 'session':    return rawPct; // already 0 or 100 — set in rawPcts computation
    default:           return toEffectivePct(rawPct);  // 'standard' (IND 10)
  }
}

function isSuperOrState(s: any) { return ['SUPER_ADMIN', 'STATE_ADMIN'].includes(s?.role); }
function isDistrictAdmin(s: any) { return s?.role === 'DISTRICT_ADMIN'; }
function isAdmin(s: any) { return isSuperOrState(s) || isDistrictAdmin(s); }

// ── Print Styles (injected once) ──────────────────────────────────────────────
const PRINT_CSS = `
  @media print {
    body * { visibility: hidden !important; }
    .incentive-print-slip, .incentive-print-slip * { visibility: visible !important; }
    .incentive-print-slip {
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100% !important; background: white !important;
      padding: 0 !important; margin: 0 !important;
    }
    @page { size: A4 portrait; margin: 12mm 15mm; }
  }
`;

// Table cell styles (used in PrintContent)
const TH: React.CSSProperties = {
  border: '1px solid #999', padding: '4px 5px',
  textAlign: 'center', fontWeight: 'bold',
  fontSize: '9.5px', background: '#e8f5e9',
};
const TD: React.CSSProperties = {
  border: '1px solid #ccc', padding: '3px 5px',
  textAlign: 'center', fontSize: '10px',
};

// ── PrintContent — A4 layout ──────────────────────────────────────────────────
function PrintContent({ form, hospital, selectedMonth, selectedYear, financialYear,
  rawPcts, pcts, targets, choIncentive, ashaIncentive }: any) {

  const ashaList = [1,2,3,4,5]
    .filter(i => form[`asha${i}_name`]?.trim())
    .map(i => ({
      name: form[`asha${i}_name`],
      mobile: form[`asha${i}_mobile`],
      bank_name: form[`asha${i}_bank_name`],
      acc_no: form[`asha${i}_acc_no`],
      ifsc: form[`asha${i}_ifsc`],
    }));

  const printDate = new Date().toLocaleDateString('en-IN',
    { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#000', background: '#fff', width: '100%' }}>

      {/* ── Page Header ── */}
      <div style={{ textAlign: 'center', borderBottom: '2.5px solid #000', paddingBottom: '7px', marginBottom: '10px' }}>
        <p style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.3px', margin: 0 }}>
          NATIONAL AYUSH MISSION — UTTARAKHAND
        </p>
        <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0 0' }}>
          CHO &amp; ASHA Monthly Performance Incentive Statement
        </p>
        <p style={{ fontSize: '9px', color: '#444', margin: '2px 0 0' }}>
          Ayushman Arogya Mandir (AYUSH Health &amp; Wellness Centre)
        </p>
      </div>

      {/* ── Hospital Info ── */}
      <table style={{ width: '100%', marginBottom: '10px', fontSize: '10.5px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: '2px 4px', width: '40%' }}>
              <strong>Hospital:</strong> {hospital?.facility_name || '—'}
            </td>
            <td style={{ padding: '2px 4px', width: '25%' }}>
              <strong>District:</strong> {hospital?.district || '—'}
            </td>
            <td style={{ padding: '2px 4px', width: '20%' }}>
              <strong>Month:</strong> {MONTHS[selectedMonth - 1]} {selectedYear}
            </td>
            <td style={{ padding: '2px 4px', width: '15%' }}>
              <strong>FY:</strong> {financialYear}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '2px 4px' }} colSpan={2}>
              <strong>Prepared by:</strong> {form.cho_name || '—'}
            </td>
            <td style={{ padding: '2px 4px' }} colSpan={2}>
              <strong>Date:</strong> {printDate}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Performance & Incentive Table ── */}
      <p style={{ fontWeight: 'bold', fontSize: '10.5px', margin: '0 0 4px', borderBottom: '1.5px solid #000', paddingBottom: '2px' }}>
        PERFORMANCE INDICATORS &amp; INCENTIVE CALCULATION
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: '4%' }}>#</th>
            <th style={{ ...TH, textAlign: 'left', width: '32%' }}>Indicator</th>
            <th style={{ ...TH, width: '9%' }}>Target</th>
            <th style={{ ...TH, width: '10%' }}>Actual</th>
            <th style={{ ...TH, width: '9%' }}>Achmt%</th>
            <th style={{ ...TH, width: '9%' }}>Slab</th>
            <th style={{ ...TH, width: '13%' }}>CHO (₹)</th>
            <th style={{ ...TH, width: '14%' }}>ASHA/each (₹)</th>
          </tr>
        </thead>
        <tbody>
          {INDICATORS.map(ind => {
            const raw = rawPcts[ind.key] || 0;
            const eff = pcts[ind.key] || 0;
            const choAmt = Math.round((eff / 100) * 500);
            const ashaAmt = Math.round((eff / 100) * 100);
            const slab = getSlabInfo(raw);

            // Target display
            const targetDisplay = ind.isProportional ? 'Proportion' : (targets[ind.key] ?? '—');

            // Actual display: for proportional, show "X / Y"
            const actualDisplay = ind.isProportional
              ? `${form[`${ind.key}_actual`] || 0} / ${form[ind.denominatorField!] || 0}`
              : (form[`${ind.key}_actual`] ?? 0);

            const pctColor = raw < 30 ? '#dc2626' : raw < 51 ? '#ea580c' : raw < 71 ? '#d97706' : '#16a34a';

            return (
              <tr key={ind.id}>
                <td style={TD}>{ind.id}</td>
                <td style={{ ...TD, textAlign: 'left', fontSize: '9px', lineHeight: '1.3' }}>{ind.label}</td>
                <td style={TD}>{targetDisplay}</td>
                <td style={TD}>{actualDisplay}</td>
                <td style={{ ...TD, fontWeight: 'bold', color: pctColor }}>{raw}%</td>
                <td style={{ ...TD, fontSize: '8.5px', fontWeight: 'bold', color: pctColor }}>{slab.note}</td>
                <td style={{ ...TD, fontWeight: 'bold' }}>₹{choAmt}</td>
                <td style={{ ...TD, fontWeight: 'bold' }}>₹{ashaAmt}</td>
              </tr>
            );
          })}
          {/* No Total row */}
        </tbody>
      </table>

      {/* ── CHO Details ── */}
      <p style={{ fontWeight: 'bold', fontSize: '10.5px', margin: '0 0 4px', borderBottom: '1.5px solid #000', paddingBottom: '2px' }}>
        CHO DETAILS
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '10.5px' }}>
        <tbody>
          <tr style={{ background: '#faf5ff' }}>
            <td style={{ ...TD, textAlign: 'left', padding: '5px 7px' }}><strong>Name:</strong> {form.cho_name || '—'}</td>
            <td style={{ ...TD, textAlign: 'left', padding: '5px 7px' }}><strong>Mobile:</strong> {form.cho_mobile || '—'}</td>
            <td style={{ ...TD, textAlign: 'left', padding: '5px 7px' }}><strong>Bank:</strong> {form.cho_bank_name || '—'}</td>
            <td style={{ ...TD, textAlign: 'left', padding: '5px 7px' }}><strong>Acc No:</strong> {form.cho_acc_no || '—'}</td>
            <td style={{ ...TD, textAlign: 'left', padding: '5px 7px' }}><strong>IFSC:</strong> {form.cho_ifsc || '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* ── ASHA Details ── */}
      {ashaList.length > 0 && (
        <>
          <p style={{ fontWeight: 'bold', fontSize: '10.5px', margin: '0 0 4px', borderBottom: '1.5px solid #000', paddingBottom: '2px' }}>
            ASHA DETAILS
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <thead>
              <tr>
                <th style={TH}>Name</th>
                <th style={TH}>Mobile</th>
                <th style={TH}>Bank Name</th>
                <th style={TH}>Account</th>
                <th style={TH}>IFSC</th>
                <th style={TH}>Incentive (₹)</th>
              </tr>
            </thead>
            <tbody>
              {ashaList.map((a: any, i: number) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff8f0' : '#fff' }}>
                  <td style={TD}>{a.name}</td>
                  <td style={TD}>{a.mobile || '—'}</td>
                  <td style={TD}>{a.bank_name || '—'}</td>
                  <td style={TD}>{a.acc_no || '—'}</td>
                  <td style={TD}>{a.ifsc || '—'}</td>
                  <td style={TD}>₹{ashaIncentive.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── Signatures ── */}      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', gap: '16px' }}>
        {[
          { title: 'CHO Signature', sub: form.cho_name || '________________________' },
          { title: 'Medical Officer / Incharge Signature', sub: 'Name & Designation' },
          { title: 'Counter Sign By DAUO', sub: 'Name & Designation' },
        ].map((sig, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: '45px', borderBottom: '1px solid #000', marginBottom: '5px' }} />
            <p style={{ fontWeight: 'bold', fontSize: '9.5px', margin: '0' }}>{sig.title}</p>
            <p style={{ fontSize: '8.5px', color: '#555', margin: '1px 0 0' }}>{sig.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <p style={{
        fontSize: '7.5px', textAlign: 'center', color: '#888',
        marginTop: '12px', borderTop: '1px solid #ccc', paddingTop: '4px',
      }}>
        Generated via e-AYUSH Seva • National AYUSH Mission, Uttarakhand • {printDate}
      </p>
    </div>
  );
}

// ── PrintSlip — modal wrapper + print trigger ─────────────────────────────────
function PrintSlip({ form, hospital, selectedMonth, selectedYear, financialYear,
  rawPcts, pcts, targets, choIncentive, ashaIncentive, onClose }: any) {

  const handlePrint = () => window.print();

  return (
    <>
      {/* Inject print CSS */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Screen modal — hidden on print via visibility trick */}
      <div className="fixed inset-0 z-[9999] bg-slate-900/75 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-4 pt-6">

        {/* Modal chrome (buttons etc.) */}
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-700 to-slate-600 text-white">
            <div className="flex items-center gap-2">
              <Printer size={17} />
              <span className="font-bold text-sm">Incentive Statement — {MONTHS[selectedMonth - 1]} {selectedYear}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                <Printer size={14} /> Print / Save PDF
              </button>
              <button
                onClick={onClose}
                className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* A4 preview on screen */}
          <div className="bg-slate-200 p-4">
            <div className="bg-white shadow-lg rounded p-6" style={{ minHeight: '297mm' }}>
              <PrintContent
                form={form} hospital={hospital}
                selectedMonth={selectedMonth} selectedYear={selectedYear}
                financialYear={financialYear}
                rawPcts={rawPcts} pcts={pcts} targets={targets}
                choIncentive={choIncentive} ashaIncentive={ashaIncentive}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actual print target — invisible on screen, shown by print CSS */}
      <div className="incentive-print-slip" style={{ position: 'fixed', top: 0, left: 0, zIndex: -999, opacity: 0, pointerEvents: 'none' }}>
        <div style={{ padding: '0' }}>
          <PrintContent
            form={form} hospital={hospital}
            selectedMonth={selectedMonth} selectedYear={selectedYear}
            financialYear={financialYear}
            rawPcts={rawPcts} pcts={pcts} targets={targets}
            choIncentive={choIncentive} ashaIncentive={ashaIncentive}
          />
        </div>
      </div>
    </>
  );
}

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
function IndicatorRow({ ind, target, actual, rawPct, onChange, disabled, denominator, prevMonthName, isFYStart, form }: any) {
  const slabSet = getSlabSet(ind.slabType);

  const activeVal = ind.slabType === 'opd' ? (actual || 0) : rawPct;
  const slab = slabSet.find((s: any) => activeVal >= s.min && activeVal <= s.max) ?? slabSet[0];

  const noIncentive =
    ind.slabType === 'opd'        ? ((actual || 0) > 0 && (actual || 0) < 200) :
    ind.slabType === 'proportion' ? (rawPct > 0 && rawPct < 20) :
    ind.slabType === 'session'    ? false :
                                     (rawPct > 0 && rawPct < 30);

  const isSession = ind.slabType === 'session';

  return (
    <div className="bg-slate-50 rounded-xl p-4 mb-3 border border-slate-100">
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">{ind.id}</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-700 leading-tight">{ind.label}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{ind.hint}</p>
        </div>
        {/* Slab badge */}
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${(isSession ? rawPct > 0 : rawPct > 0) ? slab.chipClass : 'bg-slate-100 text-slate-400'}`}>
          {isSession
            ? (rawPct === 100 ? '✅ 100%' : '❌ 0%')
            : (rawPct > 0 ? slab.note : '—')}
        </span>
      </div>

      {/* Input grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Col 1 */}
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">
            {isSession ? (isFYStart ? 'Prev Month' : `${prevMonthName || 'Prev Month'}`) : ind.isProportional ? 'Identified (Total)' : 'Target'}
          </p>
          {isSession ? (
            isFYStart ? (
              // April = FY start — no previous month in this financial year
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-400 font-semibold">
                FY Start — N/A
              </div>
            ) : (
              // All other months: manual input for previous month's sessions
              <input type="number" min={0} disabled={disabled}
                value={form?.lifestyle_session_prev_month ?? ''}
                onChange={e => onChange('lifestyle_session_prev_month', e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${disabled ? 'bg-slate-50 opacity-70 cursor-not-allowed' : 'bg-white'}`} />
            )
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm font-bold text-blue-700">
              {ind.isProportional
                ? (denominator != null && denominator !== '' ? denominator : '—')
                : (target ?? '—')}
            </div>
          )}
        </div>

        {/* Col 2: Actual input */}
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">
            {isSession ? 'This Month' : ind.isProportional ? 'On AYUSH Tx' : 'Actual'}
          </p>
          <input type="number" min={0} disabled={disabled}
            value={actual ?? ''}
            onChange={e => onChange(`${ind.key}_actual`, e.target.value === '' ? '' : Number(e.target.value))}
            className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${disabled ? 'bg-slate-50 opacity-70 cursor-not-allowed' : 'bg-white'}`} />
        </div>

        {/* Col 3: Achievement % */}
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">
            {isSession ? 'Result' : 'Achievement'}
          </p>
          <div className="rounded-lg px-3 py-1.5 border text-sm font-bold"
            style={{
              color: slab.hexColor,
              borderColor: slab.hexColor + '50',
              backgroundColor: slab.hexColor + '12',
            }}>
            {isSession ? (
              <span>{rawPct === 100 ? '✅ 100%' : '0%'}</span>
            ) : (
              <>
                <span>{rawPct}%</span>
                {noIncentive && (
                  <span className="block text-[9px] font-semibold mt-0.5" style={{ color: '#dc2626' }}>
                    ₹0 — below threshold
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Session: info banner */}
      {isSession && (
        <div className={`mt-2 rounded-lg px-3 py-2 text-[10px] font-semibold ${rawPct === 100 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {rawPct === 100
            ? `✅ Incentive eligible — session recorded in ${(actual || 0) > 0 ? 'this month' : `${prevMonthName || 'previous month'}`}`
            : `❌ No session in this month or ${prevMonthName || 'previous month'} — ₹0 incentive`
          }
        </div>
      )}

      {/* Progress bar — hidden for session (binary, no partial) */}
      {!isSession && (
        <div className="mt-2.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ backgroundColor: slab.hexColor }}
            animate={{ width: `${Math.min(rawPct, 100)}%` }} transition={{ duration: 0.4 }} />
        </div>
      )}

      {/* Slab chips — hidden for session (binary, no slabs) */}
      {!isSession && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {slabSet.map((s: any) => {
            const isActive = activeVal >= s.min && activeVal <= s.max && activeVal > 0;
            return (
              <span key={s.label}
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${isActive ? s.chipClass : 'bg-slate-100 text-slate-300'}`}>
                {s.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Helper: build PrintSlip props from a saved IncentiveRecord ───────────────
function buildPrintPropsFromRecord(rec: IncentiveRecord) {
  // Reconstruct a form-like object from all saved fields
  const form: Record<string, any> = {
    catchment_population: rec.catchment_population,
    population_above_30:  rec.population_above_30,
    total_families:       rec.total_families,
    total_ht_patients:    rec.total_ht_patients,
    total_dm_patients:    rec.total_dm_patients,
    opd_actual:                    rec.opd_actual,
    prakriti_actual:               rec.prakriti_actual,
    empanelment_actual:            rec.empanelment_actual,
    ht_screening_actual:           rec.ht_screening_actual,
    dm_screening_actual:           rec.dm_screening_actual,
    ht_followup_actual:            rec.ht_followup_actual,
    dm_followup_actual:            rec.dm_followup_actual,
    lifestyle_session_actual:      rec.lifestyle_session_actual,
    medicinal_plants_actual:       rec.medicinal_plants_actual,
    intersectoral_meetings_actual: rec.intersectoral_meetings_actual,
    cho_name:        rec.cho_name,
    cho_employee_id: rec.cho_employee_id,
    cho_mobile: rec.cho_mobile,                cho_bank_name: rec.cho_bank_name,
    cho_acc_no: rec.cho_acc_no,                cho_ifsc: rec.cho_ifsc,
    asha1_name: rec.asha1_name, asha1_mobile: rec.asha1_mobile, asha1_bank_name: rec.asha1_bank_name, asha1_acc_no: rec.asha1_acc_no, asha1_ifsc: rec.asha1_ifsc,
    asha2_name: rec.asha2_name, asha2_mobile: rec.asha2_mobile, asha2_bank_name: rec.asha2_bank_name, asha2_acc_no: rec.asha2_acc_no, asha2_ifsc: rec.asha2_ifsc,
    asha3_name: rec.asha3_name, asha3_mobile: rec.asha3_mobile, asha3_bank_name: rec.asha3_bank_name, asha3_acc_no: rec.asha3_acc_no, asha3_ifsc: rec.asha3_ifsc,
    asha4_name: rec.asha4_name, asha4_mobile: rec.asha4_mobile, asha4_bank_name: rec.asha4_bank_name, asha4_acc_no: rec.asha4_acc_no, asha4_ifsc: rec.asha4_ifsc,
    asha5_name: rec.asha5_name, asha5_mobile: rec.asha5_mobile, asha5_bank_name: rec.asha5_bank_name, asha5_acc_no: rec.asha5_acc_no, asha5_ifsc: rec.asha5_ifsc,
  };

  // Use saved ind_pct values as rawPcts (these are raw % saved at calculation time)
  const rawPcts: Record<string, number> = {
    opd:                    rec.ind1_pct  || 0,
    prakriti:               rec.ind2_pct  || 0,
    empanelment:            rec.ind3_pct  || 0,
    ht_screening:           rec.ind4_pct  || 0,
    dm_screening:           rec.ind5_pct  || 0,
    ht_followup:            rec.ind6_pct  || 0,
    dm_followup:            rec.ind7_pct  || 0,
    lifestyle_session:      rec.ind8_pct  || 0,
    medicinal_plants:       rec.ind9_pct  || 0,
    intersectoral_meetings: rec.ind10_pct || 0,
  };

  // Effective pcts — use correct slabType function per indicator
  // For OPD (slabType='opd'), we also need the actual count from the record
  const pcts: Record<string, number> = Object.fromEntries(
    INDICATORS.map(ind => {
      const raw = rawPcts[ind.key];
      // actual value from saved record (needed for OPD absolute threshold)
      const actualVal = Number((form as any)[`${ind.key}_actual`]) || 0;
      return [ind.key, computeEffectivePct(ind.slabType, raw, actualVal)];
    })
  );

  // Recompute targets from saved base params (for display in print table)
  const targets = INDICATORS.reduce((acc, ind) => {
    acc[ind.key] = ind.targetFormula(form);
    return acc;
  }, {} as Record<string, number>);

  // ashaIncentive: use whichever ASHA has a saved incentive value
  const ashaIncentive =
    rec.asha1_incentive ?? rec.asha2_incentive ?? rec.asha3_incentive ??
    rec.asha4_incentive ?? rec.asha5_incentive ?? 0;

  return {
    form,
    hospital: { facility_name: rec.hospital_name, district: rec.district },
    selectedMonth:  rec.reporting_month,
    selectedYear:   rec.reporting_year,
    financialYear:  rec.financial_year,
    rawPcts, pcts, targets,
    choIncentive:  rec.cho_incentive_total  || 0,
    ashaIncentive,
  };
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
  const [showPrint, setShowPrint] = useState(false);
  const [printingRecord, setPrintingRecord] = useState<IncentiveRecord | null>(null);

  // Previous month name — shown as label for manual input in IND 8
  const prevM = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevMonthName = MONTHS[prevM - 1];
  const [history, setHistory] = useState<IncentiveRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const financialYear = getFinancialYear(selectedMonth, selectedYear);

  // ── Targets from base params ───────────────────────────────────────────────
  const targets = INDICATORS.reduce((acc, ind) => {
    acc[ind.key] = ind.targetFormula(form);
    return acc;
  }, {} as Record<string, number>);

  // ── Raw achievement % (uncapped at floor, for display) ─────────────────────
  const rawPcts = INDICATORS.reduce((acc, ind) => {
    if (ind.slabType === 'session') {
      // IND 8: binary — session THIS month OR PREVIOUS month → 100%, else 0%
      // April (FY start): no previous month in this FY — only current month counts
      const thisMonth = Number(form[`${ind.key}_actual`]) || 0;
      const isFYStart = selectedMonth === 4;
      const prevMonth = isFYStart ? 0 : (Number(form.lifestyle_session_prev_month) || 0);
      acc[ind.key] = (thisMonth > 0 || prevMonth > 0) ? 100 : 0;
    } else if (ind.isProportional) {
      // IND 6 & 7: proportion = numerator / denominator × 100
      const num = Number(form[`${ind.key}_actual`]) || 0;
      const den = Number(form[ind.denominatorField!]) || 0;
      acc[ind.key] = den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0;
    } else {
      acc[ind.key] = calcRawPct(Number(form[`${ind.key}_actual`]) || 0, targets[ind.key]);
    }
    return acc;
  }, {} as Record<string, number>);

  // ── Effective % — each indicator uses its own slabType function ──────────────
  const pcts = INDICATORS.reduce((acc, ind) => {
    const actualVal = Number(form[`${ind.key}_actual`]) || 0;
    acc[ind.key] = computeEffectivePct(ind.slabType, rawPcts[ind.key], actualVal);
    return acc;
  }, {} as Record<string, number>);

  // ── Incentive amounts ──────────────────────────────────────────────────────
  const ashaCount = [1,2,3,4,5].filter(i => form[`asha${i}_name`]?.trim()).length;
  // CHO: ₹500 per indicator at 100%; proportional above 30%; ₹0 below 30%
  const choIncentive = INDICATORS.reduce(
    (sum, ind) => sum + Math.round((pcts[ind.key] / 100) * 500), 0
  );
  // ASHA: ₹100 per indicator at 100%; same slab rules
  const ashaIncentive = INDICATORS.reduce(
    (sum, ind) => sum + Math.round((pcts[ind.key] / 100) * 100), 0
  );

  const fetchForm = useCallback(async () => {
    setLoading(true);

    const { data } = await supabase
      .from('incentive_records')
      .select('*')
      .eq('hospital_id', hospital.hospital_id)
      .eq('reporting_month', selectedMonth)
      .eq('reporting_year', selectedYear)
      .maybeSingle();

    if (data) { setForm(data); setExistingId(data.id); }
    else { setForm({}); setExistingId(null); }
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
    population_above_30:  Number(form.population_above_30)  || null,
    total_families:       Number(form.total_families)       || null,
    total_ht_patients:    Number(form.total_ht_patients)    || null,
    total_dm_patients:    Number(form.total_dm_patients)    || null,

    // Actuals
    // Note: ht_followup_actual / dm_followup_actual now store the
    // NUMERATOR (patients on AYUSH treatment) for IND 6 & 7
    opd_actual:                    Number(form.opd_actual) || null,
    prakriti_actual:               Number(form.prakriti_actual) || null,
    empanelment_actual:            Number(form.empanelment_actual) || null,
    ht_screening_actual:           Number(form.ht_screening_actual) || null,
    dm_screening_actual:           Number(form.dm_screening_actual) || null,
    ht_followup_actual:            Number(form.ht_followup_actual) || null,
    dm_followup_actual:            Number(form.dm_followup_actual) || null,
    lifestyle_session_actual:      Number(form.lifestyle_session_actual) || null,
    lifestyle_session_prev_month:  Number(form.lifestyle_session_prev_month) || null,
    medicinal_plants_actual:       Number(form.medicinal_plants_actual) || null,
    intersectoral_meetings_actual: Number(form.intersectoral_meetings_actual) || null,

    // Save RAW achievement % (not effective) — so admin view shows actual performance
    // Incentive amounts already incorporate the 30% floor via effectivePct
    ind1_pct:  rawPcts.opd,               ind2_pct:  rawPcts.prakriti,
    ind3_pct:  rawPcts.empanelment,       ind4_pct:  rawPcts.ht_screening,
    ind5_pct:  rawPcts.dm_screening,      ind6_pct:  rawPcts.ht_followup,
    ind7_pct:  rawPcts.dm_followup,       ind8_pct:  rawPcts.lifestyle_session,
    ind9_pct:  rawPcts.medicinal_plants,  ind10_pct: rawPcts.intersectoral_meetings,

    // CHO
    cho_name: form.cho_name || null,
    cho_employee_id: form.cho_employee_id || null,
    cho_mobile: form.cho_mobile || null,
    cho_bank_name: form.cho_bank_name || null,
    cho_acc_no: form.cho_acc_no || null,
    cho_ifsc: form.cho_ifsc || null,
    cho_incentive_total: choIncentive,

    // ASHAs — all get the same per-ASHA amount
    asha1_name: form.asha1_name || null, asha1_mobile: form.asha1_mobile || null, asha1_bank_name: form.asha1_bank_name || null, asha1_acc_no: form.asha1_acc_no || null, asha1_ifsc: form.asha1_ifsc || null, asha1_incentive: form.asha1_name ? ashaIncentive : null,
    asha2_name: form.asha2_name || null, asha2_mobile: form.asha2_mobile || null, asha2_bank_name: form.asha2_bank_name || null, asha2_acc_no: form.asha2_acc_no || null, asha2_ifsc: form.asha2_ifsc || null, asha2_incentive: form.asha2_name ? ashaIncentive : null,
    asha3_name: form.asha3_name || null, asha3_mobile: form.asha3_mobile || null, asha3_bank_name: form.asha3_bank_name || null, asha3_acc_no: form.asha3_acc_no || null, asha3_ifsc: form.asha3_ifsc || null, asha3_incentive: form.asha3_name ? ashaIncentive : null,
    asha4_name: form.asha4_name || null, asha4_mobile: form.asha4_mobile || null, asha4_bank_name: form.asha4_bank_name || null, asha4_acc_no: form.asha4_acc_no || null, asha4_ifsc: form.asha4_ifsc || null, asha4_incentive: form.asha4_name ? ashaIncentive : null,
    asha5_name: form.asha5_name || null, asha5_mobile: form.asha5_mobile || null, asha5_bank_name: form.asha5_bank_name || null, asha5_acc_no: form.asha5_acc_no || null, asha5_ifsc: form.asha5_ifsc || null, asha5_incentive: form.asha5_name ? ashaIncentive : null,

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
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="text-emerald-500 animate-spin" />
    </div>
  );

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
          {history.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${view === 'history' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* ── History view ── */}
      {view === 'history' && (
        <div>
          {loadingHistory
            ? <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-emerald-500" /></div>
            : history.length === 0
              ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                  <Calculator size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400">No calculations yet</p>
                  <button onClick={() => setView('calculator')}
                    className="mt-3 text-emerald-600 text-sm font-semibold hover:underline">
                    Calculate first incentive →
                  </button>
                </div>
              ) : (
                <div>
                  {[...new Set(history.map(r => r.financial_year))].map(fy => (
                    <div key={fy} className="mb-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">FY {fy}</p>
                      <div className="space-y-2">
                        {history.filter(r => r.financial_year === fy).map(rec => (
                          <div key={rec.id}
                            className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <IndianRupee size={18} className="text-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{MONTHS[rec.reporting_month - 1]} {rec.reporting_year}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                CHO: <span className="font-semibold text-emerald-700">₹{rec.cho_incentive_total?.toLocaleString('en-IN')}</span>
                                {rec.asha1_name && (
                                  <> • ASHA: <span className="font-semibold text-blue-600">₹{rec.asha1_incentive?.toLocaleString('en-IN')}/each</span></>
                                )}
                              </p>
                            </div>
                            <button
                              onClick={() => { setSelectedMonth(rec.reporting_month); setSelectedYear(rec.reporting_year); setView('calculator'); }}
                              className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium">
                              <Eye size={13} />View
                            </button>
                            <button
                              onClick={() => setPrintingRecord(rec)}
                              className="flex items-center gap-1.5 text-xs bg-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium">
                              <Printer size={13} />Print
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
          }
        </div>
      )}

      {/* ── Calculator view ── */}
      {view === 'calculator' && (
        <div>

          {/* Month / Year selector */}
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
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-500">
                  FY {financialYear}
                </div>
              </div>
            </div>
            {existingId && (
              <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                <CheckCircle size={14} className="text-green-600" />
                <p className="text-green-700 text-xs font-semibold">Previously saved — you can update and save again.</p>
              </div>
            )}
          </div>

          {/* Slab rules legend */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm space-y-4">

            {/* IND 1 — OPD absolute count */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">IND 1 — OPD (Absolute Count)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {OPD_SLABS.map(s => (
                  <div key={s.label} className={`rounded-xl p-2.5 ${s.chipClass}`}>
                    <p className="font-bold text-xs">{s.label} OPD</p>
                    <p className="text-[10px] font-semibold opacity-80">{s.note}</p>
                    <p className="text-[9px] mt-0.5 opacity-70">
                      {s.min === 0 ? 'CHO ₹0 • ASHA ₹0'
                       : s.label === '200–300' ? 'CHO ₹150–₹250 • ASHA ₹30–₹50'
                       : s.label === '301–400' ? 'CHO ₹375 • ASHA ₹75'
                       : 'CHO ₹500 • ASHA ₹100'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* IND 2,3,4,5,9 — Stepped */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">IND 2,3,4,5,9 — % of Target (Stepped)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {STEPPED_SLABS.map(s => (
                  <div key={s.label} className={`rounded-xl p-2.5 ${s.chipClass}`}>
                    <p className="font-bold text-xs">{s.label}</p>
                    <p className="text-[10px] font-semibold opacity-80">{s.note}</p>
                    <p className="text-[9px] mt-0.5 opacity-70">
                      {s.min === 0 ? 'CHO ₹0 • ASHA ₹0'
                       : s.label === '30–50%' ? 'CHO ₹150–₹250 • ASHA ₹30–₹50'
                       : s.label === '51–70%' ? 'CHO ₹375 • ASHA ₹75'
                       : 'CHO ₹500 • ASHA ₹100'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* IND 6,7 — Proportion */}
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">IND 6,7 — HTN/DM AYUSH Follow-up Proportion</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PROPORTION_SLABS.map(s => (
                  <div key={s.label} className={`rounded-xl p-2.5 ${s.chipClass}`}>
                    <p className="font-bold text-xs">{s.label}</p>
                    <p className="text-[10px] font-semibold opacity-80">{s.note}</p>
                    <p className="text-[9px] mt-0.5 opacity-70">
                      {s.min === 0 ? 'CHO ₹0 • ASHA ₹0'
                       : s.label === '20–30%' ? 'CHO ₹150–₹250 • ASHA ₹30–₹50'
                       : s.label === '31–40%' ? 'CHO ₹375 • ASHA ₹75'
                       : 'CHO ₹500 • ASHA ₹100'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* IND 8 — Session Binary */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">IND 8 — Lifestyle Camps (2-Month Window)</p>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-xs text-slate-600 font-semibold mb-1">Session in <span className="text-green-700">this month</span> OR <span className="text-green-700">previous month</span> → <strong>100%</strong> incentive</p>
                <p className="text-xs text-slate-600 font-semibold">Neither this nor previous month → <strong className="text-red-600">0%</strong> incentive</p>
                <p className="text-[10px] text-slate-400 mt-1.5">Annual total naturally ≈ 50% (3 sessions) / 75% (4-5) / 100% (6+)</p>
                <p className="text-[10px] text-blue-500 mt-1">Previous month count entered manually — shows actual prev month name as label</p>
              </div>
            </div>

            {/* IND 10 — Standard binary */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">IND 10 — Intersectoral Meeting (Monthly)</p>
              <div className="grid grid-cols-3 gap-2">
                {SLABS.map(s => (
                  <div key={s.label} className={`rounded-xl p-2.5 ${s.chipClass}`}>
                    <p className="font-bold text-xs">{s.label}</p>
                    <p className="text-[10px] font-semibold opacity-80">{s.note}</p>
                    <p className="text-[9px] mt-0.5 opacity-70">
                      {s.min === 0 ? 'CHO ₹0 • ASHA ₹0'
                       : s.label === '30–70%' ? 'CHO ₹150–₹350 • ASHA ₹30–₹70'
                       : 'CHO ₹500 • ASHA ₹100'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 1: Base Parameters */}
          <SectionCard title="Catchment Area Parameters" icon={Building2} color="blue">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumInput
                label="Catchment Population (Total)"
                fieldKey="catchment_population"
                value={form.catchment_population}
                onChange={handleChange}
                hint="Used for: IND 3 Individual Empanelment target (8%)" />
              <NumInput
                label="Population Above 30 Years"
                fieldKey="population_above_30"
                value={form.population_above_30}
                onChange={handleChange}
                hint="Used for: IND 4 HTN Screening & IND 5 DM Screening targets (8%)" />
              <NumInput
                label="Total Families in Catchment Area"
                fieldKey="total_families"
                value={form.total_families}
                onChange={handleChange}
                hint="Used for: IND 9 Medicinal Plants target (8%)" />
              <NumInput
                label="Total HTN Patients Identified during Screening Till Date"
                fieldKey="total_ht_patients"
                value={form.total_ht_patients}
                onChange={handleChange}
                hint="Denominator for IND 6 (HTN AYUSH follow-up proportion)" />
              <NumInput
                label="Total DM Patients Identified during Screening Till Date"
                fieldKey="total_dm_patients"
                value={form.total_dm_patients}
                onChange={handleChange}
                hint="Denominator for IND 7 (DM AYUSH follow-up proportion)" />
            </div>
          </SectionCard>

          {/* Section 2: 10 Indicators */}
          <SectionCard title="Performance Indicators (10 Indicators)" icon={Activity} color="emerald">
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>
                Enter actual values for each indicator. Targets are auto-calculated from catchment parameters above.
                <strong> Incentive = ₹0 if achievement is below 30%</strong> of target.
                For IND 6 &amp; 7, enter the <em>number of patients</em> who actually received AYUSH treatment
                — proportion is auto-calculated using screened totals from base params.
              </span>
            </div>
            {INDICATORS.map(ind => (
              <IndicatorRow
                key={ind.id}
                ind={ind}
                target={targets[ind.key]}
                actual={form[`${ind.key}_actual`]}
                rawPct={rawPcts[ind.key]}
                onChange={handleChange}
                disabled={false}
                denominator={ind.isProportional ? form[ind.denominatorField!] : undefined}
                prevMonthName={ind.slabType === 'session' ? prevMonthName : undefined}
                isFYStart={ind.slabType === 'session' && selectedMonth === 4}
                form={ind.slabType === 'session' ? form : undefined}
              />
            ))}
          </SectionCard>

          {/* Section 3: CHO Details */}
          <SectionCard title="CHO (Community Health Officer) Details" icon={User} color="purple">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <TextInput label="CHO Name" fieldKey="cho_name" value={form.cho_name} onChange={handleChange} placeholder="Full name of CHO" />
              <TextInput label="CHO Employee ID" fieldKey="cho_employee_id" value={form.cho_employee_id} onChange={handleChange} placeholder="Employee ID" />
              <TextInput label="Mobile Number" fieldKey="cho_mobile" value={form.cho_mobile} onChange={handleChange} placeholder="Mobile" />
              <TextInput label="Bank Name" fieldKey="cho_bank_name" value={form.cho_bank_name} onChange={handleChange} placeholder="Bank Name" />
              <TextInput label="Account Number" fieldKey="cho_acc_no" value={form.cho_acc_no} onChange={handleChange} placeholder="Account Number" />
              <TextInput label="IFSC Code" fieldKey="cho_ifsc" value={form.cho_ifsc} onChange={handleChange} placeholder="IFSC Code" />
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">CHO Incentive Breakdown</p>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {INDICATORS.map(ind => {
                  const raw = rawPcts[ind.key];
                  const eff = pcts[ind.key];
                  const amount = Math.round((eff / 100) * 500);
                  const slab = getSlabInfo(raw);
                  return (
                    <div key={ind.id} className="text-center bg-white rounded-xl p-2 border border-purple-100">
                      <p className="text-[9px] text-slate-400 font-bold">IND {ind.id}</p>
                      <p className="text-xs font-bold text-purple-700">₹{amount}</p>
                      <p className="text-[9px] font-semibold" style={{ color: slab.hexColor }}>{raw}%</p>
                      {raw > 0 && raw < 30 && (
                        <p className="text-[8px] text-red-500 font-bold leading-tight">No Inc.</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between bg-purple-700 rounded-xl px-5 py-3">
                <p className="text-purple-200 text-sm font-semibold">Total CHO Incentive</p>
                <p className="text-white text-2xl font-bold">₹{choIncentive.toLocaleString('en-IN')}</p>
              </div>
              <p className="text-[10px] text-purple-500 mt-2 text-center">
                ₹500/indicator at 100% • Proportional ≥30% • ₹0 below 30% • Max ₹5,000
              </p>
            </div>
          </SectionCard>

          {/* Section 4: ASHA Details */}
          <SectionCard title="ASHA Details (Maximum 5 ASHAs)" icon={Users} color="orange">
            <div className="space-y-3 mb-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-white border rounded-xl p-4">
                  <p className="font-bold text-sm mb-3">ASHA {i}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <input type="text" value={form[`asha${i}_name`] ?? ''}
                      onChange={e => handleChange(`asha${i}_name`, e.target.value)}
                      placeholder={`Name`}
                      className="col-span-2 md:col-span-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                    <input type="text" value={form[`asha${i}_mobile`] ?? ''}
                      onChange={e => handleChange(`asha${i}_mobile`, e.target.value)}
                      placeholder={`Mobile`}
                      className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                    <input type="text" value={form[`asha${i}_bank_name`] ?? ''}
                      onChange={e => handleChange(`asha${i}_bank_name`, e.target.value)}
                      placeholder={`Bank Name`}
                      className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                    <input type="text" value={form[`asha${i}_acc_no`] ?? ''}
                      onChange={e => handleChange(`asha${i}_acc_no`, e.target.value)}
                      placeholder={`Account Number`}
                      className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                    <input type="text" value={form[`asha${i}_ifsc`] ?? ''}
                      onChange={e => handleChange(`asha${i}_ifsc`, e.target.value)}
                      placeholder={`IFSC Code`}
                      className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                  </div>
                </div>
              ))}
            </div>
            {ashaCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">ASHA Incentive Breakdown (per ASHA)</p>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {INDICATORS.map(ind => {
                    const raw = rawPcts[ind.key];
                    const eff = pcts[ind.key];
                    const amount = Math.round((eff / 100) * 100);
                    const slab = getSlabInfo(raw);
                    return (
                      <div key={ind.id} className="text-center bg-white rounded-xl p-2 border border-orange-100">
                        <p className="text-[9px] text-slate-400 font-bold">IND {ind.id}</p>
                        <p className="text-xs font-bold text-orange-700">₹{amount}</p>
                        <p className="text-[9px] font-semibold" style={{ color: slab.hexColor }}>{raw}%</p>
                        {raw > 0 && raw < 30 && (
                          <p className="text-[8px] text-red-500 font-bold leading-tight">No Inc.</p>
                        )}
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
                <p className="text-[10px] text-orange-500 mt-2 text-center">
                  ₹100/indicator at 100% • Proportional ≥30% • ₹0 below 30% • Max ₹1,000 per ASHA
                </p>
              </div>
            )}
          </SectionCard>

          {/* Grand Total Summary */}
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 rounded-2xl p-5 mb-5 shadow-lg shadow-emerald-200">
            <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-4">
              Total Incentive Summary — {MONTHS[selectedMonth-1]} {selectedYear}
            </p>
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
              <p className="text-white text-2xl font-black">
                ₹{(choIncentive + ashaIncentive * ashaCount).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Save + Print Buttons */}
          <div className="pb-8 flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50">
              {saving
                ? <><Loader2 size={18} className="animate-spin" />Saving...</>
                : <><Save size={18} />Save</>
              }
            </button>
            <button
              onClick={() => setShowPrint(true)}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-700 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
              <Printer size={18} />Print
            </button>
          </div>
        </div>
      )}

      {/* Print from History Record */}
      {printingRecord && (() => {
        const p = buildPrintPropsFromRecord(printingRecord);
        return (
          <PrintSlip
            form={p.form}
            hospital={p.hospital}
            selectedMonth={p.selectedMonth}
            selectedYear={p.selectedYear}
            financialYear={p.financialYear}
            rawPcts={p.rawPcts}
            pcts={p.pcts}
            targets={p.targets}
            choIncentive={p.choIncentive}
            ashaIncentive={p.ashaIncentive}
            onClose={() => setPrintingRecord(null)}
          />
        );
      })()}

      {/* Print Slip Modal */}
      {showPrint && (
        <PrintSlip
          form={form}
          hospital={hospital}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          financialYear={financialYear}
          rawPcts={rawPcts}
          pcts={pcts}
          targets={targets}
          choIncentive={choIncentive}
          ashaIncentive={ashaIncentive}
          onClose={() => setShowPrint(false)}
        />
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
      'Catchment Population', 'Pop 30+', 'Total Families', 'HTN Patients', 'DM Patients',
      'OPD Actual', 'Prakriti Actual', 'Individual Empanelment Actual',
      'HTN Screening Actual', 'DM Screening Actual',
      'HTN on AYUSH Tx (IND6 Numerator)', 'DM on AYUSH Tx (IND7 Numerator)',
      'Lifestyle Sessions Actual', 'Medicinal Plants Actual', 'Intersectoral Meetings Actual',
      'Ind1% (OPD)', 'Ind2% (Prakriti)', 'Ind3% (Empanelment)', 'Ind4% (HTN Screen)',
      'Ind5% (DM Screen)', 'Ind6% (HTN Followup)', 'Ind7% (DM Followup)',
      'Ind8% (Lifestyle)', 'Ind9% (Med Plants)', 'Ind10% (Intersectoral)',
      'CHO Name', 'CHO Employee ID', 'CHO Incentive (₹)',
      'ASHA1 Name', 'ASHA1 Incentive', 'ASHA2 Name', 'ASHA2 Incentive',
      'ASHA3 Name', 'ASHA3 Incentive', 'ASHA4 Name', 'ASHA4 Incentive',
      'ASHA5 Name', 'ASHA5 Incentive',
    ];
    const rows = records.map(r => [
      r.hospital_name, r.district, MONTHS[r.reporting_month-1], r.reporting_year,
      r.financial_year, r.calculated_by,
      r.catchment_population || '', r.population_above_30 || '', r.total_families || '',
      r.total_ht_patients || '', r.total_dm_patients || '',
      r.opd_actual || '', r.prakriti_actual || '', r.empanelment_actual || '',
      r.ht_screening_actual || '', r.dm_screening_actual || '',
      r.ht_followup_actual || '', r.dm_followup_actual || '',
      r.lifestyle_session_actual || '', r.medicinal_plants_actual || '',
      r.intersectoral_meetings_actual || '',
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
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-emerald-500" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <IndianRupee size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">No incentive records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => {
            const indPcts = [
              rec.ind1_pct, rec.ind2_pct, rec.ind3_pct, rec.ind4_pct, rec.ind5_pct,
              rec.ind6_pct, rec.ind7_pct, rec.ind8_pct, rec.ind9_pct, rec.ind10_pct,
            ].filter(v => v != null) as number[];
            const avgPct = indPcts.length > 0
              ? Math.round(indPcts.reduce((a, b) => a + b, 0) / 10)
              : 0;
            const barColor = avgPct >= 71 ? '#16a34a' : avgPct >= 51 ? '#d97706' : avgPct >= 30 ? '#ea580c' : '#dc2626';
            return (
              <div key={rec.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
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
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${avgPct}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">CHO</p>
                    <p className="font-bold text-emerald-700">₹{rec.cho_incentive_total?.toLocaleString('en-IN')}</p>
                    {rec.asha1_name && (
                      <p className="text-xs text-blue-600">ASHA: ₹{rec.asha1_incentive?.toLocaleString('en-IN')}</p>
                    )}
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
                  <p className="text-emerald-200 text-xs">
                    {MONTHS[viewingRecord.reporting_month-1]} {viewingRecord.reporting_year} • FY {viewingRecord.financial_year}
                  </p>
                </div>
                <button onClick={() => setViewingRecord(null)} className="text-emerald-200 hover:text-white p-1">✕</button>
              </div>
              <div className="p-6 space-y-4">

                {/* Indicator Performance */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Indicator Performance (Raw %)</p>
                  <div className="grid grid-cols-5 gap-2">
                    {INDICATORS.map((ind, i) => {
                      const rawPct = [
                        viewingRecord.ind1_pct, viewingRecord.ind2_pct, viewingRecord.ind3_pct,
                        viewingRecord.ind4_pct, viewingRecord.ind5_pct, viewingRecord.ind6_pct,
                        viewingRecord.ind7_pct, viewingRecord.ind8_pct, viewingRecord.ind9_pct,
                        viewingRecord.ind10_pct,
                      ][i] || 0;
                      const slab = getSlabInfo(rawPct);
                      return (
                        <div key={ind.id} className="text-center bg-slate-50 rounded-xl p-2 border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold">IND {ind.id}</p>
                          <p className="text-sm font-bold" style={{ color: slab.hexColor }}>{rawPct}%</p>
                          <p className="text-[8px] font-semibold" style={{ color: slab.hexColor }}>{slab.note}</p>
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
                      {viewingRecord.cho_employee_id && (
                        <p className="text-xs text-slate-500">EMP: {viewingRecord.cho_employee_id}</p>
                      )}
                    </div>
                    <p className="text-2xl font-black text-purple-700">
                      ₹{viewingRecord.cho_incentive_total?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* ASHAs */}
                {[1,2,3,4,5].filter(i => (viewingRecord as any)[`asha${i}_name`]).length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-orange-600 mb-2">ASHA Incentives</p>
                    {[1,2,3,4,5].filter(i => (viewingRecord as any)[`asha${i}_name`]).map(i => (
                      <div key={i}
                        className="flex justify-between py-1.5 border-b border-orange-100 last:border-0">
                        <p className="text-sm text-slate-700">{(viewingRecord as any)[`asha${i}_name`]}</p>
                        <p className="font-bold text-orange-700">
                          ₹{(viewingRecord as any)[`asha${i}_incentive`]?.toLocaleString('en-IN')}
                        </p>
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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="text-emerald-500 animate-spin" />
    </div>
  );

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
            <p className="text-slate-400 text-sm mt-2">
              This calculator is only for <strong>Ayushman Arogya Mandir (AYUSH)</strong> facilities.
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Your facility type: <strong>{hospital?.type || hospital?.facility_type || 'Unknown'}</strong>
            </p>
          </div>
        </div>
      ) : (
        <CalculatorView session={session} hospital={hospital} />
      )}
    </div>
  );
}

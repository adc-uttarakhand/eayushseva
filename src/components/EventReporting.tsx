import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flag, Plus, ChevronRight, ChevronDown, Users, MapPin,
  Calendar, FileText, CheckCircle, XCircle, Eye, Edit3,
  Trash2, Loader2, Camera, X, BarChart3, Building2,
  Globe, Map, ListTree, ClipboardList, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────
interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: 'single' | 'multi';
  start_date?: string;
  end_date?: string;
  reporting_level: string[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

interface SubEvent {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  reporting_level: string[];
  is_active: boolean;
}

interface EventReport {
  id: string;
  event_id: string;
  sub_event_id?: string;
  report_level: string;
  reported_by_name: string;
  reported_by_id: string;
  hospital_id?: string;
  district?: string;
  event_date: string;
  venue: string;
  gps_location?: string;
  participants_total: number;
  participants_male?: number;
  participants_female?: number;
  description?: string;
  photo_urls?: string[];
  status: string;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const isSuperOrState = (s: any) => ['SUPER_ADMIN', 'STATE_ADMIN'].includes(s?.role);
const isDistrictAdmin = (s: any) => ['DISTRICT_ADMIN'].includes(s?.role);
const isField = (s: any) => ['HOSPITAL', 'STAFF', 'DOCTOR'].includes(s?.role);

function getReporterLevel(session: any): string {
  if (isSuperOrState(session)) return 'state';
  if (isDistrictAdmin(session)) return 'district';
  return 'field';
}

// Alias for use in EventCard
function getReporterLevel2(session: any): string {
  return getReporterLevel(session);
}

function levelBadge(level: string) {
  const map: Record<string, string> = {
    field: 'bg-emerald-100 text-emerald-700',
    district: 'bg-blue-100 text-blue-700',
    state: 'bg-purple-100 text-purple-700',
  };
  return map[level] || 'bg-slate-100 text-slate-600';
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Report Form ──────────────────────────────────────────────────────────────
function ReportForm({ event, subEvent, session, onDone, onCancel }: any) {
  const [form, setForm] = useState({
    event_date: new Date().toISOString().slice(0, 10),
    venue: '',
    gps_location: '',
    participants_total: '',
    participants_male: '',
    participants_female: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchingGps, setFetchingGps] = useState(false);

  const fetchGps = () => {
    if (!navigator.geolocation) { alert('GPS not supported'); return; }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, gps_location: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` }));
        setFetchingGps(false);
      },
      () => { alert('GPS access denied'); setFetchingGps(false); }
    );
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.venue.trim()) { setError('Venue zaroori hai'); return; }
    if (!form.participants_total || isNaN(Number(form.participants_total))) { setError('Participants count zaroori hai'); return; }

    setSaving(true);
    try {
      await supabase.from('event_reports').insert({
        event_id: event.id,
        sub_event_id: subEvent?.id || null,
        report_level: getReporterLevel(session),
        reported_by_name: session?.name || session?.id,
        reported_by_id: session?.id,
        hospital_id: session?.hospitalId || session?.activeHospitalId || null,
        district: session?.district || null,
        event_date: form.event_date,
        venue: form.venue.trim(),
        gps_location: form.gps_location.trim() || null,
        participants_total: Number(form.participants_total),
        participants_male: form.participants_male ? Number(form.participants_male) : null,
        participants_female: form.participants_female ? Number(form.participants_female) : null,
        description: form.description.trim() || null,
        status: 'submitted',
      });
      onDone();
    } catch (err: any) {
      setError(err.message || 'Error submitting report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">Report Submit Karo</h2>
              <p className="text-emerald-200 text-xs mt-0.5">
                {event.title}{subEvent ? ` → ${subEvent.title}` : ''}
              </p>
            </div>
            <button onClick={onCancel} className="text-emerald-200 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Event Name (readonly) */}
          <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-3">
            <Flag size={16} className="text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-600 font-semibold">{event.title}</p>
              {subEvent && <p className="text-xs text-emerald-500">{subEvent.title}</p>}
            </div>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${levelBadge(getReporterLevel(session))}`}>
              {getReporterLevel(session)} level
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Event Date *</label>
              <input type="date" value={form.event_date}
                onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Total Participants *</label>
              <input type="number" value={form.participants_total} min={0}
                onChange={e => setForm(f => ({ ...f, participants_total: e.target.value }))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Male (Optional)</label>
              <input type="number" value={form.participants_male} min={0}
                onChange={e => setForm(f => ({ ...f, participants_male: e.target.value }))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Female (Optional)</label>
              <input type="number" value={form.participants_female} min={0}
                onChange={e => setForm(f => ({ ...f, participants_female: e.target.value }))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Venue *</label>
            <input type="text" value={form.venue}
              onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
              placeholder="Jaise: District Hospital Premises, Dehradun"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">GPS Location (Optional)</label>
            <div className="flex gap-2">
              <input type="text" value={form.gps_location}
                onChange={e => setForm(f => ({ ...f, gps_location: e.target.value }))}
                placeholder="30.123456, 78.654321"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 font-mono" />
              <button onClick={fetchGps} disabled={fetchingGps}
                className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50">
                {fetchingGps ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                GPS
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Description (Optional)</label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Event ka brief description..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={16} className="animate-spin" />Submitting...</> : <><CheckCircle size={16} />Submit Report</>}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ event, subEvents, session, onReport, onEdit, onDelete, onAddSub, reports }: any) {
  const [expanded, setExpanded] = useState(false);
  const myReports = reports.filter((r: EventReport) => r.event_id === event.id && !r.sub_event_id);
  const totalParticipants = reports.filter((r: EventReport) => r.event_id === event.id)
    .reduce((sum: number, r: EventReport) => sum + (r.participants_total || 0), 0);
  const myEventSubEvents = subEvents.filter((s: SubEvent) => s.event_id === event.id);
  const userLevel = getReporterLevel2(session);
  const canReportMain = event.is_active && event.reporting_level?.includes(userLevel);
  const canManage = isSuperOrState(session);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className={`px-5 py-4 ${!event.is_active ? 'opacity-60' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${event.event_type === 'multi' ? 'bg-purple-100' : 'bg-emerald-100'}`}>
            {event.event_type === 'multi' ? <ListTree size={18} className="text-purple-600" /> : <Flag size={18} className="text-emerald-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-800">{event.title}</h3>
              {!event.is_active && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactive</span>}
            </div>
            {event.description && <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{event.description}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {event.start_date && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar size={11} />{fmt(event.start_date)}{event.end_date && ` — ${fmt(event.end_date)}`}
                </span>
              )}
              {event.reporting_level?.map((l: string) => (
                <span key={l} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${levelBadge(l)}`}>{l}</span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {totalParticipants > 0 && (
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-600">{totalParticipants.toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-400">participants</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              {canReportMain && (
                <button onClick={() => onReport(event, null)}
                  className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
                  <Plus size={12} />Report
                </button>
              )}
              {canManage && (
                <>
                  <button onClick={() => onAddSub(event)}
                    className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="Add Sub Event">
                    <ListTree size={15} />
                  </button>
                  <button onClick={() => onEdit(event)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => onDelete(event.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </>
              )}
              {(myEventSubEvents.length > 0 || myReports.length > 0) && (
                <button onClick={() => setExpanded(!expanded)}
                  className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded: Sub Events + Reports */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 overflow-hidden">

            {/* Sub Events */}
            {myEventSubEvents.length > 0 && (
              <div className="px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Sub Events</p>
                <div className="space-y-2">
                  {myEventSubEvents.map((sub: SubEvent) => {
                    const subReports = reports.filter((r: EventReport) => r.sub_event_id === sub.id);
                    const subTotal = subReports.reduce((s: number, r: EventReport) => s + (r.participants_total || 0), 0);
                    return (
                      <div key={sub.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                        <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Flag size={13} className="text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700">{sub.title}</p>
                          {sub.start_date && <p className="text-xs text-slate-400">{fmt(sub.start_date)}</p>}
                        </div>
                        {subTotal > 0 && <p className="text-sm font-bold text-emerald-600 flex-shrink-0">{subTotal.toLocaleString('en-IN')}</p>}
                        {event.is_active && sub.reporting_level?.includes(userLevel) && (
                          <button onClick={() => onReport(event, sub)}
                            className="flex items-center gap-1 text-xs bg-purple-600 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex-shrink-0">
                            <Plus size={11} />Report
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* My Reports */}
            {myReports.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Reports ({myReports.length})</p>
                <div className="space-y-2">
                  {myReports.slice(0, 5).map((r: EventReport) => (
                    <div key={r.id} className="flex items-center gap-3 text-xs bg-slate-50 rounded-lg p-2.5">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${levelBadge(r.report_level)}`}>{r.report_level}</span>
                      <span className="text-slate-600 font-medium">{r.reported_by_name}</span>
                      <span className="text-slate-400">{r.venue}</span>
                      <span className="text-emerald-600 font-bold ml-auto">{r.participants_total} participants</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${statusBadge(r.status)}`}>{r.status}</span>
                    </div>
                  ))}
                  {myReports.length > 5 && <p className="text-xs text-slate-400 text-center">+{myReports.length - 5} more reports</p>}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Event Form Modal ──────────────────────────────────────────────────────────
interface SubEventDraft {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  reporting_level: string[];
}

function SubEventRow({ sub, index, onChange, onRemove }: any) {
  const toggleLevel = (level: string) => {
    const levels = sub.reporting_level.includes(level)
      ? sub.reporting_level.filter((l: string) => l !== level)
      : [...sub.reporting_level, level];
    onChange(index, { ...sub, reporting_level: levels });
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Sub Event {index + 1}</span>
        <button onClick={() => onRemove(index)} className="text-purple-400 hover:text-red-500 transition-colors">
          <X size={16} />
        </button>
      </div>
      <input type="text" value={sub.title}
        onChange={e => onChange(index, { ...sub, title: e.target.value })}
        placeholder="Sub event ka naam *"
        className="w-full border border-purple-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
      <input type="text" value={sub.description}
        onChange={e => onChange(index, { ...sub, description: e.target.value })}
        placeholder="Description (optional)"
        className="w-full border border-purple-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={sub.start_date}
          onChange={e => onChange(index, { ...sub, start_date: e.target.value })}
          className="w-full border border-purple-200 bg-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
        <input type="date" value={sub.end_date}
          onChange={e => onChange(index, { ...sub, end_date: e.target.value })}
          className="w-full border border-purple-200 bg-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
      </div>
      <div>
        <p className="text-xs font-semibold text-purple-600 mb-1.5">Reporting Level *</p>
        <div className="flex gap-2">
          {[
            { key: 'field', label: 'Field', color: 'emerald' },
            { key: 'district', label: 'District', color: 'blue' },
            { key: 'state', label: 'State', color: 'purple' },
          ].map(l => {
            const active = sub.reporting_level.includes(l.key);
            return (
              <button key={l.key} onClick={() => toggleLevel(l.key)}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  active
                    ? l.color === 'emerald' ? 'border-emerald-400 bg-emerald-100 text-emerald-700'
                      : l.color === 'blue' ? 'border-blue-400 bg-blue-100 text-blue-700'
                      : 'border-purple-400 bg-purple-100 text-purple-700'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}>
                {l.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventFormModal({ editing, parentEvent, onSave, onCancel }: any) {
  const isSubEvent = !!parentEvent;
  const [form, setForm] = useState({
    title: editing?.title || '',
    description: editing?.description || '',
    event_type: editing?.event_type || 'single',
    start_date: editing?.start_date || '',
    end_date: editing?.end_date || '',
    reporting_level: editing?.reporting_level || ['field'],
    is_active: editing?.is_active !== undefined ? editing.is_active : true,
  });
  const [subEventDrafts, setSubEventDrafts] = useState<SubEventDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleLevel = (level: string) => {
    setForm(f => ({
      ...f,
      reporting_level: f.reporting_level.includes(level)
        ? f.reporting_level.filter((l: string) => l !== level)
        : [...f.reporting_level, level]
    }));
  };

  const addSubDraft = () => {
    setSubEventDrafts(s => [...s, { title: '', description: '', start_date: '', end_date: '', reporting_level: ['field'] }]);
  };

  const updateSubDraft = (index: number, updated: SubEventDraft) => {
    setSubEventDrafts(s => s.map((item, i) => i === index ? updated : item));
  };

  const removeSubDraft = (index: number) => {
    setSubEventDrafts(s => s.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title zaroori hai'); return; }
    if (form.reporting_level.length === 0) { setError('Kam se kam ek reporting level select karo'); return; }

    // Validate sub events
    if (form.event_type === 'multi' && !isSubEvent) {
      for (let i = 0; i < subEventDrafts.length; i++) {
        if (!subEventDrafts[i].title.trim()) { setError(`Sub Event ${i + 1} ka title zaroori hai`); return; }
        if (subEventDrafts[i].reporting_level.length === 0) { setError(`Sub Event ${i + 1} ka reporting level select karo`); return; }
      }
    }

    setSaving(true);
    try {
      await onSave(form, isSubEvent ? parentEvent.id : null, subEventDrafts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">

        <div className={`px-6 py-5 ${isSubEvent ? 'bg-gradient-to-r from-purple-600 to-purple-700' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">
                {editing ? 'Update' : 'Naya'} {isSubEvent ? 'Sub Event' : 'Event'}
              </h2>
              {isSubEvent && <p className="text-purple-200 text-xs mt-0.5">{parentEvent.title} ke andar</p>}
            </div>
            <button onClick={onCancel} className="text-white/70 hover:text-white p-1"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={isSubEvent ? "Jaise: Run for Yoga" : "Jaise: International Day of Yoga 2026"}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Description (Optional)</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Event ke baare mein..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none" />
          </div>

          {!isSubEvent && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Event Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'single', label: 'Single Event', desc: 'Ek hi event', icon: Flag },
                  { key: 'multi', label: 'Multi Event', desc: 'Sub events ke saath', icon: ListTree },
                ].map(t => (
                  <button key={t.key} onClick={() => setForm(f => ({ ...f, event_type: t.key as any }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.event_type === t.key ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <t.icon size={16} className={form.event_type === t.key ? 'text-emerald-600 mb-1' : 'text-slate-400 mb-1'} />
                    <p className={`text-xs font-bold ${form.event_type === t.key ? 'text-emerald-700' : 'text-slate-600'}`}>{t.label}</p>
                    <p className="text-xs text-slate-400">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Reporting Level *</label>
            <div className="flex gap-2">
              {[
                { key: 'field', label: 'Field', icon: Building2, color: 'emerald' },
                { key: 'district', label: 'District', icon: Map, color: 'blue' },
                { key: 'state', label: 'State', icon: Globe, color: 'purple' },
              ].map(l => {
                const active = form.reporting_level.includes(l.key);
                return (
                  <button key={l.key} onClick={() => toggleLevel(l.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                      active
                        ? l.color === 'emerald' ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : l.color === 'blue' ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-purple-400 bg-purple-50 text-purple-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                    <l.icon size={13} />{l.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer"
            onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
            <div className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-emerald-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_active ? 'left-6' : 'left-1'}`} />
            </div>
            <span className="text-sm font-semibold text-slate-600">{form.is_active ? 'Active — reporting open hai' : 'Inactive'}</span>
          </div>

          {/* Sub Events Section — only for multi type main events */}
          {!isSubEvent && form.event_type === 'multi' && (
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-700">Sub Events</p>
                  <p className="text-xs text-slate-400">Har sub event ki alag reporting level hogi</p>
                </div>
                <button onClick={addSubDraft}
                  className="flex items-center gap-1.5 text-xs bg-purple-600 text-white px-3 py-2 rounded-xl font-semibold hover:bg-purple-700 transition-colors">
                  <Plus size={13} />Sub Event Add Karo
                </button>
              </div>

              {subEventDrafts.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-purple-200 rounded-2xl">
                  <ListTree size={24} className="text-purple-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Koi sub event nahi — upar button se add karo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subEventDrafts.map((sub, i) => (
                    <SubEventRow key={i} sub={sub} index={i} onChange={updateSubDraft} onRemove={removeSubDraft} />
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-red-600 text-sm">{error}</p></div>}

          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className={`flex-1 py-3 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${isSubEvent ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : 'Save Karo'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EventReporting({ session }: { session: any }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [reports, setReports] = useState<EventReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [addSubFor, setAddSubFor] = useState<Event | null>(null);
  const [reportingFor, setReportingFor] = useState<{ event: Event; subEvent: SubEvent | null } | null>(null);
  const [activeView, setActiveView] = useState<'events' | 'reports'>('events');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: evts }, { data: subs }, { data: reps }] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('sub_events').select('*').order('start_date', { ascending: true }),
      supabase.from('event_reports').select('*').order('created_at', { ascending: false }),
    ]);
    setEvents(evts || []);
    setSubEvents(subs || []);
    setReports(reps || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveEvent = async (form: any, parentEventId: string | null, subEventDrafts: SubEventDraft[] = []) => {
    if (parentEventId) {
      // Sub event save karo
      if (editingEvent) {
        await supabase.from('sub_events').update({ ...form }).eq('id', editingEvent.id);
      } else {
        await supabase.from('sub_events').insert({ ...form, event_id: parentEventId });
      }
    } else {
      // Main event save karo
      let eventId = editingEvent?.id;
      if (editingEvent) {
        await supabase.from('events').update({ ...form }).eq('id', editingEvent.id);
      } else {
        const { data } = await supabase.from('events')
          .insert({ ...form, created_by: session?.name || session?.id })
          .select('id')
          .single();
        eventId = data?.id;
      }

      // Sub events bhi save karo agar multi type hai
      if (form.event_type === 'multi' && eventId && subEventDrafts.length > 0) {
        const subInserts = subEventDrafts
          .filter(s => s.title.trim())
          .map(s => ({
            event_id: eventId,
            title: s.title.trim(),
            description: s.description.trim() || null,
            start_date: s.start_date || null,
            end_date: s.end_date || null,
            reporting_level: s.reporting_level,
            is_active: true,
          }));
        if (subInserts.length > 0) {
          await supabase.from('sub_events').insert(subInserts);
        }
      }
    }
    await fetchAll();
    setShowEventForm(false);
    setAddSubFor(null);
    setEditingEvent(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete karna chahte hain? Saari reports bhi delete ho jayengi.')) return;
    await supabase.from('events').delete().eq('id', id);
    fetchAll();
  };

  // Stats
  const totalReports = reports.length;
  const totalParticipants = reports.reduce((s, r) => s + (r.participants_total || 0), 0);
  const fieldReports = reports.filter(r => r.report_level === 'field').length;
  const districtReports = reports.filter(r => r.report_level === 'district').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Flag size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Event Reporting</h1>
              <p className="text-slate-400 text-sm">AYUSH Department Events</p>
            </div>
          </div>
          {isSuperOrState(session) && (
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => { setEditingEvent(null); setAddSubFor(null); setShowEventForm(true); }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors">
              <Plus size={16} />Naya Event
            </motion.button>
          )}
        </div>

        {/* Stats */}
        {(isSuperOrState(session) || isDistrictAdmin(session)) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Events', value: events.length, color: 'emerald', icon: Flag },
              { label: 'Total Reports', value: totalReports, color: 'blue', icon: ClipboardList },
              { label: 'Total Participants', value: totalParticipants.toLocaleString('en-IN'), color: 'purple', icon: Users },
              { label: 'Field Reports', value: fieldReports, color: 'orange', icon: Building2 },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* View Toggle */}
        <div className="flex gap-1.5 mb-6 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm">
          {[
            { key: 'events', label: 'Events', icon: Flag },
            { key: 'reports', label: 'All Reports', icon: ClipboardList },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveView(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === tab.key ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              <tab.icon size={15} />{tab.label}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-emerald-500 animate-spin" /></div>}

        {/* Events View */}
        {!loading && activeView === 'events' && (
          <>
            {events.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <Flag size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Koi event nahi hai abhi</p>
                {isSuperOrState(session) && (
                  <button onClick={() => setShowEventForm(true)}
                    className="mt-4 text-emerald-600 text-sm font-semibold hover:underline flex items-center gap-1 mx-auto">
                    <Plus size={14} />Pehla event banao
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {events.map(event => (
                  <EventCard key={event.id} event={event}
                    subEvents={subEvents} session={session} reports={reports}
                    onReport={(ev: Event, sub: SubEvent | null) => setReportingFor({ event: ev, subEvent: sub })}
                    onEdit={(ev: Event) => { setEditingEvent(ev); setAddSubFor(null); setShowEventForm(true); }}
                    onDelete={handleDelete}
                    onAddSub={(ev: Event) => { setAddSubFor(ev); setEditingEvent(null); setShowEventForm(true); }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Reports View */}
        {!loading && activeView === 'reports' && (
          <>
            {reports.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <ClipboardList size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Koi report submit nahi hui abhi</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map(report => {
                  const ev = events.find(e => e.id === report.event_id);
                  const sub = subEvents.find(s => s.id === report.sub_event_id);
                  return (
                    <motion.div key={report.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-slate-800 text-sm">{ev?.title || '—'}</span>
                            {sub && <><ChevronRight size={12} className="text-slate-400" /><span className="text-slate-600 text-sm">{sub.title}</span></>}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Calendar size={11} />{fmt(report.event_date)}</span>
                            <span className="flex items-center gap-1"><MapPin size={11} />{report.venue}</span>
                            <span className="font-semibold text-slate-600">{report.reported_by_name}</span>
                          </div>
                          {report.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{report.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">{report.participants_total}</p>
                            <p className="text-xs text-slate-400">participants</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${levelBadge(report.report_level)}`}>{report.report_level}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(report.status)}`}>{report.status}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Modals */}
        <AnimatePresence>
          {showEventForm && (
            <EventFormModal
              editing={editingEvent}
              parentEvent={addSubFor}
              onSave={handleSaveEvent}
              onCancel={() => { setShowEventForm(false); setEditingEvent(null); setAddSubFor(null); }}
            />
          )}
          {reportingFor && (
            <ReportForm
              event={reportingFor.event}
              subEvent={reportingFor.subEvent}
              session={session}
              onDone={() => { setReportingFor(null); fetchAll(); }}
              onCancel={() => setReportingFor(null)}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

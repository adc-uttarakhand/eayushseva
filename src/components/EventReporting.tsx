import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flag, Plus, ChevronRight, ChevronDown, Users, MapPin,
  Calendar, FileText, CheckCircle, XCircle, Eye, Edit3,
  Trash2, Loader2, Camera, X, BarChart3, Building2,
  Globe, Map, ListTree, ClipboardList, AlertCircle, Download
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
    if (!form.venue.trim()) { setError('Venue is required'); return; }
    if (!form.participants_total || isNaN(Number(form.participants_total))) { setError('Participants count is required'); return; }

    setSaving(true);
    try {
      // Get district — from session directly, or from present_district if field staff
      const staffDistrict = session?.district ||
        session?.present_district ||
        session?.hospitalDistrict ||
        null;

      await supabase.from('event_reports').insert({
        event_id: event.id,
        sub_event_id: subEvent?.id || null,
        report_level: getReporterLevel(session),
        reported_by_name: session?.name || session?.id,
        reported_by_id: session?.id,
        hospital_id: session?.hospitalId || session?.activeHospitalId || null,
        district: staffDistrict,
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
              <h2 className="text-white font-bold text-lg">Submit Report</h2>
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
              placeholder="e.g. District Hospital Premises, Dehradun"
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
              placeholder="Brief description of the event..."
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
            <div className="flex items-center gap-1 flex-wrap">
              {/* Single event — direct report button */}
              {canReportMain && event.event_type === 'single' && (
                <button onClick={() => onReport(event, null)}
                  className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
                  <Plus size={12} />Report
                </button>
              )}
              {/* Multi event — show sub-event buttons directly */}
              {event.event_type === 'multi' && event.is_active && myEventSubEvents
                .filter((s: SubEvent) => s.reporting_level?.includes(userLevel))
                .map((sub: SubEvent) => (
                  <button key={sub.id} onClick={() => onReport(event, sub)}
                    className="flex items-center gap-1 text-xs bg-purple-600 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                    <Plus size={11} />{sub.title.slice(0, 14)}{sub.title.length > 14 ? '…' : ''}
                  </button>
                ))}
              {/* Fallback — single event but no main access, try sub events */}
              {!canReportMain && event.event_type === 'single' && myEventSubEvents
                .filter((s: SubEvent) => event.is_active && s.reporting_level?.includes(userLevel))
                .map((sub: SubEvent) => (
                  <button key={sub.id} onClick={() => onReport(event, sub)}
                    className="flex items-center gap-1 text-xs bg-purple-600 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                    <Plus size={11} />{sub.title.slice(0, 14)}{sub.title.length > 14 ? '…' : ''}
                  </button>
                ))}
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
        placeholder="Sub event name *"
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

function EventFormModal({ editing, parentEvent, existingSubEvents, onSave, onCancel }: any) {
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

  // Existing sub events load karo jab editing mode mein ho
  const [subEventDrafts, setSubEventDrafts] = useState<SubEventDraft[]>(() => {
    if (editing && existingSubEvents?.length > 0) {
      return existingSubEvents.map((s: any) => ({
        id: s.id, // keep existing ID for update
        title: s.title || '',
        description: s.description || '',
        start_date: s.start_date || '',
        end_date: s.end_date || '',
        reporting_level: s.reporting_level || ['field'],
      }));
    }
    return [];
  });
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
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (form.reporting_level.length === 0) { setError('Select at least one reporting level'); return; }

    // Validate sub events
    if (form.event_type === 'multi' && !isSubEvent) {
      for (let i = 0; i < subEventDrafts.length; i++) {
        if (!subEventDrafts[i].title.trim()) { setError(`Sub Event ${i + 1} title is required`); return; }
        if (subEventDrafts[i].reporting_level.length === 0) { setError(`Select reporting level for Sub Event ${i + 1}`); return; }
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
                {editing ? 'Update' : 'New'} {isSubEvent ? 'Sub Event' : 'Event'}
              </h2>
              {isSubEvent && <p className="text-purple-200 text-xs mt-0.5">{parentEvent.title} under</p>}
            </div>
            <button onClick={onCancel} className="text-white/70 hover:text-white p-1"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={isSubEvent ? "e.g. Run for Yoga" : "e.g. International Day of Yoga 2026"}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Description (Optional)</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="About this event..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none" />
          </div>

          {!isSubEvent && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Event Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'single', label: 'Single Event', desc: 'Single standalone event', icon: Flag },
                  { key: 'multi', label: 'Multi Event', desc: 'With sub-events', icon: ListTree },
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
            <span className="text-sm font-semibold text-slate-600">{form.is_active ? 'Active — reporting is open' : 'Inactive'}</span>
          </div>

          {/* Sub Events Section — only for multi type main events */}
          {!isSubEvent && form.event_type === 'multi' && (
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-700">Sub Events</p>
                  <p className="text-xs text-slate-400">Each sub event can have its own reporting level</p>
                </div>
                <button onClick={addSubDraft}
                  className="flex items-center gap-1.5 text-xs bg-purple-600 text-white px-3 py-2 rounded-xl font-semibold hover:bg-purple-700 transition-colors">
                  <Plus size={13} />Add Sub Event
                </button>
              </div>

              {subEventDrafts.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-purple-200 rounded-2xl">
                  <ListTree size={24} className="text-purple-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No sub events — add using the button above</p>
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
              {saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : 'Save'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// ── Event Dashboard Component ─────────────────────────────────────────────────
function EventDashboard({ events, subEvents, reports, session }: {
  events: Event[]; subEvents: SubEvent[]; reports: EventReport[]; session: any;
}) {
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedSubEvent, setSelectedSubEvent] = useState<string>('all');

  const DISTRICTS = [
    'Dehradun','Haridwar','Pauri','Tehri','Uttarkashi','Chamoli','Rudraprayag',
    'Almora','Nainital','Bageshwar','Pithoragarh','Champawat','US Nagar'
  ];

  // Sub-events for selected event
  const availableSubEvents = selectedEvent === 'all'
    ? subEvents
    : subEvents.filter(s => s.event_id === selectedEvent);

  // Reset sub-event filter when event changes
  const handleEventChange = (val: string) => {
    setSelectedEvent(val);
    setSelectedSubEvent('all');
  };

  // Filter reports by event + sub-event
  const filteredReports = reports.filter(r => {
    if (selectedEvent !== 'all' && r.event_id !== selectedEvent) return false;
    if (selectedSubEvent !== 'all') {
      if (selectedSubEvent === 'main_only') return !r.sub_event_id;
      return r.sub_event_id === selectedSubEvent;
    }
    return true;
  });

  // Total participants
  const totalParticipants = filteredReports.reduce((s, r) => s + (r.participants_total || 0), 0);
  const totalReports = filteredReports.length;

  // Normalize district name for matching
  const normalizeDistrict = (d?: string) => (d || '').toLowerCase().trim()
    .replace('us nagar', 'us nagar')
    .replace('u.s. nagar', 'us nagar')
    .replace('udham singh nagar', 'us nagar');

  const districtsReported = new Set(
    filteredReports.map(r => normalizeDistrict(r.district)).filter(Boolean)
  ).size;

  // District-wise participation — case insensitive
  const districtData = DISTRICTS.map(district => {
    const normDistrict = normalizeDistrict(district);
    const distReports = filteredReports.filter(r => normalizeDistrict(r.district) === normDistrict);
    const total = distReports.reduce((s, r) => s + (r.participants_total || 0), 0);
    return { district, total, count: distReports.length };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  // No district reports
  const noDistrictReports = filteredReports.filter(r => !r.district?.trim());
  const noDistrictTotal = noDistrictReports.reduce((s, r) => s + (r.participants_total || 0), 0);

  const maxDistrict = districtData[0]?.total || 1;

  // Event-wise participation
  const eventData = events.map(ev => {
    const evReports = filteredReports.filter(r => r.event_id === ev.id);
    const total = evReports.reduce((s, r) => s + (r.participants_total || 0), 0);
    const evSubEvents = subEvents.filter(s => s.event_id === ev.id);
    return { event: ev, total, count: evReports.length, subCount: evSubEvents.length };
  }).filter(e => e.total > 0 || selectedEvent === 'all').sort((a, b) => b.total - a.total);

  // Sub-event breakdown for selected event
  const subEventData = selectedEvent !== 'all'
    ? subEvents.filter(s => s.event_id === selectedEvent).map(sub => {
        const subReps = reports.filter(r => r.sub_event_id === sub.id);
        const total = subReps.reduce((s, r) => s + (r.participants_total || 0), 0);
        return { sub, total, count: subReps.length };
      }).sort((a, b) => b.total - a.total)
    : [];

  // District × Event matrix
  const matrixEvents = selectedEvent === 'all' ? events.slice(0, 5) : events.filter(e => e.id === selectedEvent);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Event:</label>
            <select value={selectedEvent} onChange={e => handleEventChange(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none flex-1">
              <option value="all">All Events</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          </div>
          {availableSubEvents.length > 0 && (
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="text-xs font-bold uppercase tracking-wider text-purple-400 whitespace-nowrap">Sub-Event:</label>
              <select value={selectedSubEvent} onChange={e => setSelectedSubEvent(e.target.value)}
                className="border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none flex-1 bg-purple-50">
                <option value="all">All Sub-Events</option>
                <option value="main_only">Main Event Only</option>
                {availableSubEvents.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Participants', value: totalParticipants.toLocaleString('en-IN'), color: 'emerald', icon: '👥' },
          { label: 'Reports Submitted', value: totalReports, color: 'blue', icon: '📋' },
          { label: 'Districts Reported', value: `${districtsReported}/13`, color: 'purple', icon: '📍' },
        ].map(card => (
          <div key={card.label} className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center`}>
            <p className="text-2xl mb-1">{card.icon}</p>
            <p className={`text-xl font-black text-${card.color}-600`}>{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-tight">{card.label}</p>
          </div>
        ))}
      </div>

      {/* District-wise Participation Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <BarChart3 size={16} className="text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-sm">District-wise Participation</h3>
        </div>
        <div className="p-5">
          {districtData.length === 0 && noDistrictTotal === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No data yet</p>
          ) : (
            <div className="space-y-2.5">
              {districtData.map((d, i) => (
                <div key={d.district}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600 w-28 flex-shrink-0">
                      {i === 0 && <span className="text-yellow-500 mr-1">🏆</span>}
                      {d.district}
                    </span>
                    <div className="flex-1 mx-3 h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max((d.total / maxDistrict) * 100, 4)}%` }}>
                        {d.total > maxDistrict * 0.2 && (
                          <span className="text-white text-[9px] font-bold">{d.total.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-16 text-right">
                      {d.total.toLocaleString('en-IN')}
                      <span className="text-slate-400 font-normal"> ({d.count})</span>
                    </span>
                  </div>
                </div>
              ))}
              {noDistrictTotal > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-amber-600 w-28 flex-shrink-0">⚠️ District N/A</span>
                    <div className="flex-1 mx-3 h-5 bg-amber-50 rounded-full overflow-hidden border border-amber-200">
                      <div className="h-full rounded-full bg-amber-300"
                        style={{ width: `${Math.max((noDistrictTotal / maxDistrict) * 100, 4)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-amber-700 w-16 text-right">
                      {noDistrictTotal.toLocaleString('en-IN')}
                      <span className="text-amber-500 font-normal"> ({noDistrictReports.length})</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-500 ml-28">These reports have no district set — ask staff to re-submit</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Event-wise Participation */}
      {selectedEvent === 'all' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Flag size={16} className="text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Event-wise Participation</h3>
          </div>
          <div className="p-5 space-y-3">
            {eventData.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No data yet</p>
            ) : eventData.map(({ event, total, count }) => {
              const maxEv = eventData[0]?.total || 1;
              return (
                <div key={event.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600 flex-1 mr-2 truncate">{event.title}</span>
                    <span className="text-xs font-bold text-blue-700">{total.toLocaleString('en-IN')} <span className="text-slate-400 font-normal">({count} reports)</span></span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                      style={{ width: `${Math.max((total / maxEv) * 100, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-event breakdown */}
      {selectedEvent !== 'all' && subEventData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Flag size={16} className="text-purple-600" />
            <h3 className="font-bold text-slate-800 text-sm">Sub-event Breakdown</h3>
          </div>
          <div className="p-5 space-y-3">
            {subEventData.map(({ sub, total, count }) => {
              const maxSub = subEventData[0]?.total || 1;
              return (
                <div key={sub.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600 flex-1 mr-2 truncate">{sub.title}</span>
                    <span className="text-xs font-bold text-purple-700">{total.toLocaleString('en-IN')} <span className="text-slate-400 font-normal">({count})</span></span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
                      style={{ width: `${Math.max((total / maxSub) * 100, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* District Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 size={16} className="text-orange-500" />
          <h3 className="font-bold text-slate-800 text-sm">District-wise Summary</h3>
          <span className="text-xs text-slate-400">
            {selectedSubEvent !== 'all'
              ? `— ${availableSubEvents.find(s => s.id === selectedSubEvent)?.title || 'Sub-Event'}`
              : selectedEvent !== 'all'
              ? `— ${events.find(e => e.id === selectedEvent)?.title || 'Event'}`
              : '— All Events'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-3 font-bold text-slate-500">#</th>
                <th className="text-left px-4 py-3 font-bold text-slate-500">District</th>
                <th className="px-4 py-3 font-bold text-blue-500 text-center">Events/Sub-Events Reported</th>
                <th className="px-4 py-3 font-bold text-purple-500 text-center">Reports</th>
                <th className="px-4 py-3 font-bold text-emerald-600 text-center">Participants</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const normDist = (d?: string) => (d || '').toLowerCase().trim();
                const rows = DISTRICTS.map(district => {
                  const distReports = filteredReports.filter(r =>
                    normDist(r.district) === normDist(district)
                  );
                  const participants = distReports.reduce((s, r) => s + (r.participants_total || 0), 0);
                  const reportCount = distReports.length;
                  // Unique events + sub-events reported
                  const uniqueEvents = new Set([
                    ...distReports.filter(r => !r.sub_event_id).map(r => r.event_id),
                    ...distReports.filter(r => r.sub_event_id).map(r => r.sub_event_id),
                  ]).size;
                  return { district, participants, reportCount, uniqueEvents };
                }).filter(r => r.participants > 0)
                  .sort((a, b) => b.participants - a.participants);

                if (rows.length === 0) return (
                  <tr><td colSpan={5} className="text-center py-6 text-slate-400">No data yet</td></tr>
                );

                const maxP = rows[0]?.participants || 1;

                return rows.map((row, i) => (
                  <tr key={row.district} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 text-slate-400 font-semibold">
                      {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.district}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full">
                        {row.uniqueEvents}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full">
                        {row.reportCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                          <div className="h-full rounded-full bg-emerald-400"
                            style={{ width: `${Math.max((row.participants / maxP) * 100, 4)}%` }} />
                        </div>
                        <span className="font-black text-emerald-700 w-14 text-right">
                          {row.participants.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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
  const [filterEventId, setFilterEventId] = useState('all');
  const [filterSubEventId, setFilterSubEventId] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');

  // CSV Download function
  const downloadCSV = () => {
    const filtered = filteredReports;
    if (filtered.length === 0) { alert('No reports to download'); return; }

    const headers = [
      'Event', 'Sub Event', 'Report Level', 'Reported By',
      'District', 'Hospital ID', 'Event Date', 'Venue',
      'GPS Location', 'Total Participants', 'Male', 'Female',
      'Description', 'Status', 'Submitted At'
    ];

    const rows = filtered.map(r => {
      const ev = events.find(e => e.id === r.event_id);
      const sub = subEvents.find(s => s.id === r.sub_event_id);
      return [
        ev?.title || '',
        sub?.title || '',
        r.report_level,
        r.reported_by_name,
        r.district || '',
        r.hospital_id || '',
        r.event_date,
        r.venue,
        r.gps_location || '',
        r.participants_total,
        r.participants_male || '',
        r.participants_female || '',
        r.description || '',
        r.status,
        new Date(r.created_at).toLocaleString('en-IN'),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    });

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const evName = filterEventId !== 'all'
      ? events.find(e => e.id === filterEventId)?.title?.replace(/\s+/g, '_') || 'Event'
      : 'All_Events';
    a.download = `Event_Reports_${evName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      // Save sub event
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

      // Save/update sub events
      if (form.event_type === 'multi' && eventId && subEventDrafts.length > 0) {
        for (const s of subEventDrafts) {
          if (!s.title.trim()) continue;
          const payload = {
            event_id: eventId,
            title: s.title.trim(),
            description: s.description?.trim() || null,
            start_date: s.start_date || null,
            end_date: s.end_date || null,
            reporting_level: s.reporting_level,
            is_active: true,
          };
          if ((s as any).id) {
            // Existing sub event — update karo
            await supabase.from('sub_events').update(payload).eq('id', (s as any).id);
          } else {
            // New sub event — insert karo
            await supabase.from('sub_events').insert(payload);
          }
        }
      }
    }
    await fetchAll();
    setShowEventForm(false);
    setAddSubFor(null);
    setEditingEvent(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event? All associated reports will also be deleted.')) return;
    await supabase.from('events').delete().eq('id', id);
    fetchAll();
  };

  // Stats
  const totalReports = reports.length;
  const totalParticipants = reports.reduce((s, r) => s + (r.participants_total || 0), 0);
  const fieldReports = reports.filter(r => r.report_level === 'field').length;
  const districtReports = reports.filter(r => r.report_level === 'district').length;

  // Filtered reports for Reports view
  const filteredReports = reports.filter(r => {
    if (filterEventId !== 'all' && r.event_id !== filterEventId) return false;
    if (filterSubEventId !== 'all' && r.sub_event_id !== filterSubEventId) return false;
    if (filterLevel !== 'all' && r.report_level !== filterLevel) return false;
    return true;
  });

  // Sub events for selected filter
  const filterSubEvents = filterEventId !== 'all'
    ? subEvents.filter(s => s.event_id === filterEventId)
    : [];

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
              <Plus size={16} />New Event
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
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
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
                <p className="text-slate-400 font-medium">No events yet</p>
                {isSuperOrState(session) && (
                  <button onClick={() => setShowEventForm(true)}
                    className="mt-4 text-emerald-600 text-sm font-semibold hover:underline flex items-center gap-1 mx-auto">
                    <Plus size={14} />Create first event
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

        {/* Dashboard View */}
        {!loading && activeView === 'dashboard' && (
          <EventDashboard events={events} subEvents={subEvents} reports={reports} session={session} />
        )}

        {/* Reports View */}
        {!loading && activeView === 'reports' && (
          <>
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Event</label>
                  <select value={filterEventId}
                    onChange={e => { setFilterEventId(e.target.value); setFilterSubEventId('all'); }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                    <option value="all">All Events</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                </div>

                {filterSubEvents.length > 0 && (
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Sub Event</label>
                    <select value={filterSubEventId} onChange={e => setFilterSubEventId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                      <option value="all">All Sub Events</option>
                      {filterSubEvents.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </div>
                )}

                <div className="min-w-[130px]">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Level</label>
                  <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                    <option value="all">All Levels</option>
                    <option value="field">Field</option>
                    <option value="district">District</option>
                    <option value="state">State</option>
                  </select>
                </div>

                <div className="flex items-end gap-2 ml-auto">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-1">{filteredReports.length} reports</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {filteredReports.reduce((s, r) => s + (r.participants_total || 0), 0).toLocaleString('en-IN')} participants
                    </p>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={downloadCSV}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200">
                    <Download size={15} />CSV
                  </motion.button>
                </div>
              </div>
            </div>
            {filteredReports.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <ClipboardList size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">
                  {reports.length === 0 ? 'No reports submitted yet' : 'No reports match this filter'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredReports.map(report => {
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
              existingSubEvents={editingEvent ? subEvents.filter(s => s.event_id === editingEvent.id) : []}
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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Plus, Calendar, MapPin, Users, CheckCircle2, XCircle,
  Clock, Star, Loader2, ChevronDown, ChevronUp, X, AlertTriangle,
  Award, ClipboardList, UserCheck, ThumbsUp, Trash2, Edit2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';

interface TrainingModuleProps { session: UserSession; }
interface Training {
  id: string; title: string; description: string;
  target_roles: string[]; trainers: string[];
  start_date: string; end_date: string; venue: string;
  venue_lat?: number; venue_lng?: number;
  max_participants: number; status: string; created_by: string; created_at: string;
  whatsapp_group_link?: string;
  schedule_url?: string;
  study_materials?: { name: string; url: string; type: string }[];
}
interface Application {
  id: string; training_id: string; staff_id: string;
  staff_name: string; staff_role: string; district: string;
  past_trainings_count: number; status: string; applied_at: string;
}
interface AssessmentQuestion {
  id: string; training_id: string; question: string;
  option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string;
}

const today = () => new Date().toISOString().split('T')[0];
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const isTrainingActive = (t: Training) => { const n = today(); return t.start_date <= n && t.end_date >= n; };
const isTrainingUpcoming = (t: Training) => t.start_date > today();
const isTrainingPast = (t: Training) => t.end_date < today();
const isAdminRole = (role: string) => ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'].includes(role);
const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ─── Create/Edit Training Form ──────────────────────────────────────────────
function CreateTrainingForm({ session, editTraining, onDone, onCancel }: {
  session: UserSession; editTraining?: Training | null; onDone: () => void; onCancel: () => void;
}) {
  const [roles, setRoles] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: editTraining?.title || '', description: editTraining?.description || '',
    target_roles: editTraining?.target_roles || [] as string[],
    trainers: editTraining?.trainers || [] as string[], trainerInput: '',
    start_date: editTraining?.start_date || '', end_date: editTraining?.end_date || '',
    venue: editTraining?.venue || '',
    venue_lat: editTraining?.venue_lat?.toString() || '', venue_lng: editTraining?.venue_lng?.toString() || '',
    max_participants: editTraining?.max_participants?.toString() || '50',
    whatsapp_group_link: editTraining?.whatsapp_group_link || '',
  });
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [materialFiles, setMaterialFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('roles').select('role_name').order('role_name').then(({ data }) => {
      if (data) setRoles(data.map(r => r.role_name));
    });
  }, []);

  const toggleRole = (r: string) => setForm(f => ({
    ...f, target_roles: f.target_roles.includes(r) ? f.target_roles.filter(x => x !== r) : [...f.target_roles, r]
  }));

  const addTrainer = () => {
    const t = form.trainerInput.trim();
    if (t && !form.trainers.includes(t)) setForm(f => ({ ...f, trainers: [...f.trainers, t], trainerInput: '' }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.start_date || !form.end_date) { setError('Start and end dates are required'); return; }
    if (form.end_date < form.start_date) { setError('End date cannot be before start date'); return; }
    if (form.target_roles.length === 0) { setError('Select at least one target role'); return; }
    setSaving(true);
    setUploading(true);

    // Upload schedule file if provided
    let schedule_url = editTraining?.schedule_url || null;
    if (scheduleFile) {
      const ext = scheduleFile.name.split('.').pop();
      const path = `schedules/${Date.now()}.${ext}`;
      const { data: sd, error: se } = await supabase.storage.from('training-files').upload(path, scheduleFile, { upsert: true });
      if (!se && sd) {
        const { data: urlData } = supabase.storage.from('training-files').getPublicUrl(sd.path);
        schedule_url = urlData.publicUrl;
      }
    }

    // Upload study materials if provided
    const existing_materials = editTraining?.study_materials || [];
    const new_materials: { name: string; url: string; type: string }[] = [];
    for (const file of materialFiles) {
      const ext = file.name.split('.').pop();
      const path = `materials/${Date.now()}_${file.name}`;
      const { data: md, error: me } = await supabase.storage.from('training-files').upload(path, file, { upsert: true });
      if (!me && md) {
        const { data: urlData } = supabase.storage.from('training-files').getPublicUrl(md.path);
        new_materials.push({ name: file.name, url: urlData.publicUrl, type: file.type });
      }
    }
    setUploading(false);

    const payload = {
      title: form.title.trim(), description: form.description.trim(),
      target_roles: form.target_roles, trainers: form.trainers,
      start_date: form.start_date, end_date: form.end_date, venue: form.venue.trim(),
      venue_lat: form.venue_lat ? parseFloat(form.venue_lat) : null,
      venue_lng: form.venue_lng ? parseFloat(form.venue_lng) : null,
      max_participants: parseInt(form.max_participants) || 50,
      whatsapp_group_link: form.whatsapp_group_link.trim() || null,
      schedule_url,
      study_materials: [...existing_materials, ...new_materials],
      status: 'upcoming', created_by: session.name || session.id,
    };
    const { error: e } = editTraining
      ? await supabase.from('trainings').update(payload).eq('id', editTraining.id)
      : await supabase.from('trainings').insert([payload]);
    setSaving(false);
    if (e) { setError(e.message); return; }
    onDone();
  };

  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">{editTraining ? 'Edit Training' : 'Create New Training'}</h2>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Training Title *</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Panchakarma Advanced Training 2026"
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3} placeholder="Training objectives, topics covered..."
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Start Date *</label>
          <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">End Date *</label>
          <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Venue</label>
          <input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
            placeholder="e.g. Rishikul Govt Ayurvedic College, Haridwar"
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Max Participants</label>
          <input type="number" value={form.max_participants} onChange={e => setForm({ ...form, max_participants: e.target.value })}
            min="1" max="500"
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Venue Latitude (GPS attendance)</label>
          <input value={form.venue_lat} onChange={e => setForm({ ...form, venue_lat: e.target.value })}
            placeholder="e.g. 29.9457"
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Venue Longitude (GPS attendance)</label>
          <input value={form.venue_lng} onChange={e => setForm({ ...form, venue_lng: e.target.value })}
            placeholder="e.g. 78.1642"
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Trainers / Faculty</label>
          <div className="flex gap-2">
            <input value={form.trainerInput} onChange={e => setForm({ ...form, trainerInput: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTrainer())}
              placeholder="Type trainer name and press Add"
              className="flex-1 bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            <button type="button" onClick={addTrainer}
              className="bg-slate-800 text-white px-5 rounded-2xl font-bold text-sm hover:bg-slate-900">Add</button>
          </div>
          {form.trainers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.trainers.map(t => (
                <span key={t} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                  {t}
                  <button type="button" onClick={() => setForm(f => ({ ...f, trainers: f.trainers.filter(x => x !== t) }))}
                    className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">WhatsApp Group Invitation Link (optional)</label>
          <input value={form.whatsapp_group_link} onChange={e => setForm({ ...form, whatsapp_group_link: e.target.value })}
            placeholder="https://chat.whatsapp.com/..."
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          <p className="text-[10px] text-slate-400 ml-1">Staff will see this link after marking first-day attendance</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Training Schedule (PDF/PNG)</label>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg"
            onChange={e => setScheduleFile(e.target.files?.[0] || null)}
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none" />
          {editTraining?.schedule_url && !scheduleFile && (
            <p className="text-[10px] text-emerald-600 ml-1">Current schedule already uploaded — upload new to replace</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Study Materials (PDF/PNG — multiple)</label>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" multiple
            onChange={e => setMaterialFiles(Array.from(e.target.files || []))}
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none" />
          {editTraining?.study_materials && editTraining.study_materials.length > 0 && (
            <p className="text-[10px] text-emerald-600 ml-1">{editTraining.study_materials.length} materials already uploaded — new uploads will be added</p>
          )}
        </div>

        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Target Roles *</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, target_roles: roles }))}
                className="text-xs text-emerald-600 font-bold hover:underline">Select All</button>
              <span className="text-slate-300">|</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, target_roles: [] }))}
                className="text-xs text-red-500 font-bold hover:underline">Clear</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {roles.map(r => (
              <button key={r} type="button" onClick={() => toggleRole(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  form.target_roles.includes(r) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-gray-200 hover:border-emerald-400'
                }`}>{r}</button>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onCancel} className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-2xl hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
          {saving
            ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} />{uploading ? 'Uploading files...' : 'Saving...'}</span>
            : <span className="flex items-center gap-2"><Plus size={18} />{editTraining ? 'Update Training' : 'Create Training'}</span>
          }
        </button>
      </div>
    </motion.div>
  );
}

// ─── Assessment Manager (Admin) ─────────────────────────────────────────────
function AssessmentManager({ training, onClose }: { training: Training; onClose: () => void }) {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = async () => {
    const { data } = await supabase.from('training_assessments').select('*').eq('training_id', training.id).order('created_at');
    setQuestions(data || []); setLoading(false);
  };

  const handleAdd = async () => {
    setError('');
    if (!form.question.trim() || !form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) {
      setError('All fields are required'); return;
    }
    if (questions.length >= 20) { setError('Maximum 20 questions allowed'); return; }
    setSaving(true);
    const { error: e } = await supabase.from('training_assessments').insert([{ training_id: training.id, ...form, correct_option: form.correct_option.toUpperCase() }]);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setForm({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' });
    fetchQuestions();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl my-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Assessment Questions</h3>
            <p className="text-slate-500 text-sm mt-1">{training.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="bg-slate-50 rounded-2xl p-6 mb-6 space-y-3">
          <p className="text-sm font-bold text-slate-700">Add Question ({questions.length}/20)</p>
          <textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
            rows={2} placeholder="Enter question..."
            className="w-full bg-white border border-gray-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            {(['A','B','C','D'] as const).map(opt => (
              <div key={opt} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 w-4">{opt}.</span>
                <input value={form[`option_${opt.toLowerCase()}` as keyof typeof form]}
                  onChange={e => setForm({ ...form, [`option_${opt.toLowerCase()}`]: e.target.value })}
                  placeholder={`Option ${opt}`}
                  className="flex-1 bg-white border border-gray-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-500">Correct Answer:</label>
            <div className="flex gap-2">
              {['A','B','C','D'].map(opt => (
                <button key={opt} type="button" onClick={() => setForm({ ...form, correct_option: opt })}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${form.correct_option === opt ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-slate-600'}`}>{opt}</button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button onClick={handleAdd} disabled={saving}
            className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Add Question
          </button>
        </div>
        {loading ? <Loader2 className="animate-spin mx-auto text-emerald-600" size={32} /> : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {questions.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No questions added yet</p>}
            {questions.map((q, i) => (
              <div key={q.id} className="bg-slate-50 rounded-2xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <p className="text-sm font-bold text-slate-900">{i+1}. {q.question}</p>
                  <button onClick={async () => { await supabase.from('training_assessments').delete().eq('id', q.id); fetchQuestions(); }}
                    className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={16} /></button>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {(['A','B','C','D'] as const).map(opt => (
                    <p key={opt} className={`text-xs px-2 py-1 rounded-lg ${q.correct_option === opt ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      {opt}. {q[`option_${opt.toLowerCase()}` as keyof AssessmentQuestion]}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Assessment Modal (Staff) ───────────────────────────────────────────────
function AssessmentModal({ training, session, onDone }: { training: Training; session: UserSession; onDone: () => void }) {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [q, r] = await Promise.all([
        supabase.from('training_assessments').select('*').eq('training_id', training.id).order('created_at'),
        supabase.from('training_assessment_responses').select('score,total').eq('training_id', training.id).eq('staff_id', session.id).maybeSingle()
      ]);
      setQuestions(q.data || []);
      if (r.data) setResult(r.data);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) { alert('Please answer all questions before submitting.'); return; }
    setSubmitting(true);
    const score = questions.filter(q => answers[q.id] === q.correct_option).length;
    await supabase.from('training_assessment_responses').insert([{
      training_id: training.id, staff_id: session.id, responses: answers, score, total: questions.length,
    }]);
    setResult({ score, total: questions.length });
    setSubmitting(false);
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <Loader2 className="animate-spin text-white" size={40} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl my-4">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Training Assessment</h3>
        <p className="text-slate-500 text-sm mb-6">{training.title}</p>
        {result ? (
          <div className="text-center space-y-4 py-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-3xl font-bold ${
              result.score / result.total >= 0.6 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>{result.score}/{result.total}</div>
            <p className="font-bold text-slate-900 text-lg">{result.score / result.total >= 0.6 ? 'Assessment Passed!' : 'Assessment Completed'}</p>
            <p className="text-slate-500 text-sm">You scored {result.score} out of {result.total} ({Math.round(result.score/result.total*100)}%)</p>
            <button onClick={onDone} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-2xl hover:bg-emerald-700 mt-2">
              Continue to Feedback
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-3">
                <p className="font-bold text-slate-900 text-sm">{i+1}. {q.question}</p>
                <div className="space-y-2">
                  {(['A','B','C','D'] as const).map(opt => (
                    <button key={opt} type="button" onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                        answers[q.id] === opt ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-gray-100 hover:border-emerald-300'
                      }`}>
                      {opt}. {q[`option_${opt.toLowerCase()}` as keyof AssessmentQuestion]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-2">
              <p className="text-slate-400 text-xs mb-3 text-center">{Object.keys(answers).length}/{questions.length} questions answered</p>
              <button onClick={handleSubmit} disabled={submitting || Object.keys(answers).length < questions.length}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Submit Assessment
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Feedback Modal (Staff) ─────────────────────────────────────────────────
function FeedbackModal({ training, session, onClose }: { training: Training; session: UserSession; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [contentQuality, setContentQuality] = useState('');
  const [trainerRatings, setTrainerRatings] = useState<Record<string,string>>({});
  const [venueFacilities, setVenueFacilities] = useState('');
  const [workHelpfulness, setWorkHelpfulness] = useState('');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyGiven, setAlreadyGiven] = useState(false);
  const [error, setError] = useState('');

  const qualityOptions = ['Excellent', 'Good', 'Average', 'Poor'];
  const helpfulnessOptions = ['Definitely', 'Probably', 'Probably Not', 'Not at All'];
  const hasTrainers = (training.trainers?.length || 0) > 0;
  let qNum = 1;

  useEffect(() => {
    supabase.from('training_feedback').select('id').eq('training_id', training.id).eq('staff_id', session.id).maybeSingle()
      .then(({ data }) => { if (data) setAlreadyGiven(true); });
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (rating === 0) { setError('Please select an overall rating'); return; }
    if (!contentQuality) { setError('Please rate the training content quality'); return; }
    if (hasTrainers && Object.keys(trainerRatings).length < training.trainers.length) { setError('Please rate all trainers'); return; }
    if (!venueFacilities) { setError('Please rate the venue and facilities'); return; }
    if (!workHelpfulness) { setError('Please answer the work helpfulness question'); return; }
    setSaving(true);
    const { error: e } = await supabase.from('training_feedback').insert([{
      training_id: training.id, staff_id: session.id,
      overall_rating: rating, content_quality: contentQuality,
      trainer_effectiveness: trainerRatings, venue_facilities: venueFacilities,
      work_helpfulness: workHelpfulness, comments: comments.trim(),
    }]);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSuccess(true);
  };

  const OptionGrid = ({ options, selected, onSelect, color = 'emerald' }: { options: string[]; selected: string; onSelect: (v: string) => void; color?: string }) => (
    <div className="grid grid-cols-2 gap-2">
      {options.map(opt => (
        <button key={opt} onClick={() => onSelect(opt)}
          className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
            selected === opt ? `bg-${color}-600 text-white border-${color}-600` : 'bg-slate-50 text-slate-600 border-gray-100 hover:border-slate-300'
          }`}>{opt}</button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl my-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Training Feedback</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <p className="font-bold text-slate-900 text-sm">{training.title}</p>
        </div>

        {success ? (
          <div className="text-center space-y-3 py-4">
            <ThumbsUp size={48} className="text-purple-500 mx-auto" />
            <p className="font-bold text-slate-900">Thank you for your feedback!</p>
            <button onClick={onClose} className="w-full bg-purple-600 text-white font-bold py-3 rounded-2xl mt-2">Done</button>
          </div>
        ) : alreadyGiven ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 size={48} className="text-blue-500 mx-auto" />
            <p className="font-bold text-slate-900">Feedback Already Submitted</p>
            <button onClick={onClose} className="w-full bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl mt-2">Close</button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Q1: Overall Rating */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">{qNum++}. Overall Rating *</label>
              <div className="flex gap-2 justify-center">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)} className={`text-3xl transition-all ${s <= rating ? 'scale-110' : 'opacity-30'}`}>⭐</button>
                ))}
              </div>
              <p className="text-center text-xs text-slate-400">
                {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : rating === 5 ? 'Excellent' : ''}
              </p>
            </div>

            {/* Q2: Content Quality */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">{qNum++}. Training Content Quality *</label>
              <OptionGrid options={qualityOptions} selected={contentQuality} onSelect={setContentQuality} color="emerald" />
            </div>

            {/* Q3: Trainer Effectiveness (per trainer) */}
            {hasTrainers && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700">{qNum++}. Trainer Effectiveness *</label>
                {training.trainers.map(trainer => (
                  <div key={trainer} className="space-y-1.5">
                    <p className="text-xs text-slate-500 font-medium">{trainer}</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {qualityOptions.map(opt => (
                        <button key={opt} onClick={() => setTrainerRatings(prev => ({ ...prev, [trainer]: opt }))}
                          className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                            trainerRatings[trainer] === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-gray-100 hover:border-blue-300'
                          }`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Q4: Venue & Facilities */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">{qNum++}. Venue & Facilities *</label>
              <OptionGrid options={qualityOptions} selected={venueFacilities} onSelect={setVenueFacilities} color="purple" />
            </div>

            {/* Q5: Work Helpfulness */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">{qNum++}. Will this training help in your work? *</label>
              <OptionGrid options={helpfulnessOptions} selected={workHelpfulness} onSelect={setWorkHelpfulness} color="amber" />
            </div>

            {/* Q6: Comments */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">{qNum++}. Suggestions or Comments (optional)</label>
              <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3}
                placeholder="Any suggestions to improve future trainings..."
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none" />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button onClick={handleSubmit} disabled={saving}
              className="w-full bg-purple-600 text-white font-bold py-4 rounded-2xl hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Star size={20} />}
              Submit Feedback
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Attendance Modal ───────────────────────────────────────────────────────
function AttendanceModal({ training, session, onClose }: { training: Training; session: UserSession; onClose: () => void }) {
  const [marking, setMarking] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'fetching'|'ready'|'error'>('fetching');
  const [locationError, setLocationError] = useState('');
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [success, setSuccess] = useState(false);
  const [distanceFromVenue, setDistanceFromVenue] = useState<number | null>(null);
  const [showGpsToast, setShowGpsToast] = useState(false);

  useEffect(() => {
    supabase.from('training_attendance').select('id').eq('training_id', training.id).eq('staff_id', session.id).eq('attendance_date', today()).maybeSingle()
      .then(({ data }) => { if (data) setAlreadyMarked(true); });

    if (!navigator.geolocation) { setLocationStatus('error'); setLocationError('GPS not supported on this device.'); setShowGpsToast(true); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng }); setLocationStatus('ready');
        if (training.venue_lat && training.venue_lng)
          setDistanceFromVenue(Math.round(getDistanceMeters(lat, lng, training.venue_lat, training.venue_lng)));
      },
      err => {
        setLocationStatus('error');
        setLocationError(err.code === 1 ? 'GPS permission denied. Please allow location access.' : 'Could not get GPS location. Please enable GPS.');
        setShowGpsToast(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const venueHasCoords = !!(training.venue_lat && training.venue_lng);
  const isWithinRadius = !venueHasCoords || (distanceFromVenue !== null && distanceFromVenue <= 300);
  const canMark = location !== null && isWithinRadius;

  const handleMark = async () => {
    if (!location || !isWithinRadius) return;
    setMarking(true);
    const { error } = await supabase.from('training_attendance').insert([{
      training_id: training.id, staff_id: session.id, attendance_date: today(), latitude: location.lat, longitude: location.lng,
    }]);
    setMarking(false);
    if (error) { setLocationError(error.message); return; }
    setSuccess(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      {showGpsToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90vw] max-w-sm">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 text-white rounded-2xl p-4 flex items-start gap-3 shadow-2xl">
            <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">GPS Location Required</p>
              <p className="text-slate-300 text-xs mt-1">Please enable location on your device and allow permission for this site.</p>
              <p className="text-slate-400 text-xs mt-1">Android: Settings → Location → ON | iPhone: Settings → Privacy → Location → ON</p>
            </div>
            <button onClick={() => setShowGpsToast(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
          </motion.div>
        </div>
      )}
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Mark Attendance</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 mb-4">
          <p className="font-bold text-slate-900 text-sm">{training.title}</p>
          <p className="text-slate-500 text-xs mt-1">Date: {formatDate(today())}</p>
          {training.venue && <p className="text-slate-500 text-xs mt-0.5">Venue: {training.venue}</p>}
        </div>
        {success ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-900">Attendance Marked!</p>
            <p className="text-slate-500 text-sm">Your attendance has been recorded with GPS location.</p>

            {training.whatsapp_group_link && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mt-2">
                <p className="font-bold text-green-800 text-sm mb-2">Join WhatsApp Training Group</p>
                <a href={training.whatsapp_group_link} target="_blank" rel="noopener noreferrer"
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-all text-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.524 5.855L.057 23.945l6.264-1.641C8.01 23.427 9.964 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.925 0-3.724-.5-5.287-1.375l-.379-.225-3.723.976.995-3.631-.247-.387C2.542 15.78 2 13.961 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                  Join Group
                </a>
              </div>
            )}

            <button onClick={onClose} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-2xl mt-2">Done</button>
          </div>
        ) : alreadyMarked ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 size={48} className="text-blue-500 mx-auto" />
            <p className="font-bold text-slate-900">Attendance Already Marked</p>
            <p className="text-slate-500 text-sm">Your attendance for today is already recorded.</p>
            <button onClick={onClose} className="w-full bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl mt-2">Close</button>
          </div>
        ) : (
          <>
            <div className={`flex items-center gap-3 p-3 rounded-2xl mb-3 ${locationStatus === 'ready' ? 'bg-emerald-50 text-emerald-700' : locationStatus === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
              <MapPin size={18} className="shrink-0" />
              <p className="text-sm font-medium">
                {locationStatus === 'fetching' && 'Getting your GPS location...'}
                {locationStatus === 'ready' && `GPS Ready: ${location?.lat.toFixed(4)}, ${location?.lng.toFixed(4)}`}
                {locationStatus === 'error' && locationError}
              </p>
            </div>
            {venueHasCoords && distanceFromVenue !== null && (
              <div className={`flex items-center gap-3 p-3 rounded-2xl mb-3 ${isWithinRadius ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                <span className="shrink-0">{isWithinRadius ? '✅' : '❌'}</span>
                <div>
                  <p className="text-sm font-bold">{isWithinRadius ? 'Within venue area' : 'Outside venue area'}</p>
                  <p className="text-xs mt-0.5">{distanceFromVenue}m from venue{!isWithinRadius && ' — must be within 300m'}</p>
                </div>
              </div>
            )}
            {!venueHasCoords && location && (
              <div className="bg-blue-50 text-blue-700 flex items-center gap-2 p-3 rounded-2xl mb-3">
                <MapPin size={16} className="shrink-0" />
                <p className="text-xs font-medium">No venue coordinates set — attendance allowed from current location</p>
              </div>
            )}
            <button onClick={handleMark} disabled={marking || !canMark}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {marking ? <Loader2 className="animate-spin" size={20} /> : <UserCheck size={20} />}
              {!location ? 'Waiting for GPS...' : !isWithinRadius ? `Too far from venue (${distanceFromVenue}m)` : 'Mark My Attendance'}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Training Card ──────────────────────────────────────────────────────────
function TrainingCard({ training, session, myApplication, hasAssessment, assessmentDone, onApply, onAttendance, onAssessment, onFeedback }: {
  training: Training; session: UserSession; myApplication?: Application;
  hasAssessment: boolean; assessmentDone: boolean;
  onApply: (t: Training) => void | Promise<void>; onAttendance: (t: Training) => void;
  onAssessment: (t: Training) => void; onFeedback: (t: Training) => void;
}) {
  const active = isTrainingActive(training);
  const upcoming = isTrainingUpcoming(training);
  const past = isTrainingPast(training);
  const appStatus = myApplication?.status;
  const isLastDay = active && training.end_date === today();
  const canGiveFeedback = (past || isLastDay) && appStatus === 'approved';
  const canDoAssessment = canGiveFeedback && hasAssessment && !assessmentDone;
  const canGiveFeedbackNow = canGiveFeedback && (!hasAssessment || assessmentDone);

  const roleMatches = training.target_roles.includes(session.role) ||
    (session.staffRole && training.target_roles.includes(session.staffRole));

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-lg transition-all">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
          active ? 'bg-emerald-100 text-emerald-700' : upcoming ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
        }`}>{active ? `Active${isLastDay ? ' — Last Day' : ''}` : upcoming ? 'Upcoming' : 'Completed'}</span>
        {appStatus && (
          <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
            appStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : appStatus === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
          }`}>{appStatus === 'approved' ? '✓ Approved' : appStatus === 'rejected' ? '✗ Rejected' : '⏳ Pending'}</span>
        )}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">{training.title}</h3>
      {training.description && <p className="text-slate-500 text-sm mb-3 line-clamp-2">{training.description}</p>}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <span>{formatDate(training.start_date)} — {formatDate(training.end_date)}</span>
        </div>
        {training.venue && <div className="flex items-center gap-2 text-slate-500 text-sm"><MapPin size={14} className="text-slate-400 shrink-0" /><span>{training.venue}</span></div>}
        {training.trainers?.length > 0 && <div className="flex items-center gap-2 text-slate-500 text-sm"><Users size={14} className="text-slate-400 shrink-0" /><span>Faculty: {training.trainers.join(', ')}</span></div>}
      </div>
      <div className="flex flex-wrap gap-1 mb-4">
        {training.target_roles.map(r => <span key={r} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">{r}</span>)}
      </div>

      {/* Resources for approved participants */}
      {appStatus === 'approved' && (
        <div className="space-y-2 mb-4">
          {training.schedule_url && (
            <a href={training.schedule_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all">
              <Calendar size={14} /> View Training Schedule
            </a>
          )}
          {training.study_materials && training.study_materials.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Study Materials</p>
              {training.study_materials.map((mat, i) => (
                <a key={i} href={mat.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all">
                  <BookOpen size={13} /> {mat.name}
                </a>
              ))}
            </div>
          )}
          {training.whatsapp_group_link && (active || past) && (
            <a href={training.whatsapp_group_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-green-100 transition-all">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.524 5.855L.057 23.945l6.264-1.641C8.01 23.427 9.964 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.925 0-3.724-.5-5.287-1.375l-.379-.225-3.723.976.995-3.631-.247-.387C2.542 15.78 2 13.961 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Join WhatsApp Training Group
            </a>
          )}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {(upcoming || active) && !myApplication && roleMatches && (
          <button onClick={() => onApply(training)} className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2">
            <ClipboardList size={16} /> Apply Now
          </button>
        )}
        {(upcoming || active) && appStatus === 'pending' && (
          <div className="flex-1 bg-amber-50 text-amber-700 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
            <Clock size={16} /> Application Pending
          </div>
        )}
        {appStatus === 'rejected' && (
          <div className="flex-1 bg-red-50 text-red-600 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
            <XCircle size={16} /> Application Rejected
          </div>
        )}
        {active && appStatus === 'approved' && (
          <button onClick={() => onAttendance(training)} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
            <UserCheck size={16} /> Mark Attendance
          </button>
        )}
        {canDoAssessment && (
          <button onClick={() => onAssessment(training)} className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-bold text-sm hover:bg-orange-600 flex items-center justify-center gap-2">
            <ClipboardList size={16} /> Take Assessment
          </button>
        )}
        {canGiveFeedbackNow && (
          <button onClick={() => onFeedback(training)} className="flex-1 bg-purple-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-purple-700 flex items-center justify-center gap-2">
            <Star size={16} /> Give Feedback
          </button>
        )}
        {past && appStatus === 'approved' && !canDoAssessment && !canGiveFeedbackNow && (
          <div className="flex-1 bg-emerald-50 text-emerald-700 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
            <Award size={16} /> Training Completed
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Admin Attendance View ──────────────────────────────────────────────────
function AttendanceAdminView({ trainingId, trainingApps }: { trainingId: string; trainingApps: Application[] }) {
  const [data, setData] = useState<{ attendance: Set<string>; assessments: Set<string>; feedback: Set<string> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [att, ass, feed] = await Promise.all([
        supabase.from('training_attendance').select('staff_id').eq('training_id', trainingId),
        supabase.from('training_assessment_responses').select('staff_id').eq('training_id', trainingId),
        supabase.from('training_feedback').select('staff_id').eq('training_id', trainingId),
      ]);
      setData({
        attendance: new Set((att.data || []).map(r => r.staff_id)),
        assessments: new Set((ass.data || []).map(r => r.staff_id)),
        feedback: new Set((feed.data || []).map(r => r.staff_id)),
      });
      setLoading(false);
    };
    fetchAll();
  }, [trainingId]);

  const handleDownload = () => {
    const headers = ['Name', 'Attendance', 'Assessment', 'Feedback'];
    const rows = trainingApps.map(app => [
      app.staff_name,
      data?.attendance.has(app.staff_id) ? 'Yes' : 'No',
      data?.assessments.has(app.staff_id) ? 'Yes' : 'No',
      data?.feedback.has(app.staff_id) ? 'Yes' : 'No',
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_sheet.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) return <Loader2 className="animate-spin mx-auto text-emerald-600 my-4" size={24} />;

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-end mb-4">
        <button onClick={handleDownload}
          className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-900 transition-all">
          Download CSV
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="p-3 font-bold">Name</th>
            <th className="p-3 text-center font-bold">Attendance</th>
            <th className="p-3 text-center font-bold">Assessment</th>
            <th className="p-3 text-center font-bold">Feedback</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {trainingApps.map(app => (
            <tr key={app.staff_id}>
              <td className="p-3 font-medium text-slate-700">{app.staff_name}</td>
              <td className="p-3 text-center">{data.attendance.has(app.staff_id) ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> : '-'}</td>
              <td className="p-3 text-center">{data.assessments.has(app.staff_id) ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> : '-'}</td>
              <td className="p-3 text-center">{data.feedback.has(app.staff_id) ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Admin Feedback View ────────────────────────────────────────────────────
function FeedbackAdminView({ trainingId, trainers }: { trainingId: string; trainers: string[] }) {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('training_feedback').select('*').eq('training_id', trainingId)
      .then(({ data }) => { setFeedbacks(data || []); setLoading(false); });
  }, []);
  if (loading) return <Loader2 className="animate-spin mx-auto text-emerald-600 my-4" size={24} />;
  if (feedbacks.length === 0) return <p className="text-slate-400 text-sm text-center py-8">No feedback submitted yet</p>;
  const avgRating = (feedbacks.reduce((s, f) => s + (f.overall_rating || 0), 0) / feedbacks.length).toFixed(1);
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 rounded-2xl p-4 flex items-center gap-3">
        <div className="text-3xl font-bold text-amber-600">{avgRating}</div>
        <div><p className="font-bold text-amber-800 text-sm">Average Overall Rating</p><p className="text-amber-600 text-xs">{feedbacks.length} responses</p></div>
      </div>
      {feedbacks.map(fb => (
        <div key={fb.id} className="bg-slate-50 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700 text-sm">{fb.staff_id}</span>
            <span className="text-sm">{'⭐'.repeat(fb.overall_rating || 0)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-slate-500">Content: <span className="font-bold text-slate-700">{fb.content_quality}</span></span>
            <span className="text-slate-500">Venue: <span className="font-bold text-slate-700">{fb.venue_facilities}</span></span>
            <span className="text-slate-500 col-span-2">Helpful for work: <span className="font-bold text-slate-700">{fb.work_helpfulness}</span></span>
            {trainers.length > 0 && Object.entries(fb.trainer_effectiveness || {}).map(([trainer, rating]) => (
              <span key={trainer} className="text-slate-500 col-span-2">{trainer}: <span className="font-bold text-slate-700">{rating as string}</span></span>
            ))}
          </div>
          {fb.comments && <p className="text-slate-500 text-xs border-t border-gray-100 pt-2 italic">"{fb.comments}"</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Admin Panel ────────────────────────────────────────────────────────────
function AdminPanel({ session }: { session: UserSession }) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTraining, setExpandedTraining] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'applications'|'attendance'|'feedback'>('applications');
  const [updating, setUpdating] = useState<string | null>(null);
  const [assessmentTarget, setAssessmentTarget] = useState<Training | null>(null);
  const [editTarget, setEditTarget] = useState<Training | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [t, a] = await Promise.all([
      supabase.from('trainings').select('*').order('start_date', { ascending: false }),
      supabase.from('training_applications').select('*').order('applied_at', { ascending: false }),
    ]);
    setTrainings(t.data || []); setApplications(a.data || []); setLoading(false);
  };

  const updateApplicationStatus = async (appId: string, status: 'approved'|'rejected') => {
    setUpdating(appId);
    await supabase.from('training_applications').update({ status, reviewed_by: session.name || session.id, reviewed_at: new Date().toISOString() }).eq('id', appId);
    await fetchAll(); setUpdating(null);
  };

  const deleteTraining = async (id: string) => {
    if (!confirm('Delete this training? All related data will also be deleted.')) return;
    await supabase.from('trainings').delete().eq('id', id);
    fetchAll();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trainings', value: trainings.length, color: 'text-blue-600 bg-blue-50', icon: BookOpen },
          { label: 'Applications', value: applications.length, color: 'text-purple-600 bg-purple-50', icon: ClipboardList },
          { label: 'Approved', value: applications.filter(a => a.status === 'approved').length, color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
          { label: 'Pending', value: applications.filter(a => a.status === 'pending').length, color: 'text-amber-600 bg-amber-50', icon: Clock },
        ].map(card => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}><card.icon size={20} /></div>
            <div><p className="text-2xl font-bold text-slate-900">{card.value}</p><p className="text-xs text-slate-500">{card.label}</p></div>
          </div>
        ))}
      </div>

      {trainings.map(training => {
        const trainingApps = applications.filter(a => a.training_id === training.id);
        const isExpanded = expandedTraining === training.id;
        const filteredApps = session.role === 'DISTRICT_ADMIN'
          ? trainingApps.filter(a => session.access_districts?.includes(a.district))
          : trainingApps;

        return (
          <div key={training.id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="p-6 flex items-center justify-between gap-4 cursor-pointer"
              onClick={() => setExpandedTraining(isExpanded ? null : training.id)}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    isTrainingActive(training) ? 'bg-emerald-100 text-emerald-700' : isTrainingUpcoming(training) ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>{isTrainingActive(training) ? 'Active' : isTrainingUpcoming(training) ? 'Upcoming' : 'Completed'}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{training.title}</h3>
                <p className="text-slate-500 text-xs mt-1">{formatDate(training.start_date)} — {formatDate(training.end_date)}{training.venue && ` • ${training.venue}`}</p>
                <p className="text-slate-400 text-xs mt-1">{trainingApps.length} applied • {trainingApps.filter(a => a.status === 'approved').length} approved</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {session.role === 'SUPER_ADMIN' && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setAssessmentTarget(training); }} title="Manage Assessment"
                      className="p-2 text-orange-500 hover:bg-orange-50 rounded-xl"><ClipboardList size={16} /></button>
                    <button onClick={e => { e.stopPropagation(); setEditTarget(training); }} title="Edit Training"
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit2 size={16} /></button>
                    <button onClick={e => { e.stopPropagation(); deleteTraining(training.id); }}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                  </>
                )}
                {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100">
                  <div className="flex gap-1 p-4 border-b border-gray-100">
                    {(['applications','attendance','feedback'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveSubTab(tab)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === tab ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="p-4">
                    {activeSubTab === 'applications' && (
                      <div className="space-y-3">
                        {filteredApps.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No applications yet</p>}
                        {filteredApps.map(app => (
                          <div key={app.id} className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900 text-sm">{app.staff_name || app.staff_id}</p>
                                {/* WhatsApp message icon — sends training invite */}
                                {training.whatsapp_group_link && (
                                  <a href={`https://wa.me/?text=${encodeURIComponent(`You are invited to join the WhatsApp group for ${training.title}.\n\nJoin here: ${training.whatsapp_group_link}`)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    title="Send WhatsApp invitation to this participant"
                                    className="text-green-500 hover:text-green-700 transition-all">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.524 5.855L.057 23.945l6.264-1.641C8.01 23.427 9.964 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.925 0-3.724-.5-5.287-1.375l-.379-.225-3.723.976.995-3.631-.247-.387C2.542 15.78 2 13.961 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                                  </a>
                                )}
                              </div>
                              <p className="text-slate-500 text-xs mt-0.5">{app.staff_role} • {app.district || '—'}</p>
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <Award size={12} className="text-amber-500" />
                                Past trainings: <span className="font-bold text-slate-700 ml-1">{app.past_trainings_count}</span>
                                <span className="ml-2">• {formatDate(app.applied_at)}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {app.status === 'pending' && session.role === 'SUPER_ADMIN' ? (
                                <>
                                  <button onClick={() => updateApplicationStatus(app.id, 'approved')} disabled={updating === app.id}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                                    {updating === app.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                                  </button>
                                  <button onClick={() => updateApplicationStatus(app.id, 'rejected')} disabled={updating === app.id}
                                    className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-200 disabled:opacity-50 flex items-center gap-1">
                                    <XCircle size={12} /> Reject
                                  </button>
                                </>
                              ) : (
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                                  app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : app.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                                }`}>{app.status === 'approved' ? '✓ Approved' : app.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {activeSubTab === 'attendance' && <AttendanceAdminView trainingId={training.id} trainingApps={trainingApps} />}
                    {activeSubTab === 'feedback' && <FeedbackAdminView trainingId={training.id} trainers={training.trainers || []} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {trainings.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">No trainings created yet</p>
        </div>
      )}

      {assessmentTarget && <AssessmentManager training={assessmentTarget} onClose={() => setAssessmentTarget(null)} />}
      {editTarget && (
        <CreateTrainingForm session={session} editTraining={editTarget}
          onDone={() => { setEditTarget(null); fetchAll(); }} onCancel={() => setEditTarget(null)} />
      )}
    </div>
  );
}

// ─── Main TrainingModule ────────────────────────────────────────────────────
export default function TrainingModule({ session }: TrainingModuleProps) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [assessmentStatus, setAssessmentStatus] = useState<Record<string,{ has: boolean; done: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming'|'active'|'past'|'my'>('upcoming');
  const [attendanceTraining, setAttendanceTraining] = useState<Training | null>(null);
  const [assessmentTraining, setAssessmentTraining] = useState<Training | null>(null);
  const [feedbackTraining, setFeedbackTraining] = useState<Training | null>(null);

  const isAdmin = isAdminRole(session.role);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (trainings.length > 0 && myApplications.length > 0) checkAssessmentStatus();
  }, [trainings, myApplications]);

  const fetchData = async () => {
    setLoading(true);
    const { data: t } = await supabase.from('trainings').select('*').order('start_date');
    setTrainings(t || []);
    if (!isAdmin) {
      const { data: apps } = await supabase.from('training_applications').select('*').eq('staff_id', session.id);
      setMyApplications(apps || []);
    }
    setLoading(false);
  };

  const checkAssessmentStatus = async () => {
    const approvedIds = myApplications.filter(a => a.status === 'approved').map(a => a.training_id);
    if (approvedIds.length === 0) return;
    const [q, r] = await Promise.all([
      supabase.from('training_assessments').select('training_id').in('training_id', approvedIds),
      supabase.from('training_assessment_responses').select('training_id').eq('staff_id', session.id).in('training_id', approvedIds),
    ]);
    const hasSet = new Set((q.data || []).map(x => x.training_id));
    const doneSet = new Set((r.data || []).map(x => x.training_id));
    const status: Record<string,{ has: boolean; done: boolean }> = {};
    approvedIds.forEach(id => { status[id] = { has: hasSet.has(id), done: doneSet.has(id) }; });
    setAssessmentStatus(status);
  };

  const handleApply = async (training: Training) => {
    const { count } = await supabase.from('training_applications').select('*', { count: 'exact', head: true })
      .eq('staff_id', session.id).eq('status', 'approved');
    const { error } = await supabase.from('training_applications').insert([{
      training_id: training.id, staff_id: session.id,
      staff_name: session.name || session.id,
      staff_role: session.staffRole || session.role,
      district: session.district || session.access_districts?.[0] || '',
      past_trainings_count: count || 0, status: 'pending',
    }]);
    if (!error) { await fetchData(); alert('Application submitted! Please wait for admin approval.'); }
    else alert('Error: ' + error.message);
  };

  const relevantTrainings = trainings.filter(t => {
    if (isAdmin) return true;
    return t.target_roles.includes(session.role) || (session.staffRole && t.target_roles.includes(session.staffRole));
  });

  const upcomingList = relevantTrainings.filter(isTrainingUpcoming);
  const activeList = relevantTrainings.filter(isTrainingActive);
  const pastList = relevantTrainings.filter(isTrainingPast);
  const myAppliedIds = new Set(myApplications.map(a => a.training_id));
  const myList = relevantTrainings.filter(t => myAppliedIds.has(t.id));

  useEffect(() => {
    if (activeList.length > 0 && upcomingList.length === 0 && activeTab === 'upcoming') setActiveTab('active');
  }, [trainings]);

  const tabList = [
    { key: 'upcoming', label: 'Upcoming', count: upcomingList.length },
    { key: 'active', label: 'Active', count: activeList.length },
    { key: 'past', label: 'Past', count: pastList.length },
    ...(!isAdmin ? [{ key: 'my', label: 'My Applications', count: myList.length }] : []),
  ] as const;

  const displayList = activeTab === 'upcoming' ? upcomingList : activeTab === 'active' ? activeList : activeTab === 'past' ? pastList : myList;

  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-40 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Training <span className="text-emerald-600">Module</span></h1>
            <p className="text-slate-500 mt-2">Departmental training programs and attendance</p>
          </div>
          {session.role === 'SUPER_ADMIN' && !showCreateForm && (
            <button onClick={() => setShowCreateForm(true)}
              className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-200">
              <Plus size={18} /> New Training
            </button>
          )}
        </div>

        {showCreateForm && session.role === 'SUPER_ADMIN' && (
          <CreateTrainingForm session={session}
            onDone={() => { setShowCreateForm(false); fetchData(); }}
            onCancel={() => setShowCreateForm(false)} />
        )}

        {isAdmin && <AdminPanel session={session} />}

        {!isAdmin && (
          <>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {tabList.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-gray-100 hover:border-slate-300'
                  }`}>
                  {tab.label}
                  {tab.count > 0 && <span className="ml-2 text-xs opacity-70">({tab.count})</span>}
                </button>
              ))}
            </div>

            {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>}

            {!loading && displayList.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No trainings in this category</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayList.map(training => (
                <TrainingCard key={training.id}
                  training={training} session={session}
                  myApplication={myApplications.find(a => a.training_id === training.id)}
                  hasAssessment={assessmentStatus[training.id]?.has || false}
                  assessmentDone={assessmentStatus[training.id]?.done || false}
                  onApply={handleApply}
                  onAttendance={setAttendanceTraining}
                  onAssessment={setAssessmentTraining}
                  onFeedback={setFeedbackTraining}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {attendanceTraining && (
        <AttendanceModal training={attendanceTraining} session={session}
          onClose={() => { setAttendanceTraining(null); fetchData(); }} />
      )}

      {assessmentTraining && (
        <AssessmentModal training={assessmentTraining} session={session}
          onDone={() => {
            checkAssessmentStatus();
            const t = assessmentTraining;
            setAssessmentTraining(null);
            setTimeout(() => setFeedbackTraining(t), 300);
          }} />
      )}

      {feedbackTraining && (
        <FeedbackModal training={feedbackTraining} session={session}
          onClose={() => { setFeedbackTraining(null); fetchData(); }} />
      )}
    </div>
  );
}

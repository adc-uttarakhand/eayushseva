import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio, Youtube, Plus, Trash2, Edit3, Eye,
  Calendar, Clock, CheckCircle, XCircle,
  Loader2, ExternalLink, Play, Bell, BellOff,
  ChevronRight, Video, Archive
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LiveStream {
  id: string;
  title: string;
  youtube_url: string;
  description?: string;
  scheduled_at?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

interface LiveStreamProps {
  session: any;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getUrlType(url: string): 'youtube' | 'teams' | 'meet' | 'zoom' | 'other' {
  if (!url) return 'other';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'teams';
  if (url.includes('meet.google.com')) return 'meet';
  if (url.includes('zoom.us') || url.includes('zoom.com')) return 'zoom';
  return 'other';
}

function isExternalMeeting(url: string): boolean {
  return ['teams', 'meet', 'zoom', 'other'].includes(getUrlType(url));
}

function getMeetingLabel(url: string): { label: string; color: string; bg: string; icon: string } {
  const type = getUrlType(url);
  if (type === 'teams') return { label: 'Join on Teams', color: '#5059C9', bg: '#EEF0FB', icon: '🟦' };
  if (type === 'meet') return { label: 'Join on Meet', color: '#1E8E3E', bg: '#E6F4EA', icon: '🟢' };
  if (type === 'zoom') return { label: 'Join on Zoom', color: '#2D8CFF', bg: '#E8F3FF', icon: '🔵' };
  return { label: 'Join Meeting', color: '#64748b', bg: '#f1f5f9', icon: '🔗' };
}

function getEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
}

function getThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

function isAdminUser(session: any) {
  return ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'].includes(session?.role);
}

function useCountdown(targetDate?: string) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    if (!targetDate) return;
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setIsPast(true); setTimeLeft('Shuru ho gaya!'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) setTimeLeft(`${Math.floor(h / 24)} din ${h % 24} ghante mein`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s mein`);
      else setTimeLeft(`${m}m ${s}s mein`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetDate]);

  return { timeLeft, isPast };
}

function categorizeStreams(streams: LiveStream[]) {
  const now = Date.now();
  const live = streams.filter(s => s.is_active);
  const upcoming = streams.filter(s => !s.is_active && s.scheduled_at && new Date(s.scheduled_at).getTime() > now)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  const past = streams.filter(s => !s.is_active && (!s.scheduled_at || new Date(s.scheduled_at).getTime() <= now))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { live, upcoming, past };
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function CountdownCard({ stream, onWatch, onEdit, onDelete, onToggle, isAdmin }: any) {
  const { timeLeft, isPast } = useCountdown(stream.scheduled_at);
  const [reminded, setReminded] = useState(false);

  const handleRemind = () => {
    if (!('Notification' in window)) { alert('Browser notifications support nahi karta'); return; }
    Notification.requestPermission().then(p => {
      if (p === 'granted') {
        const ms = new Date(stream.scheduled_at).getTime() - Date.now() - 5 * 60 * 1000;
        if (ms > 0) {
          setTimeout(() => new Notification('🔴 Live Stream Shuru Hone Wala Hai!', { body: stream.title }), ms);
          setReminded(true);
          alert('✅ Reminder set! Stream se 5 minute pehle notification aayegi.');
        } else {
          alert('Stream bahut jaldi shuru hoga — abhi dekho!');
        }
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative">
        {getThumbnail(stream.youtube_url) ? (
          <img src={getThumbnail(stream.youtube_url)!} alt={stream.title} className="w-full h-36 object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-36 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
            <Calendar size={32} className="text-orange-300" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
          <Clock size={10} />{isPast ? 'Shuru!' : 'Upcoming'}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-slate-800 mb-1 line-clamp-2">{stream.title}</h3>
        {stream.description && <p className="text-slate-500 text-xs mb-2 line-clamp-2">{stream.description}</p>}
        {stream.scheduled_at && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 mb-3">
            <p className="text-orange-700 text-xs font-semibold flex items-center gap-1 mb-0.5">
              <Calendar size={11} />{formatDateTime(stream.scheduled_at)}
            </p>
            <p className="text-orange-600 text-xs font-bold">{timeLeft}</p>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleRemind}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${reminded ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {reminded ? <><BellOff size={12} />Reminder Set</> : <><Bell size={12} />Remind Me</>}
          </button>
          <button onClick={() => onWatch(stream)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-700 transition-colors">
            <Eye size={12} />Preview
          </button>
          {isAdmin && (
            <>
              <button onClick={() => onToggle(stream)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Go Live"><CheckCircle size={16} /></button>
              <button onClick={() => onEdit(stream)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={16} /></button>
              <button onClick={() => onDelete(stream.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function LiveStream({ session }: LiveStreamProps) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStream, setEditingStream] = useState<LiveStream | null>(null);
  const [watchingStream, setWatchingStream] = useState<LiveStream | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'past'>('live');
  const [form, setForm] = useState({ title: '', youtube_url: '', description: '', scheduled_at: '', is_active: false });

  const fetchStreams = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('live_streams').select('*').order('created_at', { ascending: false });
    setStreams(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 30000);
    return () => clearInterval(interval);
  }, [fetchStreams]);

  // Auto switch to live tab if something goes live
  useEffect(() => {
    const { live } = categorizeStreams(streams);
    if (live.length > 0 && activeTab !== 'live') setActiveTab('live');
  }, [streams]);

  const resetForm = () => { setForm({ title: '', youtube_url: '', description: '', scheduled_at: '', is_active: false, stream_source: '' }); setEditingStream(null); setError(''); };

  const handleEdit = (stream: LiveStream) => {
    setEditingStream(stream);
    setForm({ title: stream.title, youtube_url: stream.youtube_url, description: stream.description || '', scheduled_at: stream.scheduled_at ? stream.scheduled_at.slice(0, 16) : '', is_active: stream.is_active });
    setShowForm(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.title.trim()) { setError('Title zaroori hai'); return; }
    if (!form.youtube_url.trim()) { setError('Meeting URL zaroori hai'); return; }
    if (!extractYouTubeId(form.youtube_url) && !form.youtube_url.startsWith('http')) { setError('Valid URL dalo'); return; }
    setSaving(true);
    try {
      const payload = { title: form.title.trim(), youtube_url: form.youtube_url.trim(), description: form.description.trim() || null, scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null, is_active: form.is_active, created_by: session?.name || session?.id };
      if (editingStream) await supabase.from('live_streams').update(payload).eq('id', editingStream.id);
      else await supabase.from('live_streams').insert(payload);
      await fetchStreams();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete karna chahte hain?')) return;
    await supabase.from('live_streams').delete().eq('id', id);
    fetchStreams();
  };

  const toggleActive = async (stream: LiveStream) => {
    await supabase.from('live_streams').update({ is_active: !stream.is_active }).eq('id', stream.id);
    fetchStreams();
  };

  const { live, upcoming, past } = categorizeStreams(streams);

  const tabs = [
    { key: 'live' as const, label: 'Live', icon: Radio, count: live.length },
    { key: 'upcoming' as const, label: 'Upcoming', icon: Calendar, count: upcoming.length },
    { key: 'past' as const, label: 'Past', icon: Archive, count: past.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50/20 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
              <Radio size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Live Streams</h1>
              <p className="text-slate-400 text-sm">AYUSH Department ke live sessions</p>
            </div>
          </div>
          {isAdminUser(session) && (
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-colors">
              <Plus size={16} />Naya Stream
            </motion.button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? tab.key === 'live' ? 'bg-red-600 text-white shadow-md'
                    : tab.key === 'upcoming' ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}>
              <tab.icon size={15} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
              )}
              {tab.key === 'live' && tab.count > 0 && activeTab !== 'live' && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-red-500 animate-spin" /></div>}

        {/* LIVE TAB */}
        {!loading && activeTab === 'live' && (
          <>
            {live.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Radio size={28} className="text-red-200" />
                </div>
                <h3 className="font-semibold text-slate-500">No live stream at the moment</h3>
                <p className="text-slate-400 text-sm mt-1">Check our YouTube channel for live sessions</p>
                <a href="https://www.youtube.com/@ukdirayurved" target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-red-700 transition-colors shadow-md shadow-red-200 mx-auto w-fit">
                  <Youtube size={18} />Watch on YouTube
                </a>
                {upcoming.length > 0 && (
                  <button onClick={() => setActiveTab('upcoming')}
                    className="mt-4 text-orange-600 text-sm font-semibold flex items-center gap-1 mx-auto hover:underline">
                    {upcoming.length} upcoming stream dekho <ChevronRight size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {live.map(stream => (
                  <motion.div key={stream.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border-2 border-red-300 shadow-lg shadow-red-100 overflow-hidden">
                    <div className="bg-red-600 px-5 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-xs font-bold tracking-widest uppercase">Live Now</span>
                      </div>
                      {stream.created_by && <span className="text-red-200 text-xs">{stream.created_by}</span>}
                    </div>
                    <div className="flex flex-col md:flex-row">
                      {getThumbnail(stream.youtube_url) && (
                        <div className="md:w-64 flex-shrink-0">
                          <img src={getThumbnail(stream.youtube_url)!} alt={stream.title} className="w-full h-40 md:h-full object-cover" />
                        </div>
                      )}
                      <div className="p-5 flex-1">
                        <h3 className="font-bold text-slate-800 text-xl mb-2">{stream.title}</h3>
                        {stream.description && <p className="text-slate-500 text-sm mb-4">{stream.description}</p>}
                        <div className="flex items-center gap-3 flex-wrap">
                          {stream.youtube_url === 'https://www.youtube.com/@ukdirayurved' ? (
                            <a href="https://www.youtube.com/@ukdirayurved" target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-md shadow-red-200">
                              <Play size={16} />Watch on YouTube
                            </a>
                          ) : isExternalMeeting(stream.youtube_url) ? (
                            (() => {
                              const m = getMeetingLabel(stream.youtube_url);
                              return (
                                <a href={stream.youtube_url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all hover:opacity-90"
                                  style={{ backgroundColor: m.color, color: 'white' }}>
                                  <span>{m.icon}</span>{m.label}
                                </a>
                              );
                            })()
                          ) : (
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                              onClick={() => setWatchingStream(stream)}
                              className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-md shadow-red-200">
                              <Play size={16} />Abhi Dekho
                            </motion.button>
                          )}
                          <a href={stream.youtube_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-slate-500 text-sm hover:text-slate-700 transition-colors">
                            <ExternalLink size={14} />Open in browser
                          </a>
                          {isAdminUser(session) && (
                            <>
                              <button onClick={() => toggleActive(stream)}
                                className="flex items-center gap-1 text-xs text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors font-medium ml-auto">
                                <XCircle size={14} />End Stream
                              </button>
                              <button onClick={() => handleEdit(stream)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Edit3 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* UPCOMING TAB */}
        {!loading && activeTab === 'upcoming' && (
          <>
            {upcoming.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar size={28} className="text-orange-200" />
                </div>
                <h3 className="font-semibold text-slate-500">Koi scheduled stream nahi hai</h3>
                {isAdminUser(session) && (
                  <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="mt-4 text-red-600 text-sm font-semibold flex items-center gap-1 mx-auto hover:underline">
                    <Plus size={14} />Stream schedule karo
                  </button>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {upcoming.map(stream => (
                  <CountdownCard key={stream.id} stream={stream} onWatch={setWatchingStream}
                    onEdit={handleEdit} onDelete={handleDelete} onToggle={toggleActive} isAdmin={isAdminUser(session)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* PAST TAB */}
        {!loading && activeTab === 'past' && (
          <>
            {past.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Archive size={28} className="text-slate-300" />
                </div>
                <h3 className="font-semibold text-slate-500">Koi past recording nahi hai</h3>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {past.map(stream => (
                  <motion.div key={stream.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative">
                      {getThumbnail(stream.youtube_url) ? (
                        <img src={getThumbnail(stream.youtube_url)!} alt={stream.title} className="w-full h-36 object-cover" />
                      ) : (
                        <div className="w-full h-36 bg-slate-100 flex items-center justify-center">
                          <Video size={28} className="text-slate-300" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-slate-700 text-white text-xs px-2.5 py-1 rounded-full">Recording</div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-slate-800 mb-1 line-clamp-2">{stream.title}</h3>
                      {stream.description && <p className="text-slate-400 text-xs mb-2 line-clamp-2">{stream.description}</p>}
                      <p className="text-slate-300 text-xs mb-3">
                        {new Date(stream.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setWatchingStream(stream)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-slate-800 text-white px-3 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors">
                          <Play size={12} />Dekho
                        </button>
                        {isAdminUser(session) && (
                          <>
                            <button onClick={() => toggleActive(stream)} className="p-2 text-green-500 hover:bg-green-50 rounded-lg" title="Go Live"><Radio size={15} /></button>
                            <button onClick={() => handleEdit(stream)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg"><Edit3 size={15} /></button>
                            <button onClick={() => handleDelete(stream.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-red-600 px-6 py-5 flex items-center gap-3">
                  <Youtube size={22} className="text-white" />
                  <div>
                    <h2 className="text-white font-bold text-lg">{editingStream ? 'Stream Update Karo' : 'Naya Live Stream'}</h2>
                    <p className="text-red-200 text-xs">YouTube Live URL paste karo</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Title *</label>
                    <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Jaise: IDY 2026 Preparation Meeting"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                  </div>
                  <div>
                {/* Stream Source Selection */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Stream Source *</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { key: 'dept', label: '🏛️ Department Channel', desc: 'Live on @ukdirayurved — staff ko seedha dikhega', color: 'emerald' },
                      { key: 'personal', label: '📺 Apna YouTube Link', desc: 'Kisi bhi YouTube live ka link paste karo', color: 'red' },
                      { key: 'meeting', label: '💻 Meeting Link', desc: 'Teams / Google Meet / Zoom / Jio Meet', color: 'blue' },
                    ].map(opt => (
                      <button key={opt.key} type="button"
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            stream_source: opt.key,
                            youtube_url: opt.key === 'dept' ? 'https://www.youtube.com/@ukdirayurved' : ''
                          }));
                        }}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          form.stream_source === opt.key
                            ? opt.color === 'emerald' ? 'border-emerald-500 bg-emerald-50'
                              : opt.color === 'red' ? 'border-red-400 bg-red-50'
                              : 'border-blue-400 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                        }`}>
                        <p className={`text-sm font-bold ${
                          form.stream_source === opt.key
                            ? opt.color === 'emerald' ? 'text-emerald-700'
                              : opt.color === 'red' ? 'text-red-700'
                              : 'text-blue-700'
                            : 'text-slate-600'
                        }`}>{opt.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL Field — based on source */}
                {form.stream_source === 'dept' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-emerald-700 font-bold text-sm">Department Channel Selected</p>
                      <p className="text-emerald-600 text-xs">youtube.com/@ukdirayurved — Staff ko channel pe redirect hoga</p>
                    </div>
                  </div>
                )}

                {form.stream_source === 'personal' && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">YouTube Live URL *</label>
                    <input type="url" value={form.youtube_url}
                      onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
                      placeholder="https://youtube.com/live/xxxx ya https://youtu.be/xxxx"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 font-mono" />
                    {form.youtube_url && (
                      <p className={`text-xs mt-1 ${extractYouTubeId(form.youtube_url) ? 'text-green-600' : 'text-red-500'}`}>
                        {extractYouTubeId(form.youtube_url) ? '✅ Valid YouTube URL — app mein embedded player dikhega' : '❌ Valid YouTube URL nahi'}
                      </p>
                    )}
                  </div>
                )}

                {form.stream_source === 'meeting' && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Meeting Link *</label>
                    <input type="url" value={form.youtube_url}
                      onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
                      placeholder="Teams / Google Meet / Zoom / Jio Meet link"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono" />
                    {form.youtube_url && (
                      <div className="mt-1 text-xs">
                        {getUrlType(form.youtube_url) === 'teams' && <p className="text-blue-600">🟦 Microsoft Teams — "Join on Teams" button dikhega</p>}
                        {getUrlType(form.youtube_url) === 'meet' && <p className="text-green-600">🟢 Google Meet — "Join on Meet" button dikhega</p>}
                        {getUrlType(form.youtube_url) === 'zoom' && <p className="text-blue-600">🔵 Zoom — "Join on Zoom" button dikhega</p>}
                        {getUrlType(form.youtube_url) === 'other' && form.youtube_url.startsWith('http') && <p className="text-slate-500">🔗 Meeting link — "Join Meeting" button dikhega</p>}
                      </div>
                    )}
                  </div>
                )}
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Description (Optional)</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Stream ke baare mein kuch batao..." rows={2}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Schedule Date & Time (Optional)</label>
                    <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                    <p className="text-slate-400 text-xs mt-1">Agar schedule daalo to "Upcoming" tab mein countdown ke saath dikhega</p>
                  </div>
                  <div onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.is_active ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`relative w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-red-600' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_active ? 'left-7' : 'left-1'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${form.is_active ? 'text-red-700' : 'text-slate-600'}`}>
                        {form.is_active ? '🔴 Abhi Live Karo' : 'Save as Draft / Upcoming'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {form.is_active ? 'Sabko abhi dikhega — Live tab mein' : 'Schedule ke hisaab se ya manually live karo baad mein'}
                      </p>
                    </div>
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-red-600 text-sm">{error}</p></div>}
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => { setShowForm(false); resetForm(); }}
                      className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : 'Save Karo'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Player Modal */}
        <AnimatePresence>
          {watchingStream && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
              onClick={() => setWatchingStream(null)}>
              <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
                className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                <div className="bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      {watchingStream.is_active && (
                        <div className="flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-full">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          <span className="text-white text-xs font-bold">LIVE</span>
                        </div>
                      )}
                      <h3 className="text-white font-semibold text-sm">{watchingStream.title}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={watchingStream.youtube_url} target="_blank" rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1">
                        <ExternalLink size={14} />YouTube pe kholo
                      </a>
                      <button onClick={() => setWatchingStream(null)} className="text-slate-400 hover:text-white transition-colors text-lg">✕</button>
                    </div>
                  </div>
                  <div className="aspect-video w-full bg-black">
                    {getEmbedUrl(watchingStream.youtube_url) ? (
                      <iframe src={getEmbedUrl(watchingStream.youtube_url)!} className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen title={watchingStream.title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-slate-500">Invalid YouTube URL</p>
                      </div>
                    )}
                  </div>
                  {watchingStream.description && (
                    <div className="px-5 py-3 border-t border-white/10">
                      <p className="text-slate-300 text-sm">{watchingStream.description}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

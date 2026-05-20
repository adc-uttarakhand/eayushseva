import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wind, Flame, Leaf, Scale, User, Phone, Calendar,
  ChevronRight, ChevronLeft, RotateCcw, Save,
  CheckCircle, Clock, Eye, Loader2, X, Download,
  Languages, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Questions (same as original app) ─────────────────────────────────────────
const QUES = [
  { id:1, en:"Hair", hi:"बाल", opts:[
    {d:"v", en:"Dry, scanty or sparse hair", hi:"सूखे, कम या विरले बाल"},
    {d:"p", en:"Average quantity, tendency of premature greying", hi:"सामान्य मात्रा, असमय सफेद होने की प्रवृत्ति"},
    {d:"k", en:"Thick, greasy and oily hair", hi:"घने, चिकने और तैलीय बाल"},
  ]},
  { id:2, en:"Skin", hi:"त्वचा", opts:[
    {d:"v", en:"Dry and rough skin", hi:"रूखी और खुरदुरी त्वचा"},
    {d:"p", en:"Tender, sensitive and slightly oily", hi:"कोमल, संवेदनशील और हल्की तैलीय त्वचा"},
    {d:"k", en:"Moist, strong and oily skin", hi:"नम, मजबूत और चिकनी त्वचा"},
  ]},
  { id:3, en:"Body Frame / Built", hi:"शारीरिक गठन", opts:[
    {d:"v", en:"Thin and light body frame", hi:"पतला और हल्का शरीर"},
    {d:"p", en:"Normally / medium developed frame", hi:"सामान्य और मध्यम गठन"},
    {d:"k", en:"Well developed, broad and strong body", hi:"सुगठित, चौड़ा और मजबूत शरीर"},
  ]},
  { id:4, en:"Weight", hi:"वजन", opts:[
    {d:"v", en:"Very difficult to gain weight", hi:"वजन बढ़ाना बहुत कठिन"},
    {d:"p", en:"Normal weight, easy to maintain", hi:"सामान्य वजन, बनाए रखना आसान"},
    {d:"k", en:"Weight increases quickly and easily", hi:"वजन जल्दी और आसानी से बढ़ता है"},
  ]},
  { id:5, en:"Physical Strength", hi:"शारीरिक शक्ति", opts:[
    {d:"v", en:"Less than average physical strength", hi:"औसत से कम शारीरिक शक्ति"},
    {d:"p", en:"Average physical strength", hi:"औसत शारीरिक शक्ति"},
    {d:"k", en:"Strong — more than average strength", hi:"मजबूत — औसत से अधिक शक्ति"},
  ]},
  { id:6, en:"Hunger / Appetite", hi:"भूख", opts:[
    {d:"v", en:"Highly variable — sometimes low, sometimes very high", hi:"अनियमित — कभी बहुत कम, कभी बहुत अधिक"},
    {d:"p", en:"Sharp hunger — must eat immediately when hungry", hi:"तीव्र भूख — भूख लगते ही तुरंत खाना चाहिए"},
    {d:"k", en:"Consistent hunger — can easily control and wait", hi:"नियमित भूख — भूख को नियंत्रित करना आसान"},
  ]},
  { id:7, en:"Food Preference", hi:"भोजन की पसंद", opts:[
    {d:"v", en:"Hot food items first — Tea, Coffee, Halwa", hi:"गर्म चीजें पहली पसंद — चाय, कॉफी, हलवा"},
    {d:"p", en:"Cold items first — Ice Cream, Shakes, Juices", hi:"ठंडी चीजें पहली पसंद — आइसक्रीम, शेक, जूस"},
    {d:"k", en:"Hot & dry things — Samosa, Poori, Kachori, Fries", hi:"गर्म और सूखी चीजें — समोसा, पूरी, कचौरी, तली हुई चीजें"},
  ]},
  { id:8, en:"Eating Speed", hi:"खाने की गति", opts:[
    {d:"v", en:"Extremely fast eater", hi:"बहुत तेजी से खाते हैं"},
    {d:"p", en:"Normal pace — 10 to 15 minutes per meal", hi:"सामान्य गति — 10 से 15 मिनट प्रति भोजन"},
    {d:"k", en:"Very slow eater, takes a long time", hi:"बहुत धीरे खाते हैं, काफी समय लगता है"},
  ]},
  { id:9, en:"Stool / Bowel Habit", hi:"मल / पाचन क्रिया", opts:[
    {d:"v", en:"Dry and hard stool, prone to constipation", hi:"सूखा और कठोर मल, कब्ज की प्रवृत्ति"},
    {d:"p", en:"Multiple times a day, loose or soft consistency", hi:"दिन में कई बार, मल पतला या नरम"},
    {d:"k", en:"Well-formed and regular — once or twice a day", hi:"सुगठित और नियमित — दिन में 1-2 बार"},
  ]},
  { id:10, en:"Weather Tolerance", hi:"मौसम सहनशीलता", opts:[
    {d:"v", en:"Cannot tolerate cold and dry weather", hi:"ठंडा और सूखा मौसम सहन नहीं होता"},
    {d:"p", en:"Cannot tolerate hot weather, sweats excessively", hi:"गर्म मौसम सहन नहीं होता, अधिक पसीना आता है"},
    {d:"k", en:"Cannot tolerate cold and humid environment", hi:"ठंडा और नम वातावरण सहन नहीं होता"},
  ]},
  { id:11, en:"Concentration", hi:"एकाग्रता", opts:[
    {d:"v", en:"Very poor concentration — easily distracted", hi:"एकाग्रता बहुत कम — आसानी से विचलित हो जाते हैं"},
    {d:"p", en:"Mind stays focused and concentrated for a long time", hi:"मन लंबे समय तक केंद्रित और एकाग्र रहता है"},
    {d:"k", en:"Stable focus — can shift subjects smoothly at will", hi:"स्थिर एकाग्रता — इच्छानुसार विषय बदल सकते हैं"},
  ]},
  { id:12, en:"Walking Speed / Gait", hi:"चलने की गति", opts:[
    {d:"v", en:"Walk fast — brisk and quick steps", hi:"तेज चलते हैं — फुर्तीले कदम"},
    {d:"p", en:"Walk at an average, purposeful pace", hi:"सामान्य और उद्देश्यपूर्ण गति से चलते हैं"},
    {d:"k", en:"Walk slowly with steady, heavy steps", hi:"धीरे और स्थिर, भारी कदमों से चलते हैं"},
  ]},
  { id:13, en:"Memory / Retention", hi:"स्मृति / याददाश्त", opts:[
    {d:"v", en:"Memorise quickly but forget quickly too", hi:"जल्दी याद होता है, लेकिन जल्दी भूल भी जाते हैं"},
    {d:"p", en:"Very sharp and strong long-term memory", hi:"बहुत तेज और मजबूत दीर्घकालिक स्मृति"},
    {d:"k", en:"Takes time to memorise, but retains for very long", hi:"याद होने में समय लगता है, पर लंबे समय तक याद रहता है"},
  ]},
  { id:14, en:"Sleep", hi:"नींद", opts:[
    {d:"v", en:"Difficulty sleeping, wakes up frequently at night", hi:"नींद आने में कठिनाई, रात में बार-बार जागते हैं"},
    {d:"p", en:"Sleeps well and wakes up at the right time", hi:"अच्छी नींद आती है और सही समय पर जागते हैं"},
    {d:"k", en:"Calm, deep and long sleep — hard to wake up", hi:"शांत, गहरी और लंबी नींद — जागना मुश्किल होता है"},
  ]},
  { id:15, en:"Temperament / Mind", hi:"स्वभाव / मन", opts:[
    {d:"v", en:"Restless and fast-paced — cannot stay in one place", hi:"चंचल और तेज गति — एक स्थान पर नहीं टिकते"},
    {d:"p", en:"Understands deeply — sharp and analytical intellect", hi:"गहरी समझ — तीव्र और विश्लेषणात्मक बुद्धि"},
    {d:"k", en:"Steady, calm and cool-minded temperament", hi:"स्थिर, शांत और ठंडे दिमाग वाला स्वभाव"},
  ]},
];

// ── Prakriti Results ──────────────────────────────────────────────────────────
const PR: Record<string, any> = {
  vataj:       { hi:"वातज प्रकृति", en:"Vataj Prakriti", emoji:"🌬️", color:"#7C3AED", bg:"#F5F0FF", border:"#7C3AED",
    descEn:"Your constitution is dominated by Vata dosha, governed by Air and Ether. You are creative, enthusiastic, and quick in thought and action. A regular daily routine with warm nourishing foods and adequate rest is especially beneficial.",
    descHi:"आपकी प्रकृति में वात दोष की प्रधानता है। आप रचनात्मक, उत्साही और शीघ्र विचारशील हैं। नियमित दिनचर्या, गर्म एवं पोषक भोजन और पर्याप्त आराम आपके लिए विशेष हितकारी है।" },
  pittaj:      { hi:"पित्तज प्रकृति", en:"Pittaj Prakriti", emoji:"🔥", color:"#D97706", bg:"#FEF9EC", border:"#D97706",
    descEn:"Your constitution is dominated by Pitta dosha, governed by Fire and Water. You are intelligent, focused, and driven. Avoid excessive heat and spicy foods; prefer cooling, sweet-tasting foods.",
    descHi:"आपकी प्रकृति में पित्त दोष की प्रधानता है। आप बुद्धिमान, केंद्रित और लक्ष्य-प्रेरित हैं। अत्यधिक गर्मी व मसालेदार भोजन से बचें और ठंडे, मीठे आहार को प्राथमिकता दें।" },
  kaphaj:      { hi:"कफज प्रकृति", en:"Kaphaj Prakriti", emoji:"🌿", color:"#059669", bg:"#EDFAF4", border:"#059669",
    descEn:"Your constitution is dominated by Kapha dosha, governed by Earth and Water. You are calm, strong, and nurturing. Light, warm, and mildly spiced foods along with regular exercise help balance Kapha.",
    descHi:"आपकी प्रकृति में कफ दोष की प्रधानता है। आप शांत, मजबूत और देखभाल करने वाले हैं। हल्का, गर्म एवं हल्का मसालेदार भोजन तथा नियमित व्यायाम कफ को संतुलित रखता है।" },
  vataPittaj:  { hi:"वात-पित्तज प्रकृति", en:"Vata-Pittaj Prakriti", emoji:"🌬️🔥", color:"#EA580C", bg:"#FFF8F2", border:"#EA580C",
    descEn:"You have a dual Vata-Pitta constitution — quick, intelligent, and highly driven. Balance both doshas by avoiding extremes of temperature, maintaining a regular routine, and choosing warm but not overly spicy foods.",
    descHi:"आपकी द्वंद्व वात-पित्त प्रकृति है। तापमान की चरम स्थितियों से बचें, नियमित दिनचर्या अपनाएं और गर्म परंतु कम मसालेदार भोजन लें।" },
  vataKaphaj:  { hi:"वात-कफज प्रकृति", en:"Vata-Kaphaj Prakriti", emoji:"🌬️🌿", color:"#2563EB", bg:"#EFF6FF", border:"#2563EB",
    descEn:"You have a dual Vata-Kapha constitution — combining Vata's creativity with Kapha's stability. Choose warm, light, and mildly spiced foods. Regular exercise and a consistent daily routine are especially beneficial.",
    descHi:"आपकी द्वंद्व वात-कफ प्रकृति है। गर्म, हल्का और हल्का मसालेदार भोजन लें। नियमित व्यायाम और नियमित दिनचर्या विशेष हितकारी है।" },
  pittaKaphaj: { hi:"पित्त-कफज प्रकृति", en:"Pitta-Kaphaj Prakriti", emoji:"🔥🌿", color:"#16A34A", bg:"#F2FDF8", border:"#16A34A",
    descEn:"You have a dual Pitta-Kapha constitution — blessed with strength, intelligence, and endurance. Stay cool, avoid heavy and oily foods, and engage in regular physical activity.",
    descHi:"आपकी द्वंद्व पित्त-कफ प्रकृति है। ठंडे रहें, भारी व तैलीय भोजन से बचें और नियमित शारीरिक गतिविधि करें।" },
  samaPrakriti:{ hi:"सम प्रकृति", en:"Sama Prakriti", emoji:"⚖️", color:"#CA8A04", bg:"#FFFDE8", border:"#CA8A04",
    descEn:"You are blessed with Sama Prakriti — a rare constitution where all three doshas are in perfect equilibrium. This is considered the most ideal prakriti in Ayurveda. Maintain this balance through a wholesome lifestyle.",
    descHi:"आप दुर्लभ सम प्रकृति के धनी हैं — तीनों दोष समान अनुपात में संतुलित हैं। संतुलित जीवनशैली से इस श्रेष्ठ प्रकृति को बनाए रखें।" },
};

// ── Calc Function ─────────────────────────────────────────────────────────────
function calcPrakriti(v: number, p: number, k: number): string {
  const mx = Math.max(v, p, k);
  const tol = 2;
  const near = (a: number) => mx - a <= tol;
  const nV = near(v), nP = near(p), nK = near(k);
  if (nV && nP && nK) return 'samaPrakriti';
  if (nV && nP) return 'vataPittaj';
  if (nV && nK) return 'vataKaphaj';
  if (nP && nK) return 'pittaKaphaj';
  if (mx === v) return 'vataj';
  if (mx === p) return 'pittaj';
  return 'kaphaj';
}

// ── PDF Download Links (same as original app) ────────────────────────────────
const PDF_URLS: Record<string, string> = {
  vataj:        'https://drive.google.com/uc?export=download&id=1q-mwxWO3M_djayk6cCptIxNWA_sW5lot',
  pittaj:       'https://drive.google.com/uc?export=download&id=1zghhSaCBCzCCTIAmgvLlRB9Fmh4vRg10',
  kaphaj:       'https://drive.google.com/uc?export=download&id=1BpJH2_jPCD94yl52wNNQZaU_8FAqxGpi',
  vataPittaj:   'https://drive.google.com/uc?export=download&id=1vlEsY1QsvU55Z0Ihur0-2mf4UmKWCy1T',
  vataKaphaj:   'https://drive.google.com/uc?export=download&id=1NyA20Lu9LqcJtgzlEtzDKTj7TKLwiCU5',
  pittaKaphaj:  'https://drive.google.com/uc?export=download&id=1ynfKiAWTb9T-DML7Pgz89LZV2C0spN20',
  samaPrakriti: 'https://drive.google.com/uc?export=download&id=1b0HruvI8cbrcZRODZ_4mvGi92vOkh5Oj',
};

function buildWhatsAppLink(patientName: string, patientMobile: string, prakritiKey: string, lang: 'en' | 'hi'): string {
  const pr = PR[prakritiKey];
  const prakritiName = lang === 'hi' ? pr.hi : pr.en;
  const pdfLink = PDF_URLS[prakritiKey] || '';
  const msg = lang === 'hi'
    ? `🌿 *प्रकृति परीक्षण परिणाम*\n\nनमस्ते ${patientName} जी,\n\nआयुर्वेदिक एवं यूनानी सेवा विभाग, उत्तराखण्ड की तरफ से आपका प्रकृति परीक्षण पूर्ण हुआ।\n\n✅ *आपकी प्रकृति: ${prakritiName}*\n\n📥 आपकी व्यक्तिगत आहार एवं जीवनशैली मार्गदर्शिका डाउनलोड करें:\n${pdfLink}\n\n🌐 Prakriti Pareekshan: https://prakrutipareekshan.netlify.app\n\n— Directorate of Ayurvedic & Unani Services, Uttarakhand`
    : `🌿 *Prakriti Pareekshan Result*\n\nDear ${patientName},\n\nYour Ayurvedic Body Type Analysis by Directorate of Ayurvedic & Unani Services, Uttarakhand is complete.\n\n✅ *Your Prakriti: ${prakritiName}*\n\n📥 Download your personalised Diet & Lifestyle Guide:\n${pdfLink}\n\n🌐 Take the assessment: https://prakrutipareekshan.netlify.app\n\n— Directorate of Ayurvedic & Unani Services, Govt. of Uttarakhand`;

  const mobile = '91' + patientMobile.replace(/\D/g, '');
  return `https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`;
}
export default function PrakritiPareekshan({ session }: { session: any }) {
  const [view, setView] = useState<'new' | 'history'>('new');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [step, setStep] = useState<'patient' | 'questions' | 'result'>('patient');
  const [patient, setPatient] = useState({ name: '', age: '', gender: '', mobile: '' });
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [scores, setScores] = useState({ v: 0, p: 0, k: 0 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const t = (en: string, hi: string) => lang === 'hi' ? hi : en;

  const hospitalId = session?.activeHospitalId || session?.hospitalId || session?.id;

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('prakriti_records')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('recorded_at', { ascending: false })
      .limit(100);
    setRecords(data || []);
    setLoadingHistory(false);
  }, [hospitalId]);

  useEffect(() => {
    if (view === 'history') fetchHistory();
  }, [view, fetchHistory]);

  const handleAnswer = (qId: number, d: string) => {
    setAnswers(prev => ({ ...prev, [qId]: d }));
  };

  const handleNext = () => {
    if (currentQ < QUES.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      // Calculate result
      let v = 0, p = 0, k = 0;
      QUES.forEach(q => {
        const ans = answers[q.id];
        if (ans === 'v') v++;
        if (ans === 'p') p++;
        if (ans === 'k') k++;
      });
      setScores({ v, p, k });
      setResult(calcPrakriti(v, p, k));
      setStep('result');
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    setError('');
    try {
      const pr = PR[result];
      await supabase.from('prakriti_records').insert({
        hospital_id: hospitalId,
        recorded_by: session?.name || session?.id,
        recorded_by_id: session?.id,
        patient_name: patient.name,
        patient_age: patient.age,
        patient_gender: patient.gender,
        patient_mobile: patient.mobile,
        vata_score: scores.v,
        pitta_score: scores.p,
        kapha_score: scores.k,
        prakriti_result: result,
        prakriti_detail: pr?.en || result,
      });
      setSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep('patient');
    setPatient({ name: '', age: '', gender: '', mobile: '' });
    setAnswers({});
    setCurrentQ(0);
    setResult(null);
    setScores({ v: 0, p: 0, k: 0 });
    setSaved(false);
    setError('');
  };

  const pct = Math.round(((currentQ + 1) / 15) * 100);
  const q = QUES[currentQ];
  const pr = result ? PR[result] : null;

  const filteredRecords = records.filter(r =>
    !searchQuery || r.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.patient_mobile?.includes(searchQuery) || r.prakriti_detail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const prakritiCounts = records.reduce((acc: Record<string, number>, r) => {
    acc[r.prakriti_result] = (acc[r.prakriti_result] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-emerald-50/20 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 text-2xl">
              ⚕️
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {t('Prakriti Pareekshan', 'प्रकृति परीक्षण')}
              </h1>
              <p className="text-slate-400 text-xs">{t('Ayurvedic Body Type Analysis', 'आयुर्वेदिक शरीर प्रकृति विश्लेषण')}</p>
            </div>
          </div>
          {/* Lang toggle */}
          <button onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Languages size={15} />
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1.5 mb-6 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm">
          <button onClick={() => setView('new')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === 'new' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <User size={15} />{t('New Assessment', 'नया परीक्षण')}
          </button>
          <button onClick={() => setView('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === 'history' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Clock size={15} />{t('Records', 'रिकॉर्ड')}
            {records.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${view === 'history' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                {records.length}
              </span>
            )}
          </button>
        </div>

        {/* ── NEW ASSESSMENT ─────────────────────────────────────────────────── */}
        {view === 'new' && (
          <>
            {/* STEP 1: Patient Details */}
            {step === 'patient' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5">
                  <h2 className="text-white font-bold text-lg">{t('Patient Details', 'रोगी का विवरण')}</h2>
                  <p className="text-amber-100 text-xs mt-0.5">{t('Step 1 of 3 — Enter patient information', 'चरण 1/3 — रोगी की जानकारी भरें')}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      {t('Patient Name *', 'रोगी का नाम *')}
                    </label>
                    <input type="text" value={patient.name} onChange={e => setPatient(p => ({ ...p, name: e.target.value }))}
                      placeholder={t('Full name', 'पूरा नाम')}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{t('Age', 'आयु')}</label>
                      <input type="number" value={patient.age} onChange={e => setPatient(p => ({ ...p, age: e.target.value }))}
                        placeholder="e.g. 35" min={1} max={120}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{t('Gender', 'लिंग')}</label>
                      <select value={patient.gender} onChange={e => setPatient(p => ({ ...p, gender: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400">
                        <option value="">{t('Select', 'चुनें')}</option>
                        <option value="Male">{t('Male', 'पुरुष')}</option>
                        <option value="Female">{t('Female', 'महिला')}</option>
                        <option value="Other">{t('Other', 'अन्य')}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{t('Mobile Number', 'मोबाइल नंबर')}</label>
                    <input type="tel" value={patient.mobile} onChange={e => setPatient(p => ({ ...p, mobile: e.target.value }))}
                      placeholder="10-digit mobile"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <button
                    onClick={() => {
                      if (!patient.name.trim()) { setError(t('Patient name is required', 'रोगी का नाम आवश्यक है')); return; }
                      setError('');
                      setStep('questions');
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-amber-200 flex items-center justify-center gap-2">
                    {t('Start Assessment', 'परीक्षण शुरू करें')} <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Questions */}
            {step === 'questions' && (
              <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Progress */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-white text-xs font-semibold">
                      {t(`Question ${currentQ + 1} of 15`, `प्रश्न ${currentQ + 1}/15`)}
                    </p>
                    <p className="text-amber-100 text-xs">{pct}% {t('complete', 'पूर्ण')}</p>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-white rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>

                <div className="p-6">
                  {/* Patient info bar */}
                  <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-2 mb-5">
                    <User size={14} className="text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700">{patient.name}</span>
                    {patient.age && <span className="text-xs text-amber-500">• {patient.age} yrs</span>}
                    {patient.gender && <span className="text-xs text-amber-500">• {patient.gender}</span>}
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mb-5">
                    {t(q.en, q.hi)}
                  </h3>

                  <div className="space-y-3">
                    {q.opts.map((opt, i) => {
                      const selected = answers[q.id] === opt.d;
                      const colors = ['#7C3AED', '#D97706', '#059669'];
                      const bgs = ['#F5F0FF', '#FEF9EC', '#EDFAF4'];
                      const borders = ['#7C3AED', '#D97706', '#059669'];
                      return (
                        <button key={i} onClick={() => handleAnswer(q.id, opt.d)}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selected ? 'shadow-md' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}`}
                          style={selected ? { borderColor: borders[i], backgroundColor: bgs[i] } : {}}>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                              style={selected ? { borderColor: colors[i], backgroundColor: colors[i] } : { borderColor: '#CBD5E1' }}>
                              {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{t(opt.en, opt.hi)}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { if (currentQ > 0) setCurrentQ(q => q - 1); else setStep('patient'); }}
                      className="flex items-center gap-2 px-5 py-3 border border-slate-200 rounded-2xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                      <ChevronLeft size={16} />{t('Back', 'पीछे')}
                    </button>
                    <button onClick={handleNext} disabled={!answers[q.id]}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-200">
                      {currentQ < 14 ? <>{t('Next', 'अगला')} <ChevronRight size={16} /></> : <>{t('View Result', 'परिणाम देखें')} <ChevronRight size={16} /></>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Result */}
            {step === 'result' && pr && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="space-y-4">
                {/* Result Card */}
                <div className="bg-white rounded-3xl border-2 overflow-hidden shadow-lg"
                  style={{ borderColor: pr.border }}>
                  <div className="px-6 py-5 text-center" style={{ backgroundColor: pr.bg }}>
                    <div className="text-5xl mb-2">{pr.emoji}</div>
                    <h2 className="text-2xl font-bold" style={{ color: pr.color }}>{t(pr.en, pr.hi)}</h2>
                    <p className="text-slate-500 text-sm mt-1">{patient.name} • {patient.age && `${patient.age} yrs •`} {patient.gender}</p>
                  </div>

                  {/* Dosha scores */}
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t('Dosha Scores', 'दोष स्कोर')}</p>
                    {[
                      { label: t('Vata', 'वात'), score: scores.v, color: '#7C3AED', emoji: '🌬️' },
                      { label: t('Pitta', 'पित्त'), score: scores.p, color: '#D97706', emoji: '🔥' },
                      { label: t('Kapha', 'कफ'), score: scores.k, color: '#059669', emoji: '🌿' },
                    ].map(d => (
                      <div key={d.label} className="mb-3">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-600">{d.emoji} {d.label}</span>
                          <span className="text-sm font-bold" style={{ color: d.color }}>{d.score}/15 ({((d.score/15)*100).toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: d.color }}
                            initial={{ width: 0 }} animate={{ width: `${(d.score/15)*100}%` }} transition={{ duration: 0.6 }} />
                        </div>
                      </div>
                    ))}

                    {/* Description */}
                    <div className="mt-4 p-4 rounded-2xl" style={{ backgroundColor: pr.bg }}>
                      <p className="text-sm text-slate-600 leading-relaxed">{t(pr.descEn, pr.descHi)}</p>
                    </div>

                    {/* PDF Download & WhatsApp */}
                    <div className="flex gap-3 mt-4">
                      <a href={PDF_URLS[result!]} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-bold text-sm transition-all hover:opacity-80"
                        style={{ borderColor: pr.border, color: pr.color, backgroundColor: pr.bg }}>
                        <Download size={16} />
                        {t('Download PDF Guide', 'PDF गाइड डाउनलोड करें')}
                      </a>
                      {patient.mobile && (
                        <a href={buildWhatsAppLink(patient.name, patient.mobile, result!, lang)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-green-500 text-white hover:bg-green-600 transition-colors shadow-md shadow-green-200">
                          <span className="text-base">📲</span>
                          {t('Send on WhatsApp', 'WhatsApp पर भेजें')}
                        </a>
                      )}
                    </div>

                    {/* Save & Reset */}
                    <div className="flex gap-3 mt-5">
                      <button onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-2xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                        <RotateCcw size={15} />{t('New', 'नया')}
                      </button>
                      {!saved ? (
                        <button onClick={handleSave} disabled={saving}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200 disabled:opacity-50">
                          {saving ? <><Loader2 size={16} className="animate-spin" />{t('Saving...', 'सहेजा जा रहा है...')}</> : <><Save size={16} />{t('Save Record', 'रिकॉर्ड सहेजें')}</>}
                        </button>
                      ) : (
                        <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-100 text-green-700 font-bold rounded-2xl">
                          <CheckCircle size={16} />{t('Saved Successfully!', 'सफलतापूर्वक सहेजा गया!')}
                        </div>
                      )}
                    </div>
                    {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* ── HISTORY ──────────────────────────────────────────────────────── */}
        {view === 'history' && (
          <div>
            {/* Stats */}
            {records.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { key: 'vataj', label: t('Vata', 'वात'), emoji: '🌬️', color: '#7C3AED' },
                  { key: 'pittaj', label: t('Pitta', 'पित्त'), emoji: '🔥', color: '#D97706' },
                  { key: 'kaphaj', label: t('Kapha', 'कफ'), emoji: '🌿', color: '#059669' },
                  { key: 'samaPrakriti', label: t('Sama', 'सम'), emoji: '⚖️', color: '#CA8A04' },
                ].map(s => (
                  <div key={s.key} className="bg-white rounded-2xl border border-slate-200 p-3 text-center shadow-sm">
                    <p className="text-xl">{s.emoji}</p>
                    <p className="text-lg font-bold" style={{ color: s.color }}>{prakritiCounts[s.key] || 0}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('Search by name or mobile...', 'नाम या मोबाइल से खोजें...')}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white" />
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={24} className="text-amber-500 animate-spin" /></div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-4xl mb-3">⚕️</p>
                <p className="text-slate-400 font-medium">{t('No records found', 'कोई रिकॉर्ड नहीं मिला')}</p>
                <button onClick={() => setView('new')} className="mt-3 text-amber-600 text-sm font-semibold hover:underline">
                  {t('Start first assessment →', 'पहला परीक्षण शुरू करें →')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecords.map(record => {
                  const prInfo = PR[record.prakriti_result];
                  return (
                    <div key={record.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl flex-shrink-0">{prInfo?.emoji || '⚕️'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">{record.patient_name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            {record.patient_age && <span>{record.patient_age} yrs</span>}
                            {record.patient_gender && <span>• {record.patient_gender}</span>}
                            {record.patient_mobile && <span>• {record.patient_mobile}</span>}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ color: prInfo?.color, backgroundColor: prInfo?.bg }}>
                            {lang === 'hi' ? prInfo?.hi : prInfo?.en}
                          </p>
                          <p className="text-xs text-slate-300 mt-1">
                            {new Date(record.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {/* PDF & WhatsApp for history */}
                      <div className="flex gap-2 mt-3">
                        <a href={PDF_URLS[record.prakriti_result]} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all hover:opacity-80"
                          style={{ borderColor: prInfo?.border, color: prInfo?.color, backgroundColor: prInfo?.bg }}>
                          <Download size={13} />{t('PDF Guide', 'PDF गाइड')}
                        </a>
                        {record.patient_mobile && (
                          <a href={buildWhatsAppLink(record.patient_name, record.patient_mobile, record.prakriti_result, lang)}
                            target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors">
                            📲 {t('WhatsApp', 'WhatsApp')}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

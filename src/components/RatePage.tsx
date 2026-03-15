import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Star, ArrowRight, Save, Loader2, User as UserIcon, MapPin, Building2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Hospital {
  sr_no: number;
  facility_name: string;
  type: string;
  system: string;
  location: string;
  district: string;
  taluka: string;
  pincode: string;
  block: string;
  latitude: number;
  longitude: number;
  region_indicator: string;
  operational_status: string;
  ipd_services: string;
  incharge_name: string;
  mobile: string;
  email: string;
  status: string;
  hospital_id: string;
  doctor_id: string;
  password?: string;
}

interface RatePageProps {
  hospitals: Hospital[];
  userLocation: { lat: number; lng: number } | null;
  setActiveTab: (tab: any) => void;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

export default function RatePage({ hospitals, userLocation, setActiveTab, calculateDistance }: RatePageProps) {
  const [step, setStep] = useState<'select' | 'rate_hospital' | 'submitted' | 'rate_doctor'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [hospitalDoctors, setHospitalDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  
  const [hospitalForm, setHospitalForm] = useState({
    name: '',
    mobile: '',
    rating: 5,
    comments: ''
  });

  const [doctorForm, setDoctorForm] = useState({
    name: '',
    mobile: '',
    rating: 5,
    comments: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const nearbyHospitals = userLocation ? hospitals
    .map(h => ({
      ...h,
      distance: h.latitude && h.longitude ? calculateDistance(userLocation.lat, userLocation.lng, h.latitude, h.longitude) : Infinity
    }))
    .filter(h => h.distance !== Infinity)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3) : [];

  const searchResults = searchQuery.length > 2 ? hospitals.filter(h => 
    h.facility_name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5) : [];

  const handleSelectHospital = async (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setStep('rate_hospital');
    // Fetch doctors for this hospital
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('hospital_id', hospital.hospital_id)
      .in('role', ['Doctor', 'Senior Medical Officer', 'Medical Officer']);
    setHospitalDoctors(data || []);
  };

  const handleHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospital) return;
    if (hospitalForm.mobile.length !== 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert([{
        hospital_id: selectedHospital.hospital_id,
        reviewer_name: hospitalForm.name,
        reviewer_contact: hospitalForm.mobile,
        rating: hospitalForm.rating,
        comments: hospitalForm.comments,
        created_at: new Date().toISOString()
      }]);

      if (error) {
        console.error("Error submitting review:", error.message);
        throw error;
      }
      
      setStep('submitted');
      // Pre-fill doctor form
      setDoctorForm(prev => ({ ...prev, name: hospitalForm.name, mobile: hospitalForm.mobile }));
    } catch (err: any) {
      console.error("Error submitting review:", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospital || !selectedDoctorId) return;
    if (doctorForm.mobile.length !== 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert([{
        hospital_id: selectedHospital.hospital_id,
        doctor_id: selectedDoctorId,
        reviewer_name: doctorForm.name,
        reviewer_contact: doctorForm.mobile,
        rating: doctorForm.rating,
        comments: doctorForm.comments,
        created_at: new Date().toISOString()
      }]);

      if (error) {
        console.error("Error submitting review:", error.message);
        throw error;
      }
      alert("Thank you for your feedback!");
      setActiveTab('dashboard');
    } catch (err: any) {
      console.error("Error submitting review:", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="pt-24 px-4 sm:px-8 max-w-4xl mx-auto pb-40"
      >
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Public <span className="text-emerald-600">Rating Portal</span></h1>
            <p className="text-slate-500 mt-2 font-medium">Your feedback helps us improve healthcare in Uttarakhand.</p>
          </div>
          <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-white shadow-sm border border-gray-100 rounded-full hover:bg-slate-50 transition-all">
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        {/* Selection Step */}
        <div className="space-y-8">
          {!userLocation ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-4 animate-pulse">
                <MapPin size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Detecting Nearest Facilities</h3>
              <p className="text-slate-500 mt-2 max-w-xs">Please allow location access to see the hospitals closest to you.</p>
            </div>
          ) : nearbyHospitals.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 ml-2">
                <MapPin size={16} className="text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Nearest Facilities (GPS)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {nearbyHospitals.map(h => (
                  <button 
                    key={h.hospital_id}
                    onClick={() => handleSelectHospital(h)}
                    className="group relative overflow-hidden bg-white border border-gray-100 rounded-[2rem] p-6 hover:border-emerald-500 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 text-left"
                  >
                    <div className="absolute top-0 right-0 p-4">
                      <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                        {h.distance.toFixed(1)}km
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                      <Building2 size={24} />
                    </div>
                    <h4 className="font-bold text-slate-900 leading-tight mb-1">{h.facility_name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h.district}</p>
                    <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-xs">
                      <span>Rate Now</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative mt-8">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <Search className="text-slate-400" size={20} />
              <div className="w-px h-6 bg-gray-200" />
            </div>
            <input 
              type="text"
              placeholder="Search hospital by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-3xl py-6 pl-16 pr-6 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 text-lg font-medium shadow-sm placeholder:text-slate-300"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-2">Search Results</h3>
              <div className="grid grid-cols-1 gap-3">
                {searchResults.map(h => (
                  <button 
                    key={h.hospital_id}
                    onClick={() => handleSelectHospital(h)}
                    className="w-full text-left p-6 bg-white border border-gray-100 rounded-3xl hover:border-emerald-500 transition-all flex justify-between items-center group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{h.facility_name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{h.district} • {h.system}</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-600 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {/* Hospital Rating Modal */}
        {step === 'rate_hospital' && selectedHospital && (
          <motion.div 
            key="hospital-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6"
          >
            <div 
              onClick={() => setStep('select')}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 sm:p-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        src={`https://via.placeholder.com/200x200?text=Hospital`} 
                        alt="Hospital" 
                        className="w-20 h-20 rounded-2xl object-cover shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-xl shadow-sm">
                        <Building2 size={16} className="text-emerald-600" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Rating Facility</span>
                      <h3 className="text-2xl font-bold text-slate-900 leading-tight">{selectedHospital.facility_name}</h3>
                    </div>
                  </div>
                  <button onClick={() => setStep('select')} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleHospitalSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Your Name</label>
                      <input 
                        required
                        type="text"
                        value={hospitalForm.name}
                        onChange={e => setHospitalForm({...hospitalForm, name: e.target.value})}
                        className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                        placeholder="Full Name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Mobile Number</label>
                      <input 
                        required
                        type="tel"
                        pattern="[0-9]{10}"
                        value={hospitalForm.mobile}
                        onChange={e => setHospitalForm({...hospitalForm, mobile: e.target.value})}
                        className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                        placeholder="10-digit number"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Overall Experience</label>
                    <div className="flex gap-4 justify-center py-6 bg-slate-50 rounded-3xl border border-gray-50">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button 
                          key={s}
                          type="button"
                          onClick={() => setHospitalForm({...hospitalForm, rating: s})}
                          className="group relative p-1 transition-transform active:scale-90"
                        >
                          <Star 
                            size={44} 
                            className={`${hospitalForm.rating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} transition-colors duration-300`} 
                          />
                          {hospitalForm.rating === s && (
                            <motion.div layoutId="star-glow" className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Comments</label>
                    <textarea 
                      value={hospitalForm.comments}
                      onChange={e => setHospitalForm({...hospitalForm, comments: e.target.value})}
                      rows={3}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium resize-none"
                      placeholder="Share your experience..."
                    />
                  </div>

                  <button 
                    disabled={isSubmitting}
                    type="submit" 
                    className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl text-lg shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    Submit Rating
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Rating Submitted Modal */}
        {step === 'submitted' && (
          <motion.div 
            key="submitted-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          >
            <div 
              className="absolute inset-0 bg-emerald-600/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] p-10 text-center shadow-2xl"
            >
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-8 animate-bounce">
                <ShieldCheck size={48} />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-3">Rating Submitted!</h3>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                Thank you for rating <span className="text-slate-900 font-bold">{selectedHospital?.facility_name}</span>. Your feedback is valuable.
              </p>
              
              <div className="space-y-3">
                {hospitalDoctors.length > 0 ? (
                  <button 
                    onClick={() => setStep('rate_doctor')}
                    className="w-full bg-emerald-600 text-white font-bold py-5 rounded-2xl text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                  >
                    Rate the Doctor
                    <ArrowRight size={20} />
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl text-lg shadow-xl shadow-slate-200 hover:bg-black transition-all"
                  >
                    Done
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="w-full text-slate-400 font-bold py-3 text-sm hover:text-slate-600 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Doctor Rating Grid Modal */}
        {step === 'rate_doctor' && selectedHospital && (
          <motion.div 
            key="doctor-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1010] flex items-center justify-center p-4 sm:p-6"
          >
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setActiveTab('dashboard')}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 sm:p-10 border-b border-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Step 2: Specialist Rating</span>
                    <h3 className="text-3xl font-bold text-slate-900 leading-tight">Rate your Consultant</h3>
                    <p className="text-slate-500 font-medium mt-1">Select the doctor you consulted with at {selectedHospital.facility_name}</p>
                  </div>
                  <button onClick={() => setActiveTab('dashboard')} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 sm:p-10">
                {!selectedDoctorId ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hospitalDoctors.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className="group relative bg-slate-50 border border-gray-100 rounded-[2.5rem] p-6 hover:bg-white hover:border-emerald-500 hover:shadow-xl transition-all text-center"
                      >
                        <div className="relative w-24 h-24 mx-auto mb-4">
                          {doc.photograph_url ? (
                            <img src={doc.photograph_url} alt={doc.full_name} className="w-full h-full rounded-3xl object-cover shadow-lg group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                              <UserIcon size={40} />
                            </div>
                          )}
                          <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-xl shadow-md">
                            <div className="bg-emerald-500 w-3 h-3 rounded-full" />
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-emerald-600 transition-colors">{doc.full_name}</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">{doc.role}</p>
                        <div className="mt-6 py-2 px-4 bg-white rounded-xl border border-gray-100 text-emerald-600 font-bold text-xs group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          Rate Doctor
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="max-w-xl mx-auto">
                    <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2.5rem] border border-gray-100 mb-10">
                      <div className="relative">
                        {hospitalDoctors.find(d => d.id === selectedDoctorId)?.photograph_url ? (
                          <img src={hospitalDoctors.find(d => d.id === selectedDoctorId)?.photograph_url} alt="Doctor" className="w-20 h-20 rounded-2xl object-cover shadow-md" />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <UserIcon size={32} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Selected Specialist</span>
                        <h4 className="font-bold text-slate-900 text-xl leading-tight">{hospitalDoctors.find(d => d.id === selectedDoctorId)?.full_name}</h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{hospitalDoctors.find(d => d.id === selectedDoctorId)?.role}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedDoctorId('')} className="text-emerald-600 font-bold text-sm hover:underline px-4 py-2 bg-white rounded-xl shadow-sm">Change</button>
                    </div>

                    <form onSubmit={handleDoctorSubmit} className="space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 opacity-60">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Reviewer Name</label>
                          <input 
                            readOnly
                            type="text"
                            value={doctorForm.name}
                            className="w-full bg-white border border-gray-100 rounded-2xl py-3.5 px-5 font-medium cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-1.5 opacity-60">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Mobile Number</label>
                          <input 
                            readOnly
                            type="tel"
                            value={doctorForm.mobile}
                            className="w-full bg-white border border-gray-100 rounded-2xl py-3.5 px-5 font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Consultation Rating</label>
                        <div className="flex gap-4 justify-center py-6 bg-slate-50 rounded-3xl border border-gray-50">
                          {[1, 2, 3, 4, 5].map(s => (
                            <button 
                              key={s}
                              type="button"
                              onClick={() => setDoctorForm({...doctorForm, rating: s})}
                              className="group relative p-1 transition-transform active:scale-90"
                            >
                              <Star 
                                size={44} 
                                className={`${doctorForm.rating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} transition-colors duration-300`} 
                              />
                              {doctorForm.rating === s && (
                                <motion.div layoutId="doc-star-glow" className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Consultation Remarks</label>
                        <textarea 
                          value={doctorForm.comments}
                          onChange={e => setDoctorForm({...doctorForm, comments: e.target.value})}
                          rows={4}
                          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium resize-none"
                          placeholder="How was your consultation with the doctor?"
                        />
                      </div>

                      <button 
                        disabled={isSubmitting}
                        type="submit" 
                        className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl text-lg shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        Submit Doctor Review
                      </button>
                    </form>
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

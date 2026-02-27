import React, { useState, useEffect } from 'react';
import { Building2, Save, MapPin, Eye, EyeOff, Star, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HospitalProfileProps {
  hospitalDetails: any;
  onUpdate: () => void;
}

const SPECIAL_SERVICES = [
  'Panchakarma',
  'Kshar Sutra',
  'Ayurvedic Antenatal Care'
];

const CENTRES_OF_EXCELLENCE = [
  'Pain Management',
  'Pediatric Disorders',
  'Musculoskeletal Disorders',
  'Musculoskeletal and Anal Desorder',
  'NCD Reversal',
  'Kshar Karma',
  'Geriatric Disorders',
  'Mental Disorders',
  'Eye Disorders',
  'Pediatric Disorders and Gyanecological Disorders',
  'Anorectal Disorders',
  'Gyanecological Disorders'
];

export default function HospitalProfile({ hospitalDetails, onUpdate }: HospitalProfileProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    special_services: [] as string[],
    centre_of_excellence: '',
    latitude: '',
    longitude: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hospitalDetails) {
      setFormData({
        email: hospitalDetails.email || '',
        password: hospitalDetails.password || '',
        special_services: hospitalDetails.special_services || [],
        centre_of_excellence: hospitalDetails.centre_of_excellence || '',
        latitude: hospitalDetails.latitude?.toString() || '',
        longitude: hospitalDetails.longitude?.toString() || ''
      });
    }
  }, [hospitalDetails]);

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      special_services: prev.special_services.includes(service)
        ? prev.special_services.filter(s => s !== service)
        : [...prev.special_services, service]
    }));
  };

  const fetchLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        }));
      }, (error) => {
        alert('Error fetching location: ' + error.message);
      });
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({
          email: formData.email,
          password: formData.password,
          special_services: formData.special_services,
          centre_of_excellence: formData.centre_of_excellence,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null
        })
        .eq('hospital_id', hospitalDetails.hospital_id);

      if (error) throw error;
      alert('Hospital profile updated successfully!');
      onUpdate();
    } catch (error: any) {
      alert('Error updating profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!hospitalDetails) return null;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="text-emerald-600" size={20} /> Hospital Profile
          </h2>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full">
            <ShieldCheck className="text-emerald-600" size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Incharge Access</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Facility Name</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-slate-500 font-medium">
              {hospitalDetails.facility_name || '---'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Hospital ID</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-slate-500 font-medium">
              {hospitalDetails.hospital_id || '---'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">System</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-slate-500 font-medium">
              {hospitalDetails.system || '---'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Type</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-slate-500 font-medium">
              {hospitalDetails.type || '---'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">District</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-slate-500 font-medium">
              {hospitalDetails.district || '---'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Taluka</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-slate-500 font-medium">
              {hospitalDetails.taluka || '---'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Block</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-slate-500 font-medium">
              {hospitalDetails.block || '---'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Region Indicator</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-slate-500 font-medium">
              {hospitalDetails.region_indicator || '---'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Status</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-slate-500 font-medium">
              {hospitalDetails.status || '---'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Incharge Name</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-slate-500 font-medium">
              {hospitalDetails.incharge_name || '---'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Public Rating</label>
            <div className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 text-amber-600 font-bold flex items-center gap-2">
              <Star className="fill-amber-400" size={16} />
              {hospitalDetails.rating || '4.5'} / 5.0
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Email</label>
            <input 
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="hospital@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Enter password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Services & Excellence</h2>
        
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4 mb-3 block">Special Services</label>
            <div className="flex flex-wrap gap-3">
              {SPECIAL_SERVICES.map(service => (
                <button
                  key={service}
                  type="button"
                  onClick={() => handleServiceToggle(service)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    formData.special_services.includes(service)
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-gray-200 hover:bg-slate-100'
                  } border`}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Centre of Excellence</label>
            <select
              value={formData.centre_of_excellence}
              onChange={e => setFormData({...formData, centre_of_excellence: e.target.value})}
              className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select Centre of Excellence (Optional)</option>
              {CENTRES_OF_EXCELLENCE.map(coe => (
                <option key={coe} value={coe}>{coe}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Location</h2>
          <button
            type="button"
            onClick={fetchLocation}
            className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <MapPin size={16} /> Auto Fetch GPS
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Latitude</label>
            <input 
              type="text"
              value={formData.latitude}
              onChange={e => setFormData({...formData, latitude: e.target.value})}
              className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="e.g. 28.6139"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Longitude</label>
            <input 
              type="text"
              value={formData.longitude}
              onChange={e => setFormData({...formData, longitude: e.target.value})}
              className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="e.g. 77.2090"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : (
            <>
              <Save size={20} /> Save Profile
            </>
          )}
        </button>
      </div>
    </form>
  );
}

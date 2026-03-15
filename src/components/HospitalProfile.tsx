import React, { useState, useEffect, useRef } from 'react';
import { Building2, Save, MapPin, Eye, EyeOff, Star, ShieldCheck, Upload, Camera, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';
import ChangeInchargeModal from './ChangeInchargeModal';

interface HospitalProfileProps {
  hospitalDetails: any;
  onUpdate: () => void;
  session: any;
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

export default function HospitalProfile({ hospitalDetails, onUpdate, session }: HospitalProfileProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    special_services: [] as string[],
    centre_of_excellence: '',
    supraja_centre: false,
    panchakarma_centre: false,
    latitude: '',
    longitude: '',
    photo_url: '',
    facility_name: '',
    pincode: '',
    block: '',
    region_indicator: '',
    operational_status: '',
    status: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [incharge, setIncharge] = useState<any>(null);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [isChangeInchargeOpen, setIsChangeInchargeOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hospitalDetails) {
      setFormData({
        email: hospitalDetails.email || '',
        password: hospitalDetails.password || '',
        special_services: hospitalDetails.special_services || [],
        centre_of_excellence: hospitalDetails.centre_of_excellence || '',
        supraja_centre: hospitalDetails.supraja_centre || false,
        panchakarma_centre: hospitalDetails.panchakarma_centre || false,
        latitude: hospitalDetails.latitude?.toString() || '',
        longitude: hospitalDetails.longitude?.toString() || '',
        photo_url: hospitalDetails.photo_url || '',
        facility_name: hospitalDetails.facility_name || '',
        pincode: hospitalDetails.pincode || '',
        block: hospitalDetails.block || '',
        region_indicator: hospitalDetails.region_indicator || '',
        operational_status: hospitalDetails.operational_status || '',
        status: hospitalDetails.status || ''
      });
      
      const fetchIncharge = async () => {
        if (hospitalDetails.incharge_staff_id) {
          const { data } = await supabase
            .from('staff')
            .select('full_name, role, mobile_number, aadhaar_number, employee_id')
            .eq('id', hospitalDetails.incharge_staff_id)
            .single();
          setIncharge(data);
        } else {
          setIncharge(null);
        }
      };
      fetchIncharge();
    }
  }, [hospitalDetails]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.05, // < 50kb
        maxWidthOrHeight: 500,
        useWebWorker: true,
      });

      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${hospitalDetails.hospital_id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('hospital-photos')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('hospital-photos').getPublicUrl(fileName);
      
      const { error: updateError } = await supabase
        .from('hospitals')
        .update({ photo_url: data.publicUrl })
        .eq('hospital_id', hospitalDetails.hospital_id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, photo_url: data.publicUrl }));
      onUpdate();
    } catch (error: any) {
      alert('Error uploading photo: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        }));
        setShowLocationConfirm(false);
      }, (error) => {
        alert('Error fetching location: ' + error.message);
        setShowLocationConfirm(false);
      });
    } else {
      alert('Geolocation is not supported by your browser.');
      setShowLocationConfirm(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData = {
        email: formData.email,
        password: formData.password,
        special_services: formData.special_services,
        centre_of_excellence: formData.centre_of_excellence,
        supraja_centre: formData.supraja_centre,
        panchakarma_centre: formData.panchakarma_centre,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        facility_name: formData.facility_name,
        pincode: formData.pincode,
        block: formData.block,
        region_indicator: formData.region_indicator,
        operational_status: formData.operational_status,
        status: formData.status
      };

      const tableNames = ['hospitals', 'hospital'];
      let updateSuccess = false;

      for (const tableName of tableNames) {
        let targetId = hospitalDetails.hospital_id;
        let targetSr = hospitalDetails.sr_no;

        // Try to find correct identifiers first
        const { data: searchData } = await supabase
          .from(tableName)
          .select('hospital_id, sr_no')
          .eq('facility_name', hospitalDetails.facility_name)
          .eq('district', hospitalDetails.district)
          .limit(1);

        if (searchData && searchData.length > 0) {
          targetId = searchData[0].hospital_id;
          targetSr = searchData[0].sr_no;
        }

        // Try hospital_id
        let { data, error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('hospital_id', targetId)
          .select();

        if (!error && data && data.length > 0) {
          updateSuccess = true;
          break;
        }

        // Try sr_no
        const { data: retryData, error: retryError } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('sr_no', targetSr)
          .select();
        
        if (!retryError && retryData && retryData.length > 0) {
          updateSuccess = true;
          break;
        }

        // Try id
        if (hospitalDetails.id) {
          const { data: idData, error: idError } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', hospitalDetails.id)
            .select();
          if (!idError && idData && idData.length > 0) {
            updateSuccess = true;
            break;
          }
        }
      }

      if (!updateSuccess) {
        throw new Error('Hospital record not found for update in any table.');
      }

      onUpdate();
      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Error updating profile: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignIncharge = async (staff: any) => {
    console.log('Assigning incharge:', staff.full_name, 'to hospital:', hospitalDetails.facility_name);
    
    try {
      setSaving(true);
      
      // 1. Get previous incharge ID
      const { data: currentHosp } = await supabase
        .from('hospitals')
        .select('incharge_staff_id')
        .eq('hospital_id', hospitalDetails.hospital_id)
        .maybeSingle();
      
      const previousInchargeId = currentHosp?.incharge_staff_id;

      // 2. Update hospital with new incharge
      const tableNames = ['hospitals', 'hospital'];
      let updateSuccess = false;

      for (const tableName of tableNames) {
        let targetId = hospitalDetails.hospital_id;
        let targetSr = hospitalDetails.sr_no;

        const { data: searchData } = await supabase
          .from(tableName)
          .select('hospital_id, sr_no')
          .eq('facility_name', hospitalDetails.facility_name)
          .eq('district', hospitalDetails.district)
          .limit(1);

        if (searchData && searchData.length > 0) {
          targetId = searchData[0].hospital_id;
          targetSr = searchData[0].sr_no;
        }

        const updatePayload = { 
          incharge_staff_id: staff.id,
          incharge_name: staff.full_name
        };

        const { data, error } = await supabase
          .from(tableName)
          .update(updatePayload)
          .eq('hospital_id', targetId)
          .select();

        if (!error && data && data.length > 0) {
          updateSuccess = true;
          break;
        }

        const { data: retryData, error: retryError } = await supabase
          .from(tableName)
          .update(updatePayload)
          .eq('sr_no', targetSr)
          .select();

        if (!retryError && retryData && retryData.length > 0) {
          updateSuccess = true;
          break;
        }
      }

      if (!updateSuccess) {
        throw new Error('Hospital record not found for update.');
      }

      // 3. Handover Mechanism: Update old incharge status
      if (previousInchargeId && previousInchargeId !== staff.id) {
        // Check if they have any other hospitals assigned
        const { data: otherHospitals } = await supabase
          .from('hospitals')
          .select('hospital_id')
          .eq('incharge_staff_id', previousInchargeId);
        
        if (!otherHospitals || otherHospitals.length === 0) {
          await supabase
            .from('staff')
            .update({ is_incharge: false })
            .eq('id', previousInchargeId);
        }
      }

      // 4. Update new incharge status
      await supabase
        .from('staff')
        .update({ 
          is_incharge: true,
          // If they don't have a primary hospital, assign this one
          ...(staff.hospital_id ? {} : { hospital_id: hospitalDetails.hospital_id })
        })
        .eq('id', staff.id);

      setIncharge(staff);
      alert('Incharge assigned successfully!');
      setIsChangeInchargeOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating incharge:', error);
      alert('Error updating incharge: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (!hospitalDetails) return null;

  return (
    <>
      <ChangeInchargeModal 
        isOpen={isChangeInchargeOpen} 
        onClose={() => setIsChangeInchargeOpen(false)}
        onAssign={handleAssignIncharge}
        userRole={session?.role}
      />
      <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex gap-8 items-start">
          <div className="relative group">
            <div className="w-32 h-32 rounded-2xl bg-slate-100 overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center">
              {formData.photo_url ? (
                <img src={formData.photo_url} alt="Hospital" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="text-slate-400" size={40} />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700"
            >
              <Camera size={16} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            {uploading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-2xl"><Loader2 className="animate-spin text-emerald-600" /></div>}
          </div>

          <div className="flex-1">
            <input 
              value={formData.facility_name}
              onChange={e => setFormData({...formData, facility_name: e.target.value})}
              className="text-4xl font-bold text-slate-900 tracking-tight w-full bg-transparent border-none focus:ring-0 p-0"
              disabled={!['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role)}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">ID: {hospitalDetails.hospital_id}</span>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{hospitalDetails.type}</span>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{hospitalDetails.system}</span>
              {formData.centre_of_excellence && formData.centre_of_excellence !== 'False' && formData.centre_of_excellence !== 'false' && (
                <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Centre of Excellence</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-gray-100">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">District</label>
            <p className="font-bold text-slate-900">{hospitalDetails.district}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Taluka</label>
            <p className="font-bold text-slate-900">{hospitalDetails.taluka}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Block</label>
            <input 
              value={formData.block}
              onChange={e => setFormData({...formData, block: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PIN</label>
            <input 
              value={formData.pincode}
              onChange={e => setFormData({...formData, pincode: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Region</label>
            <select 
              value={formData.region_indicator}
              onChange={e => setFormData({...formData, region_indicator: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role)}
            >
              <option value="Rural">Rural</option>
              <option value="Urban">Urban</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operational Status</label>
            <select 
              value={formData.operational_status}
              onChange={e => setFormData({...formData, operational_status: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role)}
            >
              <option value="Operational">Operational</option>
              <option value="Non-Operational">Non-Operational</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Terrain Status</label>
            <select 
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role)}
            >
              <option value="Sugam">Sugam</option>
              <option value="Durgam">Durgam</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email ID</label>
            <p className="font-bold text-slate-900 break-all">{formData.email}</p>
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Special Services</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {formData.special_services.map((service, index) => (
                <span key={index} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  {service}
                </span>
              ))}
            </div>
          </div>
          {formData.centre_of_excellence && formData.centre_of_excellence !== 'False' && formData.centre_of_excellence !== 'false' && (
            <div className="col-span-2 md:col-span-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Centre of Excellence</label>
              <p className="font-bold text-slate-900">{formData.centre_of_excellence}</p>
            </div>
          )}
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

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Incharge Details</h2>
          <div className="flex items-center gap-2">
            {incharge && ['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role) && (
              <button
                type="button"
                onClick={async () => {
                  const { error } = await supabase
                    .from('hospitals')
                    .update({ incharge_staff_id: null })
                    .eq('sr_no', hospitalDetails.sr_no);
                  if (error) console.error('Error removing incharge:', error);
                  else onUpdate();
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
              >
                <X size={18} />
              </button>
            )}
            {['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role) && (
              <button
                type="button"
                onClick={() => setIsChangeInchargeOpen(true)}
                className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                {incharge ? 'Change' : 'Assign'} Incharge
              </button>
            )}
          </div>
        </div>
        
        {incharge ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Name</label>
              <p className="font-bold text-slate-900">{incharge.full_name}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Role</label>
              <p className="font-bold text-slate-900">{incharge.role}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mobile</label>
              <p className="font-bold text-slate-900">{incharge.mobile_number}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aadhaar</label>
              <p className="font-bold text-slate-900">{incharge.aadhaar_number}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Employee ID</label>
              <p className="font-bold text-slate-900">{incharge.employee_id}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No incharge assigned.</p>
        )}
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
    </>
  );
}

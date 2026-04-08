import React, { useState, useEffect, useRef } from 'react';
import { Building2, Save, MapPin, Eye, EyeOff, Star, ShieldCheck, Upload, Camera, Loader2, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';
import ChangeInchargeModal from './ChangeInchargeModal';

interface HospitalProfileProps {
  hospitalDetails: any;
  onUpdate: () => void;
  session: any;
  onDirtyChange?: (isDirty: boolean) => void;
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

export default function HospitalProfile({ hospitalDetails, onUpdate, session, onDirtyChange }: HospitalProfileProps) {
  const [formData, setFormData] = useState({
    taluka: '',
    ipd_services: '',
    mobile: '',
    hospital_password: '',
    email: '',
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
    status: '',
    location: '',
    building_status: '',
    no_of_rooms: '',
    total_area: '',
    construction_year: '',
    no_of_beds: '',
    altitude: '',
    above_7000_feet: '',
    type: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [incharge, setIncharge] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [fetchingAltitude, setFetchingAltitude] = useState(false);
  const [isChangeInchargeOpen, setIsChangeInchargeOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const canEdit = ['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role) || session?.id === hospitalDetails?.incharge_staff_id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hospitalDetails && formData) {
      const isCurrentlyDirty = 
        formData.email !== (hospitalDetails.email || '') ||
        formData.hospital_password !== (hospitalDetails.hospital_password || '') ||
        JSON.stringify(formData.special_services) !== JSON.stringify(hospitalDetails.special_services || []) ||
        formData.centre_of_excellence !== (hospitalDetails.centre_of_excellence || '') ||
        formData.supraja_centre !== (hospitalDetails.supraja_centre || false) ||
        formData.panchakarma_centre !== (hospitalDetails.panchakarma_centre || false) ||
        formData.latitude !== (hospitalDetails.latitude?.toString() || '') ||
        formData.longitude !== (hospitalDetails.longitude?.toString() || '') ||
        formData.photo_url !== (hospitalDetails.photo_url || '') ||
        formData.facility_name !== (hospitalDetails.facility_name || '') ||
        formData.pincode !== (hospitalDetails.pincode || '') ||
        formData.block !== (hospitalDetails.block || '') ||
        formData.region_indicator !== (hospitalDetails.region_indicator || '') ||
        formData.operational_status !== (hospitalDetails.operational_status || '') ||
        formData.status !== (hospitalDetails.status || '') ||
        formData.type !== (hospitalDetails.type || '') ||
        formData.taluka !== (hospitalDetails.taluka || '') ||
        formData.ipd_services !== (hospitalDetails.ipd_services || '') ||
        formData.mobile !== (hospitalDetails.mobile || '') ||
        formData.location !== (hospitalDetails.location || '') ||
        formData.building_status !== (hospitalDetails.building_status || '') ||
        formData.no_of_rooms !== (hospitalDetails.no_of_rooms?.toString() || '') ||
        formData.total_area !== (hospitalDetails.total_area_sqft?.toString() || '') ||
        formData.construction_year !== (hospitalDetails.construction_year?.toString() || '') ||
        formData.no_of_beds !== (hospitalDetails.no_of_beds?.toString() || '') ||
        formData.altitude !== (hospitalDetails.altitude?.toString() || '') ||
        formData.above_7000_feet !== (hospitalDetails.above_7000_feet || '');

      setIsDirty(isCurrentlyDirty);
      onDirtyChange?.(isCurrentlyDirty);
    }
  }, [formData, hospitalDetails, onDirtyChange]);

  useEffect(() => {
    if (hospitalDetails) {
      setFormData({
        email: hospitalDetails.email || '',
        hospital_password: hospitalDetails.hospital_password || '',
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
        status: hospitalDetails.status || '',
        type: hospitalDetails.type || '',
        taluka: hospitalDetails.taluka || '',
        ipd_services: hospitalDetails.ipd_services || '',
        mobile: hospitalDetails.mobile || '',
        location: hospitalDetails.location || '',
        building_status: hospitalDetails.building_status || '',
        no_of_rooms: hospitalDetails.no_of_rooms?.toString() || '',
        total_area: hospitalDetails.total_area_sqft?.toString() || '',
        construction_year: hospitalDetails.construction_year?.toString() || '',
        no_of_beds: hospitalDetails.no_of_beds?.toString() || '',
        altitude: hospitalDetails.altitude?.toString() || '',
        above_7000_feet: hospitalDetails.above_7000_feet || ''
      });
      
      const fetchInchargeAndStaff = async () => {
        if (hospitalDetails.incharge_staff_id) {
          const { data } = await supabase
            .from('staff')
            .select('full_name, role, mobile_number, aadhaar_number, employee_id, id')
            .eq('id', hospitalDetails.incharge_staff_id)
            .single();
          setIncharge(data);
        } else {
          setIncharge(null);
        }

        const { data: staffData } = await supabase
          .from('staff')
          .select('id, full_name, role, mobile_number')
          .eq('hospital_id', hospitalDetails.hospital_id);
        setStaff(staffData || []);
      };
      fetchInchargeAndStaff();
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

      const fileName = `hospital_${hospitalDetails.hospital_id}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('hospital_photo')
        .upload(fileName, compressedFile, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('hospital_photo').getPublicUrl(fileName);
      
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

  const fetchAltitude = () => {
    if ('geolocation' in navigator) {
      setFetchingAltitude(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          let altitudeInMeters = position.coords.altitude;
          
          if (altitudeInMeters === null) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            const response = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
            if (!response.ok) throw new Error('Failed to fetch from Elevation API');
            
            const data = await response.json();
            if (data.elevation && data.elevation.length > 0) {
              altitudeInMeters = data.elevation[0];
            }
          }

          if (altitudeInMeters !== null) {
            const altitudeInFeet = Math.round(altitudeInMeters * 3.28084);
            const isAbove = altitudeInFeet >= 7000 ? 'Yes' : 'No';
            setFormData(prev => ({
              ...prev,
              altitude: altitudeInFeet.toString(),
              above_7000_feet: isAbove
            }));
          } else {
            alert('GPS altitude not available and Elevation API failed. Please enter manually.');
          }
        } catch (err: any) {
          alert('Error fetching elevation data: ' + err.message);
        } finally {
          setFetchingAltitude(false);
        }
      }, (error) => {
        alert('Error fetching altitude: ' + error.message);
        setFetchingAltitude(false);
      }, { enableHighAccuracy: true });
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSave = async (e?: React.FormEvent, isVerifying: boolean = false) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const isAdmin = ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'].includes(session?.role);
      const updateData: any = {
        email: formData.email,
        hospital_password: formData.hospital_password,
        special_services: formData.special_services,
        centre_of_excellence: formData.centre_of_excellence && formData.centre_of_excellence !== 'False' && formData.centre_of_excellence !== 'false' ? (formData.centre_of_excellence === 'True' ? null : formData.centre_of_excellence) : null,
        supraja_centre: formData.supraja_centre,
        panchakarma_centre: formData.panchakarma_centre,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        facility_name: formData.facility_name,
        pincode: formData.pincode,
        block: formData.block,
        region_indicator: formData.region_indicator,
        operational_status: formData.operational_status,
        status: formData.status,
        taluka: formData.taluka,
        ipd_services: formData.ipd_services,
        mobile: formData.mobile,
        location: formData.location,
        building_status: formData.building_status,
        no_of_rooms: formData.no_of_rooms ? parseInt(formData.no_of_rooms) : null,
        total_area_sqft: formData.total_area ? parseFloat(formData.total_area) : null,
        construction_year: formData.construction_year ? parseInt(formData.construction_year) : null,
        no_of_beds: formData.no_of_beds ? parseInt(formData.no_of_beds) : null,
        altitude: formData.altitude ? parseInt(formData.altitude.toString().replace(/ft|feet/gi, '').trim()) : null,
        above_7000_feet: formData.above_7000_feet || 'No',
        type: formData.type
      };

      if (isVerifying && isAdmin) {
        updateData.is_verified = true;
        updateData.verified_by = session?.name || session?.id || 'Admin';
        updateData.verified_at = new Date().toISOString();
      } else {
        updateData.is_verified = false;
        updateData.last_edited_on = new Date().toISOString();
        updateData.verified_at = null;
        updateData.verified_by = null;
      }

      if (formData.construction_year && !/^\d{4}$/.test(formData.construction_year)) {
        throw new Error('Construction Year must be a 4-digit number.');
      }
      if (formData.no_of_beds && parseInt(formData.no_of_beds) < 0) {
        throw new Error('No. of Beds cannot be negative.');
      }

      const tableNames = ['hospitals'];
      let updateSuccess = false;

      for (const tableName of tableNames) {
        // Try id first (most reliable)
        if (hospitalDetails.id) {
          console.log(`Attempting update on ${tableName} with id: ${hospitalDetails.id}`);
          const { data: idData, error: idError } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', hospitalDetails.id)
            .select();
          if (idError) console.error(`Error updating ${tableName} with id ${hospitalDetails.id}:`, idError);
          if (!idError && idData && idData.length > 0) {
            updateSuccess = true;
            break;
          }
        }

        let targetId = hospitalDetails.hospital_id;
        let targetSr = hospitalDetails.sr_no;

        // Try to find correct identifiers first
        console.log(`Searching for ${tableName} with facility_name: ${hospitalDetails.facility_name}, district: ${hospitalDetails.district}`);
        const { data: searchData } = await supabase
          .from(tableName)
          .select('hospital_id, sr_no')
          .eq('facility_name', hospitalDetails.facility_name)
          .eq('district', hospitalDetails.district)
          .limit(1);

        if (searchData) console.log(`Search result for ${tableName}:`, searchData);
        else console.log(`No search result for ${tableName}`);

        if (searchData && searchData.length > 0) {
          targetId = searchData[0].hospital_id;
          targetSr = searchData[0].sr_no;
        }

        // Try hospital_id
        console.log(`Attempting update on ${tableName} with hospital_id: ${targetId}`);
        let { data, error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('hospital_id', targetId)
          .select();

        if (error) console.error(`Error updating ${tableName} with hospital_id ${targetId}:`, error);
        if (!error && data && data.length > 0) {
          updateSuccess = true;
          break;
        }

        // Try sr_no
        console.log(`Attempting update on ${tableName} with sr_no: ${targetSr}`);
        const { data: retryData, error: retryError } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('sr_no', targetSr)
          .select();
        
        if (retryError) console.error(`Error updating ${tableName} with sr_no ${targetSr}:`, retryError);
        if (!retryError && retryData && retryData.length > 0) {
          updateSuccess = true;
          break;
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
          incharge_name: staff.full_name,
          mobile: staff.mobile_number
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
            <div className="flex items-center gap-3">
              <input 
                value={formData.facility_name}
                onChange={e => setFormData({...formData, facility_name: e.target.value})}
                className="text-2xl font-bold text-slate-900 tracking-tight w-full bg-transparent border-none focus:ring-0 p-0"
                disabled={!canEdit}
              />
              {hospitalDetails.is_verified && (
                <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full whitespace-nowrap">
                  <CheckCircle2 size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Verified</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">SR NO: {hospitalDetails.sr_no}</span>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">ID: {hospitalDetails.hospital_id}</span>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{hospitalDetails.system}</span>
              {formData.centre_of_excellence && formData.centre_of_excellence !== 'False' && formData.centre_of_excellence !== 'false' && (
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Centre of Excellence</span>
              )}
              {formData.panchakarma_centre && (
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Panchakarma Centre</span>
              )}
              {formData.supraja_centre && (
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Supraja Centre</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-gray-100">
          <div className="col-span-2 md:col-span-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Address</label>
            <input 
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
            >
              <option value="">Select Type</option>
              {[
                'AYUSH 50 Bed',
                'AYUSH Educational Institute',
                'AYUSH WING - PHC',
                'AYUSH Wing - CHC',
                'AYUSH Wing at District Hospital',
                'AYUSHMAN AROGYA MANDIR (AYUSH)',
                'Ayurveda 10 Bed',
                'Government AYUSH Dispensary',
                'Government AYUSH Hospital',
                'MOCH - PHC',
                'MOCH - CHC'
              ].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">District</label>
            <p className="font-bold text-slate-900">{hospitalDetails.district}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Taluka</label>
            <input 
              value={formData.taluka}
              onChange={e => setFormData({...formData, taluka: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role)}
            />
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
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System</label>
            <select 
              value={hospitalDetails.system}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled
            >
              <option value={hospitalDetails.system}>{hospitalDetails.system}</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mobile</label>
            <input 
              value={formData.mobile}
              onChange={e => setFormData({...formData, mobile: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Region</label>
            <select 
              value={formData.region_indicator}
              onChange={e => setFormData({...formData, region_indicator: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
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
              disabled={!canEdit}
            >
              <option value="Operational">Operational</option>
              <option value="Non-Operational">Non-Operational</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Status</label>
            <select 
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="font-bold text-emerald-900 w-full bg-emerald-50 rounded-lg p-1 border border-emerald-200"
              disabled={!canEdit}
            >
              <option value="Sugam">Sugam</option>
              <option value="Durgam">Durgam</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">IPD Services</label>
            <select 
              value={formData.ipd_services}
              onChange={e => setFormData({...formData, ipd_services: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
            >
              <option value="OPD Only">OPD Only</option>
              <option value="IPD">IPD</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hospital Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                value={formData.hospital_password}
                onChange={e => setFormData({...formData, hospital_password: e.target.value})}
                className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1 pr-10"
                disabled={!canEdit}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email ID</label>
            <input 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
            />
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Special Services</label>
            <input 
              value={formData.special_services.join(', ')}
              onChange={e => setFormData({...formData, special_services: e.target.value.split(',').map(s => s.trim())})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
            />
          </div>
          <div className="col-span-2 md:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Centre of Excellence</span>
                <input 
                  type="checkbox" 
                  checked={!!formData.centre_of_excellence && formData.centre_of_excellence !== 'False' && formData.centre_of_excellence !== 'false'} 
                  onChange={e => setFormData({...formData, centre_of_excellence: e.target.checked ? 'True' : ''})} 
                  disabled={!canEdit}
                />
                {!!formData.centre_of_excellence && formData.centre_of_excellence !== 'False' && formData.centre_of_excellence !== 'false' && <CheckCircle2 className="text-emerald-500" size={16} />}
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Panchakarma Centre</span>
                <input type="checkbox" checked={formData.panchakarma_centre} onChange={e => setFormData({...formData, panchakarma_centre: e.target.checked})} disabled={!canEdit} />
                {formData.panchakarma_centre && <CheckCircle2 className="text-emerald-500" size={16} />}
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Supraja Centre</span>
                <input type="checkbox" checked={formData.supraja_centre} onChange={e => setFormData({...formData, supraja_centre: e.target.checked})} disabled={!canEdit} />
                {formData.supraja_centre && <CheckCircle2 className="text-emerald-500" size={16} />}
              </label>
            </div>
            
            {!!formData.centre_of_excellence && formData.centre_of_excellence !== 'False' && formData.centre_of_excellence !== 'false' && (
              <div className="w-full md:w-1/2">
                <input 
                  type="text"
                  value={formData.centre_of_excellence === 'True' ? '' : formData.centre_of_excellence}
                  onChange={e => setFormData({...formData, centre_of_excellence: e.target.value})}
                  placeholder="e.g. Eye Disorder, Pediatric, etc."
                  className="font-bold text-slate-900 w-full bg-slate-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  disabled={!canEdit}
                />
              </div>
            )}
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
          <div className="space-y-1 p-4 bg-blue-50 rounded-2xl border border-blue-200">
            <label className="text-[10px] font-bold uppercase tracking-widest text-blue-700 ml-4">Latitude</label>
            <input 
              type="text"
              value={formData.latitude}
              onChange={e => setFormData({...formData, latitude: e.target.value})}
              className="w-full bg-white border border-blue-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-blue-900 font-bold"
              placeholder="e.g. 28.6139"
            />
          </div>
          <div className="space-y-1 p-4 bg-blue-50 rounded-2xl border border-blue-200">
            <label className="text-[10px] font-bold uppercase tracking-widest text-blue-700 ml-4">Longitude</label>
            <input 
              type="text"
              value={formData.longitude}
              onChange={e => setFormData({...formData, longitude: e.target.value})}
              className="w-full bg-white border border-blue-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-blue-900 font-bold"
              placeholder="e.g. 77.2090"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Altitude (in Feet)</label>
            <input 
              type="text"
              value={formData.altitude}
              onChange={e => {
                const val = e.target.value.replace(/ft|feet/gi, '').trim();
                const isAbove = val ? (parseInt(val) >= 7000 ? 'Yes' : 'No') : 'No';
                setFormData({...formData, altitude: val, above_7000_feet: isAbove});
              }}
              className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="e.g. 7500"
              disabled={!['HOSPITAL', 'DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role)}
            />
          </div>
          <div className="space-y-1 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
            <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 ml-4">Above 7000 ft</label>
            <select
              value={formData.above_7000_feet || 'No'}
              onChange={e => setFormData({...formData, above_7000_feet: e.target.value})}
              className="w-full bg-white border border-emerald-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none text-emerald-900 font-bold"
              disabled={!['HOSPITAL', 'DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN'].includes(session?.role)}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={fetchAltitude}
            disabled={fetchingAltitude}
            className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fetchingAltitude ? (
              <><Loader2 size={16} className="animate-spin" /> Fetching Elevation Data...</>
            ) : (
              <><MapPin size={16} /> Get Precise Altitude (Feet)</>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Infrastructure Details</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Building Status</label>
            <select 
              value={formData.building_status}
              onChange={e => setFormData({...formData, building_status: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
            >
              <option value="">Select Status</option>
              <option value="Owner">Owner</option>
              <option value="Rented">Rented</option>
              <option value="Free">Free</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No. of Rooms</label>
            <input 
              type="number"
              value={formData.no_of_rooms}
              onChange={e => setFormData({...formData, no_of_rooms: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Area (sq feet)</label>
            <input 
              type="number"
              value={formData.total_area}
              onChange={e => setFormData({...formData, total_area: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Construction Year</label>
            <input 
              type="number"
              value={formData.construction_year}
              onChange={e => setFormData({...formData, construction_year: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No. of Beds</label>
            <input 
              type="number"
              value={formData.no_of_beds}
              onChange={e => setFormData({...formData, no_of_beds: e.target.value})}
              className="font-bold text-slate-900 w-full bg-slate-50 rounded-lg p-1"
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Incharge Details</h2>
        </div>
        
        {incharge ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Incharge Name</label>
              <p className="font-bold text-slate-900">{incharge.full_name}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mobile</label>
              <p className="font-bold text-slate-900">{incharge.mobile_number}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Incharge Staff ID</label>
              <p className="font-bold text-slate-900">{incharge.id}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No incharge assigned.</p>
        )}
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Staff</h2>
        </div>
        
        {staff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-2">Name</th>
                  <th className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-2">Role</th>
                  <th className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-2">Mobile</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((employee) => (
                  <tr key={employee.id} className="border-t border-gray-100">
                    <td className="py-3 font-bold text-slate-900">{employee.full_name}</td>
                    <td className="py-3 font-bold text-slate-900">{employee.role}</td>
                    <td className="py-3 font-bold text-slate-900">{employee.mobile_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No staff members found.</p>
        )}
      </div>

      <div className="flex justify-end items-center gap-6">
        <div className="flex flex-col items-end gap-1">
          {hospitalDetails.last_edited_on && (
            <div className="text-sm text-slate-500 font-medium">
              Last edited on: {new Date(hospitalDetails.last_edited_on).toLocaleString()}
            </div>
          )}
          {hospitalDetails.is_verified && hospitalDetails.verified_at && (
            <div className="text-sm text-emerald-600 font-bold">
              Last Verified on: {new Date(hospitalDetails.verified_at).toLocaleString()}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto">
          {['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'].includes(session?.role) ? (
            <>
              <button 
                type="button"
                onClick={(e) => handleSave(undefined, false)}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-slate-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700 transition-all disabled:opacity-50 w-full"
              >
                {saving ? 'Saving...' : <><Save size={20} /> Save Profile</>}
              </button>
              <button 
                type="button"
                onClick={(e) => handleSave(undefined, true)}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 w-full"
              >
                {saving ? 'Verifying...' : <><CheckCircle2 size={20} /> Verify Profile</>}
              </button>
            </>
          ) : (
            <button 
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 w-full"
            >
              {saving ? 'Saving...' : <><Save size={20} /> Save Profile</>}
            </button>
          )}
        </div>
      </div>
    </form>
    </>
  );
}

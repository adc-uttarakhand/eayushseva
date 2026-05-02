/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import InstallPrompt from './components/InstallPrompt';
import PharmacyManagerDashboard from './components/PharmacyManagerDashboard';
import AddMedicineModal from './components/AddMedicineModal';
import SearchBar from './components/SearchBar';
import Carousel from './components/Carousel';
import FacilityCard from './components/FacilityCard';
import BentoGrid from './components/BentoGrid';
import BottomNav, { TabId } from './components/BottomNav';
import LoginModal, { UserSession } from './components/LoginModal';
import EditHospitalModal from './components/EditHospitalModal';
import EParchi from './components/EParchi';
import PatientList from './components/PatientList';
import DoctorCommandCenter from './components/DoctorCommandCenter';
import RatePage from './components/RatePage';
import EmployeeDirectory from './components/EmployeeDirectory';
import RegistrationRequests from './components/RegistrationRequests';
import ServiceRecordTab from './components/ServiceRecordTab';
import HospitalDirectory from './components/HospitalDirectory';
import AdminPasswordReset from './components/AdminPasswordReset';
import AdminCreator from './components/AdminCreator';
import MedicineDemandSystem from './components/MedicineDemandSystem';
import StateSupplyDashboard from './components/StateSupplyDashboard';
import DistrictSupplyManager from './components/DistrictSupplyManager';
import ProfilePage from './components/ProfilePage';
import InchargeManagement from './components/InchargeManagement';
import RapidTests from './components/RapidTests';
import HospitalDetailsModal from './components/HospitalDetailsModal';
import TransferRequests from './components/TransferRequests';
import TransferModule from './components/TransferModule';
import AdminTransferList from './components/AdminTransferList';
import Sthananataran from './components/Sthananataran';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import DiseaseManagement from './components/DiseaseManagement';
import RoleManagement from './components/RoleManagement';
import StaffDistributionSummary from './components/StaffDistributionSummary';
import PanchakarmaModule from './components/PanchakarmaModule';
import PanchakarmaAdminDashboard from './components/PanchakarmaAdminDashboard';
import SearchDeleteEmployeeModal from './components/SearchDeleteEmployeeModal';
import { LogIn, User as UserIcon, LogOut, Loader2, Search, Filter, Building2, MapPin, Phone, Mail, ShieldCheck, X, Star, ArrowRight, Save, Bell, Key, Activity, Stethoscope, Users, LayoutDashboard } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Toaster, toast } from 'react-hot-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

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
  last_edited_on?: string;
  verified_at?: string;
  is_verified?: boolean;
  panchakarma_centre?: boolean;
}

const EXPERTISE_KEYWORDS_LIST = [
  "Marma Chikitsa", "Ayurvedic Neurotherapy", "Leech Therapy", "Ayurvedic Antenatal Care", "Panchakarma Therapies", 
  "Uttar Vasti", "Siravedh", "Viddhakarma", "NCD Reversal", "Panchakarma Procedures", "Agnikarma", "Kshar Karma", 
  "Kshar Sutra", "Netra Kriya Kalpa", "Pediatric Disorders", "Rheumatism", "Hyperuricemia", "Liver Disorders", 
  "Gynecological Disorders", "ENT Disorders", "Eye Disorders", "GI Disorders", "Skin Diseases", "Psoriasis", 
  "Auto immune Disorders", "Chronic Pain Management", "Osteoarthritis", "Neurological Disorders", "Spine Disorders", 
  "Reproductive System Disorders", "Infertility", "Psychiatry", "Endocrine Disorders", "Preventive Medicine", 
  "Cancer Rehab", "Cancer Management", "Yoga"
];

export default function App() {
  const [activeTab, _setActiveTab] = useState<TabId>('dashboard');
  const [isHospitalProfileDirty, setIsHospitalProfileDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const setActiveTab = (newTab: TabId) => {
    if (activeTab === 'dashboard' && isHospitalProfileDirty && newTab !== 'dashboard') {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
      return;
    }
    _setActiveTab(newTab);
  };
  const [hospitalSubTab, setHospitalSubTab] = useState<'hospitals' | 'employees' | 'incharges'>('hospitals');
  const [supplySubTab, setSupplySubTab] = useState<'upload' | 'manual' | 'monitor' | 'samples' | 'rishikul'>('monitor');
  const [transferSubTab, setTransferSubTab] = useState<'hospitals' | 'employees'>('hospitals');
  const [pharmacySubTab, setPharmacySubTab] = useState('list');
  const [requestsSubTab, setRequestsSubTab] = useState<'transfer_requests' | 'registration_requests'>('transfer_requests');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isNearbyActive, setIsNearbyActive] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [doctorSearchResults, setDoctorSearchResults] = useState<any[]>([]);
  const [isDoctorSearchOpen, setIsDoctorSearchOpen] = useState(false);
  
  // Edit state
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isHospitalDetailsOpen, setIsHospitalDetailsOpen] = useState(false);
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const savedReadIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      const defaultNotifications = [
        {
          id: '1',
          title: 'Welcome to AYUSH Portal',
          message: 'Your account has been successfully created and verified.',
          read: false,
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Profile Update Required',
          message: 'Please complete your deep profile details to unlock all features.',
          read: false,
          timestamp: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      return defaultNotifications.filter(n => !savedReadIds.includes(n.id));
    } catch (e) {
      return [];
    }
  });
  const hasNotifications = notifications.length > 0;
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const allStaff = hospitals.flatMap(h => (h as any).staff || []);

  const handleMarkAllAsRead = () => {
    try {
      const currentReadIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      const newReadIds = [...new Set([...currentReadIds, ...notifications.map(n => n.id)])];
      localStorage.setItem('readNotifications', JSON.stringify(newReadIds));
    } catch (e) {
      // ignore
    }
    setNotifications([]);
  };

  const handleNotificationClick = (id: string) => {
    try {
      const currentReadIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      if (!currentReadIds.includes(id)) {
        localStorage.setItem('readNotifications', JSON.stringify([...currentReadIds, id]));
      }
    } catch (e) {
      // ignore
    }
    setNotifications(notifications.filter(n => n.id !== id));
  };

  // Search/Filter state for Hospitals tab
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHospitals();
  }, [session]);

  useEffect(() => {
    if (activeTab === 'rate' && !userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
        }, (err) => {
          console.warn("Location access denied for rating portal", err);
        });
      }
    }
  }, [activeTab, userLocation]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const handleFindNearby = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      setActiveTab('nearby');
    }, () => {
      alert("Unable to retrieve your location");
    });
  };

  const [isTransferEnabled, setIsTransferEnabled] = useState<boolean>(false);
  const [isSthananataranEnabled, setIsSthananataranEnabled] = useState<boolean>(false);

  useEffect(() => {
    fetchTransferStatus();
  }, []);

  const fetchTransferStatus = async () => {
    setLoading(true);
    const { data: transferData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'transfer_module_active')
      .maybeSingle();                
    
    if (transferData) {
      setIsTransferEnabled(Boolean(transferData.setting_value));
    }

    const { data: sthananataranData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'sthananataran_module_active')
      .maybeSingle();                
    
    if (sthananataranData) {
      setIsSthananataranEnabled(Boolean(sthananataranData.setting_value));
    }
    setLoading(false);
  };

  const toggleTransferModule = async () => {
    const newState = !isTransferEnabled;
    if (window.confirm(`Are you sure you want to ${newState ? 'enable' : 'disable'} the transfer module for all districts?`)) {
      setLoading(true);
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: newState })
        .eq('setting_key', 'transfer_module_active');
      
      if (!error) {
        setIsTransferEnabled(newState);
        toast.success(`Transfer module ${newState ? 'enabled' : 'disabled'} successfully.`);
      } else {
        alert('Error updating transfer module status: ' + error.message);
        toast.error('Error updating transfer module status.');
      }
      setLoading(false);
    }
  };

  const toggleSthananataranModule = async () => {
    console.log('toggleSthananataranModule clicked, current state:', isSthananataranEnabled);
    const newState = !isSthananataranEnabled;
    
    setLoading(true);
    console.log('Updating Supabase with newState:', newState);
    const { error } = await supabase
      .from('system_settings')
      .upsert({ setting_key: 'sthananataran_module_active', setting_value: newState }, { onConflict: 'setting_key' });
    
    if (!error) {
      setIsSthananataranEnabled(newState);
      toast.success(`Sthananataran module ${newState ? 'enabled' : 'disabled'} successfully.`);
      console.log('Supabase upsert successful');
    } else {
      console.error('Error updating Sthananataran module status:', error);
      alert('Error updating Sthananataran module status: ' + error.message);
      toast.error('Error updating Sthananataran module status.');
    }
    setLoading(false);
  };

  const handleDoctorSearch = async (query: string) => {
    setDoctorSearchQuery(query);
    if (!query) {
      setDoctorSearchResults([]);
      return;
    }

    // Fetch from doctor_profiles and join staff
    const { data: profiles, error: docError } = await supabase
      .from('doctor_profiles')
      .select(`
        *,
        staff (*)
      `);

    if (profiles) {
      const q = query.toLowerCase().trim();
      const results = profiles.filter(profile => {
        const keywords = (profile.keywords || '').toLowerCase();
        const specialization = (profile.specialization || '').toLowerCase();
        const docName = (profile.staff?.full_name || '').toLowerCase();
        
        return keywords.includes(q) || specialization.includes(q) || docName.includes(q);
      }).map(profile => {
        const doc = profile.staff;
        const hospital = doc ? hospitals.find(h => h.hospital_id === doc.hospital_id) : null;
        
        let distance = null;
        if (userLocation && hospital?.latitude && hospital?.longitude) {
          distance = calculateDistance(userLocation.lat, userLocation.lng, hospital.latitude, hospital.longitude);
        }
        
        return {  
          ...doc, 
          doctor_profiles: profile,
          hospitalName: hospital?.facility_name || 'Not Available', 
          distance 
        };
      });
      setDoctorSearchResults(results);
    }
  };

  // Reset tab when role changes
  useEffect(() => {
    if (session?.role === 'DISTRICT_MEDICINE_INCHARGE') {
      setActiveTab('demands');
    } else if (session?.role === 'PHARMACY_MANAGER') {
      setActiveTab('pharmacy_dashboard');
    } else {
      setActiveTab('dashboard');
    }
  }, [session?.role]);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Active Filters:', session?.access_districts, session?.access_systems);
      
      const tableNames = ['hospitals', 'hospital'];
      let lastError = null;
      let foundData = false;

      for (const tableName of tableNames) {
        let query = supabase.from(tableName).select('*').limit(10000);

        if (session) {
          // State Admin Bypass: If access_districts contains 'All', remove district filter
          if (session.access_districts && !session.access_districts.includes('All')) {
            query = query.in('district', session.access_districts);
          }
          
          if (session.access_systems && session.access_systems.length > 0 && !session.access_systems.includes('All')) {
            const systems = session.access_systems.join(',');
            query = query.or(`system.in.(${systems}),type.eq.Office`);
          }
        }

        const { data, error: fetchError } = await query;

        if (!fetchError && data && data.length > 0) {
          setHospitals(data);
          foundData = true;
          break;
        }
        
        if (fetchError) {
          lastError = fetchError;
        }
      }

      if (!foundData) {
        if (lastError) {
          setError(`Database Connection Issue: ${lastError.message}`);
        } else {
          setError('No records found in the database. Please check RLS policies.');
        }
      }
    } catch (err: any) {
      console.error('Unexpected error during fetch:', err);
      setError(`Unexpected Error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      setSession(JSON.parse(savedSession));
    }
  }, []);

  const handleLogin = (sess: UserSession) => {
    setSession(sess);
    localStorage.setItem('session', JSON.stringify(sess));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('session');
  };

  const isAdmin = session?.role === 'SUPER_ADMIN';
  
  const canEditFacility = (facility: Hospital) => {
    if (isAdmin) return true;
    if (session?.role === 'HOSPITAL' && session.id === facility.hospital_id) return true;
    return false;
  };

  const currentHospital = hospitals.find(h => h.hospital_id === (session?.hospitalId || session?.id));

  const getHospitalImage = (id: string | number) => `https://via.placeholder.com/800x600?text=Hospital`;

  const filteredHospitals = hospitals.filter(h => {
    const name = h.facility_name?.toLowerCase() || '';
    const district = h.district?.toLowerCase() || '';
    const system = h.system?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    let matchesSearch = name.includes(query) || district.includes(query) || system.includes(query);
    
    if (isNearbyActive && userLocation && h.latitude && h.longitude) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, h.latitude, h.longitude);
      return dist <= 5 && matchesSearch;
    }
    
    return matchesSearch;
  });

  const renderDashboard = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pb-20"
    >
      <header className="relative pt-12 pb-8 px-4 sm:px-8 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl"
        >
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter text-slate-900 leading-[0.9]">
            Healing from the <br />
            <span className="text-emerald-600">Himalayas.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-500 max-w-xl font-medium leading-relaxed">
            Access premium AYUSH healthcare facilities.
          </p>
        </motion.div>
        
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full opacity-10 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path fill="#10B981" d="M44.7,-76.4C58.1,-69.2,69.2,-58.1,76.4,-44.7C83.6,-31.3,86.9,-15.7,85.6,-0.7C84.3,14.2,78.5,28.5,70.3,41.2C62.1,53.9,51.5,65,38.8,72.4C26.1,79.8,11.3,83.5,-3.1,88.9C-17.5,94.3,-35,101.4,-49.4,96.4C-63.8,91.4,-75.1,74.3,-82.4,57.1C-89.7,39.9,-93,22.6,-91.7,5.9C-90.4,-10.8,-84.5,-26.9,-75.1,-40.8C-65.7,-54.7,-52.8,-66.4,-38.7,-73.2C-24.6,-80,-12.3,-81.9,1.2,-84C14.7,-86.1,29.4,-88.4,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>
      </header>

      <BentoGrid 
        onFindDoctor={() => setIsDoctorSearchOpen(true)} 
        onFindNearby={handleFindNearby}
        onRate={() => setActiveTab('rate')}
        onDemands={() => setActiveTab('demands')}
        isLoggedIn={!!session}
      />

      <main className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-slate-400 font-medium">Loading premium facilities...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
            <p className="text-red-500 font-medium max-w-md">{error}</p>
            <button 
              onClick={fetchHospitals}
              className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold hover:bg-emerald-700 transition-all"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            <Carousel title="Top Rated Centres">
              {hospitals.slice(0, 10).map(facility => (
                <FacilityCard 
                  key={facility.sr_no} 
                  name={facility.facility_name}
                  rating={0}
                  ratingCount={0}
                  district={facility.district}
                  system={facility.system}
                  image={facility.photo_url || getHospitalImage(facility.sr_no)}
                  isAdmin={false}
                  hideRateOption={true}
                />
              ))}
            </Carousel>

            <div className="px-4 sm:px-8 py-12 text-center">
              <button 
                onClick={() => setActiveTab('rate')}
                className="text-4xl sm:text-6xl font-black text-slate-900 hover:text-emerald-600 transition-all tracking-tighter uppercase"
              >
                Rate a Centre <span className="text-emerald-600">→</span>
              </button>
              <p className="text-slate-500 mt-4 font-bold uppercase tracking-widest text-sm">Share your experience & help us improve AYUSH healthcare</p>
            </div>

            <Carousel title="Available Nearby">
              {hospitals.slice(10, 20).map(facility => (
                <FacilityCard 
                  key={facility.sr_no} 
                  name={facility.facility_name}
                  rating={0}
                  ratingCount={0}
                  district={facility.district}
                  system={facility.system}
                  image={facility.photo_url || getHospitalImage(facility.sr_no)}
                  isAdmin={false}
                  hideRateOption={true}
                />
              ))}
            </Carousel>
          </>
        )}

        <section className="px-4 sm:px-8 py-12">
          <div className="bg-neutral-50 rounded-[2.5rem] p-8 sm:p-12 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-slate-900">Serving Uttarakhand</h2>
              <p className="text-slate-500 mt-2">The largest network of AYUSH facilities in the state.</p>
            </div>
            <div className="flex gap-12">
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-600">{hospitals.length}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Facilities</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-600">
                  {new Set(hospitals
                    .map(h => h.district)
                    .filter(d => d && d !== 'Outside Uttarakhand' && d !== 'Uttarakhand')
                  ).size}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Districts</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Doctor Search Modal */}
      <AnimatePresence>
        {isDoctorSearchOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Find a Specialist</h2>
                <button onClick={() => setIsDoctorSearchOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
              <div className="p-8">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text"
                    placeholder="Search by expertise (e.g. Yoga, Marma) or name..."
                    value={doctorSearchQuery}
                    onChange={(e) => handleDoctorSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-lg font-medium"
                  />
                </div>

                {!doctorSearchQuery && (
                  <div className="mb-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 px-1 flex items-center gap-2">
                      <Filter size={12} /> Browse by Expertise
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                      {EXPERTISE_KEYWORDS_LIST.map(tag => (
                        <button 
                          key={tag}
                          onClick={() => handleDoctorSearch(tag)}
                          className="px-4 py-2 rounded-xl bg-white border border-gray-100 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:border-emerald-100 hover:text-emerald-700 transition-all shadow-sm flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {doctorSearchResults.length > 0 ? (
                    doctorSearchResults.map(doc => (
                      <div key={doc.id} className="p-6 rounded-[2rem] border border-gray-100 bg-white hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-900/5 transition-all group">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-slate-900 text-xl tracking-tight">{doc.full_name}</h3>
                              <div className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                {doc.doctor_profiles?.specialization}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-1.5 mt-2">
                              <div className="flex items-center gap-2 text-slate-600">
                                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                                  <Building2 size={16} />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Facility Name</p>
                                  <p className="text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors leading-tight mt-0.5">
                                    {doc.hospitalName || 'Facility Not Assigned'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {doc.distance !== null && !isNaN(doc.distance) && (
                            <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex flex-col items-center">
                              <span className="text-lg font-black tracking-tighter leading-none">{doc.distance.toFixed(1)}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Km away</span>
                            </div>
                          )}
                        </div>

                        {doc.doctor_profiles?.keywords && (
                          <div className="mt-5 pt-5 border-t border-gray-50 flex flex-wrap gap-2">
                            {doc.doctor_profiles.keywords.split(',').map((k: string, i: number) => (
                              <span key={i} className="bg-slate-50 text-slate-600 border border-gray-100 px-3 py-1.5 rounded-xl text-[10px] font-bold group-hover:bg-emerald-50/50 group-hover:border-emerald-100 group-hover:text-emerald-700 transition-all">
                                {k.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : doctorSearchQuery ? (
                    <div className="py-12 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-gray-200">
                      <Search className="mx-auto text-slate-300 mb-4" size={48} />
                      <h3 className="text-xl font-bold text-slate-900">No specialists found</h3>
                      <p className="text-slate-500 mt-2">We couldn't find any doctor matching "{doctorSearchQuery}"</p>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Stethoscope className="mx-auto text-emerald-100 mb-4" size={64} />
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">Find Top AYUSH Experts</h3>
                      <p className="text-slate-500 mt-2 max-w-sm mx-auto">Enter a disease, treatment, or keyword to browse qualified specialists across Uttarakhand.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderNearbyHospitals = () => {
    if (!userLocation) return null;

    const nearbyHospitals = hospitals
      .map(h => ({
        ...h,
        distance: h.latitude && h.longitude ? calculateDistance(userLocation.lat, userLocation.lng, h.latitude, h.longitude) : Infinity
      }))
      .filter(h => h.distance <= 5)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="pt-24 px-4 sm:px-8 max-w-7xl mx-auto pb-40"
      >
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">Nearby <br /><span className="text-emerald-600">Facilities</span></h1>
            <p className="text-slate-500 mt-2 font-medium">Top 10 hospitals within 5km of your current location.</p>
          </div>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="bg-slate-100 p-3 rounded-full hover:bg-slate-200 transition-all"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {nearbyHospitals.length > 0 ? (
            nearbyHospitals.map(h => (
              <div key={h.hospital_id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {h.system} • {h.type}
                    </span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-3 group-hover:text-emerald-600 transition-colors">{h.facility_name}</h3>
                    <p className="text-slate-500 mt-1 flex items-center gap-1 font-medium">
                      <MapPin size={16} className="text-slate-400" /> {h.district}, {h.taluka}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-emerald-600 tracking-tighter">{h.distance.toFixed(1)}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kilometers</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-6 border-t border-gray-50">
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`, '_blank')}
                    className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    <MapPin size={18} />
                    Navigate
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-gray-200">
              <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-900">No facilities found nearby</h3>
              <p className="text-slate-500 mt-2">Try expanding your search or checking your GPS settings.</p>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="mt-8 bg-emerald-600 text-white px-8 py-3 rounded-full font-bold"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const [realStats, setRealStats] = useState({
    totalPatients: 0,
    panchakarmaTreatments: 0,
    yogaSessions: 0,
    loading: true
  });

  const fetchGlobalStats = async () => {
    try {
      setRealStats(prev => ({ ...prev, loading: true }));
      
      // Fetch total patient count
      const { count: patientCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Fetch panchakarma log count
      const { count: pkCount } = await supabase
        .from('panchakarma_logs')
        .select('*', { count: 'exact', head: true });

      // Fetch yoga session count
      const { count: yogaCount } = await supabase
        .from('yoga_sessions')
        .select('*', { count: 'exact', head: true });

      setRealStats({
        totalPatients: patientCount || 0,
        panchakarmaTreatments: pkCount || 0,
        yogaSessions: yogaCount || 0,
        loading: false
      });
    } catch (err) {
      console.error('Error fetching global stats:', err);
      setRealStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchGlobalStats();
    }
  }, [activeTab]);

  const renderStats = () => {
    const stats = {
      hospitals: hospitals.length,
      districts: new Set(hospitals.map(h => h.district).filter(d => d)).size,
      totalPatients: realStats.totalPatients,
      panchakarmaTreatments: realStats.panchakarmaTreatments,
      yogaSessions: realStats.yogaSessions,
      systems: new Set(hospitals.map(h => h.system)).size
    };

    const statCards = [
      { 
        title: "AYUSH Facilities", 
        value: stats.hospitals, 
        label: "Registered centres across Uttarakhand",
        icon: Building2,
        color: "bg-blue-50 text-blue-600 border-blue-100"
      },
      { 
        title: "Patient Footfall", 
        value: stats.totalPatients, 
        label: "Real-time global registrations",
        icon: Users,
        color: "bg-emerald-50 text-emerald-600 border-emerald-100"
      },
      { 
        title: "Panchakarma Services", 
        value: stats.panchakarmaTreatments, 
        label: "Total treatments administered",
        icon: Activity,
        color: "bg-amber-50 text-amber-600 border-amber-100"
      },
      { 
        title: "Yoga & Wellness", 
        value: stats.yogaSessions, 
        label: "Total sessions conducted state-wide",
        icon: Star,
        color: "bg-purple-50 text-purple-600 border-purple-100"
      }
    ];

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="pt-24 px-4 sm:px-8 max-w-7xl mx-auto pb-40"
      >
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">State Healthcare <br /><span className="text-emerald-600">Analytics</span></h1>
            <p className="text-slate-500 mt-2 font-medium">Verified real-time data from Uttarakhand's AYUSH network.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={fetchGlobalStats}
              disabled={realStats.loading}
              className="bg-emerald-50 text-emerald-600 p-3 rounded-full hover:bg-emerald-100 transition-all"
            >
              <Activity size={20} className={realStats.loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="bg-slate-100 p-3 rounded-full hover:bg-slate-200 transition-all hidden sm:block"
            >
              <X size={24} className="text-slate-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((card, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-8 rounded-[2.5rem] border ${card.color} shadow-sm group hover:shadow-xl transition-all h-full flex flex-col`}
            >
              <div className="bg-white/50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <card.icon size={24} />
              </div>
              <div className="flex-1">
                <div className="text-4xl font-black tracking-tighter mb-1 select-none">
                  {realStats.loading ? '...' : card.value.toLocaleString()}
                </div>
                <h3 className="text-sm font-bold opacity-80 uppercase tracking-widest">{card.title}</h3>
              </div>
              <p className="text-slate-500 text-[10px] font-bold mt-4 leading-normal">{card.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8">
            <div className="bg-white border border-gray-100 p-10 rounded-[2.5rem] shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Building2 className="text-emerald-600" size={24} />
                Medical Systems Distribution
              </h3>
              <div className="space-y-6">
                {['Ayurveda', 'Unani'].map(sys => {
                  const total = hospitals.filter(h => h.system && h.system !== '').length || 1;
                  const count = hospitals.filter(h => h.system === sys).length;
                  const percentage = Math.round((count / total) * 100) || 0;
                  return (
                    <div key={sys} className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-slate-600">{sys}</span>
                        <span className="text-emerald-600 tracking-tight">{count} Units ({percentage}%)</span>
                      </div>
                      <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-gray-50">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-10 rounded-[2.5rem] shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <LayoutDashboard className="text-blue-500" size={24} />
                Facility Type Distribution
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Array.from(new Set(hospitals.map(h => h.type).filter(t => t))).sort().map(type => {
                  const count = hospitals.filter(h => h.type === type).length;
                  return (
                    <div key={type} className="p-4 bg-slate-50 rounded-2xl border border-gray-50 group hover:bg-white hover:border-blue-100 transition-all">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{type}</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-10 rounded-[2.5rem] shadow-sm flex flex-col justify-center items-center text-center">
             <div className="bg-emerald-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6">
               <ShieldCheck size={40} />
             </div>
             <h3 className="text-2xl font-bold text-slate-900">Verified System Data</h3>
             <p className="text-slate-500 mt-4 leading-relaxed max-w-sm">
               All statistics are generated directly from encrypted server records. 
               Data is updated automatically as healthcare transactions occur state-wide.
             </p>
             <div className="mt-8 flex gap-3">
                <span className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Live Sync
                </span>
                <span className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Verified
                </span>
             </div>
          </div>
        </div>

        {/* YouTube Channel Link */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 pt-8 border-t border-gray-100 text-center"
        >
          <a 
            href="https://www.youtube.com/@ukdirayurved" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-red-50 text-red-600 px-8 py-4 rounded-3xl font-bold hover:bg-red-600 hover:text-white transition-all group scale-90 sm:scale-100"
          >
            <div className="bg-red-600 text-white p-1.5 rounded-lg group-hover:bg-white group-hover:text-red-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
            </div>
            <span>Departmental YouTube Channel</span>
          </a>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">@ukdirayurved</p>
        </motion.div>
      </motion.div>
    );
  };

  const renderHospitals = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="pt-24 px-4 sm:px-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">Hospital Directory</h1>
          <p className="text-slate-500 mt-2">Explore and manage healthcare facilities</p>
        </div>
      </div>

      {hospitalSubTab === 'hospitals' && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div className="w-full md:w-auto flex gap-3">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search by name, district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 border border-gray-100 rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <button className="bg-neutral-50 border border-gray-100 p-3 rounded-full text-slate-600 hover:bg-neutral-100 transition-all">
                <Filter size={20} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
              <p className="text-slate-400 font-medium">Loading hospital directory...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4 text-center px-4">
              <p className="text-red-500 font-medium max-w-md">{error}</p>
              <button 
                onClick={fetchHospitals}
                className="bg-emerald-600 text-white px-8 py-3 rounded-full font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredHospitals.map(facility => (
                <FacilityCard 
                  key={facility.sr_no} 
                  name={facility.facility_name}
                  rating={4.5 + (Math.random() * 0.5)}
                  district={facility.district}
                  system={facility.system}
                  image={getHospitalImage(facility.sr_no)}
                  isAdmin={canEditFacility(facility)}
                  onEdit={() => {
                    setEditingHospital(facility);
                    setIsEditOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
      {hospitalSubTab === 'employees' && (
        selectedStaffId ? (
          <ServiceRecordTab hospitals={hospitals} targetStaffId={selectedStaffId} isAdminMode={true} onBack={() => setSelectedStaffId(null)} />
        ) : (
          <EmployeeDirectory hospitals={hospitals} session={session} onStaffClick={setSelectedStaffId} />
        )
      )}
      {hospitalSubTab === 'incharges' && session && <InchargeManagement session={session} />}
    </motion.div>
  );

  const renderProfile = () => {
    if (!session) return null;
    return <ProfilePage session={session} onUpdate={fetchHospitals} />;
  };

  const renderTools = () => {
    if (!session) return null;
    return (
      <div className="pt-24 px-4 sm:px-8 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Admin Tools</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {session.role === 'SUPER_ADMIN' && (
            <>
              <button 
                onClick={() => setActiveTab('disease_management')}
                className="bg-white/40 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] font-bold text-slate-900 shadow-sm hover:bg-white/60 transition-all"
              >
                Disease Management
              </button>
              <button 
                onClick={() => setActiveTab('role_management')}
                className="bg-white/40 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] font-bold text-slate-900 shadow-sm hover:bg-white/60 transition-all"
              >
                Role Management
              </button>
              <button 
                onClick={() => setActiveTab('staff_distribution')}
                className="bg-white/40 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] font-bold text-slate-900 shadow-sm hover:bg-white/60 transition-all"
              >
                Staff Distribution Summary
              </button>
              <button 
                onClick={() => setIsAddMedicineOpen(true)}
                className="bg-white/40 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] font-bold text-slate-900 shadow-sm hover:bg-white/60 transition-all"
              >
                Add New Medicine
              </button>
            </>
          )}
          {(session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN') && (
            <>
              <button 
                onClick={toggleTransferModule}
                className={`bg-white/40 backdrop-blur-xl border p-8 rounded-[2.5rem] font-bold text-slate-900 shadow-sm hover:bg-white/60 transition-all flex flex-col items-start gap-4 ${isTransferEnabled ? 'border-emerald-500' : 'border-white/40'}`}
              >
                <div className="flex justify-between w-full items-center">
                  <span>Transfer Module Control</span>
                  <div className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1 ${isTransferEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {isTransferEnabled && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                    {isTransferEnabled ? 'LIVE' : 'DISABLED'}
                  </div>
                </div>
                <p className="text-sm text-slate-500 font-normal">Master switch to enable or disable the transfer module for all districts.</p>
              </button>
              <button 
                onClick={toggleSthananataranModule}
                className={`bg-white/40 backdrop-blur-xl border p-8 rounded-[2.5rem] font-bold text-slate-900 shadow-sm hover:bg-white/60 transition-all flex flex-col items-start gap-4 ${isSthananataranEnabled ? 'border-emerald-500' : 'border-white/40'}`}
              >
                <div className="flex justify-between w-full items-center">
                  <span>Sthananataran Module Control</span>
                  <div className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1 ${isSthananataranEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {isSthananataranEnabled && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                    {isSthananataranEnabled ? 'LIVE' : 'DISABLED'}
                  </div>
                </div>
                <p className="text-sm text-slate-500 font-normal">Master switch to enable or disable the Sthananataran module for all districts.</p>
              </button>
            </>
          )}
          {(session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN' || (session.role === 'DISTRICT_ADMIN' && isTransferEnabled)) && (
            <button 
              onClick={() => setActiveTab('transfer_requests')}
              className="bg-white/40 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] font-bold text-slate-900 shadow-sm hover:bg-white/60 transition-all"
            >
              Transfer Requests
            </button>
          )}
          {(session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN') && (
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="bg-white/40 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] font-bold text-red-600 shadow-sm hover:bg-red-50 transition-all flex flex-col items-start gap-2"
            >
              <span>Delete Employee</span>
              <span className="text-sm font-normal text-red-400">Permanently remove records</span>
            </button>
          )}

          <AddMedicineModal isOpen={isAddMedicineOpen} onClose={() => setIsAddMedicineOpen(false)} onSuccess={() => alert('Medicine added successfully')} />
          <SearchDeleteEmployeeModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onDelete={() => {}}
          />
        </div>
      </div>
    );
  };

  const renderDiseaseManagement = () => {
    if (!session || session.role !== 'SUPER_ADMIN') return null;
    return <DiseaseManagement session={session} />;
  };

  const renderRoleManagement = () => {
    if (!session || session.role !== 'SUPER_ADMIN') return null;
    return <RoleManagement />;
  };

  const renderStaffDistributionSummary = () => {
    console.log('renderStaffDistributionSummary called', { session });
    if (!session || session.role !== 'SUPER_ADMIN') return null;
    return <StaffDistributionSummary />;
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      <nav className="sticky top-0 left-0 right-0 z-[60] px-4 sm:px-8 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="text-lg font-bold tracking-tighter text-slate-900 hover:opacity-80 transition-opacity cursor-pointer flex items-center shrink-0"
          >
            e-AYUSH <span className="text-emerald-600 ml-1">Seva</span>
          </button>
          {session && currentHospital && session.role !== 'SUPER_ADMIN' && session.role !== 'STATE_ADMIN' && (
            <div className="flex pl-2 sm:pl-4 border-l border-gray-200 items-center gap-2 min-w-0">
              <button 
                onClick={() => setIsHospitalDetailsOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 hover:bg-slate-50 p-1.5 sm:p-2 rounded-lg transition-colors group min-w-0"
              >
                <Building2 size={14} className="text-emerald-600 group-hover:scale-110 transition-transform shrink-0 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-sm font-bold text-slate-600 tracking-tight text-left truncate">{currentHospital.facility_name}</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {!session ? (
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
            >
              <LogIn size={16} />
              Portal Login
            </button>
          ) : (
            <div className="flex items-center gap-4">
              {/* Notification Icon */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`p-2.5 rounded-full bg-slate-50 transition-all ${hasNotifications ? 'text-emerald-600 animate-pulse' : 'text-slate-400 hover:text-emerald-600'}`}
                >
                  <Bell size={20} className={hasNotifications ? 'animate-bounce' : ''} />
                </button>
                {hasNotifications && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                )}

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsNotificationsOpen(false)} 
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20"
                      >
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                          <h3 className="font-bold text-slate-900">Notifications</h3>
                          {hasNotifications && (
                            <button 
                              onClick={handleMarkAllAsRead}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                          {notifications.length > 0 ? (
                            notifications.map(notification => (
                              <div 
                                key={notification.id} 
                                onClick={() => handleNotificationClick(notification.id)}
                                className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${notification.read ? 'bg-white hover:bg-slate-50' : 'bg-emerald-50/50 hover:bg-emerald-50'}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className={`text-sm font-bold ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
                                    {notification.title}
                                  </h4>
                                  {!notification.read && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed mb-2">
                                  {notification.message}
                                </p>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  {new Date(notification.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-slate-400">
                              <Bell size={24} className="mx-auto mb-2 opacity-20" />
                              <p className="text-sm font-medium">No notifications</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Menu Trigger */}
              <div className="relative">
                <button 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500 shadow-sm hover:scale-105 transition-all active:scale-95"
                >
                  {session.photograph ? (
                    <img src={session.photograph} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <UserIcon size={20} />
                    </div>
                  )}
                </button>

                {/* Profile Dropdown */}
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsProfileMenuOpen(false)} 
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-20"
                      >
                        <div className="p-6 bg-slate-900 text-white">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Signed in as</p>
                          <p className="font-bold text-lg truncate">{session.name || 'Staff User'}</p>
                          <p className="text-xs text-emerald-400 font-bold mt-1 uppercase tracking-widest">{session.role.replace('_', ' ')}</p>
                        </div>
                        
                        <div className="p-4 space-y-1">
                          <div className="px-4 py-3 bg-slate-50 rounded-2xl mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Connected Facility</p>
                            <p className="text-sm font-bold text-slate-900 mt-1">{currentHospital?.facility_name || 'N/A'}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{currentHospital?.district || 'N/A'}</p>
                          </div>

                          <button 
                            onClick={() => {
                              setActiveTab('profile');
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                          >
                            <UserIcon size={18} className="text-slate-400" />
                            My Profile
                          </button>
                          
                          <button 
                            onClick={() => {
                              setActiveTab('profile'); // Assuming password change is in profile
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                          >
                            <Key size={18} className="text-slate-400" />
                            Change Password
                          </button>

                          <div className="h-px bg-gray-100 my-2 mx-2" />

                          <button 
                            onClick={() => {
                              handleLogout();
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
                          >
                            <LogOut size={18} />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </nav>

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onLogin={handleLogin} 
      />

      <EditHospitalModal
        hospital={editingHospital}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdate={fetchHospitals}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />

      <HospitalDetailsModal
        hospital={currentHospital || null}
        isOpen={isHospitalDetailsOpen}
        onClose={() => setIsHospitalDetailsOpen(false)}
        staffId={session?.id || ''}
      />

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          (session?.role === 'HOSPITAL' || session?.role === 'STAFF') ? (
            <motion.div key="doctor-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DoctorCommandCenter 
                session={session} 
                hospitalName={currentHospital?.facility_name} 
                hospitalDetails={currentHospital}
                hospitals={hospitals}
                onOpenEParchi={() => setActiveTab('eparchi')} 
                onEditHospital={() => {
                  setEditingHospital(currentHospital);
                  setIsEditOpen(true);
                }}
                onUpdateHospital={fetchHospitals}
                onHospitalProfileDirtyChange={setIsHospitalProfileDirty}
              />
            </motion.div>
          ) : (
            renderDashboard()
          )
        )}
        {activeTab === 'tools' && renderTools()}
        {activeTab === 'disease_management' && renderDiseaseManagement()}
        {activeTab === 'rapid_tests' && session && (
          <RapidTests hospitalId={session.hospitalId || (currentHospital?.hospital_id || session.id)} staffId={session.id} />
        )}
        {activeTab === 'role_management' && renderRoleManagement()}
        {activeTab === 'staff_distribution' && renderStaffDistributionSummary()}
        {activeTab === 'nearby' && renderNearbyHospitals()}
        {activeTab === 'rate' && (
          <motion.div key="rate-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RatePage 
              hospitals={hospitals} 
              userLocation={userLocation} 
              setActiveTab={setActiveTab} 
              calculateDistance={calculateDistance} 
            />
          </motion.div>
        )}
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'patients' && (
          <motion.div key="patients-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PatientList 
              hospitalId={(session?.role === 'SUPER_ADMIN' || session?.role === 'STATE_ADMIN') ? '' : (session?.hospitalId || currentHospital?.hospital_id || session?.id || '')} 
              session={session}
            />
          </motion.div>
        )}
        {activeTab === 'hospitals' && (
          (session?.role === 'SUPER_ADMIN' || session?.role === 'STATE_ADMIN' || session?.role === 'DISTRICT_ADMIN') 
            ? <HospitalDirectory session={session} activeSubTab={hospitalSubTab} /> 
            : renderHospitals()
        )}
        {activeTab === 'eparchi' && (session?.role === 'HOSPITAL' || session?.role === 'STAFF') && (
          <motion.div key="eparchi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EParchi 
              hospitalId={session.activeHospitalId || session.hospitalId || session.id} 
              hospitalName={currentHospital?.facility_name}
              district={currentHospital?.district}
              hospitalType={currentHospital?.type}
              regionIndicator={currentHospital?.region_indicator}
              session={session}
              onNavigateToIndent={() => {
                setPharmacySubTab('list');
                setActiveTab('pharmacy_dashboard');
              }}
            />
          </motion.div>
        )}
        {activeTab === 'patients' && (session?.role === 'HOSPITAL' || session?.role === 'STAFF') && (
          <motion.div key="patients" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PatientList 
              hospitalId={session.activeHospitalId || session.hospitalId || session.id} 
              hospitalName={currentHospital?.facility_name}
            />
          </motion.div>
        )}
        {activeTab === 'employees' && (session?.role === 'SUPER_ADMIN' || session?.role === 'STATE_ADMIN' || session?.role === 'DISTRICT_ADMIN') && (
          <motion.div key="employees" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {selectedStaffId ? (
              <ServiceRecordTab 
                hospitals={hospitals} 
                targetStaffId={selectedStaffId} 
                isAdminMode={true} 
                onBack={() => setSelectedStaffId(null)} 
                employmentType={
                  (
                    allStaff.find(s => s.id === selectedStaffId) || 
                    hospitals.flatMap(h => (h as any).staff || []).find(s => s?.id === selectedStaffId) || 
                    {} as any
                  ).employment_type || 'Permanent'
                }
              />
            ) : (
              <EmployeeDirectory hospitals={hospitals} session={session} onStaffClick={setSelectedStaffId} />
            )}
          </motion.div>
        )}
        {activeTab === 'demands' && session && (
          <motion.div key="demands" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MedicineDemandSystem session={session} />
          </motion.div>
        )}
        {activeTab === 'password_reset' && session && (session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN' || session.role === 'DISTRICT_ADMIN') && (
          <motion.div key="password_reset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdminPasswordReset session={session} />
          </motion.div>
        )}
        {activeTab === 'admin_management' && session && (session.role === 'SUPER_ADMIN' || (session.role === 'STATE_ADMIN' && (!session.access_pages?.length || session.access_pages.includes('admin_management')))) && (
          <motion.div key="admin_management" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdminCreator session={session} />
          </motion.div>
        )}
        {activeTab === 'supply_upload' && (session?.role === 'SUPER_ADMIN' || session?.role === 'STATE_ADMIN') && (
          <motion.div key="supply_upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StateSupplyDashboard activeSubTab={supplySubTab} />
          </motion.div>
        )}
        {activeTab === 'district_supply' && (session?.role === 'DISTRICT_ADMIN' || session?.role === 'DISTRICT_MEDICINE_INCHARGE') && (
          <motion.div key="district_supply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DistrictSupplyManager session={session} />
          </motion.div>
        )}
        {activeTab === 'incharge' && session && (session?.role === 'SUPER_ADMIN' || session?.role === 'STATE_ADMIN' || session?.role === 'DISTRICT_ADMIN') && (
          <motion.div key="incharge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InchargeManagement session={session} />
          </motion.div>
        )}
        {activeTab === 'pharmacy_dashboard' && session?.role === 'PHARMACY_MANAGER' && (
          <motion.div key="pharmacy_dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PharmacyManagerDashboard session={session} initialMedicineSubTab={pharmacySubTab} />
          </motion.div>
        )}
        {activeTab === 'transfer_module' && isTransferEnabled && (
          <motion.div key="transfer_module" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TransferModule session={session} activeSubTab={transferSubTab} />
          </motion.div>
        )}
        {activeTab === 'transfer_module' && !isTransferEnabled && (
          <motion.div key="transfer_disabled" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Module disabled by State Admin</h2>
          </motion.div>
        )}
        {activeTab === 'sthanantaran' && (session?.role === 'SUPER_ADMIN' || session?.role === 'STATE_ADMIN' || session?.role === 'DISTRICT_ADMIN') && (
          <motion.div key="sthanantaran" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdminTransferList session={session} />
          </motion.div>
        )}
        {activeTab === 'registrations' && (
          <motion.div 
            key="registrations" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
            className="pt-8 px-4 sm:px-8 max-w-7xl mx-auto"
          >
            <RegistrationRequests session={session} />
          </motion.div>
        )}
        {activeTab === 'requests' && (
          <motion.div 
            key="requests" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
            className="pt-8 px-4 sm:px-8 max-w-7xl mx-auto"
          >
            {requestsSubTab === 'transfer_requests' && (
              (session?.role === 'SUPER_ADMIN' || session?.role === 'STATE_ADMIN' || (session?.role === 'DISTRICT_ADMIN' && isTransferEnabled)) ? (
                <TransferRequests session={session} />
              ) : (
                <div className="pt-20 text-center">
                  <h2 className="text-2xl font-bold text-slate-900">Module disabled by State Admin</h2>
                </div>
              )
            )}
            {requestsSubTab === 'registration_requests' && (
              <RegistrationRequests session={session} />
            )}
          </motion.div>
        )}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'panchakarma' && (
          <motion.div key="panchakarma" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {(session?.role === 'SUPER_ADMIN' || session?.role === 'STATE_ADMIN') ? (
              <PanchakarmaAdminDashboard />
            ) : (
              <PanchakarmaModule session={session} />
            )}
          </motion.div>
        )}
        {(activeTab === 'doctors' || activeTab === 'tools' || activeTab === 'staff') && (
          <motion.div 
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-40 text-center"
          >
            <h2 className="text-2xl font-bold text-slate-300 uppercase tracking-widest">
              {activeTab} Module Coming Soon
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-tab Container */}
      {(activeTab === 'hospitals' || activeTab === 'supply_upload' || activeTab === 'transfer_module') && (
        <div className="fixed bottom-[60px] md:bottom-[68px] left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg rounded-full overflow-x-auto flex p-1 gap-1 w-max max-w-[95vw]">
          {activeTab === 'hospitals' && (
            <>
              <button onClick={() => setHospitalSubTab('hospitals')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${hospitalSubTab === 'hospitals' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Hospitals</button>
              <button onClick={() => setHospitalSubTab('employees')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${hospitalSubTab === 'employees' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Employees</button>
              <button onClick={() => setHospitalSubTab('incharges')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${hospitalSubTab === 'incharges' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Incharges</button>
            </>
          )}
          {activeTab === 'supply_upload' && (
            <>
              <button onClick={() => setSupplySubTab('monitor')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${supplySubTab === 'monitor' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Monitor</button>
              <button onClick={() => setSupplySubTab('upload')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${supplySubTab === 'upload' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Upload</button>
              <button onClick={() => setSupplySubTab('manual')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${supplySubTab === 'manual' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Manual</button>
              <button onClick={() => setSupplySubTab('samples')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${supplySubTab === 'samples' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Samples</button>
              <button onClick={() => setSupplySubTab('rishikul')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${supplySubTab === 'rishikul' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Rishikul</button>
            </>
          )}
          {activeTab === 'transfer_module' && (
            <>
              <button onClick={() => setTransferSubTab('hospitals')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${transferSubTab === 'hospitals' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Hospitals</button>
              <button onClick={() => setTransferSubTab('employees')} className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap ${transferSubTab === 'employees' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Employees</button>
            </>
          )}
        </div>
      )}

      {!(session?.role === 'HOSPITAL' || session?.role === 'STAFF') && (
        <BottomNav 
          active={activeTab} 
          setActive={setActiveTab} 
          role={session?.role || null} 
          isTransferEnabled={isTransferEnabled}
          hasPanchakarma={currentHospital?.panchakarma_centre}
          modules={session?.modules || []}
          isIncharge={currentHospital ? currentHospital.incharge_staff_id === session?.id : false}
          accessPages={session?.access_pages || []}
        />
      )}
      {/* Unsaved Changes Modal */}
      <AnimatePresence>
        {showUnsavedModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-gray-100"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                <Building2 size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Want to Save Profile Before Leaving?</h3>
              <p className="text-slate-500 mb-8">You have unsaved changes in the hospital profile. What would you like to do?</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowUnsavedModal(false);
                    setPendingTab(null);
                  }}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                >
                  Yes, Go back
                </button>
                <button
                  onClick={() => {
                    setIsHospitalProfileDirty(false);
                    setShowUnsavedModal(false);
                    if (pendingTab) _setActiveTab(pendingTab as any);
                    setPendingTab(null);
                  }}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-[0.98]"
                >
                  No, discard changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <InstallPrompt />
      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}

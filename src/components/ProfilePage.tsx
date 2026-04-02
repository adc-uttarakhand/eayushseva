import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Lock, Shield, Save, Loader2, Building2, Key, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';

interface ProfilePageProps {
  session: UserSession;
  onUpdate?: () => void;
}

export default function ProfilePage({ session, onUpdate }: ProfilePageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    system: '',
    designation: '',
    userId: ''
  });

  useEffect(() => {
    fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      if (session.role === 'STATE_ADMIN' || session.role === 'DISTRICT_ADMIN' || session.role === 'DISTRICT_MEDICINE_INCHARGE') {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.id);
        const queryColumn = isUuid ? 'id' : 'admin_userid';
        
        const { data, error } = await supabase
          .from('admin_logins')
          .select('*')
          .eq(queryColumn, session.id)
          .single();

        if (data) {
          setFormData({
            name: data.name || '',
            email: data.email_id || data.admin_userid || '',
            mobile: data.mobile_number || '',
            password: data.admin_password || '',
            system: data.access_systems?.join(', ') || 'All',
            designation: session.role.replace('_', ' '),
            userId: data.admin_userid || session.id
          });
        }
      } else if (session.role === 'HOSPITAL') {
        const { data, error } = await supabase
          .from('hospitals')
          .select('*')
          .eq('hospital_id', session.id)
          .single();

        if (data) {
          setFormData({
            name: data.facility_name || '',
            email: data.email || '',
            mobile: data.mobile || '',
            password: data.hospital_password || '',
            system: data.system || '',
            designation: 'Hospital Administrator',
            userId: session.id
          });
        }
      } else if (session.role === 'STAFF') {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('id', session.id)
          .single();

        if (data) {
          setFormData({
            name: data.full_name || '',
            email: data.email_id || '',
            mobile: data.mobile_number || '',
            password: data.login_password || '',
            system: '', // Staff usually tied to hospital system
            designation: data.role || 'Staff',
            userId: session.id
          });
        }
      } else if (session.role === 'SUPER_ADMIN') {
        setFormData({
          name: 'Super Admin',
          email: 'admin@uttarakhand.gov.in',
          mobile: '9999999999',
          password: 'Shutup@99',
          system: 'All',
          designation: 'Super Administrator',
          userId: session.id
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (session.role === 'STATE_ADMIN' || session.role === 'DISTRICT_ADMIN' || session.role === 'DISTRICT_MEDICINE_INCHARGE') {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.id);
        const queryColumn = isUuid ? 'id' : 'admin_userid';

        const { error } = await supabase
          .from('admin_logins')
          .update({
            name: formData.name,
            admin_password: formData.password,
            email_id: formData.email,
            mobile_number: formData.mobile
          })
          .eq(queryColumn, session.id);
        
        if (error) throw error;
      } else if (session.role === 'HOSPITAL') {
        const { error } = await supabase
          .from('hospitals')
          .update({
            facility_name: formData.name,
            hospital_password: formData.password,
            email: formData.email,
            mobile: formData.mobile
          })
          .eq('hospital_id', session.id);
        
        if (error) throw error;
      } else if (session.role === 'STAFF') {
        const { error } = await supabase
          .from('staff')
          .update({
            full_name: formData.name,
            login_password: formData.password,
            email_id: formData.email,
            mobile_number: formData.mobile
          })
          .eq('id', session.id);
        
        if (error) throw error;
      }
      
      alert('Profile updated successfully!');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert('Error updating profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-slate-400 font-medium tracking-widest uppercase text-[10px]">Loading Profile...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-12 pb-40"
    >
      <div className="bg-white rounded-2xl md:rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-gray-100 overflow-hidden">
        <div className="bg-slate-900 p-4 md:p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <User size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{formData.name}</h1>
                <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mt-1">{formData.designation}</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        </div>

        <form onSubmit={handleSave} className="p-4 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Shield size={18} className="text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Personal Information</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="tel"
                      value={formData.mobile}
                      onChange={e => setFormData({...formData, mobile: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Key size={18} className="text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Security & System</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">User ID</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text"
                      readOnly
                      value={formData.userId}
                      className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none font-bold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Change Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-12 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium"
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">System / Access</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text"
                      readOnly
                      value={formData.system}
                      className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none font-bold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving || session.role === 'SUPER_ADMIN'}
              className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

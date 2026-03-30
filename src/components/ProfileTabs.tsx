import React from 'react';
import { User, Shield, UserCircle2, Camera, Loader2, Upload, Eye, EyeOff } from 'lucide-react';

export const renderBasicInfo = (
  profile: any,
  setProfile: any,
  isIncharge: boolean,
  hospitalName: string,
  roles: string[],
  userRole: string,
  showPassword: boolean,
  setShowPassword: (show: boolean) => void,
  fileInputRef: React.RefObject<HTMLInputElement>,
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  uploading: boolean,
  maskDate: (value: string) => string,
  UTTARAKHAND_DISTRICTS: string[],
  setIsHospitalChangeModalOpen: (open: boolean) => void
) => (
  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <User className="text-emerald-600" size={20} /> Basic Info
      </h2>
      {isIncharge && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full">
          <Shield className="text-emerald-600" size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Incharge, {hospitalName}</span>
        </div>
      )}
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="space-y-1 md:col-span-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Photograph (Passport Size)</label>
        <div className="flex gap-6 items-center bg-slate-50 p-6 rounded-3xl border border-gray-100">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center">
              {profile.photograph ? (
                <img src={profile.photograph} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 size={48} className="text-slate-400" />
              )}
            </div>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700 transition-all group-hover:scale-110"
            >
              <Camera size={16} />
            </button>
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Upload Photo</p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB. Will be auto-compressed to 50KB.</p>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button 
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
              {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              {uploading ? 'Uploading...' : 'Select File'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1 md:col-span-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Full Name</label>
        <input 
          value={profile.fullName} 
          onChange={e => setProfile({...profile, fullName: e.target.value})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
        />
      </div>

      <div className="space-y-1 md:col-span-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Role / Designation</label>
        <select 
          value={profile.designation} 
          onChange={e => setProfile({...profile, designation: e.target.value})} 
          disabled={!(isIncharge || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')}
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <option value="">Select Role</option>
          {roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        {!(isIncharge || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
          <p className="text-[10px] text-slate-400 ml-4 mt-1 italic">Only Incharge or Admin can modify your role.</p>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Login Password</label>
        <div className="relative">
          <input 
            type={showPassword ? "text" : "password"}
            value={profile.password} 
            onChange={e => setProfile({...profile, password: e.target.value})} 
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Employee ID</label>
        <input 
          value={profile.empId} 
          onChange={e => setProfile({...profile, empId: e.target.value})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Aadhaar Number</label>
        <input 
          value={profile.aadhaarNumber} 
          onChange={e => setProfile({...profile, aadhaarNumber: e.target.value})} 
          placeholder="12-digit Aadhaar"
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">BCP Registration Number</label>
        <input 
          value={profile.bcpRegistrationNo} 
          onChange={e => setProfile({...profile, bcpRegistrationNo: e.target.value})} 
          placeholder="Optional"
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Father's Name</label>
        <input 
          value={profile.fatherName} 
          onChange={e => setProfile({...profile, fatherName: e.target.value})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Email ID</label>
        <input 
          type="email"
          value={profile.email} 
          onChange={e => setProfile({...profile, email: e.target.value})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">System of Medicine</label>
        <input 
          value={profile.system} 
          readOnly
          className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none cursor-not-allowed text-slate-500 font-bold" 
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Connected Hospital</label>
        <div className="relative">
          <input 
            value={profile.hospitalConnectedName} 
            readOnly
            className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none cursor-not-allowed text-slate-500 font-bold" 
          />
          <button 
            type="button"
            onClick={() => setIsHospitalChangeModalOpen(true)}
            className="text-[10px] text-emerald-600 hover:underline mt-1 font-bold ml-4"
          >
            Change Hospital?
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Mobile</label>
        <input 
          value={profile.mobile} 
          onChange={e => setProfile({...profile, mobile: e.target.value})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Employment Type</label>
        <select 
          value={profile.employmentType} 
          onChange={e => setProfile({...profile, employmentType: e.target.value as any})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="Permanent">Permanent</option>
          <option value="Contractual">Contractual</option>
          <option value="Outsourced">Outsourced</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Class</label>
        <select 
          value={profile.employmentClass} 
          onChange={e => setProfile({...profile, employmentClass: e.target.value})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option>Class I</option>
          <option>Class II</option>
          <option>Class III</option>
          <option>Class IV</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Gender</label>
        <select 
          value={profile.gender} 
          onChange={e => setProfile({...profile, gender: e.target.value})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Date of Birth</label>
        <input 
          type="text"
          placeholder="DD-MMM-YYYY"
          value={profile.dob} 
          onChange={e => setProfile({...profile, dob: maskDate(e.target.value)})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Blood Group</label>
        <select 
          value={profile.bloodGroup} 
          onChange={e => setProfile({...profile, bloodGroup: e.target.value})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">Select</option>
          <option>A+</option>
          <option>A-</option>
          <option>B+</option>
          <option>B-</option>
          <option>AB+</option>
          <option>AB-</option>
          <option>O+</option>
          <option>O-</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Present District</label>
        <select 
          value={profile.presentDistrict} 
          onChange={e => setProfile({...profile, presentDistrict: e.target.value})} 
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">Select District</option>
          {UTTARAKHAND_DISTRICTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1 md:col-span-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Permanent Address</label>
        <textarea 
          value={profile.permanentAddress} 
          onChange={e => setProfile({...profile, permanentAddress: e.target.value})} 
          rows={2}
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Current Residential Address</label>
        <textarea 
          value={profile.currentResidentialAddress} 
          onChange={e => setProfile({...profile, currentResidentialAddress: e.target.value})} 
          rows={2}
          className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
        />
      </div>
    </div>
  </div>
);

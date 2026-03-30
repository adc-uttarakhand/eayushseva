import React from 'react';
import { Building2, MapPin, Calendar, Shield, Plus, X } from 'lucide-react';

export const renderServiceRecordTab = (
  profile: any,
  setProfile: any,
  hospitalDetails: any,
  hospitalName: string,
  maskDate: (value: string) => string,
  UTTARAKHAND_DISTRICTS: string[],
  updatePosting: (id: string, field: string, value: any) => void,
  addPosting: () => void,
  removePosting: (id: string) => void,
  formatDaysToYMD: (days: number) => void,
  parseDateStr: (d: string) => Date,
  offices: any[],
  hospitals: any[],
  OfficeSearchInput: any,
  HospitalSearchInput: any,
  serviceDays: any
) => (
  <div className="space-y-6">
    {/* Current Posting Info */}
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Building2 className="text-emerald-600" size={20} /> Service Record Details
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Date of First Appointment</label>
          <input 
            type="text"
            placeholder="DD-MMM-YYYY"
            value={profile.dateOfFirstAppointment} 
            onChange={e => setProfile({...profile, dateOfFirstAppointment: maskDate(e.target.value)})} 
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Date of 1st Joining in Dept</label>
          <input 
            type="text"
            placeholder="DD-MMM-YYYY"
            value={profile.dateOfFirstJoiningDepartment} 
            onChange={e => setProfile({...profile, dateOfFirstJoiningDepartment: maskDate(e.target.value)})} 
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">First Posting Place</label>
          <HospitalSearchInput
            value={profile.firstPostingPlace}
            onChange={(val: string) => setProfile({...profile, firstPostingPlace: val})}
            hospitals={hospitals}
            className="bg-slate-50 border-gray-100 rounded-2xl py-3 px-4"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Present Posting Place</label>
          <div className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 text-slate-600 font-bold min-h-[3rem] flex items-center">
            {hospitalDetails?.office_name ? `${hospitalDetails.office_name}, ${hospitalDetails.district || 'N/A'}` : (hospitalName || 'Not Assigned')}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Present Posting District</label>
          <div className="w-full bg-slate-100 border border-gray-100 rounded-2xl py-3 px-4 text-slate-600 font-bold">
            {hospitalDetails?.district || '---'}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Date of Joining at Present Posting</label>
          <input 
            type="text"
            placeholder="DD-MMM-YYYY"
            value={profile.currentPostingJoiningDate} 
            onChange={e => setProfile({...profile, currentPostingJoiningDate: maskDate(e.target.value)})} 
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
            <option>Permanent</option>
            <option>Contractual</option>
            <option>Outsourced</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Home District</label>
          <select 
            value={profile.homeDistrict} 
            onChange={e => setProfile({...profile, homeDistrict: e.target.value})} 
            className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select Home District</option>
            {UTTARAKHAND_DISTRICTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>
    </div>

    <div className={`bg-white rounded-3xl p-8 shadow-sm border border-gray-100 transition-all ${profile.employmentType !== 'Permanent' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <MapPin className="text-emerald-600" size={20} /> Posting History (Permanent Only)
      </h2>
      <div className="space-y-4">
        {profile.postings.map((posting: any, index: number) => (
          <div key={posting.id} className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-start border p-4 rounded-2xl ${index === 0 ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-100 bg-slate-50'}`}>
            <div className="space-y-1 md:col-span-5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">
                {index === 0 ? 'First Posting Place (Auto Fetched)' : 'Subsequent Posting'}
              </label>
              {index === 0 ? (
                <div className="w-full bg-slate-100 border border-gray-200 rounded-xl py-2 px-3 font-bold text-slate-700 min-h-[3rem] flex items-center leading-tight">
                  {posting.hospitalName}
                </div>
              ) : (
                <div className="space-y-2">
                  <select 
                    value={posting.postingType} 
                    onChange={e => updatePosting(posting.id, 'postingType', e.target.value)} 
                    className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Hospital">Hospital</option>
                    <option value="Office">Office</option>
                  </select>
                  {posting.postingType === 'Office' ? (
                    <OfficeSearchInput
                      isTextarea
                      value={posting.hospitalName}
                      onChange={(val: string) => updatePosting(posting.id, 'hospitalName', val)}
                      offices={offices}
                      placeholder="Type office name..."
                    />
                  ) : (
                    <HospitalSearchInput
                      isTextarea
                      value={posting.hospitalName}
                      onChange={(val: string) => updatePosting(posting.id, 'hospitalName', val)}
                      hospitals={hospitals}
                      placeholder="Type hospital name..."
                    />
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">From Date</label>
              <input 
                type="text"
                placeholder="DD-MMM-YYYY"
                value={posting.fromDate} 
                onChange={e => updatePosting(posting.id, 'fromDate', maskDate(e.target.value))} 
                className={`w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${index === 0 ? 'bg-slate-100 cursor-not-allowed' : ''}`} 
                readOnly={index === 0}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">To Date</label>
              <input 
                type="text"
                placeholder="DD-MMM-YYYY"
                value={posting.toDate} 
                onChange={e => updatePosting(posting.id, 'toDate', maskDate(e.target.value))} 
                className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Days</label>
              <div className="w-full bg-slate-100 border border-gray-200 rounded-xl py-2 px-3 text-center font-bold text-slate-600">
                <div className="text-lg">{posting.days || 0}</div>
                <div className="text-[10px] text-slate-400">{formatDaysToYMD(posting.days || 0)}</div>
              </div>
            </div>
            <div className="md:col-span-1 flex justify-center pt-6">
              <button 
                type="button"
                onClick={() => removePosting(posting.id)}
                className={`p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all ${index === 0 ? 'hidden' : ''}`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ))}

        <button 
          type="button"
          onClick={addPosting}
          className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-all px-4 py-2"
        >
          <Plus size={16} /> Add Another Posting
        </button>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 mt-6">
      <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 text-center shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Total Sugam Days</p>
        <p className="text-3xl font-black text-emerald-700 mt-1">{serviceDays.sugam}</p>
      </div>
      <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 text-center shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Total Durgam Days</p>
        <p className="text-3xl font-black text-amber-700 mt-1">{serviceDays.durgam}</p>
      </div>
      <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 text-center shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Total Durgam (Above 7000 ft) Days</p>
        <p className="text-3xl font-black text-rose-700 mt-1">{serviceDays.durgamAbove7000}</p>
      </div>
    </div>
  </div>
);

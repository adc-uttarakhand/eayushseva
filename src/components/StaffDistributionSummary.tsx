import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Users, AlertTriangle } from 'lucide-react';

export default function StaffDistributionSummary() {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    console.log('Fetching staff and roles data...');
    
    // Fetch all staff recursively
    let allStaff: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .range(from, to);

      if (error) {
        console.error('Supabase fetch error:', error);
        break;
      }

      if (data && data.length > 0) {
        allStaff = [...allStaff, ...data];
        if (data.length < 1000) {
          hasMore = false;
        } else {
          from += 1000;
          to += 1000;
        }
      } else {
        hasMore = false;
      }
    }
    
    // Fetch all roles
    const { data: rolesData, error: rolesError } = await supabase.from('roles').select('*');
    
    console.log('Fetch results:', { staffCount: allStaff.length, rolesData, rolesError });

    if (allStaff && rolesData) {
      // Group staff by role and count unique aadhar
      const staffCounts = allStaff.reduce((acc: any, staff: any) => {
        const role = staff.role;
        if (!role) return acc;
        if (!acc[role]) acc[role] = new Set();
        // Try different possible column names for aadhar
        const aadhar = staff.aadhar || staff.aadhaar_number || staff.aadhaar;
        if (aadhar) acc[role].add(aadhar);
        return acc;
      }, {});

      const summaryData = rolesData.map((role: any) => ({
        role: role.role_name || role.name,
        // Try different possible column names for sanctioned_count
        sanctioned: role.sanctioned_count || role.sanctioned || 0,
        active: staffCounts[role.role_name || role.name] ? staffCounts[role.role_name || role.name].size : 0
      }));
      setSummary(summaryData);
    } else {
      console.error('Failed to fetch data:', { rolesError });
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Users className="text-emerald-600" /> Staff Distribution Summary
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((item) => (
          <div key={item.role} className={`p-4 rounded-2xl border ${item.active < item.sanctioned ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-gray-100'}`}>
            <h3 className="font-bold text-slate-900">{item.role}</h3>
            <div className="flex justify-between mt-2">
              <span>Sanctioned: {item.sanctioned}</span>
              <span>Active: {item.active}</span>
            </div>
            {item.active < item.sanctioned && (
              <div className="mt-2 text-red-600 flex items-center gap-1 text-sm">
                <AlertTriangle size={16} /> Gap: {item.sanctioned - item.active}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

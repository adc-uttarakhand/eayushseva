import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, CheckCircle, Clock, Loader2, Download, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Sthananataran from './Sthananataran';

export default function AdminTransferList({ session }: { session: any }) {
    const currentYear = new Date().getFullYear();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubCategory, setSelectedSubCategory] = useState('');
    const [selectedApp, setSelectedApp] = useState<any>(null);

    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const filterOptions = React.useMemo(() => {
        const roles = Array.from(new Set(applications.map(a => a.category).filter(Boolean)));
        const districts = Array.from(new Set(applications.map(a => a.present_posting).filter(Boolean)));
        const categories = Array.from(new Set(applications.map(a => a.application_type).filter(Boolean)));
        const subCategories = Array.from(new Set(applications.map(a => a.transfer_category).filter(Boolean)));
        return { roles, districts, categories, subCategories };
    }, [applications]);

    const filteredApplications = React.useMemo(() => {
        return applications.filter(a => {
            const matchesSearch = a.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = !selectedRole || a.category === selectedRole;
            const matchesDistrict = !selectedDistrict || a.present_posting === selectedDistrict;
            const matchesCategory = !selectedCategory || a.application_type === selectedCategory;
            const matchesSubCategory = !selectedSubCategory || a.transfer_category === selectedSubCategory;
            return matchesSearch && matchesRole && matchesDistrict && matchesCategory && matchesSubCategory;
        });
    }, [applications, searchTerm, selectedRole, selectedDistrict, selectedCategory, selectedSubCategory]);

    useEffect(() => {
        const fetchApplications = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('transfer_applications')
                .select('*')
                .eq('transfer_year', currentYear.toString());
            
            if (error) {
                console.error('Error fetching applications:', error);
            } else {
                setApplications(data || []);
            }
            setIsLoading(false);
        };

        fetchApplications();
    }, [currentYear]);

    const handleRowClick = (app: any) => {
        setSelectedApp(app);
    };

    if (selectedApp) {
        return (
            <div className="p-8 bg-slate-50 min-h-screen">
                <button 
                    onClick={() => setSelectedApp(null)}
                    className="mb-6 px-4 py-2 bg-slate-200 text-slate-800 rounded-lg flex items-center gap-2 hover:bg-slate-300 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to List
                </button>
                <Sthananataran session={session} profile={selectedApp} />
            </div>
        );
    }

    const handleDownloadCSV = () => {
        const headers = [
            'Applicant Name', 'Home District', 'Present District', 'Posting Place', 
            'Posting Since', 'Category', 'Sub-category', 'Sugam Days', 
            'Durgam (<7000ft) Days', 'Durgam (>7000ft) Days', 'Status'
        ];
        
        const csvContent = [
            headers.join(','),
            ...filteredApplications.map(app => [
                `"${(app.applicant_name || '').replace(/"/g, '""')}"`,
                `"${(app.home_district || '').replace(/"/g, '""')}"`,
                `"${(app.present_posting || '').replace(/"/g, '""')}"`,
                `"${(app.present_posting_hospital || app.present_posting_place || app.main_posting_name || app.present_posting_name || '-').replace(/"/g, '""')}"`,
                `"${(app.present_posting_since || '').replace(/"/g, '""')}"`,
                `"${(app.application_type || '').replace(/"/g, '""')}"`,
                `"${(app.transfer_category || '').replace(/"/g, '""')}"`,
                app.calculated_sugam_days || 0,
                app.calculated_durgam_below_7000_days || 0,
                app.calculated_durgam_above_7000_days || 0,
                app.form_submitted ? 'Submitted' : 'Draft'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transfer_applications_${currentYear}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getChoiceName = (choice: any) => {
        if (!choice) return '-';
        return typeof choice === 'object' ? choice.hospital_name || choice.name || '-' : choice;
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Transfer Applications Session: {currentYear}</h1>
                <button 
                    onClick={handleDownloadCSV}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 text-sm font-medium transition-colors"
                >
                    <Download size={16} />
                    Download CSV
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center">
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="px-4 py-2 border rounded-lg text-sm bg-slate-50 text-slate-700">
                    <option value="">All Roles</option>
                    {filterOptions.roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} className="px-4 py-2 border rounded-lg text-sm bg-slate-50 text-slate-700">
                    <option value="">All Districts</option>
                    {filterOptions.districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2 border rounded-lg text-sm bg-slate-50 text-slate-700">
                    <option value="">All Categories</option>
                    {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)} className="px-4 py-2 border rounded-lg text-sm bg-slate-50 text-slate-700">
                    <option value="">All Sub Categories</option>
                    {filterOptions.subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by Applicant Name..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border rounded-lg text-sm w-full bg-slate-50"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0">
                            <tr>
                                <th className="p-4 font-semibold">Applicant Name</th>
                                <th className="p-4 font-semibold">Home District</th>
                                <th className="p-4 font-semibold">Present District</th>
                                <th className="p-4 font-semibold">Posting Place</th>
                                <th className="p-4 font-semibold">Posting Since</th>
                                <th className="p-4 font-semibold">Category</th>
                                <th className="p-4 font-semibold">Sub-category</th>
                                <th className="p-4 font-semibold">Sugam Days</th>
                                <th className="p-4 font-semibold">Durgam Days (&lt;7000ft)</th>
                                <th className="p-4 font-semibold">Durgam Days (&gt;7000ft)</th>
                                <th className="p-4 font-semibold">Choices</th>
                                <th className="p-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-slate-500">
                                        <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                                        Loading applications...
                                    </td>
                                </tr>
                            ) : filteredApplications.map((app) => (
                                <tr 
                                    key={app.id} 
                                    onClick={() => handleRowClick(app)}
                                    className="hover:bg-slate-50 cursor-pointer transition-all"
                                >
                                    <td className="p-4 font-medium text-slate-900">{app.applicant_name}</td>
                                    <td className="p-4">{app.home_district || '-'}</td>
                                    <td className="p-4">{app.present_posting}</td>
                                    <td className="p-4">{app.present_posting_hospital || app.present_posting_place || app.main_posting_name || app.present_posting_name || '-'}</td>
                                    <td className="p-4">{app.present_posting_since || '-'}</td>
                                    <td className="p-4">{app.application_type}</td>
                                    <td className="p-4">{app.transfer_category}</td>
                                    <td className="p-4">{app.calculated_sugam_days || 0}</td>
                                    <td className="p-4">{app.calculated_durgam_below_7000_days || 0}</td>
                                    <td className="p-4">{app.calculated_durgam_above_7000_days || 0}</td>
                                    <td className="p-4 truncate max-w-xs">
                                        {[app.choice_1, app.choice_2, app.choice_3, app.choice_4, app.choice_5, app.choice_6, app.choice_7, app.choice_8, app.choice_9, app.choice_10]
                                            .filter(c => c)
                                            .map((c, i) => `${i + 1}. ${getChoiceName(c)}`)
                                            .join(', ')}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-max ${app.form_submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {app.form_submitted ? <CheckCircle size={12} /> : <Clock size={12} /> }
                                            {app.form_submitted ? 'Submitted' : 'Draft'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

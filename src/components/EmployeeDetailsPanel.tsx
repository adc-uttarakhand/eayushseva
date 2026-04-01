import React from 'react';
import { X, Printer, CheckCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EmployeeDetailsPanelProps {
  employee: any;
  onClose: () => void;
}

export default function EmployeeDetailsPanel({ employee, onClose }: EmployeeDetailsPanelProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const fileName = `${employee.full_name}_Service_Report.pdf`;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.text(employee.full_name.toUpperCase(), 10, 18);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(employee.role, 10, 24);
    
    // Draw line under header
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1);
    doc.line(10, 25, 200, 25);
    
    // Top Right Indicators
    const district = getDistrictAbbreviation(employee.present_district);
    const status = employee.present_posting_status === 'Sugam' ? 'S' : 'D';
    
    // District Circle/Box
    doc.setFillColor(209, 250, 229); // emerald-100
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.roundedRect(170, 10, 12, 12, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(6, 78, 59); // emerald-800
    doc.text(district, 176, 17.5, { align: 'center' });
    
    // Status Circle/Box
    if (status === 'S') {
        doc.setFillColor(209, 250, 229); // emerald-100
        doc.setDrawColor(16, 185, 129); // emerald-500
        doc.setTextColor(6, 78, 59); // emerald-800
    } else {
        doc.setFillColor(254, 243, 199); // amber-100
        doc.setDrawColor(245, 158, 11); // amber-500
        doc.setTextColor(120, 53, 15); // amber-800
    }
    doc.roundedRect(185, 10, 12, 12, 2, 2, 'FD');
    doc.text(status, 191, 17.5, { align: 'center' });

    // Basic Information Section
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Basic Information', 10, 35);
    
    autoTable(doc, {
      startY: 40,
      body: [
        ['Full Name:', employee.full_name, 'Role:', employee.role],
        ['Employee ID:', employee.employee_id, 'DOB:', formatDate(employee.dob)],
        ['Home District:', employee.home_district, 'Mobile:', employee.mobile_number || 'N/A'],
        ['Present Hospital:', employee.present_hospital, 'Present District:', employee.present_district],
        ['Present Status:', employee.present_posting_status, 'Joining Date:', formatDate(employee.current_posting_joining_date)],
        ['Days in Current Posting:', calculateDaysInCurrentPosting(employee.current_posting_joining_date), '', ''],
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 35 },
        1: { cellWidth: 60 },
        2: { fontStyle: 'bold', cellWidth: 35 },
        3: { cellWidth: 60 }
      }
    });

    // Posting History (Integrated with Present Posting)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Posting History', 10, (doc as any).lastAutoTable.finalY + 10);
    
    const historyPostings = [...(employee.postings || [])].sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
    const postingHistoryBody = [
      [
        employee.present_hospital, 
        employee.present_posting_status, 
        employee.present_posting_above_7000ft || 'N/A', 
        `${formatDate(employee.current_posting_joining_date)} - ${formatDate(postingEndDate.toISOString())}`, 
        calculateDaysInCurrentPosting(employee.current_posting_joining_date)
      ],
      ...historyPostings.map((p: any) => [
        p.hospitalName, 
        p.status, 
        p.above7000, 
        `${formatDate(p.fromDate)} - ${formatDate(p.toDate || postingEndDate.toISOString())}`, 
        p.days
      ])
    ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Hospital', 'Status', 'Above 7000ft', 'Duration', 'Total Days']],
      body: postingHistoryBody,
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1 },
    });

    // Leave Records
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Leave Records', 10, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Type', 'Duration', 'Total Days']],
      body: sortData(employee.long_leaves, 'fromDate').map((l: any) => [
        l.leaveType, 
        `${formatDate(l.fromDate)} - ${formatDate(l.toDate)}`, 
        l.totalDays
      ]),
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1 },
    });

    // Attachment Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Attachment Details', 10, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Hospital', 'Status', 'Above 7000ft', 'Duration', 'Total Days']],
      body: sortData(employee.attachments, 'from').map((a: any) => [
        a.hospital, 
        a.status, 
        a.above7000, 
        `${formatDate(a.from)} - ${formatDate(a.to)}`, 
        a.days
      ]),
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1 },
    });

    // Service Days Brief
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Service Days Brief', 10, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Leaves', 'Att. Sugam', 'Att. Durgam', 'Att. >7k', 'Total Sugam', 'Total Durgam', 'Total >7k']],
      body: [[
        employee.long_leaves_count, 
        employee.attachment_sugam_days, 
        employee.attachment_durgam_days, 
        employee.attachment_durgam_above_7000_days, 
        employee.total_sugam_days, 
        employee.total_durgam_below_7000_days, 
        employee.total_durgam_above_7000_days
      ]],
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1 },
    });

    // Footer / Verification
    if (employee.is_verified) {
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setDrawColor(226, 232, 240);
      doc.line(10, finalY - 5, 200, finalY - 5);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Submitted by: ${employee.full_name} | Last edited: ${formatDate(employee.last_edited_on)}`, 10, finalY);
      
      doc.setFillColor(209, 250, 229);
      doc.roundedRect(10, finalY + 5, 190, 20, 3, 3, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(6, 78, 59);
      doc.text('VERIFIED', 15, finalY + 18);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Verified at: ${formatDate(employee.last_verified_on)}`, 45, finalY + 14);
      doc.text(`Verified By (DAUO): DAUO ${employee.present_district || 'N/A'}`, 45, finalY + 20);
    }

    doc.save(fileName);
  };

  const getPostingEndDate = () => {
    return new Date(new Date().getFullYear(), 4, 31); // 31 May of present year
  };

  const calculateDaysInCurrentPosting = (joiningDate: string) => {
    if (!joiningDate) return 'N/A';
    const start = new Date(joiningDate);
    const end = getPostingEndDate();
    if (isNaN(start.getTime())) return 'N/A';
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getDistrictAbbreviation = (district: string) => {
    const mapping: Record<string, string> = {
      'Almora': 'ALM',
      'Uttarkashi': 'UKI',
      'Dehradun': 'DDN',
      'Haridwar': 'HWR',
      'Nainital': 'NTL',
      'Pauri Garhwal': 'PAU',
      'Tehri Garhwal': 'TEH',
      'Chamoli': 'CHM',
      'Rudraprayag': 'RUD',
      'Pithoragarh': 'PIT',
      'Champawat': 'CMP',
      'Bageshwar': 'BAG',
      'Udham Singh Nagar': 'USN'
    };
    return mapping[district] || (district ? district.substring(0, 3).toUpperCase() : 'N/A');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const sortData = (data: any[], dateField: string) => {
    return [...(data || [])].sort((a, b) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime());
  };

  const postingEndDate = getPostingEndDate();

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex justify-end">
      <div className="bg-white w-full max-w-3xl h-full overflow-y-auto p-10 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
          <X size={24} />
        </button>

        <div className="flex justify-between items-start mb-8 border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold uppercase">{employee.full_name}</h1>
            <p className="text-slate-500 font-medium">{employee.role}</p>
          </div>
          <div className="flex gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center font-bold text-emerald-800" title="District">
              {getDistrictAbbreviation(employee.present_district)}
            </div>
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold ${employee.present_posting_status === 'Sugam' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-amber-100 border-amber-500 text-amber-800'}`} title="Status">
              {employee.present_posting_status === 'Sugam' ? 'S' : 'D'}
            </div>
          </div>
        </div>

        <section className="mb-8">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p><strong>Full Name:</strong> {employee.full_name}</p>
            <p><strong>Role:</strong> {employee.role}</p>
            <p><strong>Employee ID:</strong> {employee.employee_id}</p>
            <p><strong>DOB:</strong> {formatDate(employee.dob)}</p>
            <p><strong>Home District:</strong> {employee.home_district}</p>
            <p><strong>Present Hospital:</strong> {employee.present_hospital}</p>
            <p><strong>Present District:</strong> {employee.present_district}</p>
            <p><strong>Mobile Number:</strong> {employee.mobile_number || 'N/A'}</p>
            <p><strong>Present Status:</strong> {employee.present_posting_status}</p>
            <p><strong>Joining Date:</strong> {formatDate(employee.current_posting_joining_date)}</p>
            <p><strong>Days in Current Posting:</strong> {calculateDaysInCurrentPosting(employee.current_posting_joining_date)}</p>
          </div>
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-bold mb-3">Posting History</h3>
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-1">Hospital</th><th className="border border-slate-300 p-1">Status</th><th className="border border-slate-300 p-1">Above 7000ft</th><th className="border border-slate-300 p-1">Duration</th><th className="border border-slate-300 p-1">Total Days</th></tr></thead>
            <tbody>
              {/* Present Posting as First Row */}
              <tr className="bg-emerald-50/50 font-medium">
                <td className="border border-slate-300 p-1">{employee.present_hospital}</td>
                <td className="border border-slate-300 p-1">{employee.present_posting_status}</td>
                <td className="border border-slate-300 p-1">{employee.present_posting_above_7000ft || 'N/A'}</td>
                <td className="border border-slate-300 p-1">{formatDate(employee.current_posting_joining_date)} - {formatDate(postingEndDate.toISOString())}</td>
                <td className="border border-slate-300 p-1">{calculateDaysInCurrentPosting(employee.current_posting_joining_date)}</td>
              </tr>
              {/* History in Descending Order */}
              {(() => {
                const descendingHistory = [...(employee.postings || [])].sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
                return descendingHistory.map((p: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-slate-300 p-1">{p.hospitalName}</td>
                    <td className="border border-slate-300 p-1">{p.status}</td>
                    <td className="border border-slate-300 p-1">{p.above7000}</td>
                    <td className="border border-slate-300 p-1">{formatDate(p.fromDate)} - {formatDate(p.toDate || postingEndDate.toISOString())}</td>
                    <td className="border border-slate-300 p-1">{p.days}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-bold mb-3">Leave Records</h3>
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-1">Type</th><th className="border border-slate-300 p-1">Duration</th><th className="border border-slate-300 p-1">Total Days</th></tr></thead>
            <tbody>{sortData(employee.long_leaves, 'fromDate').map((l: any, i: number) => <tr key={`leave-${l.id || i}`}><td className="border border-slate-300 p-1">{l.leaveType}</td><td className="border border-slate-300 p-1">{formatDate(l.fromDate)} - {formatDate(l.toDate)}</td><td className="border border-slate-300 p-1">{l.totalDays}</td></tr>)}</tbody>
          </table>
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-bold mb-3">Attachment Details</h3>
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-1">Hospital</th><th className="border border-slate-300 p-1">Status</th><th className="border border-slate-300 p-1">Above 7000ft</th><th className="border border-slate-300 p-1">Duration</th><th className="border border-slate-300 p-1">Total Days</th></tr></thead>
            <tbody>{sortData(employee.attachments, 'from').map((a: any, i: number) => <tr key={`attach-${a.id || i}`}><td className="border border-slate-300 p-1">{a.hospital}</td><td className="border border-slate-300 p-1">{a.status}</td><td className="border border-slate-300 p-1">{a.above7000}</td><td className="border border-slate-300 p-1">{formatDate(a.from)} - {formatDate(a.to)}</td><td className="border border-slate-300 p-1">{a.days}</td></tr>)}</tbody>
          </table>
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-bold mb-3">Service Days Brief</h3>
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-1">Long Leaves</th><th className="border border-slate-300 p-1">Att. Sugam</th><th className="border border-slate-300 p-1">Att. Durgam (&lt;7k)</th><th className="border border-slate-300 p-1">Att. Durgam (&gt;7k)</th><th className="border border-slate-300 p-1">Total Sugam</th><th className="border border-slate-300 p-1">Total Durgam (&lt;7k)</th><th className="border border-slate-300 p-1">Total Durgam (&gt;7k)</th></tr></thead>
            <tbody><tr><td className="border border-slate-300 p-1">{employee.long_leaves_count}</td><td className="border border-slate-300 p-1">{employee.attachment_sugam_days}</td><td className="border border-slate-300 p-1">{employee.attachment_durgam_days}</td><td className="border border-slate-300 p-1">{employee.attachment_durgam_above_7000_days}</td><td className="border border-slate-300 p-1">{employee.total_sugam_days}</td><td className="border border-slate-300 p-1">{employee.total_durgam_below_7000_days}</td><td className="border border-slate-300 p-1">{employee.total_durgam_above_7000_days}</td></tr></tbody>
          </table>
        </section>

        {employee.is_verified && (
          <footer className="mt-12 border-t pt-4">
            <p className="text-xs text-slate-600 mb-2">Submitted by: {employee.full_name} | Last edited: {formatDate(employee.last_edited_on)}</p>
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 text-emerald-800 p-2 rounded-full"><CheckCircle size={24} /></div>
              <div>
                <p className="font-bold">Verified at: {formatDate(employee.last_verified_on)}</p>
                <p className="text-xs text-slate-500">Verified By (DAUO): DAUO {employee.present_district || 'N/A'}</p>
              </div>
            </div>
          </footer>
        )}

        <div className="mt-8 flex justify-center gap-4 print:hidden">
          <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700">
            <Download size={18} /> Download PDF
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-900">
            <Printer size={18} /> Print Report
          </button>
          <button onClick={onClose} className="flex items-center gap-2 bg-slate-200 text-slate-800 px-6 py-2 rounded-lg font-bold hover:bg-slate-300">
            <X size={18} /> Close
          </button>
        </div>
      </div>
    </div>
  );
}

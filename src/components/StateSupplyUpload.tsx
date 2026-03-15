import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  ArrowRight,
  Database,
  Search,
  Check,
  Plus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as stringSimilarity from 'string-similarity';
import { supabase } from '../lib/supabase';

import MedicineCombobox from './MedicineCombobox';

interface ExcelRow {
  'Order No': string;
  'Firm Name': string;
  'Medicine Name': string;
  'Category': string;
  'Source Type': string;
  'Packing Size': string;
  'Unit': string;
  [key: string]: any;
}

interface ReconciliationRow {
  id: number;
  'Order No': string;
  'Firm Name': string;
  'Medicine Name': string;
  'Category': string;
  'Source Type': string;
  'Packing Size': string;
  'Unit': string;
  'DistrictQuantities': { [district: string]: number };
  'TotalQuantity': number;
  medicine_id?: string;
  status: 'Confirmed' | 'Partial' | 'Mismatch';
  is_confirmed: boolean;
  suggestions: any[];
  selected_medicine_id: string | null;
}

const DISTRICT_ALIASES: { [key: string]: string[] } = {
  'ALMORA': ['ALMORA'],
  'BAGESHWAR': ['BAGESHWAR'],
  'CHAMOLI': ['CHAMOLI'],
  'CHAMPAWAT': ['CHAMPAWAT'],
  'DEHRADUN': ['DEHRADUN'],
  'HARIDWAR': ['HARIDWAR'],
  'NAINITAL': ['NAINITAL'],
  'PAURI': ['PAURI', 'PAURI GARHWAL'],
  'PITHORAGARH': ['PITHORAGARH'],
  'RUDRAPRAYAG': ['RUDRAPRAYAG'],
  'TEHRI': ['TEHRI', 'TEHRI GARHWAL'],
  'UDHAM SINGH NAGAR': ['UDHAM SINGH NAGAR', 'U.S. NAGAR', 'U S NAGAR', 'US NAGAR', 'UDHAMSINGH NAGAR'],
  'UTTARKASHI': ['UTTARKASHI']
};

const DISTRICTS = Object.keys(DISTRICT_ALIASES);

export default function StateSupplyUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ReconciliationRow[]>([]);
  const [masterData, setMasterData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRowsParsed, setTotalRowsParsed] = useState(0);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'Confirmed' | 'Partial' | 'Mismatch'>('Confirmed');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingRowIndex, setAddingRowIndex] = useState<number | null>(null);
  const [newMedicine, setNewMedicine] = useState({
    medicine_name: '',
    category: '',
    source_type: '',
    packing_size: '',
    unit_type: ''
  });
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);

  const sanitize = (str: string | undefined | null) => {
    if (!str) return '';
    return str.toString().replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      processFile(droppedFile, uploadType);
    } else {
      setError('Please upload a valid .xlsx file');
    }
  };

  const [uploadType, setUploadType] = useState<'tender' | 'rishikul'>('tender');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile, uploadType);
    }
  };

  const downloadTemplate = (type: 'tender' | 'rishikul') => {
    let headers: string[] = [];
    let filename = '';

    if (type === 'tender') {
      headers = ['SL.NO.', 'Category', 'Source Type', 'Order No', 'Firm Name', 'Medicine Name', 'Packing Size', 'Unit', 'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri', 'Pithoragarh', 'Rudraprayag', 'Tehri', 'Udham Singh Nagar', 'Uttarkashi'];
      filename = 'Tender_Purchase_Template.xlsx';
    } else {
      headers = ['Invoice Number', 'Medicine Name', 'Firm Name', 'Packing Size', 'Unit Type', 'Category', 'Source Type', 'Batch Number', 'District', 'Quantity'];
      filename = 'Rishikul_Supply_Template.xlsx';
    }

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, filename);
  };

  const processFile = async (selectedFile: File, type: 'tender' | 'rishikul') => {
    console.log('--- EXCEL UPLOAD STARTED ---', type);
    
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setData([]);

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const dataBuffer = e.target?.result;
          if (!dataBuffer) throw new Error('File buffer is empty.');

          const wb = XLSX.read(dataBuffer, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const jsonDataRaw = XLSX.utils.sheet_to_json(ws) as any[];

          if (!jsonDataRaw || jsonDataRaw.length === 0) throw new Error('File is empty.');

          const jsonData = jsonDataRaw.map(row => {
            const normalizedRow: any = {};
            Object.keys(row).forEach(key => normalizedRow[key.trim()] = row[key]);
            return normalizedRow;
          });

          // Validation
          const requiredColumns = type === 'tender' 
            ? ['Order No', 'Firm Name', 'Medicine Name', 'Category', 'Source Type', 'Packing Size', 'Unit']
            : ['Invoice Number', 'Firm Name', 'Medicine Name', 'Category', 'Source Type', 'Packing Size', 'Unit Type', 'Batch Number', 'District', 'Quantity'];
          
          const firstRow = jsonData[0];
          const missingCols = requiredColumns.filter(col => {
            const exists = Object.keys(firstRow).some(key => key.toLowerCase() === col.toLowerCase());
            return !exists;
          });

          if (missingCols.length > 0) {
            const msg = `Missing columns: ${missingCols.join(', ')}. Please ensure headers match exactly.`;
            setError(msg);
            setLoading(false);
            return;
          }

          // ... (rest of the processing logic)
          console.log('Database: Fetching Medicine Master data from Supabase...');
          const { data: fetchedMasterData, error: masterError } = await supabase
            .from('medicine_master')
            .select('id, medicine_name, packing_size, source_type, category, unit_type');

          if (masterError) {
            console.error('Supabase Error:', masterError);
            throw new Error('Failed to fetch medicine master data: ' + masterError.message);
          }
          
          const currentMasterData = fetchedMasterData || [];
          setMasterData(currentMasterData);
          console.log('Database: Medicine Master Data Fetched:', currentMasterData.length, 'records');

          console.log('Processing: Creating reconciliation rows for each Excel row...');
          const reconciliationRows: ReconciliationRow[] = jsonData.map((row, rowIndex) => {
            const getVal = (col: string) => {
              const key = Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase());
              return key ? row[key] : undefined;
            };

            const sanitizeHeader = (header: string) => {
              return header.toUpperCase().replace(/[.\-\s]/g, '');
            };

            const districtQuantities: { [district: string]: number } = {};
            let totalQuantity = 0;

            if (type === 'rishikul') {
              const district = getVal('District')?.toString() || '';
              const qty = parseFloat(getVal('Quantity')?.toString() || '0') || 0;
              if (district && qty > 0) {
                districtQuantities[district] = qty;
                totalQuantity = qty;
              }
            } else {
              const findDistrictMatch = (header: string) => {
                const sanitizedHeader = sanitizeHeader(header);
                for (const [standardName, aliases] of Object.entries(DISTRICT_ALIASES)) {
                  for (const alias of aliases) {
                    const sanitizedAlias = sanitizeHeader(alias);
                    if (sanitizedHeader === sanitizedAlias) return standardName;
                  }
                }
                return null;
              };

              Object.keys(row).forEach(header => {
                const standardName = findDistrictMatch(header);
                if (standardName) {
                  const qty = parseFloat(row[header]) || 0;
                  if (qty > 0) {
                    districtQuantities[standardName] = (districtQuantities[standardName] || 0) + qty;
                    totalQuantity += qty;
                  }
                }
              });
            }

            const excelMedName = getVal('Medicine Name')?.toString() || '';
            const excelPacking = Number(getVal('Packing Size'));
            const excelSource = type === 'rishikul' ? 'Rishikul Pharmacy' : (getVal('Source Type')?.toString() || '');
            const excelCategory = getVal('Category')?.toString() || '';
            const excelUnit = getVal(type === 'rishikul' ? 'Unit Type' : 'Unit')?.toString() || '';

            const sanitizedExcelName = sanitize(excelMedName);
            const sanitizedSource = sanitize(excelSource);
            const sanitizedCategory = sanitize(excelCategory);
            const sanitizedUnit = sanitize(excelUnit);

            const filteredMaster = currentMasterData.filter(m => {
              const matchesPacking = Number(m.packing_size) === excelPacking;
              const matchesSource = type === 'rishikul' 
                ? sanitize(m.source_type) === sanitize('Rishikul Pharmacy') 
                : sanitize(m.source_type) === sanitizedSource;
              const matchesCategory = sanitize(m.category) === sanitizedCategory;
              const matchesUnit = sanitize(m.unit_type) === sanitizedUnit;
              
              return matchesPacking && matchesSource && matchesCategory && matchesUnit;
            });

            let bestMatchId: string | null = null;
            let status: 'Confirmed' | 'Partial' | 'Mismatch' = 'Mismatch';
            let isConfirmed = false;
            let suggestions: any[] = filteredMaster;

            if (filteredMaster.length > 0) {
              const masterNamesSanitized = filteredMaster.map(m => sanitize(m.medicine_name));
              
              if (masterNamesSanitized.length > 0 && sanitizedExcelName) {
                const ss = (stringSimilarity as any).default || stringSimilarity;
                const matches = ss.findBestMatch(sanitizedExcelName, masterNamesSanitized);
                const bestMatch = matches.bestMatch;
                const bestMatchIndex = matches.bestMatchIndex;
                
                bestMatchId = filteredMaster[bestMatchIndex].id;

                if (bestMatch.rating === 1.0) {
                  status = 'Confirmed';
                  isConfirmed = false;
                } else if (bestMatch.rating > 0.4) {
                  status = 'Partial';
                  isConfirmed = false;
                } else {
                  status = 'Mismatch';
                  isConfirmed = false;
                }
              }
            }

            return {
              id: rowIndex,
              'Order No': getVal(type === 'rishikul' ? 'Invoice Number' : 'Order No'),
              'Firm Name': getVal('Firm Name'),
              'Medicine Name': excelMedName,
              'Category': excelCategory,
              'Source Type': excelSource,
              'Packing Size': excelPacking.toString(),
              'Unit': excelUnit,
              'DistrictQuantities': districtQuantities,
              'TotalQuantity': totalQuantity,
              medicine_id: bestMatchId || undefined,
              selected_medicine_id: bestMatchId,
              status,
              is_confirmed: isConfirmed,
              suggestions
            };
          });

          console.log('Processing: Created', reconciliationRows.length, 'reconciliation rows.');
          setTotalRowsParsed(reconciliationRows.length);
          setData(reconciliationRows);
          setLoading(false);
          console.log('--- EXCEL UPLOAD SUCCESSFUL ---');
        } catch (innerErr: any) {
          console.error('CRITICAL ERROR during processing:', innerErr);
          alert('Error processing Excel file: ' + innerErr.message);
          setError(innerErr.message || 'Error parsing Excel data');
          setLoading(false);
        }
      };

      reader.onerror = (err) => {
        console.error('FileReader Error:', err);
        alert('Failed to read the file from your computer.');
        setError('Failed to read the file.');
        setLoading(false);
      };

      console.log('FileReader: Reading file as ArrayBuffer...');
      reader.readAsArrayBuffer(selectedFile);
    } catch (err: any) {
      console.error('CRITICAL ERROR starting upload:', err);
      alert('Could not start file upload: ' + err.message);
      setError(err.message || 'Error processing file');
      setLoading(false);
    }
  };

  const handleConfirmRow = (index: number) => {
    const targetRow = data[index];
    const medKey = `${sanitize(targetRow['Medicine Name'])}|${targetRow['Packing Size']}|${sanitize(targetRow['Source Type'])}`;

    setData(prev => prev.map(row => {
      const rowKey = `${sanitize(row['Medicine Name'])}|${row['Packing Size']}|${sanitize(row['Source Type'])}`;
      if (rowKey === medKey && row.selected_medicine_id === targetRow.selected_medicine_id) {
        return { ...row, is_confirmed: true, status: 'Confirmed' };
      }
      return row;
    }));
  };

  const handleMedicineChange = (index: number, medicineId: string) => {
    const targetRow = data[index];
    const medKey = `${sanitize(targetRow['Medicine Name'])}|${targetRow['Packing Size']}|${sanitize(targetRow['Source Type'])}`;

    setData(prev => prev.map(row => {
      const rowKey = `${sanitize(row['Medicine Name'])}|${row['Packing Size']}|${sanitize(row['Source Type'])}`;
      if (rowKey === medKey) {
        return { 
          ...row, 
          selected_medicine_id: medicineId, 
          is_confirmed: false,
          status: row.status === 'Mismatch' ? 'Partial' : row.status
        };
      }
      return row;
    }));
  };

  const handleBulkConfirm = () => {
    setData(prev => prev.map(row => 
      row.status === 'Confirmed' ? { ...row, is_confirmed: true } : row
    ));
  };

  const handleConfirmUpload = async () => {
    if (!data.every(row => row.is_confirmed)) return;
    setUploading(true);
    const istTimestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    try {
      const bulkData: any[] = [];
      
      for (const row of data) {
        // Find the master medicine record to get the correct name
        const masterMed = masterData.find(m => m.id === row.selected_medicine_id);
        
        if (!row.selected_medicine_id || !masterMed) {
          alert(`Row with Order No ${row['Order No']} is missing medicine information or master match.`);
          setUploading(false);
          return;
        }

        const medicineName = masterMed.medicine_name;

        Object.entries(row.DistrictQuantities).forEach(([district, qty]) => {
          const numericQty = Number(qty);
          // Safety Filter: Skip zero or null quantities
          if (numericQty && numericQty > 0) {
            bulkData.push({
              order_no: row['Order No'],
              firm_name: row['Firm Name'],
              medicine_id: row.selected_medicine_id,
              medicine_name: medicineName, // Double Mapping: Use name from Master
              district_name: district,
              allocated_qty: numericQty,
              status: 'Dispatched',
              created_at: istTimestamp,
              dispatch_date: istTimestamp,
              source_type: masterMed.source_type || row['Source Type'] // Ensure source type is captured from Master if available
            });
          }
        });
      }

      if (bulkData.length === 0) {
        alert("No valid records with quantities found to upload.");
        setUploading(false);
        return;
      }

      console.log(`Final Upload: Preparing to insert ${bulkData.length} district-wise records into state_supply_orders.`);

      const { error: insertError } = await supabase
        .from('state_supply_orders')
        .insert(bulkData);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFile(null);
        setData([]);
      }, 3000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Error uploading data');
    } finally {
      setUploading(false);
    }
  };

  const openAddModal = (index: number, row: ReconciliationRow) => {
    setAddingRowIndex(index);
    setNewMedicine({
      medicine_name: row['Medicine Name']?.toString() || '',
      category: row['Category']?.toString() || '',
      source_type: row['Source Type']?.toString() || '',
      packing_size: row['Packing Size']?.toString() || '',
      unit_type: row['Unit']?.toString() || ''
    });
    setIsAddModalOpen(true);
  };

  const handleAddMedicineSubmit = async () => {
    if (addingRowIndex === null) return;
    setIsAddingMedicine(true);
    try {
      const { data: insertedData, error } = await supabase
        .from('medicine_master')
        .insert([{
          medicine_name: newMedicine.medicine_name,
          category: newMedicine.category,
          source_type: newMedicine.source_type,
          packing_size: Number(newMedicine.packing_size),
          unit_type: newMedicine.unit_type
        }])
        .select()
        .single();

      if (error) throw error;

      const updatedMaster = [...masterData, insertedData];
      setMasterData(updatedMaster);

      const targetRow = data[addingRowIndex];
      const medKey = `${sanitize(targetRow['Medicine Name'])}|${targetRow['Packing Size']}|${sanitize(targetRow['Source Type'])}`;

      setData(prev => prev.map(row => {
        const rowKey = `${sanitize(row['Medicine Name'])}|${row['Packing Size']}|${sanitize(row['Source Type'])}`;
        if (rowKey === medKey) {
          return { 
            ...row, 
            selected_medicine_id: insertedData.id, 
            is_confirmed: true, 
            status: 'Confirmed',
            suggestions: [...row.suggestions, insertedData]
          };
        }
        return row;
      }));

      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Error adding medicine:', err);
      alert('Failed to add medicine: ' + err.message);
    } finally {
      setIsAddingMedicine(false);
    }
  };

  const allConfirmed = data.length > 0 && data.every(row => row.is_confirmed);

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-12 text-center">
        {!data.length ? (
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileSpreadsheet className="text-emerald-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Supply Excel</h2>
            <p className="text-slate-500 mb-8">Drag and drop your .xlsx file here, or click to browse. Ensure columns match the required format.</p>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx"
              className="hidden"
            />
            
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => { setUploadType('tender'); fileInputRef.current?.click(); }}
                disabled={loading}
                className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                Upload Tender Purchase Excel (Without Batch Number)
              </button>
              <button 
                onClick={() => { setUploadType('rishikul'); fileInputRef.current?.click(); }}
                disabled={loading}
                className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                Rishikul Supply Excel with Batch Number
              </button>
            </div>
            <div className="flex gap-4 justify-center mt-4">
              <button 
                onClick={() => downloadTemplate('tender')}
                className="text-slate-500 hover:text-slate-900 font-bold text-sm underline"
              >
                Download Tender Purchase Template
              </button>
              <button 
                onClick={() => downloadTemplate('rishikul')}
                className="text-emerald-600 hover:text-emerald-900 font-bold text-sm underline"
              >
                Download Rishikul Supply Template
              </button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 text-left">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Required Columns</p>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Order No, Firm Name, Medicine Name, Category, Source Type, Packing Size, Unit + 13 District Columns (ALMORA, BAGESHWAR, etc.)
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Wide Format Support</p>
                <p className="text-xs font-medium text-slate-600">Automatically un-pivots district quantities into individual supply orders.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-start gap-4">
                <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
                <div className="flex-1">
                  <h3 className="font-bold text-red-900">{error}</h3>
                  <button 
                    onClick={() => {
                      setData([]);
                      setError(null);
                    }}
                    className="mt-4 text-sm font-bold text-red-600 hover:underline"
                  >
                    Try another file
                  </button>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-center gap-4">
                <CheckCircle2 className="text-emerald-500" size={24} />
                <p className="font-bold text-emerald-900">Supply orders uploaded successfully!</p>
              </div>
            )}

            <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden text-left">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Preview Data</h2>
                  <p className="text-slate-500 text-sm font-medium">Review the parsed data before confirming upload.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setData([])}
                    className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmUpload}
                    disabled={uploading || !allConfirmed}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                    Final Upload to Database
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 px-8 pt-6 pb-2">
                <button 
                  onClick={() => setActiveTab('Confirmed')} 
                  className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'Confirmed' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  Ready to Sync ({data.filter(r => r.status === 'Confirmed').length})
                </button>
                <button 
                  onClick={() => setActiveTab('Partial')} 
                  className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'Partial' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  Review Suggestions ({data.filter(r => r.status === 'Partial').length})
                </button>
                <button 
                  onClick={() => setActiveTab('Mismatch')} 
                  className={`px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'Mismatch' ? 'bg-red-100 text-red-700 shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  Not Found / New ({data.filter(r => r.status === 'Mismatch').length})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Excel Data</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">System Suggestion</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Action
                        {activeTab === 'Confirmed' && data.some(r => r.status === 'Confirmed' && !r.is_confirmed) && (
                          <button onClick={handleBulkConfirm} className="ml-4 bg-emerald-500 text-white px-3 py-1 rounded-lg text-[10px] hover:bg-emerald-600 transition-colors shadow-sm">
                            Bulk Confirm
                          </button>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.map((row, i) => {
                      if (row.status !== activeTab) return null;
                      return (
                      <tr key={i} className={`hover:bg-slate-50/30 transition-colors ${
                        row.status === 'Confirmed' ? 'bg-emerald-50/30' : 
                        row.status === 'Partial' ? 'bg-amber-50/30' : 'bg-red-50/30'
                      }`}>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-bold">#{row['Order No']}</span>
                              <p className="font-bold text-slate-900">{row['Medicine Name']}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 uppercase">{row['Packing Size']}</span>
                              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 uppercase">{row['Category']}</span>
                              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 uppercase">{row['Source Type']}</span>
                              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 uppercase">{row['Unit']}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-slate-400 font-medium">Total Qty: {row.TotalQuantity.toLocaleString()}</p>
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100">
                                Found in {Object.keys(row.DistrictQuantities).length} Districts
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2 min-w-[300px]">
                            <MedicineCombobox 
                              options={masterData.filter(m => uploadType === 'rishikul' ? sanitize(m.source_type) === sanitize('Rishikul Pharmacy') : true)}
                              value={row.selected_medicine_id}
                              onChange={(val) => handleMedicineChange(i, val)}
                              suggestions={row.suggestions}
                            />
                            
                            {!row.selected_medicine_id && (
                              <button 
                                onClick={() => openAddModal(i, row)}
                                className="flex items-center justify-center gap-1 w-full bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                              >
                                <Plus size={14} /> Add to Master
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              row.status === 'Confirmed' ? 'bg-emerald-500' : 
                              row.status === 'Partial' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                            <span className={`text-xs font-bold ${
                              row.status === 'Confirmed' ? 'text-emerald-600' : 
                              row.status === 'Partial' ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {row.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {!row.is_confirmed ? (
                            <button 
                              onClick={() => handleConfirmRow(i)}
                              disabled={!row.selected_medicine_id}
                              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1 text-xs font-bold">
                              <CheckCircle2 size={14} /> Synced
                            </span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <div className="text-sm font-bold text-slate-600 flex gap-4">
                  <span>Total Items: <span className="text-slate-900">{data.length}</span></span>
                  <span className="text-slate-300">|</span>
                  <span>Ready: <span className="text-emerald-600">{data.filter(r => r.is_confirmed).length}</span></span>
                  <span className="text-slate-300">|</span>
                  <span>Pending: <span className="text-amber-600">{data.filter(r => !r.is_confirmed).length}</span></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Add to Master</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medicine Name</label>
                <input 
                  type="text" 
                  value={newMedicine.medicine_name}
                  onChange={e => setNewMedicine({...newMedicine, medicine_name: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                  <input 
                    type="text" 
                    value={newMedicine.category}
                    onChange={e => setNewMedicine({...newMedicine, category: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source Type</label>
                  <input 
                    type="text" 
                    value={newMedicine.source_type}
                    onChange={e => setNewMedicine({...newMedicine, source_type: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Packing Size</label>
                  <input 
                    type="number" 
                    value={newMedicine.packing_size}
                    onChange={e => setNewMedicine({...newMedicine, packing_size: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit Type</label>
                  <input 
                    type="text" 
                    value={newMedicine.unit_type}
                    onChange={e => setNewMedicine({...newMedicine, unit_type: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-6 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddMedicineSubmit}
                disabled={isAddingMedicine}
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isAddingMedicine ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Save to Master
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Loader2, IndianRupee } from 'lucide-react';

interface Treatment {
  id: string;
  patient_id: string;
  treatment_name: string;
  charges: number;
  payment_status: string;
  status: string;
  created_at: string;
  patients: {
    name: string;
  };
}

export default function FeesModule({ hospitalId }: { hospitalId: string }) {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchUnpaidTreatments = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('patient_treatments')
      .select('*, patients(name)')
      .eq('payment_status', 'Unpaid')
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`);

    if (error) {
      console.error('Error fetching unpaid treatments:', error);
    } else {
      setTreatments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUnpaidTreatments();
  }, [hospitalId]);

  const handleConfirmPayment = async (patientId: string) => {
    setProcessing(patientId);
    const { error } = await supabase
      .from('patient_treatments')
      .update({ payment_status: 'Paid', status: 'Ready for Service' })
      .eq('patient_id', patientId)
      .eq('payment_status', 'Unpaid');

    if (error) {
      console.error('Error updating payment status:', error);
      alert('Error confirming payment.');
    } else {
      fetchUnpaidTreatments();
    }
    setProcessing(null);
  };

  const groupedTreatments = treatments.reduce((acc, treatment) => {
    const patientName = treatment.patients?.name || 'Unknown';
    if (!acc[treatment.patient_id]) {
      acc[treatment.patient_id] = { name: patientName, total: 0, treatments: [] };
    }
    acc[treatment.patient_id].total += treatment.charges || 0;
    acc[treatment.patient_id].treatments.push(treatment);
    return acc;
  }, {} as Record<string, { name: string, total: number, treatments: Treatment[] }>);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Fees Collection</h2>
      
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
      ) : Object.keys(groupedTreatments).length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium">No pending payments for today.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTreatments).map(([patientId, data]: [string, any]) => (
            <div key={patientId} className="p-6 bg-neutral-50 rounded-2xl border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{data.name}</h3>
                <p className="text-sm text-slate-500">{data.treatments.length} items pending</p>
                <div className="mt-2 text-xl font-black text-emerald-700 flex items-center gap-1">
                  <IndianRupee size={20} /> {data.total}
                </div>
              </div>
              <button 
                onClick={() => handleConfirmPayment(patientId)}
                disabled={processing === patientId}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {processing === patientId ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                Confirm Payment
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

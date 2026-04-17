export interface InventoryItem {
  id: string;
  hospital_id: string;
  medicine_id?: string;
  medicine_name: string;
  manufacturer?: string;
  batch_number?: string;
  mfg_date?: string;
  expiry_date?: string;
  unit_type: string; // Box, Bottle, Strip
  unit_label: string; // Tablet, Gram, ml (The unit of the loose quantity)
  quantity_in_units: number; // Number of boxes/bottles
  pack_size: number; // Tablets per box, grams per bottle, etc.
  total_quantity: number; // quantity_in_units * pack_size
  entry_type?: 'State_Supply' | 'Manual_Entry';
  total_bulk_units?: number;
  created_at: string;
}

export interface IndentStock {
  id: string;
  hospital_id: string;
  medicine_id: string;
  medicine_name: string;
  batch_number?: string;
  expiry_date?: string;
  current_loose_quantity: number; // Remaining tablets/grams in the current open unit
  remaining_loose_quantity?: number;
  remaining_packing_quantity?: number;
  unit_label: string; // Tablet, Gram, ml
  created_at: string;
}

export interface PrescriptionMedicine {
  id: string;
  medicine_name: string;
  dosage: string; // e.g., 1-0-1
  frequency: string; // e.g., After Food
  duration_days: number;
  total_quantity: number; // Calculated: (dosage sum) * duration
  quantity: number;
  instruction?: string[];
  is_market_purchase: boolean;
  unit_label: string; // Tablet, Gram, ml
}

export interface DailyConsumption {
  id: string;
  hospital_id: string;
  patient_id: string;
  medicine_name: string;
  quantity_dispensed: number;
  date: string;
}

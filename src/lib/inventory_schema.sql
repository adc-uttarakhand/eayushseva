-- 1. Main Inventory Table (Bulk Units)
CREATE TABLE medicine_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id),
  medicine_id UUID REFERENCES medicine_master(id),
  medicine_name TEXT NOT NULL,
  manufacturer TEXT,
  batch_number TEXT,
  mfg_date TEXT,
  expiry_date TEXT,
  unit_type TEXT, -- Box, Bottle, Strip
  unit_label TEXT, -- Tablet, Gram, ml
  quantity_in_units INTEGER NOT NULL DEFAULT 0,
  pack_size INTEGER NOT NULL DEFAULT 1,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  entry_type TEXT, -- 'State_Supply', 'Manual_Entry'
  total_bulk_units INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily Indent Table (Retail/Loose Units)
CREATE TABLE daily_indent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id),
  medicine_id UUID NOT NULL REFERENCES medicine_master(id),
  medicine_name TEXT NOT NULL,
  batch_number TEXT,
  expiry_date TEXT,
  current_loose_quantity NUMERIC NOT NULL DEFAULT 0,
  unit_label TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, medicine_id, batch_number, expiry_date)
);

-- 3. Daily Consumption Table
CREATE TABLE daily_consumption (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  medicine_id UUID NOT NULL REFERENCES medicine_master(id),
  batch_number TEXT,
  quantity_dispensed NUMERIC NOT NULL,
  consumed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Atomic Transaction for Prescription Deduction
CREATE OR REPLACE FUNCTION deduct_inventory_on_prescription(
  p_hospital_id UUID,
  p_patient_id UUID,
  p_medicines JSONB -- Array of {medicine_id, quantity, unit_type}
) RETURNS VOID AS $$
DECLARE
  m RECORD;
BEGIN
  FOR m IN SELECT * FROM jsonb_to_recordset(p_medicines) AS x(medicine_id UUID, quantity NUMERIC, unit_type TEXT)
  LOOP
    -- Deduct from daily_indent
    UPDATE daily_indent
    SET current_loose_quantity = current_loose_quantity - m.quantity
    WHERE hospital_id = p_hospital_id AND medicine_id = m.medicine_id;
    
    -- Log to daily_consumption
    INSERT INTO daily_consumption (hospital_id, patient_id, medicine_id, quantity, unit_type, consumed_at)
    VALUES (p_hospital_id, p_patient_id, m.medicine_id, m.quantity, m.unit_type, NOW());
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Atomic Transaction for Bulk-to-Retail Conversion
CREATE OR REPLACE FUNCTION open_bulk_unit(
  p_hospital_id UUID,
  p_medicine_id UUID
) RETURNS VOID AS $$
DECLARE
  v_conversion_value INTEGER;
BEGIN
  -- Get conversion value and check bulk stock
  SELECT conversion_value INTO v_conversion_value
  FROM medicine_inventory
  WHERE id = p_medicine_id AND hospital_id = p_hospital_id AND bulk_quantity > 0;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient bulk stock or medicine not found';
  END IF;

  -- Deduct 1 from bulk
  UPDATE medicine_inventory
  SET bulk_quantity = bulk_quantity - 1
  WHERE id = p_medicine_id AND hospital_id = p_hospital_id;

  -- Add to loose quantity
  INSERT INTO daily_indent (hospital_id, medicine_id, current_loose_quantity, retail_unit_type)
  VALUES (p_hospital_id, p_medicine_id, v_conversion_value, (SELECT retail_unit_type FROM medicine_inventory WHERE id = p_medicine_id))
  ON CONFLICT (hospital_id, medicine_id) DO UPDATE
  SET current_loose_quantity = daily_indent.current_loose_quantity + v_conversion_value;
END;
$$ LANGUAGE plpgsql;

-- 6. State Supply Orders Table
CREATE TABLE state_supply_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_no TEXT NOT NULL,
  firm_name TEXT NOT NULL,
  medicine_id UUID NOT NULL REFERENCES medicine_master(id),
  district_name TEXT NOT NULL,
  allocated_qty INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending at District',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. District Inventory Table
CREATE TABLE district_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district TEXT NOT NULL,
  medicine_id UUID NOT NULL REFERENCES medicine_master(id),
  batch_no TEXT NOT NULL,
  mfg_date DATE,
  expiry_date DATE,
  total_received INTEGER NOT NULL,
  remaining_qty INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Hospital Dispatches Table
CREATE TABLE hospital_dispatches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district TEXT NOT NULL,
  hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id),
  medicine_id UUID NOT NULL REFERENCES medicine_master(id),
  batch_no TEXT,
  mfg_date DATE,
  expiry_date DATE,
  quantity INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- 'Push_by_District', 'Pull_by_Hospital'
  status TEXT NOT NULL, -- 'Dispatched', 'Claimed_Pending_Confirm', 'Confirmed_by_District', 'Received', 'Added_to_Inventory'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

export interface Hospital {
  sr_no: number;
  facility_name: string;
  type: string; // Sugam / Durgam
  system: string;
  location: string;
  district: string;
  taluka: string;
  pincode: string;
  block: string;
  latitude: number;
  longitude: number;
  region_indicator: string;
  operational_status: string;
  ipd_services: string;
  incharge_name: string;
  mobile: string;
  email: string;
  status: string;
  hospital_id: string;
  doctor_id: string;
  password?: string;
  incharge_staff_id?: string;
  photo_url?: string;
  special_services?: string[];
  centre_of_excellence?: string;
  supraja_centre?: boolean;
  panchakarma_centre?: boolean;
  is_verified?: boolean;
  last_edited_on?: string;
  verified_by?: string;
  verified_at?: string;
  above_7000_feet?: boolean; // Added for the requirement
}

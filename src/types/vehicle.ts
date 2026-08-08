export type Vehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  current_km: number;
  notes: string | null;
  inspection_date: string | null;
  insurance_date: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleInput = {
  plate: string;
  brand: string;
  model: string;
  current_km: number;
  notes?: string | null;
  inspection_date?: string | null;
  insurance_date?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type VehicleUpdate = Partial<VehicleInput>;

export type VehicleDeadlineAlert = {
  vehicle_id: string;
  plate: string;
  brand: string;
  model: string;
  deadline_type: "inspection" | "insurance";
  deadline_date: string;
  days_remaining: number;
};

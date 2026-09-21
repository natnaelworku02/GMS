export interface Owner {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface OwnerCreateDTO {
  name: string;
  phone: string;
}

export interface OwnerUpdateDTO {
  name?: string;
  phone?: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  model: string;
  type: string;
  engine_number: string;
  chassis_number: string;
  plate_number: string;
  created_at: string;
}

export interface VehicleCreateDTO {
  owner_id: string;
  model: string;
  type: string;
  engine_number: string;
  chassis_number: string;
  plate_number: string;
}

export interface VehicleCondition {
  id: string;
  part_name: string;
  condition_state: string;
}

export interface VehicleConditionInput {
  part_name: string;
  condition_state: string;
}

export interface JobCard {
  id: string;
  vehicle_id: string;
  owner_id: string;
  status: string;
  mileage_km: number;
  private_paint: boolean;
  private_mechanic: boolean;
  insurance_provider: string | null;
  description: string;
  remarks: string | null;
  requested_materials: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  conditions: VehicleCondition[];
  mechanics: Employee[];
  staff_assignments: StaffAssignment[];
  inventory_usage: InventoryUsage[];
}

export interface StaffAssignment {
  employee_id: string;
  work_category: string;
}

export interface InventoryUsage {
  id: string;
  item_id: string;
  store_location_id: string;
  quantity: number;
  created_at: string;
}

export interface InventoryUsageCreateDTO {
  item_id: string;
  store_location_id: string;
  quantity: number;
}

export interface JobCardCreateDTO {
  vehicle_id: string;
  owner_id: string;
  mileage_km: number;
  private_paint?: boolean;
  private_mechanic?: boolean;
  insurance_provider?: string | null;
  description: string;
  remarks?: string | null;
  requested_materials?: string | null;
  staff_assignments?: StaffAssignment[];
  conditions?: VehicleConditionInput[];
}

export interface JobCardUpdateDTO {
  mileage_km?: number;
  private_paint?: boolean;
  private_mechanic?: boolean;
  insurance_provider?: string | null;
  description?: string;
  remarks?: string | null;
  requested_materials?: string | null;
}

export interface Employee {
  id: string;
  name: string;
  job_title: string;
  work_category: WorkCategory;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export type WorkCategory = "mechanic" | "bat_lamera" | "strip_and_fit" | "auto_electrician" | "painter";

export interface EmployeeCreateDTO {
  name: string;
  job_title: string;
  work_category: WorkCategory;
  phone: string;
}

export interface EmployeeUpdateDTO {
  name?: string;
  job_title?: string;
  work_category?: WorkCategory;
  phone?: string;
  is_active?: boolean;
}

export interface VehicleHistory {
  vehicle: Vehicle;
  owner: Owner;
  job_cards: JobCard[];
  performas: Array<{
    id: string;
    job_card_id: string | null;
    version: number;
    status: string;
    grand_total: number;
    created_at: string;
  }>;
}

export interface JobCardHistory {
  events: Array<{ id: string; action: string; details: Record<string, unknown> | null; user_id: string; created_at: string }>;
  inventory_movements: Array<{ id: string; item_id: string; store_location_id: string; quantity_change: number; quantity_before: number; quantity_after: number; created_at: string }>;
}

export interface EmployeeHistory {
  employee_id: string;
  assignments: Array<{ job_card_id: string; vehicle_id: string; work_category: string; status: string; description: string; created_at: string }>;
}

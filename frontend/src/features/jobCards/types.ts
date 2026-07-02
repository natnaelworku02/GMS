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
  mechanic_ids?: string[];
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
  phone: string;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeCreateDTO {
  name: string;
  job_title: string;
  phone: string;
}

export interface EmployeeUpdateDTO {
  name?: string;
  job_title?: string;
  phone?: string;
  is_active?: boolean;
}

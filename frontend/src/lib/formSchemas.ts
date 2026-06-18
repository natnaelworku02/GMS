import { z } from "zod";

export const employeeCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  job_title: z.string().min(1, "Job title is required"),
  phone: z.string().min(1, "Phone is required"),
});

export const employeeUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  job_title: z.string().min(1, "Job title is required"),
  phone: z.string().min(1, "Phone is required"),
  is_active: z.boolean(),
});

export const ownerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  phone_secondary: z.string().optional(),
  email: z.string().optional(),
  owner_type: z.enum(["individual", "corporate", "insurance"]),
});

export const vehicleCreateSchema = z.object({
  owner_id: z.string().min(1, "Owner is required"),
  model: z.string().min(1, "Model is required"),
  type: z.string().min(1, "Type is required"),
  plate_number: z.string().min(1, "Plate number is required"),
  engine_number: z.string().min(1, "Engine number is required"),
  chassis_number: z.string().min(1, "Chassis number is required"),
  current_mileage: z.number().int().positive().optional(),
});

export const jobCardCreateSchema = z.object({
  vehicle_id: z.string().min(1, "Vehicle is required"),
  owner_id: z.string().min(1, "Owner is required"),
  mileage_km: z.number().int().positive("Mileage must be positive"),
  private_paint: z.boolean(),
  private_mechanic: z.boolean(),
  insurance_provider: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  remarks: z.string().optional(),
  requested_materials: z.string().optional(),
  staff_assignments: z.array(
    z.object({
      employee_id: z.string().min(1),
      role: z.string().min(1),
    }),
  ),
  conditions: z.array(
    z.object({
      part_name: z.string(),
      condition_state: z.string(),
    }),
  ),
});

export const jobCardUpdateSchema = z.object({
  mileage_km: z.number().int().positive(),
  private_paint: z.boolean(),
  private_mechanic: z.boolean(),
  insurance_provider: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  remarks: z.string().optional(),
  requested_materials: z.string().optional(),
});

export type EmployeeCreateFormData = z.input<typeof employeeCreateSchema>;
export type EmployeeUpdateFormData = z.input<typeof employeeUpdateSchema>;
export type OwnerFormData = z.input<typeof ownerSchema>;
export type VehicleCreateFormData = z.input<typeof vehicleCreateSchema>;
export type JobCardCreateFormData = z.input<typeof jobCardCreateSchema>;
export type JobCardUpdateFormData = z.input<typeof jobCardUpdateSchema>;

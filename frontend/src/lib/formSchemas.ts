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
});

export const vehicleCreateSchema = z.object({
  owner_id: z.string().min(1, "Owner is required"),
  model: z.string().min(1, "Model is required"),
  type: z.string().min(1, "Type is required"),
  plate_number: z.string().min(1, "Plate number is required"),
  engine_number: z.string().min(1, "Engine number is required"),
  chassis_number: z.string().min(1, "Chassis number is required"),
});

export const jobCardCreateSchema = z.object({
  vehicle_id: z.string().min(1, "Vehicle is required"),
  owner_id: z.string().min(1, "Owner is required"),
  mileage_km: z.number().int().min(0, "Mileage must be 0 or more").default(0),
  private_paint: z.boolean(),
  private_mechanic: z.boolean(),
  insurance_provider: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  remarks: z.string().optional(),
  requested_materials: z.string().optional(),
  mechanic_ids: z.array(z.string().min(1)).optional(),
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

export const performaCreateSchema = z.object({
  job_card_id: z.string().min(1, "Job card is required"),
  client_email: z.string().optional(),
  line_items: z
    .array(
      z.object({
        type: z.enum(["labor", "part"]),
        description: z.string(),
        quantity: z.number().int().positive(),
        unit_price: z.number().min(0),
      }),
    )
    .min(1, "At least one line item is required"),
});

export const inventoryItemSchema = z.object({
  part_name: z.string().min(1, "Part name is required"),
  applicable_vehicle_types: z.array(z.string()).min(1, "At least one vehicle type is required"),
  unit_price: z.number().min(0, "Price must be non-negative"),
  supplier_info: z.string().optional(),
  min_stock_threshold: z.number().int().min(0).optional(),
});

export const inventoryLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const stockAdjustSchema = z.object({
  store_location_id: z.string().min(1, "Location is required"),
  quantity: z.number().int().min(0, "Quantity must be non-negative"),
});

export const toolSchema = z.object({
  name: z.string().min(1, "Name is required"),
  specifications: z.string().optional(),
  total_quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const toolCheckoutSchema = z.object({
  tool_id: z.string().min(1, "Tool is required"),
  employee_id: z.string().min(1, "Employee is required"),
  job_card_id: z.string().min(1, "Job card is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export type EmployeeCreateFormData = z.input<typeof employeeCreateSchema>;
export type EmployeeUpdateFormData = z.input<typeof employeeUpdateSchema>;
export type OwnerFormData = z.input<typeof ownerSchema>;
export type VehicleCreateFormData = z.input<typeof vehicleCreateSchema>;
export type JobCardCreateFormData = z.input<typeof jobCardCreateSchema>;
export type JobCardUpdateFormData = z.input<typeof jobCardUpdateSchema>;
export type PerformaCreateFormData = z.input<typeof performaCreateSchema>;
export type InventoryItemFormData = z.input<typeof inventoryItemSchema>;
export type InventoryLocationFormData = z.input<typeof inventoryLocationSchema>;
export type ToolFormData = z.input<typeof toolSchema>;
export const profileUpdateSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
});

export type ToolCheckoutFormData = z.input<typeof toolCheckoutSchema>;
export type ProfileUpdateFormData = z.input<typeof profileUpdateSchema>;

import { z } from "zod";

export const createUserSchema = z.object({
  full_name: z.string().min(1, "Required"),
  phone: z.string().regex(/^\+?[0-9]+$/, "Invalid phone number"),
  role_id: z.string().min(1, "Select a role"),
  password: z.string().min(8, "Min 8 characters"),
  is_active: z.boolean(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

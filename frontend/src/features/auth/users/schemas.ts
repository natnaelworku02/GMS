import { z } from "zod";

export const strongPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a special character");

export const createUserSchema = z.object({
  full_name: z.string().min(1, "Required"),
  phone: z.string().regex(/^\+?[0-9]+$/, "Invalid phone number"),
  role_id: z.string().min(1, "Select a role"),
  password: strongPasswordSchema,
  is_active: z.boolean(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

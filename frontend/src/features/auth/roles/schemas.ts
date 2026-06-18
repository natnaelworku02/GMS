import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(1, "Required"),
  is_superadmin: z.boolean(),
});

export type CreateRoleFormData = z.infer<typeof createRoleSchema>;

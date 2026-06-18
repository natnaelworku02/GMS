"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createRoleSchema, type CreateRoleFormData } from "../schemas";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  defaultValues?: Partial<CreateRoleFormData>;
  onSubmit: (data: CreateRoleFormData) => Promise<void>;
  isSubmitting?: boolean;
};

export function RoleForm({ defaultValues, onSubmit, isSubmitting }: Props) {
  const form = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { is_superadmin: false, ...defaultValues },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Role Name</label>
        <input
          id="name"
          {...register("name")}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_superadmin"
          type="checkbox"
          {...register("is_superadmin")}
          className="h-4 w-4 rounded border-input text-indigo-500 focus:ring-indigo-500"
        />
        <label htmlFor="is_superadmin" className="text-sm">Super Admin (bypasses all permissions)</label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Saving..." : "Create Role"}
        </Button>
      </div>
    </form>
  );
}

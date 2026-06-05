"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserFormData } from "../schemas";
import { useGetRolesQuery } from "@/features/auth/api";

type Props = {
  defaultValues?: Partial<CreateUserFormData>;
  onSubmit: (data: CreateUserFormData) => Promise<void>;
  isSubmitting?: boolean;
  mode: "create" | "edit";
};

export function UserForm({ defaultValues, onSubmit, isSubmitting, mode }: Props) {
  const { data: roles } = useGetRolesQuery();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { is_active: true, ...defaultValues },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="full_name" className="text-sm font-medium">Full Name</label>
        <input
          id="full_name"
          {...register("full_name")}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">Phone</label>
        <input
          id="phone"
          {...register("phone")}
          placeholder="+251..."
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="role_id" className="text-sm font-medium">Role</label>
        <select
          id="role_id"
          {...register("role_id")}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Select a role</option>
          {roles?.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        {errors.role_id && <p className="text-xs text-destructive">{errors.role_id.message}</p>}
      </div>

      {mode === "create" && (
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            {...register("password")}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          id="is_active"
          type="checkbox"
          {...register("is_active")}
          className="h-4 w-4 rounded border-input text-foreground focus:ring-ring"
        />
        <label htmlFor="is_active" className="text-sm">Active</label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition-all hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserFormData } from "../schemas";
import { useGetRolesQuery } from "@/features/auth/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  defaultValues?: Partial<CreateUserFormData>;
  onSubmit: (data: CreateUserFormData) => Promise<void>;
  isSubmitting?: boolean;
  mode: "create" | "edit";
  formId?: string;
};

export function UserForm({ defaultValues, onSubmit, isSubmitting, mode, formId }: Props) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const { data: rolesResp } = useGetRolesQuery({ page: 1, page_size: 100 });
  const roles = rolesResp?.items ?? [];

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { is_active: true, ...defaultValues },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = form;

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="full_name">{t("fullName")}</Label>
        <Input id="full_name" {...register("full_name")} />
        {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input id="phone" placeholder={t("phonePlaceholder")} {...register("phone")} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role_id">{t("role")}</Label>
        <Controller
          name="role_id"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectRole")} />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.role_id && <p className="text-xs text-destructive">{errors.role_id.message}</p>}
      </div>

      {mode === "create" && (
        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
              id="is_active"
            />
          )}
        />
        <Label htmlFor="is_active">{t("isActive")}</Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Saving..." : mode === "create" ? t("create") : tc("save")}
        </Button>
      </div>
    </form>
  );
}

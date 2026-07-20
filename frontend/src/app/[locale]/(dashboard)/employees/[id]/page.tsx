"use client";

import { useEffect, use } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetEmployeeQuery, useUpdateEmployeeMutation } from "@/features/jobCards/api";
import { employeeUpdateSchema, type EmployeeUpdateFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const t = useTranslations("hr");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: employee, isLoading: loading } = useGetEmployeeQuery(id);
  const [update, { isLoading: updating }] = useUpdateEmployeeMutation();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
    control,
  } = useForm<EmployeeUpdateFormData>({
    resolver: zodResolver(employeeUpdateSchema),
  });

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name,
        job_title: employee.job_title,
        phone: employee.phone,
        is_active: employee.is_active,
      });
    }
  }, [employee, reset]);

  const onSubmit = async (data: EmployeeUpdateFormData) => {
    try {
      await update({ id, body: data }).unwrap();
      toast.success(tc("updated"));
      router.push("/employees");
    } catch {
      toast.error(tc("error"));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!employee) return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <p className="text-sm text-muted-foreground">{t("notFound") || "Not found"}</p>
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft size={15} />
        {tc("back")}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" onClick={() => router.push("/employees")} className="mb-6">
        <ArrowLeft size={15} />
        {tc("back")}
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("edit")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="job_title">{t("jobTitle")}</Label>
          <Input id="job_title" {...register("job_title")} />
          {errors.job_title && <p className="text-sm text-destructive">{errors.job_title.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" {...register("phone")} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="is_active"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <Label htmlFor="is_active">{t("active")}</Label>
        </div>
        <Button type="submit" disabled={updating}>
          {updating && <Loader2 className="h-4 w-4 animate-spin" />}
          {updating && <Loader2 className="h-4 w-4 animate-spin" />}
          {tc("save")}
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetEmployeeQuery, useUpdateEmployeeMutation } from "@/features/jobCards/api";
import { employeeUpdateSchema, type EmployeeUpdateFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  const t = useTranslations("hr");
  const router = useRouter();
  const { data: employee, isLoading: loading } = useGetEmployeeQuery(id, { skip: !id });
  const [update, { isLoading: updating }] = useUpdateEmployeeMutation();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
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
      router.push("/employees");
    } catch {
      setError("root", { message: "Failed to update employee" });
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" onClick={() => router.push("/employees")} className="mb-6">
        <ArrowLeft size={15} />
        Back to Employees
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
          <input id="is_active" type="checkbox" {...register("is_active")}
            className="h-4 w-4 rounded border-input text-indigo-500 focus:ring-indigo-500" />
          <Label htmlFor="is_active">{t("active")}</Label>
        </div>
        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <Button type="submit" disabled={updating}>
          {updating && <Loader2 className="h-4 w-4 animate-spin" />}
          {updating ? "Saving..." : t("save")}
        </Button>
      </form>
    </div>
  );
}

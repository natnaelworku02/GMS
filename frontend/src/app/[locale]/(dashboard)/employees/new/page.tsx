"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateEmployeeMutation } from "@/features/jobCards/api";
import { employeeCreateSchema, type EmployeeCreateFormData } from "@/lib/formSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewEmployeePage() {
  const t = useTranslations("hr");
  const router = useRouter();
  const [create, { isLoading }] = useCreateEmployeeMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EmployeeCreateFormData>({
    resolver: zodResolver(employeeCreateSchema),
  });

  const onSubmit = async (data: EmployeeCreateFormData) => {
    try {
      await create({ name: data.name, job_title: data.job_title, phone: data.phone }).unwrap();
      router.push("/employees");
    } catch {
      setError("root", { message: "Failed to create employee" });
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" onClick={() => router.push("/employees")} className="mb-6">
        <ArrowLeft size={15} />
        Back to Employees
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("create")}</h1>

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
        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? "Creating..." : t("create")}
        </Button>
      </form>
    </div>
  );
}

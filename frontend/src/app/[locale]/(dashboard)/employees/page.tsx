"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetEmployeesQuery, useCreateEmployeeMutation, useDeleteEmployeeMutation } from "@/features/jobCards/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { employeeCreateSchema, type EmployeeCreateFormData } from "@/lib/formSchemas";
import type { Employee } from "@/features/jobCards/types";

export default function EmployeesPage() {
  const t = useTranslations("hr");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data: employeesResp, isLoading } = useGetEmployeesQuery({ page, page_size: 20, search: search || undefined });
  const employees = employeesResp?.items ?? [];
  const total = employeesResp?.total ?? 0;
  const totalPages = employeesResp?.total_pages ?? 0;

  const [open, setOpen] = useState(false);
  const [create, { isLoading: creating }] = useCreateEmployeeMutation();
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleteEmployee, { isLoading: deleting }] = useDeleteEmployeeMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEmployee(deleteTarget.id).unwrap();
      toast.success("Employee deleted");
      setDeleteTarget(null);
    } catch (error) {
      const msg = (error as any)?.data?.detail || "Failed to delete employee";
      toast.error(msg);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeCreateFormData>({
    resolver: zodResolver(employeeCreateSchema),
  });

  const onCreate = async (data: EmployeeCreateFormData) => {
    try {
      await create({ name: data.name.trim(), job_title: data.job_title.trim(), phone: data.phone.trim() }).unwrap();
      toast.success(tc("save"));
      setOpen(false);
      reset();
    } catch {
      toast.error(tc("error"));
    }
  };

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: t("name"),
      render: (e) => (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 text-xs font-semibold text-indigo-500">
            {e.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </span>
          <span className="font-medium">{e.name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "job_title",
      header: t("jobTitle"),
      render: (e) => <span className="text-muted-foreground">{e.job_title}</span>,
    },
    {
      key: "phone",
      header: t("phone"),
      render: (e) => <span className="text-muted-foreground">{e.phone}</span>,
    },
    {
      key: "is_active",
      header: t("active"),
      render: (e) =>
        e.is_active ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-[oklch(0.62_0.17_165)]">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {t("active")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {t("inactive")}
          </span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          <Can permission="hr.update">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(ev: React.MouseEvent) => {
                ev.stopPropagation();
                router.push(`/employees/${e.id}`);
              }}
            >
              <Pencil size={14} />
            </Button>
          </Can>
          <Can permission="hr.delete">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(ev: React.MouseEvent) => {
                ev.stopPropagation();
                setDeleteTarget(e);
              }}
            >
              <Trash2 size={14} className="text-destructive" />
            </Button>
          </Can>
        </div>
      ),
      className: "w-20 text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${total} employee${total !== 1 ? "s" : ""}`}
        action={
          <Can permission="hr.create">
            <Button onClick={() => setOpen(true)}>
              <Plus size={15} />
              {t("create")}
            </Button>
          </Can>
        }
      />
      <div className="mt-6">
        <DataTable<Employee>
          columns={columns}
          data={employees}
          isLoading={isLoading}
          emptyMessage={t("noEmployees")}
          searchPlaceholder={t("search")}
          searchValue={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
        />
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {tc("previous")}
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              {tc("next")}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name">{t("name")}</Label>
              <Input id="emp-name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-title">{t("jobTitle")}</Label>
              <Input id="emp-title" {...register("job_title")} />
              {errors.job_title && <p className="text-xs text-destructive">{errors.job_title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-phone">{t("phone")}</Label>
              <Input id="emp-phone" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false); }}>{tc("cancel")}</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? tc("loading") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Employee"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        variant="destructive"
        disableConfirm={deleting}
      />
    </div>
  );
}

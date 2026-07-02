"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetEmployeesQuery, useCreateEmployeeMutation } from "@/features/jobCards/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
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
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Employee } from "@/features/jobCards/types";

export default function EmployeesPage() {
  const t = useTranslations("hr");
  const tc = useTranslations("common");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: employees = [], isLoading } = useGetEmployeesQuery();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [create, { isLoading: creating }] = useCreateEmployeeMutation();

  const filtered = search
    ? employees.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.job_title.toLowerCase().includes(search.toLowerCase()),
      )
    : employees;

  const handleCreate = async () => {
    if (!name.trim() || !jobTitle.trim() || !phone.trim()) return;
    try {
      await create({ name: name.trim(), job_title: jobTitle.trim(), phone: phone.trim() }).unwrap();
      toast.success(tc("save"));
      setOpen(false);
      setName("");
      setJobTitle("");
      setPhone("");
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
      ),
      className: "w-12 text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${employees.length} employee${employees.length !== 1 ? "s" : ""}`}
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
          data={filtered}
          isLoading={isLoading}
          emptyMessage={t("noEmployees")}
          searchPlaceholder={t("search")}
          searchValue={search}
          onSearch={setSearch}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name">{t("name")}</Label>
              <Input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-title">{t("jobTitle")}</Label>
              <Input id="emp-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-phone">{t("phone")}</Label>
              <Input id="emp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={creating || !name.trim() || !jobTitle.trim() || !phone.trim()}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? tc("loading") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

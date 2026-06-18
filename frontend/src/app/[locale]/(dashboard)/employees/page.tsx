"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetEmployeesQuery } from "@/features/jobCards/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import type { Employee } from "@/features/jobCards/types";

export default function EmployeesPage() {
  const t = useTranslations("hr");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: employees = [], isLoading } = useGetEmployeesQuery();

  const filtered = search
    ? employees.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.job_title.toLowerCase().includes(search.toLowerCase()),
      )
    : employees;

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: t("name"),
      render: (e) => <span className="font-medium">{e.name}</span>,
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
            <Button onClick={() => router.push("/employees/new")}>
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
          emptyMessage="No employees found"
          searchPlaceholder={t("search")}
          searchValue={search}
          onSearch={setSearch}
        />
      </div>
    </div>
  );
}

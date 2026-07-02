"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetToolsQuery } from "@/features/tools/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";
import type { Tool } from "@/features/tools/types";

export default function ToolsPage() {
  const t = useTranslations("tools");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: tools = [], isLoading } = useGetToolsQuery();

  const filtered = useMemo(() => {
    if (!search) return tools;
    const q = search.toLowerCase();
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.specifications?.toLowerCase().includes(q),
    );
  }, [tools, search]);

  const columns: Column<Tool>[] = [
    {
      key: "name",
      header: t("name"),
      render: (tool) => <span className="font-medium">{tool.name}</span>,
      sortable: true,
    },
    {
      key: "specifications",
      header: t("specifications"),
      render: (tool) => (
        <span className="text-muted-foreground">{tool.specifications || "—"}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: "total_quantity",
      header: t("totalQuantity"),
      render: (tool) => <span>{tool.total_quantity}</span>,
      sortable: true,
    },
    {
      key: "available_quantity",
      header: t("availableQuantity"),
      render: (tool) => (
        <Badge variant={tool.available_quantity > 0 ? "outline" : "destructive"} className={`font-medium ${tool.available_quantity > 0 ? "text-emerald-600 border-emerald-300 bg-emerald-50" : ""}`}>
          {tool.available_quantity}
        </Badge>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${tools.length} tool${tools.length !== 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/tools/checkouts")}>
              <ClipboardList size={14} />
              {t("checkouts")}
            </Button>
            <Button onClick={() => router.push("/tools/new")}>
              <Plus size={15} />
              {t("create")}
            </Button>
          </div>
        }
      />

      <div className="mt-6">
        <DataTable<Tool>
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No tools found"
          searchPlaceholder={t("name") + "..."}
          searchValue={search}
          onSearch={setSearch}
          onRowClick={(tool) => router.push(`/tools/${tool.id}`)}
        />
      </div>
    </div>
  );
}

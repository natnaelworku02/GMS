"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetInventoryLocationsQuery } from "@/features/inventory/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import type { InventoryLocation } from "@/features/inventory/types";

export default function InventoryLocationsPage() {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: locationsResp, isLoading } = useGetInventoryLocationsQuery({ page, page_size: 20, search: searchQuery || undefined });
  const locations = locationsResp?.items ?? [];
  const total = locationsResp?.total ?? 0;
  const totalPages = locationsResp?.total_pages ?? 0;

  const columns: Column<InventoryLocation>[] = [
    {
      key: "name",
      header: t("location"),
      render: (l) => <span className="font-medium">{l.name}</span>,
      sortable: true,
    },
    {
      key: "created_at",
      header: tc("createdAt"),
      render: (l) => (
        <span className="text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</span>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" onClick={() => router.push("/inventory")} className="mb-4">
        <ArrowLeft size={15} />
        {tc("back")} to {t("title")}
      </Button>
      <PageHeader
        title={t("locations")}
        description={`${total} location${total !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => router.push("/inventory/locations/new")}>
            <Plus size={15} />
            {t("createLocation")}
          </Button>
        }
      />
      <div className="mt-6">
        <DataTable<InventoryLocation>
          columns={columns}
          data={locations}
          isLoading={isLoading}
          emptyMessage={t("noLocations")}
          searchValue={searchQuery}
          onSearch={(v) => { setSearchQuery(v); setPage(1); }}
          searchPlaceholder={t("searchPlaceholder") || tc("search")}
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
    </div>
  );
}

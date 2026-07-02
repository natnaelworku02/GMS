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
  const [searchQuery, setSearchQuery] = useState("");
  const { data: locations = [], isLoading } = useGetInventoryLocationsQuery();

  const filteredLocations = locations.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
        description={`${locations.length} location${locations.length !== 1 ? "s" : ""}`}
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
          data={filteredLocations}
          isLoading={isLoading}
          emptyMessage={t("noLocations")}
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          searchPlaceholder={t("searchPlaceholder") || tc("search")}
        />
      </div>
    </div>
  );
}

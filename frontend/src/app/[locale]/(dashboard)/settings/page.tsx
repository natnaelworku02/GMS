"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useGetSettingsQuery, useUpdateSettingMutation } from "@/features/settings/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Setting } from "@/features/settings/types";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { data: settings = [], isLoading } = useGetSettingsQuery();
  const [updateSetting, { isLoading: isUpdating }] = useUpdateSettingMutation();
  const [editing, setEditing] = useState<Setting | null>(null);
  const [editValue, setEditValue] = useState("");

  const columns: Column<Setting>[] = [
    {
      key: "key",
      header: t("key"),
      render: (s) => <span className="font-mono text-sm">{s.key}</span>,
      sortable: true,
    },
    {
      key: "value",
      header: t("value"),
      render: (s) => <span className="text-sm">{s.value}</span>,
    },
    {
      key: "updated_at",
      header: t("updatedAt"),
      render: (s) => (
        <span className="text-sm text-muted-foreground">
          {new Date(s.updated_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <Can permission="settings.update">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setEditing(s);
              setEditValue(s.value);
            }}
          >
            <Pencil size={14} />
          </Button>
        </Can>
      ),
      className: "w-12 text-right",
    },
  ];

  const handleSave = async () => {
    if (!editing) return;
    try {
      await updateSetting({ key: editing.key, value: editValue }).unwrap();
      toast.success(tc("save"));
      setEditing(null);
    } catch {
      toast.error(tc("error"));
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("title")}
        description={t("count", { count: settings.length })}
      />

      <div className="mt-6">
        <DataTable<Setting>
          columns={columns}
          data={settings}
          isLoading={isLoading}
          emptyMessage={t("noSettings")}
        />
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("update")} — {editing?.key}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t("value")}</label>
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{tc("cancel")}</Button>
            <Button onClick={handleSave} disabled={isUpdating}>{tc("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

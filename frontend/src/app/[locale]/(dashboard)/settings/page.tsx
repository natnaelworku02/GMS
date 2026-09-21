"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useGetSettingsQuery, useUpdateSettingMutation } from "@/features/settings/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DatabaseBackup, Loader2, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Setting } from "@/features/settings/types";
import { useAppSelector } from "@/lib/hooks";
import { useCreateBackupMutation, useGetBackupsQuery, useRestoreBackupMutation } from "@/features/backups/api";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [searchQuery, setSearchQuery] = useState("");
  const isSuperAdmin = useAppSelector((state) => state.auth.isSuperAdmin);
  const { data: backupStatus } = useGetBackupsQuery(undefined, { skip: !isSuperAdmin });
  const [createBackup, { isLoading: creatingBackup }] = useCreateBackupMutation();
  const [restoreBackup, { isLoading: restoringBackup }] = useRestoreBackupMutation();
  const [restoreFile, setRestoreFile] = useState<string | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const { data: settings = [], isLoading } = useGetSettingsQuery();

  const filteredSettings = searchQuery
    ? settings.filter(
        (s) =>
          s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.value.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : settings;
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

  const handleCreateBackup = async () => {
    try { await createBackup().unwrap(); toast.success("Backup created"); }
    catch { toast.error("Backup failed"); }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    try {
      await restoreBackup({ filename: restoreFile, confirmation: restoreConfirmation }).unwrap();
      toast.success("Database restored"); setRestoreFile(null); setRestoreConfirmation("");
    } catch { toast.error("Restore failed"); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("title")}
        description={t("count", { count: settings.length })}
      />

      {isSuperAdmin && (
        <section className="mt-6 border-y py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="flex items-center gap-2 text-base font-semibold"><DatabaseBackup size={18} /> Database Backups</h2><p className="mt-1 text-sm text-muted-foreground">Automatic every 24 hours · retained for {backupStatus?.retention_days ?? 30} days</p></div>
            <Button onClick={handleCreateBackup} disabled={creatingBackup}>{creatingBackup && <Loader2 className="h-4 w-4 animate-spin" />} Create Backup Now</Button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm"><span className={`h-2 w-2 rounded-full ${backupStatus?.healthy ? "bg-emerald-500" : "bg-amber-500"}`} /><span>{backupStatus?.latest ? `Last successful backup: ${new Date(backupStatus.latest.created_at).toLocaleString()}` : "No successful backup yet"}</span></div>
          <div className="mt-4 divide-y">
            {(backupStatus?.backups ?? []).slice(0, 10).map((backup) => (
              <div key={backup.filename} className="flex items-center justify-between gap-3 py-2 text-sm"><div><p className="font-mono text-xs">{backup.filename}</p><p className="text-xs text-muted-foreground">{(backup.size_bytes / 1024 / 1024).toFixed(2)} MB · {new Date(backup.created_at).toLocaleString()}</p></div><Button size="sm" variant="outline" onClick={() => setRestoreFile(backup.filename)}><RotateCcw size={14} /> Restore</Button></div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6">
        <DataTable<Setting>
          columns={columns}
          data={filteredSettings}
          isLoading={isLoading}
          emptyMessage={t("noSettings")}
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          searchPlaceholder={t("searchPlaceholder") || tc("search")}
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

      <Dialog open={!!restoreFile} onOpenChange={(open) => { if (!open) { setRestoreFile(null); setRestoreConfirmation(""); } }}>
        <DialogContent><DialogHeader><DialogTitle>Restore Database</DialogTitle></DialogHeader><div className="space-y-3 py-3"><p className="text-sm text-destructive">This replaces the current database with {restoreFile}. Create a fresh backup first.</p><label className="block text-sm font-medium">Type RESTORE DATABASE to confirm</label><input value={restoreConfirmation} onChange={(event) => setRestoreConfirmation(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div><DialogFooter><Button variant="outline" onClick={() => setRestoreFile(null)}>Cancel</Button><Button variant="destructive" onClick={handleRestore} disabled={restoringBackup || restoreConfirmation !== "RESTORE DATABASE"}>{restoringBackup && <Loader2 className="h-4 w-4 animate-spin" />} Restore</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

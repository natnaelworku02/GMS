import { api } from "@/lib/api";

export interface BackupFile { filename: string; size_bytes: number; created_at: string }
export interface BackupStatus { healthy: boolean; backup_dir: string; retention_days: number; latest: BackupFile | null; backups: BackupFile[] }

export const backupsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBackups: build.query<BackupStatus, void>({ query: () => "/backups/", providesTags: ["Backups"] }),
    createBackup: build.mutation<BackupFile, void>({ query: () => ({ url: "/backups/", method: "POST" }), invalidatesTags: ["Backups"] }),
    restoreBackup: build.mutation<{ status: string; filename: string }, { filename: string; confirmation: string }>({
      query: (body) => ({ url: "/backups/restore", method: "POST", body }), invalidatesTags: ["Backups", "JobCards", "Performas", "InventoryItems", "Invoices", "Payments"],
    }),
  }),
});

export const { useGetBackupsQuery, useCreateBackupMutation, useRestoreBackupMutation } = backupsApi;

"use client";

import { useSync } from "@/providers/SyncProvider";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing } = useSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium ${
        isOnline
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      <WifiOff size={14} />
      {!isOnline ? (
        <span>You&apos;re offline — changes will sync when reconnected</span>
      ) : isSyncing ? (
        <span>Syncing {pendingCount} pending change{pendingCount !== 1 ? "s" : ""}...</span>
      ) : (
        <span>{pendingCount} change{pendingCount !== 1 ? "s" : ""} waiting to sync</span>
      )}
    </div>
  );
}

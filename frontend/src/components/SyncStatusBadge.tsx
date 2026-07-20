"use client";

import { useSync } from "@/providers/SyncProvider";
import { CloudOff, RotateCw, Cloud } from "lucide-react";

export function SyncStatusBadge() {
  const { isOnline, pendingCount, isSyncing } = useSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="relative">
      {!isOnline ? (
        <CloudOff size={16} className="text-destructive" />
      ) : isSyncing ? (
        <RotateCw size={16} className="text-amber-500 animate-spin" />
      ) : (
        <div className="relative">
          <Cloud size={16} className="text-amber-500" />
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">
            {pendingCount}
          </span>
        </div>
      )}
    </div>
  );
}

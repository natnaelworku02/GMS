"use client";

import { useSync } from "@/providers/SyncProvider";
import { AlertTriangle } from "lucide-react";

export function CacheStalenessWarning() {
  const { isOnline } = useSync();

  if (isOnline) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
      <AlertTriangle size={14} className="shrink-0" />
      <span>
        Offline mode — prices and stock quantities shown may be outdated.
        Verify after reconnecting.
      </span>
    </div>
  );
}

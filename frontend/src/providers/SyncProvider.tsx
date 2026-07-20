"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { getPendingMutations, updateMutation, removeMutation, getMutationCount } from "@/lib/offline/queue";
import { api } from "@/lib/api";

interface SyncContextValue {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  pendingCount: 0,
  isOnline: true,
  isSyncing: false,
  triggerSync: async () => {},
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(async () => {
    const count = await getMutationCount();
    setPendingCount(count);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      const pending = await getPendingMutations();
      for (const mutation of pending) {
        try {
          await updateMutation(mutation.id, { status: "syncing" });
          const token = localStorage.getItem("accessToken");
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}${mutation.endpoint}`,
            {
              method: mutation.method,
              headers,
              body: mutation.body ? JSON.stringify(mutation.body) : undefined,
            },
          );
          if (response.ok) {
            await removeMutation(mutation.id);
          } else {
            await updateMutation(mutation.id, {
              status: "failed",
              retryCount: mutation.retryCount + 1,
            });
          }
        } catch {
          await updateMutation(mutation.id, {
            status: "failed",
            retryCount: mutation.retryCount + 1,
          });
        }
      }
      api.util.invalidateTags(["JobCards", "Owners", "Vehicles", "Performas", "InventoryItems", "Tools", "Employees", "Users", "Roles"]);
      await refreshCount();
    } finally {
      setIsSyncing(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshCount();

    const handleOnline = async () => {
      setIsOnline(true);
      await triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueued = () => {
      refreshCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("mutation-queued", handleQueued);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("mutation-queued", handleQueued);
    };
  }, [triggerSync, refreshCount]);

  return (
    <SyncContext.Provider value={{ pendingCount, isOnline, isSyncing, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

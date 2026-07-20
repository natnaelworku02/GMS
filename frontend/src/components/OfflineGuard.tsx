"use client";

import { useSync } from "@/providers/SyncProvider";
import { WifiOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function OfflineGuard({
  children,
  message = "Connect to the internet to perform this action",
}: {
  children: React.ReactNode;
  message?: string;
}) {
  const { isOnline } = useSync();

  if (isOnline) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger>
        <span className="inline-flex cursor-not-allowed opacity-50">
          <span className="relative">
            {children}
            <span className="absolute -top-1 -right-1">
              <WifiOff size={10} className="text-destructive" />
            </span>
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">{message}</p>
      </TooltipContent>
    </Tooltip>
  );
}

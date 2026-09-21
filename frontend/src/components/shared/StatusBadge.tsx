import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending_inspection:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50",
  waiting_for_approval:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50",
  in_repair:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/50",
  waiting_for_parts:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50",
  ready_for_testing:
    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-800/50",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50",
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50",
  rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50",
};

const dotColors: Record<string, string> = {
  pending_inspection: "bg-amber-500",
  waiting_for_approval: "bg-orange-500",
  in_repair: "bg-indigo-500",
  waiting_for_parts: "bg-red-500",
  ready_for_testing: "bg-cyan-500",
  completed: "bg-emerald-500",
  sent: "bg-blue-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
};

type Props = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        statusStyles[status] || "bg-muted text-muted-foreground border-border",
        status === "in_repair" && "animate-pulse",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          dotColors[status] || "bg-current",
          status === "in_repair" && "animate-pulse",
        )}
      />
      {label}
    </span>
  );
}

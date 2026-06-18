import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending_inspection:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  waiting_for_approval:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  in_repair:
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  waiting_for_parts:
    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  ready_for_testing:
    "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  completed:
    "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  approved: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status] || "bg-muted text-muted-foreground border-border",
        status === "in_repair" && "animate-pulse",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          status === "in_repair" && "animate-pulse",
        )}
      />
      {label}
    </span>
  );
}

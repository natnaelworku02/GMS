import { Inbox } from "lucide-react";

type Props = {
  title?: string;
  message?: string;
  action?: React.ReactNode;
};

export function EmptyState({
  title = "No data",
  message = "Nothing to show here yet.",
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
        <Inbox className="size-6 text-muted-foreground/50" />
      </div>
      <div>
        <p className="font-medium text-foreground/80">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground/70">{message}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

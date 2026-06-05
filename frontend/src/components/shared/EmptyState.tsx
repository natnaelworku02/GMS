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
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Inbox className="size-12" />
      <div className="text-center">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm">{message}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message = "Something went wrong",
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <AlertCircle className="size-12 text-destructive" />
      <div className="text-center">
        <p className="font-medium text-foreground">Error</p>
        <p className="mt-1 text-sm">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      )}
    </div>
  );
}

import { Loader2 } from "lucide-react";

type Props = {
  message?: string;
};

export function LoadingState({ message = "Loading..." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="size-8 animate-spin" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

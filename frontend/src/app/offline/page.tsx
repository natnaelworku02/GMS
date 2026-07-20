import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re Offline</h1>
      <p className="max-w-sm text-muted-foreground">
        Connect to the internet to continue using the Garage Management System.
        Any changes you made will sync automatically when you reconnect.
      </p>
    </div>
  );
}

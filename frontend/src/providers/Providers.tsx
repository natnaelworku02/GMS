import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/lib/store-provider";
import { ThemeProvider } from "./ThemeProvider";
import { AuthInit } from "@/features/auth/components/AuthInit";
import { SyncProvider } from "./SyncProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ThemeProvider>
        <AuthInit>
          <SyncProvider>
            {children}
            <Toaster richColors closeButton />
          </SyncProvider>
        </AuthInit>
      </ThemeProvider>
    </StoreProvider>
  );
}

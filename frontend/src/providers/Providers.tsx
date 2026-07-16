import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/lib/store-provider";
import { ThemeProvider } from "./ThemeProvider";
import { AuthInit } from "@/features/auth/components/AuthInit";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ThemeProvider>
        <AuthInit>
          {children}
          <Toaster richColors closeButton />
        </AuthInit>
      </ThemeProvider>
    </StoreProvider>
  );
}

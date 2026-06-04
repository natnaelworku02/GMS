import { Toaster } from "sonner";
import { StoreProvider } from "@/lib/store-provider";
import { MSWProvider } from "./MSWProvider";
import { ThemeProvider } from "./ThemeProvider";
import { AuthInit } from "@/features/auth/components/AuthInit";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <MSWProvider>
        <ThemeProvider>
          <AuthInit>
            {children}
            <Toaster richColors closeButton />
          </AuthInit>
        </ThemeProvider>
      </MSWProvider>
    </StoreProvider>
  );
}

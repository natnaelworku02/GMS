import { StoreProvider } from "@/lib/store-provider";
import { MSWProvider } from "./MSWProvider";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <MSWProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </MSWProvider>
    </StoreProvider>
  );
}

"use client";

import { useEffect, useState } from "react";

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enable = process.env.NEXT_PUBLIC_MSW_ENABLED === "true";

    if (!enable) {
      setReady(true);
      return;
    }

    const init = async () => {
      const { worker } = await import("@/mocks/browser");
      await worker.start({
        onUnhandledRequest: "bypass",
      });
      setReady(true);
    };

    init();
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}

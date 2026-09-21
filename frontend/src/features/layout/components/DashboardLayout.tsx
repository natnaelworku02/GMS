"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { OfflineBanner } from "@/components/OfflineBanner";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <OfflineBanner />
      <div className="flex flex-1">
        <div className="hidden lg:flex">
          <Sidebar />
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <Navbar onToggleMenu={() => setMobileNavOpen(true)} />
          <motion.main
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-1 overflow-x-hidden bg-gradient-to-br from-background via-background to-muted/20 px-3 py-4 pb-24 sm:px-4 md:px-6 md:py-5 lg:pb-6"
          >
            {children}
          </motion.main>
        </div>
        <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      </div>
    </div>
  );
}

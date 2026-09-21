"use client";

import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { Search, Menu } from "lucide-react";

interface NavbarProps {
  onToggleMenu?: () => void;
}

export function Navbar({ onToggleMenu }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/90 px-3 backdrop-blur-xl sm:gap-3 md:px-6">
      <button
        onClick={onToggleMenu}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
      >
        <Menu size={18} />
      </button>

      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <input
          type="text"
          placeholder="Search..."
          className="h-9 w-full rounded-full border border-border/60 bg-muted/40 pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground/40 transition-all focus:border-primary/30 focus:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center rounded-md border border-border/60 bg-muted/60 px-1.5 text-[10px] font-medium text-muted-foreground/50">
          Ctrl+K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-0.5">
        <LocaleSwitcher />
        <ThemeToggle />
        <SyncStatusBadge />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}

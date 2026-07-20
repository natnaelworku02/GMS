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
    <header className="flex h-14 items-center gap-3 border-b border-indigo-500/10 bg-card/80 backdrop-blur-sm px-4 md:px-6">
      <button
        onClick={onToggleMenu}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
      >
        <Menu size={18} />
      </button>

      <div className="relative flex-1 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          className="h-9 w-full rounded-lg border border-input bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-indigo-500/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground/60">
          Ctrl+K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <LocaleSwitcher />
        <ThemeToggle />
        <SyncStatusBadge />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}

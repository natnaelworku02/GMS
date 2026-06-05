"use client";

import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { UserMenu } from "./UserMenu";

export function Navbar() {
  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b bg-card px-6">
      <div className="flex items-center gap-1">
        <LocaleSwitcher />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

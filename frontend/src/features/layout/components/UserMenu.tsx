"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { logout as logoutAction } from "@/features/auth/authSlice";
import { storage } from "@/lib/storage";
import { LogOut, ChevronDown } from "lucide-react";

export function UserMenu() {
  const t = useTranslations("auth");
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await storage.clearTokens();
    dispatch(logoutAction());
    router.replace("/login");
  };

  if (!user) return null;

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-500">
          {initials}
        </span>
        <span className="hidden sm:inline text-sm">{user.full_name}</span>
        <ChevronDown size={12} className="hidden sm:block text-muted-foreground/50" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border bg-card p-1 shadow-lg shadow-black/5">
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{user.full_name}</p>
            <p className="text-xs text-muted-foreground">{user.role_name || user.role_id}</p>
          </div>
          <div className="border-t" />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut size={15} />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Can } from "@/features/auth/components/Can";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { logout as logoutAction } from "@/features/auth/authSlice";
import { useRouter } from "@/i18n/navigation";
import { storage } from "@/lib/storage";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Package,
  Wrench,
  Users,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
  Truck,
  Briefcase,
} from "lucide-react";

const navItems = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard, permission: null },
  { href: "/job-cards", labelKey: "jobCards", icon: FileText, permission: "job_cards.read", disabled: false },
  { href: "/owners", labelKey: "owners", icon: UserCircle, permission: "job_cards.read", disabled: false },
  { href: "/vehicles", labelKey: "vehicles", icon: Truck, permission: "job_cards.read", disabled: false },
  { href: "/employees", labelKey: "employees", icon: Briefcase, permission: "hr.read", disabled: false },
  { href: "/performas", labelKey: "performas", icon: Receipt, permission: "performa.read", disabled: true },
  { href: "/inventory", labelKey: "inventory", icon: Package, permission: "inventory.read", disabled: true },
  { href: "/tools", labelKey: "tools", icon: Wrench, permission: "tools.read", disabled: true },
  { href: "/users", labelKey: "users", icon: Users, permission: "users.read", disabled: false },
  { href: "/roles", labelKey: "roles", icon: ShieldCheck, permission: "users.read", disabled: false },
  { href: "/settings", labelKey: "settings", icon: Settings, permission: "settings.read", disabled: true },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const initials = user?.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await storage.clearTokens();
    dispatch(logoutAction());
    router.replace("/login");
  };

  return (
    <aside
      className={`flex flex-col bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex h-14 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500">
          <span className="text-sm font-bold text-white">G</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-white/90">GMS</span>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                isActive
                  ? "bg-indigo-500/15 text-indigo-300 font-medium"
                  : "text-white/60 hover:bg-white/5 hover:text-white/90"
              } ${item.disabled ? "pointer-events-none opacity-30" : ""}`}
              title={item.disabled ? "Coming soon" : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-indigo-400" />
              )}
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          );

          if (item.permission) {
            return (
              <Can key={item.href} permission={item.permission} fallback={null}>
                {link}
              </Can>
            );
          }

          return link;
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        {!collapsed && user && (
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/30 text-xs font-semibold text-indigo-300">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white/90">{user.full_name}</p>
              <p className="truncate text-xs text-white/40">{user.role_name || "User"}</p>
            </div>
          </div>
        )}

        <div className="flex gap-1">
          {collapsed && user && (
            <button
              onClick={handleLogout}
              className="flex flex-1 items-center justify-center rounded-lg px-2 py-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex flex-1 items-center justify-center rounded-lg px-2 py-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

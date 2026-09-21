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
  History,
  PlusCircle,
} from "lucide-react";

const navGroups = [
  {
    label: "core",
    items: [
      { href: "/", labelKey: "dashboard", icon: LayoutDashboard, permission: null },
      { href: "/start-job", labelKey: "startJob", icon: PlusCircle, permission: "job_cards.create" },
      { href: "/job-cards", labelKey: "jobCards", icon: FileText, permission: "job_cards.read" },
      { href: "/performas", labelKey: "performas", icon: Receipt, permission: "performa.read" },
      { href: "/invoices", labelKey: "invoices", icon: Receipt, permission: "performa.read" },
    ],
  },
  {
    label: "resources",
    items: [
      { href: "/owners", labelKey: "owners", icon: UserCircle, permission: "job_cards.read" },
      { href: "/vehicles", labelKey: "vehicles", icon: Truck, permission: "job_cards.read" },
      { href: "/history", labelKey: "history", icon: History, permission: "job_cards.read" },
      { href: "/employees", labelKey: "employees", icon: Briefcase, permission: "hr.read" },
      { href: "/inventory", labelKey: "inventory", icon: Package, permission: "inventory.read" },
      { href: "/tools", labelKey: "tools", icon: Wrench, permission: "tools.read" },
    ],
  },
  {
    label: "admin",
    items: [
      { href: "/users", labelKey: "users", icon: Users, permission: "users.read" },
      { href: "/roles", labelKey: "roles", icon: ShieldCheck, permission: "users.read" },
      { href: "/audit-logs", labelKey: "auditLogs", icon: History, permission: "settings.read" },
      { href: "/settings", labelKey: "settings", icon: Settings, permission: "settings.read" },
    ],
  },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
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
      className={`flex flex-col bg-gradient-to-b from-[#0c1222] via-[#0f172a] to-[#111827] text-white transition-all duration-300 ease-in-out ${
        collapsed ? "w-[60px]" : "w-56"
      }`}
    >
      <div className="flex h-14 items-center gap-3 border-b border-white/[0.06] px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/20">
          <span className="text-sm font-bold text-white">G</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white/90">GMS</span>
            <span className="text-[10px] font-medium text-white/30 tracking-wide uppercase">Garage</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
            {!collapsed && (
              <div className="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-wider text-white/20">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
                      isActive
                        ? "bg-indigo-500/15 text-indigo-300 font-medium shadow-sm shadow-indigo-500/5"
                        : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
                    }`}
                    title={collapsed ? t(item.labelKey) : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-500 shadow-sm shadow-indigo-500/50" />
                    )}
                    <Icon size={18} className={`shrink-0 ${isActive ? "text-indigo-400" : "text-white/30 group-hover:text-white/50"}`} />
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
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-2">
        {!collapsed && user && (
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 text-[10px] font-bold text-indigo-300 ring-1 ring-indigo-500/10">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/80">{user.full_name}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/35 transition-all hover:bg-white/[0.04] hover:text-white/60"
              title={tc("logout")}
            >
              <LogOut size={16} />
              <span>{tc("logout")}</span>
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center justify-center rounded-lg p-2 text-white/25 transition-all hover:bg-white/[0.04] hover:text-white/50 ${
              collapsed ? "w-full" : ""
            }`}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

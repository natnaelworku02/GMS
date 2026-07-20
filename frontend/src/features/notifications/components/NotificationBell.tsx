"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from "../api";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const t = useTranslations("notifications");
  const nt = useTranslations("nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unread = [] } = useGetNotificationsQuery({ unread: true });
  const [markRead] = useMarkNotificationReadMutation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markRead(id);
  };

  const timeAgo = (dateStr: string) => {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label={nt("notifications")}
      >
        <Bell size={16} />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border bg-card shadow-lg shadow-black/5">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h3 className="text-sm font-semibold">{t("title")}</h3>
            {unread.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {unread.length} {t("unread")}
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {unread.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              unread.slice(0, 5).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 border-b last:border-b-0"
                >
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                </button>
              ))
            )}
          </div>

          <div className="border-t p-2">
            <button
              onClick={() => { setOpen(false); router.push("/notifications"); }}
              className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-indigo-500 transition-colors hover:bg-accent"
            >
              {t("seeAll")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

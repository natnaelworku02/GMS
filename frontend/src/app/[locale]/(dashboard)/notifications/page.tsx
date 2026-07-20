"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from "@/features/notifications/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const [showUnreadOnly, setShowUnreadOnly] = useState(true);
  const { data: notifications = [], isLoading } = useGetNotificationsQuery(
    showUnreadOnly ? { unread: true } : undefined,
  );
  const [markRead, { isLoading: marking }] = useMarkNotificationReadMutation();

  const handleMarkRead = async (id: string) => {
    await markRead(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("title")}
        description={`${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`}
      />

      <div className="mb-4 flex items-center gap-2">
        {notifications.some((n) => !n.is_read) && (
          <Button variant="outline" size="sm" className="ml-auto">
            <CheckCheck size={14} />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setShowUnreadOnly(true)}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            showUnreadOnly ? "bg-indigo-500/10 text-indigo-500 font-medium" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          {t("unread")}
        </button>
        <button
          onClick={() => setShowUnreadOnly(false)}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            !showUnreadOnly ? "bg-indigo-500/10 text-indigo-500 font-medium" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          {t("all")}
        </button>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.is_read ? "bg-muted-foreground/30" : "bg-indigo-500"}`} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.entity_type && (
                    <Badge variant="outline" className="text-[10px]">{n.entity_type}</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>

              {!n.is_read && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleMarkRead(n.id)}
                  disabled={marking}
                  title={t("markRead")}
                >
                  <CheckCheck size={15} />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

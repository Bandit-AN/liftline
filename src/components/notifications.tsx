"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ClipboardCheck, Dumbbell, MessageSquare, Sparkles, Users } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { relativeTime } from "@/lib/dates";
import type { AppNotification } from "@/lib/types";
import { Button, cx, EmptyState, IconButton, LoadingBlock, useToast } from "./ui";

const ICONS = { message: MessageSquare, check_in: ClipboardCheck, feedback: ClipboardCheck, plan: Dumbbell, group: Users, system: Sparkles };

export function useNotifications() {
  const { session } = useSession();
  return useList("notifications", { eq: { user_id: session.userId }, order: { col: "created_at", asc: false }, limit: 50 });
}

export function NotificationList({ items, onOpen, compact }: { items: AppNotification[]; onOpen: (n: AppNotification) => void; compact?: boolean }) {
  if (!items.length) return <EmptyState icon={<Bell className="size-6" />} title="You're all caught up" body="New messages, check-ins and plan updates will show up here." className={compact ? "border-0" : ""} />;
  return (
    <ul className="divide-y divide-line">
      {items.map((n) => {
        const I = ICONS[n.kind] ?? Sparkles;
        return (
          <li key={n.id}>
            <button onClick={() => onOpen(n)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-2">
              <span className={cx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", n.read_at ? "bg-surface-3 text-faint" : "bg-accent/12 text-accent")}>
                <I className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx("block text-sm", !n.read_at && "font-medium")}>{n.title}</span>
                {n.body && <span className="block truncate text-[13px] text-muted">{n.body}</span>}
                <span className="block text-xs text-faint">{relativeTime(n.created_at)}</span>
              </span>
              {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function useOpenNotification() {
  const { repo } = useSession();
  const router = useRouter();
  return async (n: AppNotification) => {
    if (!n.read_at) await repo.update("notifications", n.id, { read_at: new Date().toISOString() }).catch(() => {});
    if (n.link) router.push(n.link);
  };
}

export function useMarkAllRead(items: AppNotification[]) {
  const { repo } = useSession();
  const toast = useToast();
  return async () => {
    try {
      const at = new Date().toISOString();
      await Promise.all(items.filter((n) => !n.read_at).map((n) => repo.update("notifications", n.id, { read_at: at })));
    } catch (e) {
      toast.error(e);
    }
  };
}

export function NotificationBell() {
  const { data, loading } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openN = useOpenNotification();
  const markAll = useMarkAllRead(data);
  const unread = data.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <IconButton label={unread ? `Notifications (${unread} unread)` : "Notifications"} onClick={() => setOpen((o) => !o)} className="relative">
        <Bell className="size-[18px]" />
        {unread > 0 && <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">{unread > 9 ? "9+" : unread}</span>}
      </IconButton>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <Button variant="ghost" size="sm" icon={<CheckCheck className="size-4" />} onClick={markAll} disabled={!unread}>Mark all read</Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? <div className="p-4"><LoadingBlock rows={3} /></div> : (
              <NotificationList items={data.slice(0, 20)} compact onOpen={(n) => { setOpen(false); openN(n); }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

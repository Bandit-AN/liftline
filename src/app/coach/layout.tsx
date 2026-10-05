"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Dumbbell, LayoutGrid, Library, Menu, MessageSquare, Salad, Settings, Users, UsersRound, X } from "lucide-react";
import { RequireRole } from "@/components/guard";
import { DemoBadge, Logo } from "@/components/brand";
import { NotificationBell } from "@/components/notifications";
import { AccountMenu } from "@/components/account-menu";
import { cx, IconButton } from "@/components/ui";
import { useList, useSession } from "@/lib/app-context";

const NAV = [
  { href: "/coach", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/coach/clients", label: "Clients", icon: Users },
  { href: "/coach/check-ins", label: "Check-ins", icon: ClipboardCheck, badge: "checkins" as const },
  { href: "/coach/messages", label: "Messages", icon: MessageSquare, badge: "messages" as const },
  { href: "/coach/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/coach/exercises", label: "Exercises", icon: Library },
  { href: "/coach/nutrition", label: "Nutrition", icon: Salad },
  { href: "/coach/community", label: "Community", icon: UsersRound },
  { href: "/coach/settings", label: "Settings", icon: Settings },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { session } = useSession();
  const pending = useList("check_ins", { eq: { coach_id: session.userId, status: "submitted" } });
  const unread = useList("messages", { eq: { sender_role: "client" }, isNull: ["read_at"] });
  const counts = { checkins: pending.data.length, messages: unread.data.length };

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        const count = n.badge ? counts[n.badge] : 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active ? "bg-surface-2 text-ink font-medium" : "text-muted hover:bg-surface-2/60 hover:text-ink",
            )}
          >
            <n.icon className={cx("size-[18px]", active && "text-accent")} />
            <span className="flex-1">{n.label}</span>
            {count > 0 && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent tnum">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function CoachShell({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  useEffect(() => setDrawer(false), [pathname]);

  return (
    <div className="min-h-dvh md:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface/40 px-4 py-5 md:flex">
        <Link href="/coach" className="mb-8 px-2"><Logo /></Link>
        <Nav />
        <div className="mt-auto rounded-xl border border-line px-3 py-3">
          <p className="truncate text-sm font-medium">{session.profile.business_name || session.profile.full_name}</p>
          <p className="truncate text-xs text-muted">{session.profile.full_name}</p>
          {session.mode === "demo" && <DemoBadge className="mt-2" />}
        </div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-surface px-4 py-5">
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo />
              <IconButton label="Close menu" onClick={() => setDrawer(false)}><X className="size-4" /></IconButton>
            </div>
            <Nav onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur md:px-8">
        <IconButton label="Open menu" className="md:hidden" onClick={() => setDrawer(true)}><Menu className="size-5" /></IconButton>
        <span className="md:hidden"><Logo compact /></span>
        <div className="flex-1" />
        {session.mode === "demo" && <DemoBadge className="md:hidden" />}
        <NotificationBell />
        <AccountMenu settingsHref="/coach/settings" />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="coach">
      <CoachShell>{children}</CoachShell>
    </RequireRole>
  );
}

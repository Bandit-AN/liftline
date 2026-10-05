"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, LineChart, MessageCircle, Salad } from "lucide-react";
import { RequireRole } from "@/components/guard";
import { DemoBadge, Logo } from "@/components/brand";
import { NotificationBell } from "@/components/notifications";
import { AccountMenu } from "@/components/account-menu";
import { cx, EmptyState, LinkButton } from "@/components/ui";
import { useApp, useList, useSession } from "@/lib/app-context";

const NAV = [
  { href: "/app", label: "Today", icon: Home, exact: true },
  { href: "/app/workout", label: "Train", icon: Dumbbell },
  { href: "/app/food", label: "Food", icon: Salad },
  { href: "/app/progress", label: "Progress", icon: LineChart },
  { href: "/app/messages", label: "Coach", icon: MessageCircle, badge: true },
];

function ClientShell({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const { signOut } = useApp();
  const pathname = usePathname();
  const unread = useList("messages", session.clientId ? { eq: { client_id: session.clientId, sender_role: "coach" }, isNull: ["read_at"] } : null);

  if (!session.clientId) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
        <EmptyState
          title="Your account isn't linked to a coach yet"
          body="Open the invite link your coach sent you while signed in to this account to connect. If the link expired, ask your coach for a new one."
          action={<LinkButton href="/" variant="secondary" className="mt-1">Home</LinkButton>}
        />
        <button onClick={() => signOut()} className="mt-4 text-sm text-muted hover:text-ink">Sign out</button>
      </main>
    );
  }

  const isChat = pathname.startsWith("/app/messages");

  return (
    <div className="mx-auto min-h-dvh max-w-lg md:border-x md:border-line">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur">
        <Link href="/app" aria-label="Today"><Logo compact /></Link>
        {session.mode === "demo" && <DemoBadge />}
        <div className="flex-1" />
        <NotificationBell />
        <AccountMenu settingsHref="/app/profile" />
      </header>
      <main className={cx(isChat ? "" : "px-4 pb-28 pt-5")}>{children}</main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur" aria-label="Main">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            const count = n.badge ? unread.data.length : 0;
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cx("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px]", active ? "text-accent" : "text-muted")}>
                <n.icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                {n.label}
                {count > 0 && <span className="absolute right-[calc(50%-20px)] top-2.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">{count}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="client">
      <ClientShell>{children}</ClientShell>
    </RequireRole>
  );
}

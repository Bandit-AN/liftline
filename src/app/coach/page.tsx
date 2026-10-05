"use client";

import Link from "next/link";
import { Activity, ArrowRight, ClipboardCheck, Dumbbell, MessageSquare, UserPlus, Users } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { addDays, relativeTime, today } from "@/lib/dates";
import { checkInState, completion } from "@/lib/stats";
import { Avatar, Badge, Card, CardHeader, EmptyState, ErrorState, LinkButton, LoadingBlock, PageHeader, Skeleton, Stat } from "@/components/ui";

export default function CoachOverview() {
  const { session } = useSession();
  const clients = useList("clients", { eq: { coach_id: session.userId }, order: { col: "full_name" } });
  const checkIns = useList("check_ins", { eq: { coach_id: session.userId }, gte: { week_of: addDays(today(), -14) } });
  const unread = useList("messages", { eq: { sender_role: "client" }, isNull: ["read_at"] });
  const plans = useList("workout_plans", { eq: { coach_id: session.userId, active: true } });
  const logs = useList("workout_logs", { gte: { date: addDays(today(), -8) }, order: { col: "created_at", asc: false } });

  const loading = clients.loading || checkIns.loading || unread.loading || plans.loading || logs.loading;
  const error = clients.error || checkIns.error || unread.error || plans.error || logs.error;

  const active = clients.data.filter((c) => c.status === "active");
  const pending = checkIns.data.filter((c) => c.status === "submitted");
  const comp = completion(plans.data, logs.data, active.map((c) => c.id));
  const byId = Object.fromEntries(clients.data.map((c) => [c.id, c]));

  const unreadByClient = new Map<string, number>();
  unread.data.forEach((m) => unreadByClient.set(m.client_id, (unreadByClient.get(m.client_id) ?? 0) + 1));

  type Item = { key: string; name: string; text: string; tone: "accent" | "warn" | "danger" | "info"; tag: string; href: string };
  const attention: Item[] = [];
  pending.forEach((ci) => byId[ci.client_id] && attention.push({ key: `ci-${ci.id}`, name: byId[ci.client_id].full_name, text: "Submitted a weekly check-in", tone: "accent", tag: "Review", href: `/coach/check-ins?id=${ci.id}` }));
  unreadByClient.forEach((n, cid) => byId[cid] && attention.push({ key: `m-${cid}`, name: byId[cid].full_name, text: `${n} unread message${n > 1 ? "s" : ""}`, tone: "info", tag: "Reply", href: `/coach/messages?client=${cid}` }));
  active.forEach((c) => {
    const st = checkInState(c, checkIns.data);
    if (st.state === "overdue") attention.push({ key: `od-${c.id}`, name: c.full_name, text: "Check-in overdue", tone: "danger", tag: "Overdue", href: `/coach/clients/${c.id}` });
    const days = c.last_activity_at ? (Date.now() - new Date(c.last_activity_at).getTime()) / 864e5 : 99;
    if (days >= 4) attention.push({ key: `in-${c.id}`, name: c.full_name, text: `No activity for ${Math.floor(days)} days`, tone: "warn", tag: "Inactive", href: `/coach/messages?client=${c.id}` });
  });
  clients.data.filter((c) => c.status === "invited").forEach((c) => attention.push({ key: `inv-${c.id}`, name: c.full_name, text: "Hasn't accepted their invite yet", tone: "warn", tag: "Invited", href: `/coach/clients/${c.id}` }));

  const firstName = session.profile.full_name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${firstName || "coach"}`}
        subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        actions={<>
          <LinkButton href="/coach/workouts/new" icon={<Dumbbell className="size-4" />}>New workout</LinkButton>
          <LinkButton href="/coach/clients?invite=1" variant="primary" icon={<UserPlus className="size-4" />}>Invite client</LinkButton>
        </>}
      />
      {error && <div className="mb-6"><ErrorState message={error} onRetry={() => { clients.reload(); checkIns.reload(); }} /></div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[118px]" />) : (
          <>
            <Stat label="Active clients" value={active.length} sub={`${clients.data.length - active.length} invited or paused`} icon={<Users className="size-4" />} href="/coach/clients" />
            <Stat label="Pending check-ins" value={pending.length} sub={pending.length ? "Waiting for your review" : "All reviewed"} icon={<ClipboardCheck className="size-4" />} href="/coach/check-ins" />
            <Stat label="Unread messages" value={unread.data.length} sub={`${unreadByClient.size} conversation${unreadByClient.size === 1 ? "" : "s"}`} icon={<MessageSquare className="size-4" />} href="/coach/messages" />
            <Stat label="Workout completion" value={`${comp.pct}%`} sub={`${comp.done} of ${comp.scheduled} sessions · last 7 days`} icon={<Activity className="size-4" />} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Needs your attention" subtitle="Check-ins, messages and clients who've gone quiet" />
          <div className="px-2 pb-3">
            {loading ? <div className="px-3"><LoadingBlock /></div> : attention.length === 0 ? (
              <EmptyState className="mx-3 mb-2" title="Nothing waiting on you" body="New check-ins, messages and inactive clients will appear here." />
            ) : (
              <ul>
                {attention.slice(0, 10).map((a) => (
                  <li key={a.key}>
                    <Link href={a.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2">
                      <Avatar name={a.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.name}</p>
                        <p className="truncate text-[13px] text-muted">{a.text}</p>
                      </div>
                      <Badge tone={a.tone}>{a.tag}</Badge>
                      <ArrowRight className="size-4 text-faint" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent workouts" subtitle="Latest sessions logged by clients" />
          <div className="px-5 pb-5">
            {loading ? <LoadingBlock /> : logs.data.filter((l) => l.completed).length === 0 ? (
              <EmptyState title="No workouts logged yet" body="Once clients log sessions you'll see them here." />
            ) : (
              <ul className="space-y-3">
                {logs.data.filter((l) => l.completed && byId[l.client_id]).slice(0, 7).map((l) => (
                  <li key={l.id}>
                    <Link href={`/coach/clients/${l.client_id}?tab=logs`} className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-accent/10 text-accent"><Dumbbell className="size-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{byId[l.client_id].full_name}</p>
                        <p className="truncate text-xs text-muted">{l.day_name} · {l.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)} sets</p>
                      </div>
                      <span className="text-xs text-faint">{relativeTime(l.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

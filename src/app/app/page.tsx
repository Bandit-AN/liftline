"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, BedDouble, CheckCircle2, ClipboardCheck, Dumbbell, MessageCircle, Plus, Sparkles, UsersRound, X } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { addDays, fmtDate, today, WEEKDAYS_LONG, weekday, weekStart } from "@/lib/dates";
import { checkInState, dayForDate, totals } from "@/lib/stats";
import { Card, cx, IconButton, LinkButton, ProgressBar, Ring, Skeleton } from "@/components/ui";
import { HabitList } from "@/components/client/habits";
import { MACRO_COLORS } from "@/components/macro-split";
import { withSuspense } from "@/components/with-suspense";

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-7 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

function Today() {
  const { session } = useSession();
  const cid = session.clientId!;
  const params = useSearchParams();
  const [welcome, setWelcome] = useState(params.get("welcome") === "1");
  const T = today();

  const client = useList("clients", { eq: { id: cid } });
  const plan = useList("workout_plans", { eq: { client_id: cid, active: true } });
  const nplan = useList("nutrition_plans", { eq: { client_id: cid, active: true } });
  const logs = useList("workout_logs", { eq: { client_id: cid, date: T } });
  const food = useList("food_entries", { eq: { client_id: cid, date: T } });
  const checkIns = useList("check_ins", { eq: { client_id: cid }, gte: { week_of: addDays(weekStart(T), -7) } });
  const unread = useList("messages", { eq: { client_id: cid, sender_role: "coach" }, isNull: ["read_at"] });
  const groups = useList("groups", {});

  const c = client.data[0];
  const p = plan.data[0];
  const day = dayForDate(p, T);
  const log = logs.data.find((l) => l.day_id === day?.id) ?? logs.data[0];
  const n = nplan.data[0];
  const t = totals(food.data);
  const ci = c ? checkInState(c, checkIns.data.filter((x) => x.week_of === weekStart(T))) : null;
  const remind = !!c?.notification_prefs.check_in_reminders && (ci?.state === "due" || ci?.state === "overdue");
  const lastFeedback = checkIns.data.filter((x) => x.coach_feedback).sort((a, b) => (a.week_of < b.week_of ? 1 : -1))[0];
  const loading = client.loading || plan.loading || nplan.loading;

  const nextDay = p ? Array.from({ length: 7 }, (_, i) => addDays(T, i + 1)).map((d) => ({ d, day: dayForDate(p, d) })).find((x) => x.day) : null;
  const doneSets = log?.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0) ?? 0;
  const totalSets = day?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0;

  return (
    <>
      <p className="text-[13px] text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
      <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Hey {session.profile.full_name.split(" ")[0]} 👋</h1>

      {welcome && (
        <Card className="relative mt-4 border-accent/30 bg-accent/5 p-4">
          <IconButton label="Dismiss" className="absolute right-2 top-2" onClick={() => setWelcome(false)}><X className="size-4" /></IconButton>
          <p className="flex items-center gap-2 font-medium"><Sparkles className="size-4 text-accent" /> You&apos;re in!</p>
          <p className="mt-1 pr-6 text-[13px] text-muted">This is your Today screen. Your coach&apos;s plan shows up here — log workouts, food and habits, and check in once a week. Start by setting your goals in your <Link className="text-accent underline-offset-2 hover:underline" href="/app/profile">profile</Link>.</p>
        </Card>
      )}

      <SectionTitle>Today&apos;s training</SectionTitle>
      {loading ? <Skeleton className="h-28" /> : !p ? (
        <Card className="p-4 text-sm text-muted">Your coach hasn&apos;t assigned a workout plan yet. You&apos;ll get a notification when they do.</Card>
      ) : day ? (
        <Link href="/app/workout">
          <Card className={cx("p-4 transition-colors", log?.completed ? "border-accent/30" : "hover:border-line-strong")}>
            <div className="flex items-center gap-3">
              <span className={cx("flex size-11 items-center justify-center rounded-xl", log?.completed ? "bg-accent text-accent-ink" : "bg-accent/10 text-accent")}>
                {log?.completed ? <CheckCircle2 className="size-5" /> : <Dumbbell className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{day.name}</p>
                <p className="truncate text-[13px] text-muted">{day.exercises.length} exercises · {day.exercises.slice(0, 3).map((e) => e.name).join(", ")}{day.exercises.length > 3 ? "…" : ""}</p>
              </div>
              <ArrowRight className="size-4 text-faint" />
            </div>
            {log && !log.completed && <><ProgressBar value={doneSets} max={totalSets} className="mt-3" /><p className="mt-1.5 text-xs text-muted">{doneSets} of {totalSets} sets done — tap to continue</p></>}
            {log?.completed && <p className="mt-3 text-xs text-accent">Completed — nice work!</p>}
            {!log && <div className="mt-3 inline-flex h-9 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">Start workout</div>}
          </Card>
        </Link>
      ) : (
        <Card className="flex items-center gap-3 p-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 text-muted"><BedDouble className="size-5" /></span>
          <div className="flex-1">
            <p className="font-semibold">Rest day</p>
            <p className="text-[13px] text-muted">{nextDay ? `Next: ${nextDay.day!.name} on ${WEEKDAYS_LONG[weekday(nextDay.d)]}` : "Recover, walk, hydrate."}</p>
          </div>
          <LinkButton href="/app/workout" size="sm" variant="ghost">Train anyway</LinkButton>
        </Card>
      )}

      <SectionTitle action={<Link href="/app/food" className="flex items-center gap-1 text-[13px] text-accent"><Plus className="size-3.5" /> Log food</Link>}>Nutrition</SectionTitle>
      {loading || food.loading ? <Skeleton className="h-36" /> : (
        <Link href="/app/food">
          <Card className="flex items-center gap-5 p-4">
            <Ring value={t.calories} max={n?.calories ?? 0} size={104} stroke={9}>
              <span className="text-lg font-semibold tnum leading-none">{n ? Math.max(0, n.calories - t.calories).toLocaleString() : t.calories.toLocaleString()}</span>
              <span className="mt-1 text-[10.5px] text-muted">{n ? (t.calories > n.calories ? "over" : "kcal left") : "kcal eaten"}</span>
            </Ring>
            <div className="flex-1 space-y-2.5">
              {n ? ([["Protein", t.protein, n.protein, MACRO_COLORS.protein], ["Carbs", t.carbs, n.carbs, MACRO_COLORS.carbs], ["Fat", t.fat, n.fat, MACRO_COLORS.fat]] as const).map(([l, v, max, col]) => (
                <div key={l}>
                  <div className="flex justify-between text-xs"><span className="text-muted">{l}</span><span className="tnum">{Math.round(v)}<span className="text-faint"> / {max}g</span></span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: col }} /></div>
                </div>
              )) : <p className="text-[13px] text-muted">No targets yet — your coach will set calories and macros.</p>}
            </div>
          </Card>
        </Link>
      )}

      <SectionTitle>Habits</SectionTitle>
      <Card className="px-4 py-1"><HabitList clientId={cid} /></Card>

      <SectionTitle>Check-in</SectionTitle>
      {!ci ? <Skeleton className="h-20" /> : (
        <Link href="/app/check-in">
          <Card className={cx("flex items-center gap-3 p-4", remind && "border-accent/40")}>
            <span className={cx("flex size-11 items-center justify-center rounded-xl", remind ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted")}><ClipboardCheck className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {ci.state === "due" && "Weekly check-in due today"}
                {ci.state === "overdue" && "Weekly check-in overdue"}
                {ci.state === "upcoming" && `Next check-in ${fmtDate(ci.due, { weekday: "long" })}`}
                {ci.state === "submitted" && "Check-in submitted"}
                {ci.state === "reviewed" && "Your coach replied"}
                {ci.state === "none" && "Weekly check-in"}
              </p>
              <p className="truncate text-[13px] text-muted">
                {ci.state === "submitted" ? "Your coach will review it soon." : ci.state === "reviewed" ? ci.current?.coach_feedback : lastFeedback?.coach_feedback ? `Last feedback: ${lastFeedback.coach_feedback}` : "Takes about 3 minutes."}
              </p>
            </div>
            <ArrowRight className="size-4 text-faint" />
          </Card>
        </Link>
      )}

      {(unread.data.length > 0 || groups.data.length > 0) && <SectionTitle>Updates</SectionTitle>}
      <div className="space-y-3">
        {unread.data.length > 0 && (
          <Link href="/app/messages">
            <Card className="flex items-center gap-3 p-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-info/10 text-info"><MessageCircle className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{unread.data.length} new message{unread.data.length > 1 ? "s" : ""} from your coach</p>
                <p className="truncate text-[13px] text-muted">{unread.data.at(-1)?.body}</p>
              </div>
            </Card>
          </Link>
        )}
        {groups.data.length > 0 && (
          <Link href="/app/community">
            <Card className="flex items-center gap-3 p-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 text-muted"><UsersRound className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Community</p>
                <p className="truncate text-[13px] text-muted">{groups.data.map((g) => g.name).join(", ")}</p>
              </div>
              <ArrowRight className="size-4 text-faint" />
            </Card>
          </Link>
        )}
      </div>
    </>
  );
}

export default withSuspense(Today);

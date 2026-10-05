"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, History, PlayCircle, Timer, X } from "lucide-react";
import { useExerciseDemos, type ResolvedDemo } from "@/lib/demos";
import { DemoThumb, ExerciseDemoSheet } from "@/components/exercise-demo";
import { useList, useSession } from "@/lib/app-context";
import { addDays, fmtDate, today, WEEKDAYS } from "@/lib/dates";
import { dayForDate, lastLogFor } from "@/lib/stats";
import type { LoggedExercise, WorkoutDay, WorkoutLog } from "@/lib/types";
import { Button, Card, cx, EmptyState, ErrorState, IconButton, LoadingBlock, Textarea, useToast, useConfirm } from "@/components/ui";
import { WorkoutLogItem } from "@/components/workout-log-view";

function freshEntries(day: WorkoutDay, history: WorkoutLog[], date: string): LoggedExercise[] {
  return day.exercises.map((e) => {
    const prev = lastLogFor(history, e.name, date);
    return {
      exercise_id: e.id,
      exercise_name: e.name,
      sets: Array.from({ length: e.sets }, (_, i) => ({ reps: null, weight: prev?.sets[Math.min(i, prev.sets.length - 1)]?.weight ?? null, done: false })),
    };
  });
}

function RestTimer({ seconds, onClose }: { seconds: number; onClose: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const start = Date.now();
    const t = setInterval(() => {
      const l = seconds - Math.floor((Date.now() - start) / 1000);
      setLeft(l);
      if (l <= 0) {
        clearInterval(t);
        if ("vibrate" in navigator) navigator.vibrate?.(200);
      }
    }, 250);
    return () => clearInterval(t);
  }, [seconds]);
  const done = left <= 0;
  return (
    <div className="fixed inset-x-0 bottom-[76px] z-30 mx-auto max-w-lg px-4" role="timer" aria-live="polite">
      <div className={cx("flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl", done ? "border-accent/50 bg-accent text-accent-ink" : "border-line bg-surface-2")}>
        <Timer className="size-5" />
        <div className="flex-1">
          <p className="text-xs opacity-70">{done ? "Rest over" : "Rest"}</p>
          <p className="text-lg font-semibold tnum leading-tight">{done ? "Next set!" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}</p>
        </div>
        <IconButton label="Dismiss rest timer" onClick={onClose} className={done ? "text-accent-ink hover:bg-black/10 hover:text-accent-ink" : ""}><X className="size-4" /></IconButton>
      </div>
    </div>
  );
}

export default function WorkoutPage() {
  const { session, repo } = useSession();
  const ask = useConfirm();
  const cid = session.clientId!;
  const toast = useToast();
  const T = today();
  const plan = useList("workout_plans", { eq: { client_id: cid, active: true } });
  const history = useList("workout_logs", { eq: { client_id: cid }, gte: { date: addDays(T, -120) }, order: { col: "date", asc: false } });
  const p = plan.data[0];
  const scheduled = dayForDate(p, T);
  const [dayId, setDayId] = useState<string | null>(null);
  const day = p?.days.find((d) => d.id === (dayId ?? scheduled?.id ?? p?.days[0]?.id)) ?? null;

  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [entries, setEntries] = useState<LoggedExercise[]>([]);
  const [notes, setNotes] = useState("");
  const [rest, setRest] = useState<{ sec: number; key: number } | null>(null);
  const { resolve } = useExerciseDemos();
  const [demo, setDemo] = useState<{ d: ResolvedDemo; cue: string; rx: string } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const initFor = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logRef = useRef<WorkoutLog | null>(null);
  const saving = useRef<Promise<unknown>>(Promise.resolve());

  // Load today's log for the selected day (or prepare a fresh one).
  useEffect(() => {
    if (!day || history.loading) return;
    const key = `${day.id}-${T}`;
    if (initFor.current === key) return;
    initFor.current = key;
    const existing = history.data.find((l) => l.date === T && l.day_id === day.id) ?? null;
    logRef.current = existing;
    setLog(existing);
    if (existing) {
      // Merge in case the coach changed the plan after the log was started.
      const fresh = freshEntries(day, history.data, T);
      setEntries(fresh.map((f) => existing.entries.find((e) => e.exercise_id === f.exercise_id) ?? f));
      setNotes(existing.notes);
    } else {
      setEntries(freshEntries(day, history.data, T));
      setNotes("");
    }
  }, [day, history.loading, history.data, T]);

  const persist = useCallback((patch: Partial<WorkoutLog>) => {
    if (!day || !p) return Promise.resolve();
    saving.current = saving.current.then(async () => {
      try {
        if (logRef.current) {
          logRef.current = await repo.update("workout_logs", logRef.current.id, patch);
        } else {
          logRef.current = await repo.insert("workout_logs", { client_id: cid, plan_id: p.id, day_id: day.id, day_name: day.name, date: T, completed: false, notes: "", entries: [], ...patch });
        }
        setLog(logRef.current);
      } catch (e) {
        toast.error(e);
      }
    });
    return saving.current;
  }, [day, p, repo, cid, T, toast]);

  // Flush a pending debounced save if the user navigates away.
  const latest = useRef({ entries, notes, persist });
  latest.current = { entries, notes, persist };
  useEffect(() => () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      latest.current.persist({ entries: latest.current.entries, notes: latest.current.notes });
    }
  }, []);

  const scheduleSave = (next: LoggedExercise[], nextNotes = notes) => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      persist({ entries: next, notes: nextNotes });
    }, 700);
  };

  const setSet = (ei: number, si: number, patch: Partial<LoggedExercise["sets"][number]>, immediate = false) => {
    const next = entries.map((e, i) => (i === ei ? { ...e, sets: e.sets.map((s, k) => (k === si ? { ...s, ...patch } : s)) } : e));
    setEntries(next);
    if (immediate) {
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      persist({ entries: next, notes });
    } else scheduleSave(next);
  };

  const toggleDone = (ei: number, si: number) => {
    const s = entries[ei].sets[si];
    const ex = day!.exercises.find((x) => x.id === entries[ei].exercise_id);
    const target = parseInt(ex?.reps ?? "", 10);
    const patch = { done: !s.done, reps: !s.done && s.reps == null && !Number.isNaN(target) ? target : s.reps };
    setSet(ei, si, patch, true);
    if (!s.done && ex?.rest_sec) setRest({ sec: ex.rest_sec, key: Date.now() });
  };

  const finish = async () => {
    const doneSets = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    if (!doneSets && !(await ask({ title: "No sets ticked", body: "Mark this workout complete anyway?", confirmLabel: "Mark complete" }))) return;
    setFinishing(true);
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    await persist({ entries, notes, completed: true });
    setFinishing(false);
    setRest(null);
    toast.success("Workout complete — great job!");
  };

  const pastLogs = useMemo(() => history.data.filter((l) => !(l.date === T && l.day_id === day?.id)), [history.data, T, day?.id]);
  const totalSets = entries.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  if (plan.error || history.error) return <ErrorState message={(plan.error || history.error)!} onRetry={() => { plan.reload(); history.reload(); }} />;
  if (plan.loading || history.loading) return <LoadingBlock rows={4} />;
  if (!p) return <EmptyState title="No workout plan yet" body="Your coach hasn't assigned a training plan. You'll get a notification when they do." />;

  return (
    <>
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{day?.name ?? "Workout"}</h1>
        <span className="text-[13px] text-muted">{fmtDate(T, { weekday: "short", month: "short", day: "numeric" })}</span>
      </div>
      <p className="text-[13px] text-muted">{p.name}{scheduled ? "" : " · rest day today — pick a session to train anyway"}</p>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {p.days.map((d) => (
          <button key={d.id} onClick={() => { setDayId(d.id); setRest(null); }}
            className={cx("shrink-0 rounded-xl border px-3 py-2 text-left text-[13px]", d.id === day?.id ? "border-accent/60 bg-accent/10 text-ink" : "border-line text-muted")}>
            <span className="block font-medium">{d.name}</span>
            <span className="block text-[11px] text-faint">{d.weekdays.map((w) => WEEKDAYS[w]).join(" · ") || "Any day"}{d.id === scheduled?.id ? " · today" : ""}</span>
          </button>
        ))}
      </div>
      {p.description && <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-muted">{p.description}</p>}

      {log?.completed && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
          <CheckCircle2 className="size-4 text-accent" /> Completed today. You can still edit and it&apos;ll save automatically.
        </div>
      )}

      <div className="mt-5 space-y-4">
        {day?.exercises.map((ex) => {
          const ei = entries.findIndex((e) => e.exercise_id === ex.id);
          const entry = entries[ei];
          if (!entry) return null;
          const prev = lastLogFor(history.data, ex.name, T);
          const rd = resolve(ex);
          const rx = `${ex.sets} × ${ex.reps}${ex.rest_sec ? ` · ${ex.rest_sec >= 60 ? `${Math.floor(ex.rest_sec / 60)}:${String(ex.rest_sec % 60).padStart(2, "0")}` : `${ex.rest_sec}s`} rest` : ""}`;
          return (
            <Card key={ex.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{ex.name}</h3>
                  <p className="text-[13px] text-muted tnum">{rx}</p>
                  {rd && <p className="truncate text-xs text-faint">{rd.equipment}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {entry.sets.every((s) => s.done) && <CheckCircle2 className="size-5 text-accent" />}
                  {rd ? (
                    <button type="button" onClick={() => setDemo({ d: rd, cue: ex.notes, rx })} aria-label={`Watch ${ex.name} demo`}
                      className="relative overflow-hidden rounded-xl border border-line">
                      <DemoThumb demo={rd} className="h-12 w-16" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35"><PlayCircle className="size-5 text-white" /></span>
                    </button>
                  ) : (
                    <span className="max-w-20 text-right text-[11px] leading-tight text-faint">No demo yet</span>
                  )}
                </div>
              </div>
              {ex.notes && <p className="mt-2 text-[13px] text-info">Coach: {ex.notes}</p>}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-faint">
                <History className="size-3.5" />
                {prev ? <>Last time ({fmtDate(prev.date)}): <span className="text-muted tnum">{prev.sets.map((s) => `${s.weight ? `${s.weight}×` : ""}${s.reps ?? "–"}`).join(", ")}</span></> : "No previous results"}
              </p>
              <div className="mt-3 grid grid-cols-[28px_1fr_1fr_44px] items-center gap-2 text-[11px] uppercase tracking-wide text-faint">
                <span>Set</span><span>kg</span><span>Reps</span><span />
              </div>
              <div className="mt-1 space-y-2">
                {entry.sets.map((s, si) => (
                  <div key={si} className={cx("grid grid-cols-[28px_1fr_1fr_44px] items-center gap-2 rounded-xl", s.done && "opacity-80")}>
                    <span className="text-center text-sm text-muted tnum">{si + 1}</span>
                    <input type="number" inputMode="decimal" step="0.5" aria-label={`${ex.name} set ${si + 1} weight`} value={s.weight ?? ""} placeholder="—"
                      onChange={(e) => setSet(ei, si, { weight: e.target.value === "" ? null : Number(e.target.value) })}
                      className={cx("h-11 w-full rounded-xl border bg-surface-2 px-3 text-center text-[15px] tnum focus:border-accent/60 focus:outline-none", s.done ? "border-accent/30" : "border-line")} />
                    <input type="number" inputMode="numeric" aria-label={`${ex.name} set ${si + 1} reps`} value={s.reps ?? ""} placeholder={ex.reps}
                      onChange={(e) => setSet(ei, si, { reps: e.target.value === "" ? null : Number(e.target.value) })}
                      className={cx("h-11 w-full rounded-xl border bg-surface-2 px-3 text-center text-[15px] tnum placeholder:text-faint focus:border-accent/60 focus:outline-none", s.done ? "border-accent/30" : "border-line")} />
                    <button onClick={() => toggleDone(ei, si)} aria-pressed={s.done} aria-label={`Mark set ${si + 1} of ${ex.name} ${s.done ? "not done" : "done"}`}
                      className={cx("flex h-11 w-11 items-center justify-center rounded-xl border transition", s.done ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-faint")}>
                      <Check className="size-5" strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => {
                const last = entry.sets.at(-1);
                const next = entries.map((e, i) => (i === ei ? { ...e, sets: [...e.sets, { reps: null, weight: last?.weight ?? null, done: false }] } : e));
                setEntries(next);
                scheduleSave(next);
              }}>+ Add set</Button>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4 p-4">
        <label htmlFor="wnotes" className="text-[13px] font-medium text-muted">Notes for your coach</label>
        <Textarea id="wnotes" className="mt-2" rows={2} placeholder="How did it feel? Any pain, swaps or PRs?" value={notes} onChange={(e) => { setNotes(e.target.value); scheduleSave(entries, e.target.value); }} />
      </Card>

      <Button variant="primary" size="lg" className="mt-4 w-full" loading={finishing} onClick={finish}>
        {log?.completed ? "Save workout" : `Finish workout · ${doneSets}/${totalSets} sets`}
      </Button>
      <p className="mt-2 text-center text-xs text-faint">{log ? "Progress saves automatically" : "Your log saves as soon as you tick a set"}</p>

      <h2 className="mb-3 mt-10 text-[13px] font-semibold uppercase tracking-wide text-muted">History</h2>
      {pastLogs.length === 0 ? <EmptyState title="No past workouts yet" body="Completed sessions will show up here." /> : (
        <div className="space-y-2">{pastLogs.slice(0, 15).map((l) => <WorkoutLogItem key={l.id} log={l} />)}</div>
      )}

      {rest && <RestTimer key={rest.key} seconds={rest.sec} onClose={() => setRest(null)} />}
      {/* The demo opens over the workout; sets, weights and the rest timer keep running underneath. */}
      <ExerciseDemoSheet demo={demo?.d ?? null} open={!!demo} onClose={() => setDemo(null)} coachCue={demo?.cue || undefined} prescription={demo?.rx} />
    </>
  );
}

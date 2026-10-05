"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { addDays, today, WEEKDAYS, weekday } from "@/lib/dates";
import type { Habit, HabitLog } from "@/lib/types";
import { cx, EmptyState, LoadingBlock, useToast } from "@/components/ui";

function stepFor(h: Habit) {
  if (h.unit === "done") return 1;
  if (h.target >= 1000) return 500;
  if (h.unit.toLowerCase() === "l") return 0.25;
  if (h.target <= 12) return 0.5;
  return 1;
}

function fmt(v: number, h: Habit) {
  if (h.target >= 1000) return v.toLocaleString();
  return String(Math.round(v * 100) / 100);
}

function HabitRow({ habit, log, week }: { habit: Habit; log?: HabitLog; week: HabitLog[] }) {
  const { session, repo } = useSession();
  const toast = useToast();
  const [value, setValue] = useState<number>(log?.value ?? 0);
  const [editing, setEditing] = useState(false);
  const logId = useRef(log?.id);
  const chain = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    setValue(log?.value ?? 0);
    if (log?.id) logId.current = log.id;
  }, [log?.value, log?.id]);

  // Saves are serialised so rapid taps never create duplicate rows for the day.
  const save = (v: number) => {
    const next = Math.max(0, Math.round(v * 100) / 100);
    setValue(next);
    chain.current = chain.current.then(async () => {
      try {
        if (logId.current) await repo.update("habit_logs", logId.current, { value: next });
        else logId.current = (await repo.insert("habit_logs", { habit_id: habit.id, client_id: session.clientId!, date: today(), value: next })).id;
      } catch (e) {
        toast.error(e);
      }
    });
  };

  const done = value >= habit.target;
  const step = stepFor(habit);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        {habit.unit === "done" ? (
          <button onClick={() => save(done ? 0 : 1)} aria-pressed={done} aria-label={`Mark ${habit.name} ${done ? "not done" : "done"}`}
            className={cx("flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition", done ? "border-accent bg-accent text-accent-ink" : "border-line-strong text-transparent hover:border-accent/60")}>
            <Check className="size-4" strokeWidth={3} />
          </button>
        ) : (
          <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-full border-2", done ? "border-accent bg-accent text-accent-ink" : "border-line text-faint")}>
            {done ? <Check className="size-4" strokeWidth={3} /> : <span className="text-[10px] tnum">{habit.target ? Math.min(99, Math.round((value / habit.target) * 100)) : 0}%</span>}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{habit.name}</p>
          {habit.unit !== "done" ? (
            <p className="text-xs text-muted tnum">{fmt(value, habit)} / {fmt(habit.target, habit)} {habit.unit}</p>
          ) : <p className="text-xs text-muted">{done ? "Done today" : "Tap to complete"}</p>}
        </div>
        {habit.unit !== "done" && (
          editing ? (
            <input autoFocus type="number" inputMode="decimal" defaultValue={value} aria-label={`${habit.name} value`}
              className="h-9 w-24 rounded-lg border border-line bg-surface-2 px-2 text-right text-sm tnum"
              onBlur={(e) => { setEditing(false); const n = Number(e.target.value); if (!Number.isNaN(n)) save(n); }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
          ) : (
            <div className="flex items-center gap-1">
              <button aria-label={`Decrease ${habit.name}`} onClick={() => save(value - step)} className="flex size-9 items-center justify-center rounded-lg bg-surface-2 text-muted active:bg-surface-3"><Minus className="size-4" /></button>
              <button onClick={() => setEditing(true)} className="h-9 min-w-12 rounded-lg px-1 text-xs text-muted underline-offset-2 hover:underline" aria-label={`Type a value for ${habit.name}`}>Edit</button>
              <button aria-label={`Increase ${habit.name}`} onClick={() => save(value + step)} className="flex size-9 items-center justify-center rounded-lg bg-surface-2 text-ink active:bg-surface-3"><Plus className="size-4" /></button>
            </div>
          )
        )}
      </div>
      <div className="ml-12 mt-2 flex gap-1" aria-label="Last 7 days">
        {last7.map((d) => {
          const l = d === today() ? { value } : week.find((x) => x.date === d);
          const hit = l && l.value >= habit.target;
          return <span key={d} title={WEEKDAYS[weekday(d)]} className={cx("h-1.5 flex-1 rounded-full", hit ? "bg-accent" : l && l.value > 0 ? "bg-accent/35" : "bg-surface-3")} />;
        })}
      </div>
    </li>
  );
}

export function HabitList({ clientId }: { clientId: string }) {
  const habits = useList("habits", { eq: { client_id: clientId, active: true }, order: { col: "created_at" } });
  const logs = useList("habit_logs", { eq: { client_id: clientId }, gte: { date: addDays(today(), -6) } });
  if (habits.loading) return <LoadingBlock rows={2} />;
  if (!habits.data.length) return <EmptyState title="No habits yet" body="Your coach hasn't assigned any daily habits." />;
  return (
    <ul className="divide-y divide-line">
      {habits.data.map((h) => (
        <HabitRow key={h.id} habit={h} log={logs.data.find((l) => l.habit_id === h.id && l.date === today())} week={logs.data.filter((l) => l.habit_id === h.id)} />
      ))}
    </ul>
  );
}

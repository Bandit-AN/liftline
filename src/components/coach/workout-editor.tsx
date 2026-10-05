"use client";

import { useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Copy, PlayCircle, Plus, Trash2 } from "lucide-react";
import { BUILTIN_DEMOS } from "@/lib/exercise-library";
import { useExerciseDemos, type ResolvedDemo } from "@/lib/demos";
import { ExerciseDemoSheet } from "@/components/exercise-demo";
import { ExerciseDemoEditor } from "./demo-editor";
import type { PlanExercise, WorkoutDay } from "@/lib/types";
import { WEEKDAYS } from "@/lib/dates";
import { Button, Card, cx, IconButton, Input, NumberInput } from "@/components/ui";


const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function blankExercise(): PlanExercise {
  return { id: newId(), name: "", sets: 3, reps: "8-10", rest_sec: 90, notes: "" };
}
export function blankDay(n: number): WorkoutDay {
  return { id: newId(), name: `Day ${n}`, weekdays: [], exercises: [blankExercise()] };
}

/** Validate before save; returns an error message or null. */
export function validateDays(days: WorkoutDay[]): string | null {
  if (!days.length) return "Add at least one workout day.";
  for (const d of days) {
    if (!d.name.trim()) return "Every day needs a name.";
    if (!d.exercises.length) return `“${d.name}” has no exercises.`;
    if (d.exercises.some((e) => !e.name.trim())) return `Give every exercise in “${d.name}” a name.`;
    if (d.exercises.some((e) => !e.sets || e.sets < 1)) return `Sets must be at least 1 in “${d.name}”.`;
  }
  const used = days.flatMap((d) => d.weekdays);
  if (new Set(used).size !== used.length) return "Two days are scheduled on the same weekday.";
  return null;
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

export function WorkoutEditor({ days, onChange }: { days: WorkoutDay[]; onChange: (d: WorkoutDay[]) => void }) {
  const setDay = (i: number, patch: Partial<WorkoutDay>) => onChange(days.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  const setEx = (di: number, ei: number, patch: Partial<PlanExercise>) =>
    setDay(di, { exercises: days[di].exercises.map((e, k) => (k === ei ? { ...e, ...patch } : e)) });
  const takenBy = (wd: number) => days.findIndex((d) => d.weekdays.includes(wd));
  const { custom, resolve } = useExerciseDemos();
  const [preview, setPreview] = useState<ResolvedDemo | null>(null);
  const [adding, setAdding] = useState<{ di: number; ei: number; name: string } | null>(null);

  // Typing or picking a name links the exact library entry (and its equipment).
  const rename = (di: number, ei: number, name: string) => {
    const r = resolve({ name });
    setEx(di, ei, { name, demo_id: r?.id ?? null, equipment: r?.equipment ?? "" });
  };
  const libraryNames = [...new Set([...custom.data.map((c) => c.name), ...BUILTIN_DEMOS.map((b) => b.name)])].sort();

  return (
    <div className="space-y-4">
      <datalist id="exercise-library">
        {libraryNames.map((e) => <option key={e} value={e} />)}
      </datalist>
      {days.map((day, di) => (
        <Card key={day.id} className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Input aria-label="Day name" value={day.name} onChange={(e) => setDay(di, { name: e.target.value })} className="max-w-xs font-medium" />
            <div className="flex-1" />
            <IconButton label="Move day up" disabled={di === 0} onClick={() => onChange(move(days, di, -1))}><ArrowUp className="size-4" /></IconButton>
            <IconButton label="Move day down" disabled={di === days.length - 1} onClick={() => onChange(move(days, di, 1))}><ArrowDown className="size-4" /></IconButton>
            <IconButton label="Duplicate day" onClick={() => onChange([...days.slice(0, di + 1), { ...structuredClone(day), id: newId(), name: `${day.name} (copy)`, weekdays: [], exercises: day.exercises.map((e) => ({ ...e, id: newId() })) }, ...days.slice(di + 1)])}><Copy className="size-4" /></IconButton>
            <IconButton label="Delete day" onClick={() => onChange(days.filter((_, k) => k !== di))}><Trash2 className="size-4" /></IconButton>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted">Scheduled on</span>
            {WEEKDAYS.map((w, wd) => {
              const on = day.weekdays.includes(wd);
              const other = takenBy(wd);
              const blocked = other >= 0 && other !== di;
              return (
                <button
                  key={w}
                  type="button"
                  disabled={blocked}
                  title={blocked ? `Already used by ${days[other].name}` : undefined}
                  onClick={() => setDay(di, { weekdays: on ? day.weekdays.filter((x) => x !== wd) : [...day.weekdays, wd].sort() })}
                  className={cx("h-7 rounded-lg px-2.5 text-xs transition-colors", on ? "bg-accent text-accent-ink font-semibold" : "bg-surface-2 text-muted hover:text-ink", blocked && "opacity-30 cursor-not-allowed")}
                >
                  {w}
                </button>
              );
            })}
          </div>

          <div className="mt-4 hidden grid-cols-[1fr_64px_88px_76px_36px] gap-2 px-1 text-[11px] uppercase tracking-wide text-faint md:grid">
            <span>Exercise</span><span>Sets</span><span>Reps</span><span>Rest (s)</span><span />
          </div>
          <ol className="mt-1 space-y-3">
            {day.exercises.map((ex, ei) => (
              <li key={ex.id} className="rounded-xl border border-line bg-surface-2/50 p-3">
                <div className="grid grid-cols-3 gap-2 md:grid-cols-[1fr_64px_88px_76px_36px]">
                  <Input list="exercise-library" placeholder="Exercise name" aria-label="Exercise name" value={ex.name} onChange={(e) => rename(di, ei, e.target.value)} className="col-span-3 md:col-span-1" />
                  <NumberInput aria-label="Sets" min={1} value={ex.sets} onChange={(v) => setEx(di, ei, { sets: v ?? 0 })} />
                  <Input aria-label="Reps" placeholder="8-10" value={ex.reps} onChange={(e) => setEx(di, ei, { reps: e.target.value })} />
                  <NumberInput aria-label="Rest in seconds" min={0} step={15} value={ex.rest_sec} onChange={(v) => setEx(di, ei, { rest_sec: v ?? 0 })} />
                  <div className="col-span-3 flex justify-end gap-0.5 md:col-span-1">
                    <IconButton label="Move exercise up" disabled={ei === 0} className="md:hidden" onClick={() => setDay(di, { exercises: move(day.exercises, ei, -1) })}><ArrowUp className="size-4" /></IconButton>
                    <IconButton label="Move exercise down" disabled={ei === day.exercises.length - 1} className="md:hidden" onClick={() => setDay(di, { exercises: move(day.exercises, ei, 1) })}><ArrowDown className="size-4" /></IconButton>
                    <IconButton label="Remove exercise" onClick={() => setDay(di, { exercises: day.exercises.filter((_, k) => k !== ei) })}><Trash2 className="size-4" /></IconButton>
                  </div>
                </div>
                {ex.name.trim() && (() => {
                  const r = resolve(ex);
                  return r ? (
                    <button type="button" onClick={() => setPreview(r)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-2 py-1 text-xs text-accent">
                      <PlayCircle className="size-3.5" /> Demo: {r.name} · {r.equipment}
                    </button>
                  ) : (
                    <button type="button" onClick={() => setAdding({ di, ei, name: ex.name.trim() })} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-warn/10 px-2 py-1 text-xs text-warn">
                      <AlertTriangle className="size-3.5" /> No demo for this exercise · Add one
                    </button>
                  );
                })()}
                <div className="mt-2 flex items-center gap-2">
                  <Input placeholder="Coaching cue (optional) — e.g. 2 sec lowering, pause at the bottom" aria-label="Coaching instructions" value={ex.notes} onChange={(e) => setEx(di, ei, { notes: e.target.value })} className="h-9 text-[13px]" />
                  <div className="hidden gap-0.5 md:flex">
                    <IconButton label="Move exercise up" disabled={ei === 0} onClick={() => setDay(di, { exercises: move(day.exercises, ei, -1) })}><ArrowUp className="size-4" /></IconButton>
                    <IconButton label="Move exercise down" disabled={ei === day.exercises.length - 1} onClick={() => setDay(di, { exercises: move(day.exercises, ei, 1) })}><ArrowDown className="size-4" /></IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <Button size="sm" variant="ghost" className="mt-3" icon={<Plus className="size-4" />} onClick={() => setDay(di, { exercises: [...day.exercises, blankExercise()] })}>Add exercise</Button>
        </Card>
      ))}
      <Button icon={<Plus className="size-4" />} onClick={() => onChange([...days, blankDay(days.length + 1)])}>Add workout day</Button>
      <ExerciseDemoSheet demo={preview} open={!!preview} onClose={() => setPreview(null)} />
      <ExerciseDemoEditor open={!!adding} prefillName={adding?.name} onClose={() => setAdding(null)}
        onSaved={(d) => adding && setEx(adding.di, adding.ei, { name: d.name, demo_id: `c:${d.id}`, equipment: d.equipment })} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import { fmtDate } from "@/lib/dates";
import type { WorkoutLog } from "@/lib/types";
import { Badge, cx } from "./ui";

export function WorkoutLogItem({ log, defaultOpen }: { log: WorkoutLog; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const sets = log.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const volume = log.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).reduce((v, s) => v + (s.reps ?? 0) * (s.weight ?? 0), 0), 0);
  return (
    <div className="rounded-xl border border-line">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        {log.completed ? <CheckCircle2 className="size-5 text-accent" /> : <Circle className="size-5 text-faint" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{log.day_name || "Workout"}</p>
          <p className="text-xs text-muted">{fmtDate(log.date, { weekday: "short", month: "short", day: "numeric" })} · {sets} sets{volume ? ` · ${Math.round(volume).toLocaleString()} kg volume` : ""}</p>
        </div>
        {!log.completed && <Badge tone="warn">In progress</Badge>}
        <ChevronDown className={cx("size-4 text-faint transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3">
          <table className="w-full text-[13px]">
            <tbody>
              {log.entries.map((e) => (
                <tr key={e.exercise_id} className="align-top">
                  <td className="py-1.5 pr-3 text-muted">{e.exercise_name}</td>
                  <td className="py-1.5 text-right tnum">
                    {e.sets.filter((s) => s.done).map((s, i) => (
                      <span key={i} className="ml-2 inline-block">{s.weight ? `${s.weight}×` : ""}{s.reps ?? "–"}</span>
                    ))}
                    {!e.sets.some((s) => s.done) && <span className="text-faint">Skipped</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {log.notes && <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-muted">“{log.notes}”</p>}
        </div>
      )}
    </div>
  );
}

import type { CheckIn, Client, FoodEntry, WorkoutDay, WorkoutLog, WorkoutPlan } from "./types";
import { addDays, nextWeekday, today, weekday, weekStart } from "./dates";

export function dayForDate(plan: WorkoutPlan | null | undefined, date: string): WorkoutDay | null {
  if (!plan) return null;
  return plan.days.find((d) => d.weekdays.includes(weekday(date))) ?? null;
}

export type CheckInState = "reviewed" | "submitted" | "due" | "overdue" | "upcoming" | "none";

/** Check-in status for the current week, based on the client's check-in day. */
export function checkInState(client: Client, checkIns: CheckIn[]): { state: CheckInState; due: string; current?: CheckIn } {
  const T = today();
  const week = weekStart(T);
  const current = checkIns.find((c) => c.client_id === client.id && c.week_of === week);
  const due = nextWeekday(week, client.check_in_day);
  if (client.status !== "active") return { state: "none", due };
  // An unreviewed check-in from any week needs the coach's attention first.
  const pending = checkIns.find((c) => c.client_id === client.id && c.status === "submitted");
  if (pending) return { state: "submitted", due, current: pending };
  if (current) return { state: current.status === "reviewed" ? "reviewed" : "submitted", due, current };
  if (due === T) return { state: "due", due };
  if (due < T) return { state: "overdue", due };
  return { state: "upcoming", due };
}

export function totals(entries: FoodEntry[]) {
  // Postgres numeric columns can arrive as strings; coerce defensively.
  const n = (v: number | string | null | undefined) => Number(v ?? 0) || 0;
  return entries.reduce(
    (a, e) => ({
      calories: a.calories + n(e.calories), protein: a.protein + n(e.protein), carbs: a.carbs + n(e.carbs), fat: a.fat + n(e.fat),
      fiber: a.fiber + n(e.fiber), sugar: a.sugar + n(e.sugar), sodium: a.sodium + n(e.sodium),
      // How many entries actually recorded each optional nutrient.
      tracked: a.tracked + (e.fiber != null || e.sugar != null || e.sodium != null ? 1 : 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, tracked: 0 },
  );
}

/** Completed / scheduled sessions over the last `days` days (excluding today). */
export function completion(plans: WorkoutPlan[], logs: WorkoutLog[], clientIds: string[], days = 7) {
  const T = today();
  let scheduled = 0;
  let done = 0;
  for (const cid of clientIds) {
    const plan = plans.find((p) => p.client_id === cid && p.active);
    if (!plan) continue;
    for (let d = 1; d <= days; d++) {
      const date = addDays(T, -d);
      if (dayForDate(plan, date)) {
        scheduled++;
        if (logs.some((l) => l.client_id === cid && l.date === date && l.completed)) done++;
      }
    }
  }
  return { scheduled, done, pct: scheduled ? Math.round((done / scheduled) * 100) : 0 };
}

export function lastLogFor(logs: WorkoutLog[], exerciseName: string, beforeDate: string) {
  const sorted = logs.filter((l) => l.date < beforeDate && l.completed).sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const l of sorted) {
    const e = l.entries.find((x) => x.exercise_name === exerciseName);
    if (e && e.sets.some((s) => s.done)) return { date: l.date, sets: e.sets.filter((s) => s.done) };
  }
  return null;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

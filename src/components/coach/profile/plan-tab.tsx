"use client";

import { useState } from "react";
import { AlertTriangle, BookmarkPlus, Pencil, PlayCircle, Plus, Salad, Trash2, Dumbbell } from "lucide-react";
import { useExerciseDemos, type ResolvedDemo } from "@/lib/demos";
import { ExerciseDemoSheet } from "@/components/exercise-demo";
import { useList, useSession } from "@/lib/app-context";
import { assignNutrition, assignWorkout } from "@/lib/assign";
import { relativeTime, WEEKDAYS } from "@/lib/dates";
import type { Client, WorkoutDay } from "@/lib/types";
import { Badge, Button, Card, CardHeader, EmptyState, Field, IconButton, Input, LoadingBlock, Modal, NumberInput, Select, useToast } from "@/components/ui";
import { blankDay, validateDays, WorkoutEditor } from "../workout-editor";
import { blankNutrition, NutritionEditor, validateNutrition, type NutritionDraft } from "../nutrition-editor";
import { MacroSplit } from "@/components/macro-split";

export function PlanTab({ client }: { client: Client }) {
  return (
    <div className="space-y-6">
      <WorkoutPlanCard client={client} />
      <NutritionPlanCard client={client} />
      <HabitsCard client={client} />
    </div>
  );
}

function WorkoutPlanCard({ client }: { client: Client }) {
  const { session, repo } = useSession();
  const toast = useToast();
  const plans = useList("workout_plans", { eq: { client_id: client.id, active: true } });
  const templates = useList("workout_templates", { eq: { coach_id: session.userId }, order: { col: "name" } });
  const { resolve } = useExerciseDemos();
  const [demo, setDemo] = useState<ResolvedDemo | null>(null);
  const plan = plans.data[0];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ name: string; description: string; days: WorkoutDay[] }>({ name: "", description: "", days: [] });
  const [busy, setBusy] = useState(false);

  const startEdit = (src?: { name: string; description: string; days: WorkoutDay[] }) => {
    setDraft(structuredClone(src ?? (plan ? { name: plan.name, description: plan.description, days: plan.days } : { name: "Training plan", description: "", days: [blankDay(1)] })));
    setEditing(true);
  };

  const save = async () => {
    if (!draft.name.trim()) return toast.error("Give the plan a name.");
    const err = validateDays(draft.days);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      if (plan) await repo.update("workout_plans", plan.id, { ...draft, updated_at: new Date().toISOString() });
      else await assignWorkout(repo, session.userId, client.id, draft);
      toast.success(plan ? "Plan updated — client notified" : "Plan assigned");
      setEditing(false);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!plan) return;
    try {
      await repo.insert("workout_templates", { coach_id: session.userId, name: `${plan.name} (from ${client.full_name.split(" ")[0]})`, description: plan.description, days: plan.days });
      toast.success("Saved to your workout templates");
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Dumbbell className="size-4 text-accent" /> Workout plan</span>}
        subtitle={plan && !editing ? `${plan.name} · updated ${relativeTime(plan.updated_at)}` : editing ? "Editing — changes apply to this client only" : undefined}
        action={!editing && plan ? (
          <div className="flex gap-1">
            <IconButton label="Save as template" onClick={saveAsTemplate}><BookmarkPlus className="size-4" /></IconButton>
            <Button size="sm" icon={<Pencil className="size-3.5" />} onClick={() => startEdit()}>Edit</Button>
          </div>
        ) : undefined}
      />
      <div className="px-5 pb-5">
        {plans.loading ? <LoadingBlock rows={2} /> : editing ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Plan name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="Instructions"><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="How to progress, warm-up notes…" /></Field>
            </div>
            <WorkoutEditor days={draft.days} onChange={(days) => setDraft({ ...draft, days })} />
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" loading={busy} onClick={save}>{plan ? "Save changes" : "Assign plan"}</Button>
            </div>
          </div>
        ) : (
          <>
            {plan ? (
              <div className="grid gap-3 md:grid-cols-2">
                {plan.days.map((d) => (
                  <div key={d.id} className="rounded-xl border border-line p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{d.name}</p>
                      <span className="text-xs text-muted">{d.weekdays.map((w) => WEEKDAYS[w]).join(", ") || "Unscheduled"}</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-[13px] text-muted">
                      {d.exercises.map((e) => {
                        const r = resolve(e);
                        return (
                          <li key={e.id} className="flex justify-between gap-2">
                            {r ? (
                              <button type="button" onClick={() => setDemo(r)} className="flex min-w-0 items-center gap-1.5 text-left hover:text-ink" aria-label={`${e.name}: view demo`}>
                                <PlayCircle className="size-3.5 shrink-0 text-accent" /><span className="truncate">{e.name}</span>
                              </button>
                            ) : (
                              <span className="flex min-w-0 items-center gap-1.5" title="No demo — add one in Exercises"><AlertTriangle className="size-3.5 shrink-0 text-warn" /><span className="truncate">{e.name}</span></span>
                            )}
                            <span className="shrink-0 tnum">{e.sets} × {e.reps}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No workout plan assigned" body="Start from one of your templates or build one just for this client." />
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Select aria-label="Start from template" className="w-auto min-w-56" value="" onChange={(e) => {
                const t = templates.data.find((x) => x.id === e.target.value);
                if (t) startEdit({ name: t.name, description: t.description, days: t.days });
              }}>
                <option value="">{plan ? "Replace from template…" : "Start from template…"}</option>
                {templates.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              {!plan && <Button icon={<Plus className="size-4" />} onClick={() => startEdit()}>Build from scratch</Button>}
            </div>
          </>
        )}
      </div>
      <ExerciseDemoSheet demo={demo} open={!!demo} onClose={() => setDemo(null)} />
    </Card>
  );
}

function NutritionPlanCard({ client }: { client: Client }) {
  const { session, repo } = useSession();
  const toast = useToast();
  const plans = useList("nutrition_plans", { eq: { client_id: client.id, active: true } });
  const templates = useList("nutrition_templates", { eq: { coach_id: session.userId }, order: { col: "name" } });
  const plan = plans.data[0];
  const [draft, setDraft] = useState<NutritionDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!draft) return;
    const err = validateNutrition(draft);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      if (plan) await repo.update("nutrition_plans", plan.id, { ...draft, updated_at: new Date().toISOString() });
      else await assignNutrition(repo, session.userId, client.id, draft);
      toast.success(plan ? "Targets updated — client notified" : "Nutrition plan assigned");
      setDraft(null);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Salad className="size-4 text-accent" /> Nutrition plan</span>}
        subtitle={plan && !draft ? `${plan.name} · updated ${relativeTime(plan.updated_at)}` : undefined}
        action={!draft && plan ? <Button size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setDraft({ name: plan.name, calories: plan.calories, protein: plan.protein, carbs: plan.carbs, fat: plan.fat, meals: plan.meals, notes: plan.notes })}>Edit</Button> : undefined}
      />
      <div className="px-5 pb-5">
        {plans.loading ? <LoadingBlock rows={2} /> : draft ? (
          <div className="space-y-4">
            <NutritionEditor value={draft} onChange={setDraft} />
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="primary" loading={busy} onClick={save}>{plan ? "Save changes" : "Assign plan"}</Button>
            </div>
          </div>
        ) : (
          <>
            {plan ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-3xl font-semibold tnum">{plan.calories.toLocaleString()} <span className="text-sm font-normal text-muted">kcal / day</span></p>
                  <MacroSplit protein={plan.protein} carbs={plan.carbs} fat={plan.fat} className="mt-3" />
                  {plan.notes && <p className="mt-3 text-[13px] text-muted">{plan.notes}</p>}
                </div>
                <ul className="space-y-1.5 text-[13px]">
                  {plan.meals.map((m) => <li key={m.id}><span className="text-muted">{m.name}:</span> {m.suggestion || <span className="text-faint">—</span>}</li>)}
                </ul>
              </div>
            ) : <EmptyState title="No nutrition targets set" body="Assign calories and macros so the client can track against them." />}
            <div className="mt-4 flex flex-wrap gap-2">
              <Select aria-label="Start from nutrition template" className="w-auto min-w-56" value="" onChange={(e) => {
                const t = templates.data.find((x) => x.id === e.target.value);
                if (t) setDraft({ name: t.name, calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat, meals: structuredClone(t.meals), notes: t.notes });
              }}>
                <option value="">{plan ? "Replace from template…" : "Start from template…"}</option>
                {templates.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              {!plan && <Button icon={<Plus className="size-4" />} onClick={() => setDraft(blankNutrition())}>Set targets manually</Button>}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

const HABIT_PRESETS = [
  { name: "Steps", target: 10000, unit: "steps" },
  { name: "Water", target: 3, unit: "L" },
  { name: "Sleep", target: 8, unit: "h" },
  { name: "Protein target hit", target: 1, unit: "done" },
  { name: "Mobility 10 min", target: 1, unit: "done" },
];

function HabitsCard({ client }: { client: Client }) {
  const { session, repo } = useSession();
  const toast = useToast();
  const habits = useList("habits", { eq: { client_id: client.id, active: true }, order: { col: "created_at" } });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", target: 1 as number | null, unit: "done" });
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.target) return toast.error("Name and target are required.");
    setBusy(true);
    try {
      await repo.insert("habits", { coach_id: session.userId, client_id: client.id, name: form.name.trim(), target: form.target, unit: form.unit.trim() });
      toast.success("Habit assigned");
      setOpen(false);
      setForm({ name: "", target: 1, unit: "done" });
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Daily habits" subtitle="Tracked by the client on their Today screen" action={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Add habit</Button>} />
      <div className="px-5 pb-5">
        {habits.loading ? <LoadingBlock rows={2} /> : habits.data.length === 0 ? <EmptyState title="No habits assigned" body="Steps, water, sleep or anything else you want them to tick off daily." /> : (
          <ul className="divide-y divide-line">
            {habits.data.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2.5">
                <p className="flex-1 text-sm">{h.name}</p>
                <Badge>{h.unit === "done" ? "Daily check" : `${h.target.toLocaleString()} ${h.unit}`}</Badge>
                <IconButton label={`Remove ${h.name}`} onClick={async () => {
                  try { await repo.update("habits", h.id, { active: false }); toast.success("Habit removed"); } catch (e) { toast.error(e); }
                }}><Trash2 className="size-4" /></IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Assign a habit" footer={<>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="primary" type="submit" form="habit-form" loading={busy}>Assign</Button>
      </>}>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {HABIT_PRESETS.map((p) => <button key={p.name} type="button" onClick={() => setForm(p)} className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs text-muted hover:text-ink">{p.name}</button>)}
        </div>
        <form id="habit-form" onSubmit={add} className="grid grid-cols-2 gap-3">
          <Field label="Habit" className="col-span-2"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 10-min evening walk" /></Field>
          <Field label="Daily target"><NumberInput min={0} step="any" value={form.target} onChange={(v) => setForm({ ...form, target: v })} /></Field>
          <Field label="Unit" hint="Use “done” for a simple yes/no habit."><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
        </form>
      </Modal>
    </Card>
  );
}


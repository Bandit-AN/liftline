"use client";

import { useMemo, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp, useList, useSession } from "@/lib/app-context";
import { addDays, fmtDate, fmtDateTime, relativeTime, today, WEEKDAYS_LONG } from "@/lib/dates";
import { totals } from "@/lib/stats";
import type { BodyMetric, CheckIn, Client, ClientStatus, Invite } from "@/lib/types";
import { Badge, Button, Card, CardHeader, cx, EmptyState, ErrorState, Field, IconButton, Input, LoadingBlock, NumberInput, ProgressBar, Segmented, Select, Textarea, useToast, useConfirm } from "@/components/ui";
import { CaloriesChart, MeasurementChart, WeightChart } from "@/components/charts";
import { PhotoGallery } from "@/components/photos";
import { WorkoutLogItem } from "@/components/workout-log-view";
import { CheckInAnswers, CheckInReview, CheckInStatusBadge, weekLabel } from "@/components/checkin-detail";
import { InviteLinkBox } from "../invite-modal";

// ─── Overview ─────────────────────────────────────────────────

export function OverviewTab({ client, metrics, checkIns, goTo }: { client: Client; metrics: BodyMetric[]; checkIns: CheckIn[]; goTo: (tab: string) => void }) {
  const logs = useList("workout_logs", { eq: { client_id: client.id }, gte: { date: addDays(today(), -28) }, order: { col: "date", asc: false } });
  const plan = useList("workout_plans", { eq: { client_id: client.id, active: true } });
  const food = useList("food_entries", { eq: { client_id: client.id }, gte: { date: addDays(today(), -7) } });
  const nplan = useList("nutrition_plans", { eq: { client_id: client.id, active: true } });

  const weights = metrics.filter((m) => m.weight != null);
  const current = weights.at(-1)?.weight ?? null;
  const start = client.start_weight ?? weights[0]?.weight ?? null;
  const change = current != null && start != null ? Math.round((current - start) * 10) / 10 : null;
  const completed = logs.data.filter((l) => l.completed).length;
  const scheduled = (plan.data[0]?.days.reduce((n, d) => n + d.weekdays.length, 0) ?? 0) * 4;
  const loggedDays = [...new Set(food.data.filter((f) => f.date < today()).map((f) => f.date))];
  const avgKcal = loggedDays.length ? Math.round(totals(food.data.filter((f) => f.date < today())).calories / loggedDays.length) : null;
  const latest = checkIns[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted">Current weight</p>
          <p className="mt-1 text-2xl font-semibold tnum">{current ?? "—"}<span className="ml-1 text-sm font-normal text-muted">kg</span></p>
          {change != null && <p className={cx("text-xs tnum", change < 0 ? "text-accent" : "text-muted")}>{change > 0 ? "+" : ""}{change} kg since start</p>}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Workouts (4 weeks)</p>
          <p className="mt-1 text-2xl font-semibold tnum">{completed}<span className="text-sm font-normal text-muted">{scheduled ? ` / ${scheduled}` : ""}</span></p>
          {scheduled > 0 && <ProgressBar value={completed} max={scheduled} className="mt-2" />}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Avg calories (7 days)</p>
          <p className="mt-1 text-2xl font-semibold tnum">{avgKcal?.toLocaleString() ?? "—"}</p>
          {nplan.data[0] && <p className="text-xs text-muted">Target {nplan.data[0].calories.toLocaleString()} · {loggedDays.length} days logged</p>}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Last activity</p>
          <p className="mt-1 text-2xl font-semibold">{relativeTime(client.last_activity_at)}</p>
          <p className="text-xs text-muted">Check-ins on {WEEKDAYS_LONG[client.check_in_day]}s</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Weight trend" subtitle={client.target_weight ? `Goal: ${client.target_weight} kg` : undefined} action={<Button size="sm" variant="ghost" onClick={() => goTo("progress")}>Details</Button>} />
          <div className="px-3 pb-4"><WeightChart metrics={metrics} target={client.target_weight} /></div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Latest check-in" action={latest ? <CheckInStatusBadge ci={latest} /> : undefined} />
          <div className="px-5 pb-5">
            {latest ? (
              <>
                <p className="text-[13px] text-muted">{weekLabel(latest)} · {relativeTime(latest.submitted_at)}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[["Adherence", `${latest.adherence}%`], ["Energy", `${latest.energy}/5`], ["Sleep", `${latest.sleep_quality}/5`]].map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-surface-2 py-2"><p className="text-[11px] text-muted">{l}</p><p className="font-semibold tnum">{v}</p></div>
                  ))}
                </div>
                {latest.questions && <p className="mt-3 line-clamp-3 text-[13px]"><span className="text-muted">Question: </span>{latest.questions}</p>}
                <Button size="sm" className="mt-4" variant={latest.status === "submitted" ? "primary" : "secondary"} onClick={() => goTo("check-ins")}>{latest.status === "submitted" ? "Review now" : "View history"}</Button>
              </>
            ) : <EmptyState title="No check-ins yet" />}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent workouts" action={<Button size="sm" variant="ghost" onClick={() => goTo("training")}>All logs</Button>} />
        <div className="space-y-2 px-5 pb-5">
          {logs.loading ? <LoadingBlock rows={2} /> : logs.data.length === 0 ? <EmptyState title="No workouts logged in the last 4 weeks" /> : logs.data.slice(0, 3).map((l) => <WorkoutLogItem key={l.id} log={l} />)}
        </div>
      </Card>

      {client.preferences && (
        <Card className="p-5">
          <p className="text-xs font-medium text-muted">Client preferences</p>
          <p className="mt-1 text-sm">{client.preferences}</p>
        </Card>
      )}
    </div>
  );
}

// ─── Progress ─────────────────────────────────────────────────

export function ProgressTab({ client, metrics }: { client: Client; metrics: BodyMetric[] }) {
  const measured = metrics.filter((m) => m.waist ?? m.chest ?? m.hips ?? m.arm ?? m.thigh).reverse();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Body weight" subtitle={`${metrics.filter((m) => m.weight).length} weigh-ins`} />
        <div className="px-3 pb-4"><WeightChart metrics={metrics} target={client.target_weight} height={260} /></div>
      </Card>
      <Card>
        <CardHeader title="Measurements" subtitle="Centimetres" />
        <div className="px-3 pb-2"><MeasurementChart metrics={metrics} /></div>
        {measured.length > 0 && (
          <div className="overflow-x-auto px-5 pb-5">
            <table className="mt-3 w-full text-[13px] tnum">
              <thead className="text-left text-xs text-muted"><tr><th className="py-2 font-medium">Date</th><th>Waist</th><th>Chest</th><th>Hips</th><th>Arm</th><th>Thigh</th></tr></thead>
              <tbody className="divide-y divide-line">
                {measured.slice(0, 8).map((m) => <tr key={m.id}><td className="py-2 text-muted">{fmtDate(m.date)}</td><td>{m.waist ?? "—"}</td><td>{m.chest ?? "—"}</td><td>{m.hips ?? "—"}</td><td>{m.arm ?? "—"}</td><td>{m.thigh ?? "—"}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card>
        <CardHeader title="Progress photos" />
        <div className="px-5 pb-5"><PhotoGallery clientId={client.id} canUpload={false} /></div>
      </Card>
    </div>
  );
}

// ─── Training logs ────────────────────────────────────────────

export function TrainingTab({ client }: { client: Client }) {
  const logs = useList("workout_logs", { eq: { client_id: client.id }, order: { col: "date", asc: false }, limit: 60 });
  if (logs.error) return <ErrorState message={logs.error} onRetry={logs.reload} />;
  if (logs.loading) return <LoadingBlock />;
  if (!logs.data.length) return <EmptyState title="No workouts logged yet" body="Sessions the client logs will appear here with sets, reps, weights and notes." />;
  return <div className="space-y-2">{logs.data.map((l, i) => <WorkoutLogItem key={l.id} log={l} defaultOpen={i === 0} />)}</div>;
}

// ─── Nutrition logs ───────────────────────────────────────────

export function NutritionTab({ client }: { client: Client }) {
  const since = addDays(today(), -13);
  const food = useList("food_entries", { eq: { client_id: client.id }, gte: { date: since }, order: { col: "created_at" } });
  const plan = useList("nutrition_plans", { eq: { client_id: client.id, active: true } });
  const target = plan.data[0];
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(since, i)).map((date) => ({ date, ...totals(food.data.filter((f) => f.date === date)), entries: food.data.filter((f) => f.date === date) })), [food.data, since]);
  const [sel, setSel] = useState(today());
  const day = days.find((d) => d.date === sel);

  if (food.error) return <ErrorState message={food.error} onRetry={food.reload} />;
  if (food.loading) return <LoadingBlock />;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Calories — last 14 days" subtitle={target ? `Target ${target.calories.toLocaleString()} kcal (dashed line)` : "No target assigned"} />
        <div className="px-3 pb-4"><CaloriesChart days={days.map((d) => ({ date: d.date, calories: d.calories }))} target={target?.calories ?? null} height={200} /></div>
      </Card>
      <Card>
        <CardHeader title="Food diary" action={<Select aria-label="Day" className="w-44" value={sel} onChange={(e) => setSel(e.target.value)}>{[...days].reverse().map((d) => <option key={d.date} value={d.date}>{fmtDate(d.date, { weekday: "short", month: "short", day: "numeric" })}{d.entries.length ? "" : " (empty)"}</option>)}</Select>} />
        <div className="px-5 pb-5">
          {day && target && (
            <div className="mb-4 grid grid-cols-4 gap-3 text-[13px]">
              {([["Calories", day.calories, target.calories, ""], ["Protein", day.protein, target.protein, "g"], ["Carbs", day.carbs, target.carbs, "g"], ["Fat", day.fat, target.fat, "g"]] as const).map(([l, v, t, u]) => (
                <div key={l}><p className="text-muted">{l}</p><p className="tnum">{Math.round(v)}{u} <span className="text-faint">/ {t}{u}</span></p><ProgressBar value={v} max={t} className="mt-1" tone={v > t * 1.1 ? "warn" : "accent"} /></div>
              ))}
            </div>
          )}
          {day && day.tracked > 0 && (
            <p className="mb-3 text-xs text-muted tnum">Fiber {Math.round(day.fiber)}g · Sugar {Math.round(day.sugar)}g · Sodium {Math.round(day.sodium).toLocaleString()}mg <span className="text-faint">({day.tracked} of {day.entries.length} foods include these)</span></p>
          )}
          {!day?.entries.length ? <EmptyState title="Nothing logged this day" /> : (
            <ul className="divide-y divide-line text-sm">
              {day.entries.map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-2">
                  <Badge className="w-20 justify-center capitalize">{f.meal}</Badge>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5"><span className="truncate">{f.name}</span>{f.estimated && <Badge tone="warn" className="shrink-0">Photo est.</Badge>}</span>
                    {f.portion && <span className="block truncate text-xs text-faint">{f.portion}</span>}
                  </span>
                  <span className="text-xs text-muted tnum">P{Math.round(f.protein)} C{Math.round(f.carbs)} F{Math.round(f.fat)}</span>
                  <span className="w-16 text-right tnum">{f.calories}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Check-ins ────────────────────────────────────────────────

export function CheckInsTab({ checkIns }: { checkIns: CheckIn[] }) {
  if (!checkIns.length) return <EmptyState title="No check-ins yet" body="Weekly check-ins submitted by this client will appear here." />;
  return (
    <div className="space-y-4">
      {checkIns.map((ci, i) => (
        <Card key={ci.id} className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{weekLabel(ci)}</p>
              <p className="text-xs text-muted">Submitted {fmtDateTime(ci.submitted_at)}</p>
            </div>
            <CheckInStatusBadge ci={ci} />
          </div>
          <CheckInAnswers ci={ci} prevWeight={checkIns[i + 1]?.weight} />
          <div className="mt-5 border-t border-line pt-4"><CheckInReview ci={ci} /></div>
        </Card>
      ))}
    </div>
  );
}

// ─── Notes ────────────────────────────────────────────────────

export function NotesTab({ client }: { client: Client }) {
  const { session, repo } = useSession();
  const ask = useConfirm();
  const toast = useToast();
  const notes = useList("coach_notes", { eq: { client_id: client.id }, order: { col: "created_at", asc: false } });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-4">
        <Textarea placeholder="Injuries, preferences, context from calls… Only you can see notes." value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-faint">Private to you — never shown to the client.</span>
          <Button variant="primary" size="sm" disabled={!text.trim()} loading={busy} onClick={async () => {
            setBusy(true);
            try { await repo.insert("coach_notes", { coach_id: session.userId, client_id: client.id, body: text.trim() }); setText(""); toast.success("Note added"); } catch (e) { toast.error(e); } finally { setBusy(false); }
          }}>Add note</Button>
        </div>
      </Card>
      {notes.loading ? <LoadingBlock rows={2} /> : notes.data.length === 0 ? <EmptyState title="No notes yet" /> : notes.data.map((n) => (
        <Card key={n.id} className="flex gap-3 p-4">
          <div className="flex-1">
            <p className="whitespace-pre-wrap text-sm">{n.body}</p>
            <p className="mt-1.5 text-xs text-faint">{fmtDateTime(n.created_at)}</p>
          </div>
          <IconButton label="Delete note" onClick={async () => {
            if (!(await ask({ title: "Delete this note?", confirmLabel: "Delete", danger: true }))) return;
            try { await repo.remove("coach_notes", n.id); } catch (e) { toast.error(e); }
          }}><Trash2 className="size-4" /></IconButton>
        </Card>
      ))}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────

export function ClientSettingsTab({ client }: { client: Client }) {
  const { session, repo } = useSession();
  const ask = useConfirm();
  const { session: s } = useApp();
  const router = useRouter();
  const toast = useToast();
  const invites = useList("invites", { eq: { client_id: client.id }, order: { col: "created_at", asc: false } });
  const [form, setForm] = useState({ full_name: client.full_name, goal: client.goal, check_in_day: client.check_in_day, start_weight: client.start_weight, target_weight: client.target_weight, height_cm: client.height_cm });
  const [busy, setBusy] = useState(false);
  const invite: Invite | undefined = invites.data[0];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await repo.update("clients", client.id, { ...form, full_name: form.full_name.trim() }); toast.success("Client updated"); } catch (err) { toast.error(err); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-5">
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2"><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Goal" className="sm:col-span-2"><Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <Field label="Check-in day">
            <Select value={form.check_in_day} onChange={(e) => setForm({ ...form, check_in_day: Number(e.target.value) })}>{WEEKDAYS_LONG.map((d, i) => <option key={d} value={i}>{d}</option>)}</Select>
          </Field>
          <Field label="Height (cm)"><NumberInput value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: v })} /></Field>
          <Field label="Starting weight (kg)"><NumberInput step="0.1" value={form.start_weight} onChange={(v) => setForm({ ...form, start_weight: v })} /></Field>
          <Field label="Target weight (kg)"><NumberInput step="0.1" value={form.target_weight} onChange={(v) => setForm({ ...form, target_weight: v })} /></Field>
          <div className="flex justify-end sm:col-span-2"><Button variant="primary" type="submit" loading={busy}>Save changes</Button></div>
        </form>
      </Card>

      {client.status === "invited" && (
        <Card className="p-5">
          <p className="font-medium">Invite link</p>
          <p className="mb-4 mt-1 text-[13px] text-muted">{client.full_name.split(" ")[0]} hasn&apos;t joined yet.</p>
          {invites.loading ? <LoadingBlock rows={1} /> : invite && !invite.accepted_at && new Date(invite.expires_at) > new Date() ? (
            <InviteLinkBox invite={invite} clientName={client.full_name} coachName={session.profile.full_name} />
          ) : (
            <Button icon={<Copy className="size-4" />} onClick={async () => {
              try { await repo.createInvite(client.id, client.email); toast.success("New invite link created"); } catch (e) { toast.error(e); }
            }}>Create a new invite link</Button>
          )}
        </Card>
      )}

      {client.status !== "invited" && (
        <Card className="p-5">
          <p className="font-medium">Coaching status</p>
          <p className="mb-3 mt-1 text-[13px] text-muted">Paused clients keep their data but are hidden from check-in reminders and workout stats.</p>
          <Segmented<ClientStatus> value={client.status} onChange={async (v) => {
            try { await repo.update("clients", client.id, { status: v }); toast.success(v === "paused" ? "Client paused" : "Client active"); } catch (e) { toast.error(e); }
          }} options={[{ value: "active", label: "Active" }, { value: "paused", label: "Paused" }]} />
        </Card>
      )}

      <Card className="border-danger/30 p-5">
        <p className="font-medium text-danger">Remove client</p>
        <p className="mb-3 mt-1 text-[13px] text-muted">Permanently deletes {client.full_name}&apos;s plans, logs, photos records, check-ins and messages{s?.mode === "live" ? ". Their login stays but is no longer linked to you" : ""}.</p>
        <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={async () => {
          if (!(await ask({ title: `Remove ${client.full_name}?`, body: "This permanently deletes their plans, logs, check-ins and messages. It can't be undone.", confirmLabel: "Remove client", danger: true }))) return;
          try { await repo.remove("clients", client.id); toast.success("Client removed"); router.replace("/coach/clients"); } catch (e) { toast.error(e); }
        }}>Remove client</Button>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { fmtDate, fmtDateTime, today, weekStart } from "@/lib/dates";
import type { CheckIn } from "@/lib/types";
import { Button, Card, cx, ErrorState, Field, LoadingBlock, NumberInput, Textarea, useToast } from "@/components/ui";
import { CheckInAnswers, CheckInFeedback, CheckInStatusBadge, weekLabel } from "@/components/checkin-detail";

const SCALES = [
  { key: "progress_rating", label: "How do you feel about your progress?", low: "Poor", high: "Great" },
  { key: "energy", label: "Energy levels", low: "Drained", high: "Energised" },
  { key: "hunger", label: "Hunger", low: "Rarely hungry", high: "Always hungry" },
  { key: "sleep_quality", label: "Sleep quality", low: "Poor", high: "Great" },
] as const;

type Form = {
  weight: number | null; progress_rating: number; energy: number; hunger: number; sleep_quality: number;
  sleep_hours: number | null; adherence: number; wins: string; challenges: string; questions: string;
};

function ScalePicker({ label, low, high, value, onChange }: { label: string; low: string; high: string; value: number; onChange: (v: number) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-pressed={value === n}
            className={cx("h-11 rounded-xl border text-sm font-medium tnum transition", value === n ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-muted")}>
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-faint"><span>{low}</span><span>{high}</span></div>
    </fieldset>
  );
}

export default function CheckInPage() {
  const { session, repo } = useSession();
  const cid = session.clientId!;
  const toast = useToast();
  const week = weekStart(today());
  const cis = useList("check_ins", { eq: { client_id: cid }, order: { col: "week_of", asc: false } });
  const metrics = useList("body_metrics", { eq: { client_id: cid }, order: { col: "date", asc: false }, limit: 30 });
  const client = useList("clients", { eq: { id: cid } });
  const current = cis.data.find((c) => c.week_of === week);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form>({ weight: null, progress_rating: 0, energy: 0, hunger: 0, sleep_quality: 0, sleep_hours: null, adherence: 80, wins: "", challenges: "", questions: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastWeight = metrics.data.find((m) => m.weight != null)?.weight ?? null;
  useEffect(() => {
    if (lastWeight != null) setForm((f) => (f.weight == null ? { ...f, weight: lastWeight } : f));
  }, [lastWeight]);

  const startEdit = (ci: CheckIn) => {
    setForm({ weight: ci.weight, progress_rating: ci.progress_rating, energy: ci.energy, hunger: ci.hunger, sleep_quality: ci.sleep_quality, sleep_hours: ci.sleep_hours, adherence: ci.adherence, wins: ci.wins, challenges: ci.challenges, questions: ci.questions });
    setEditing(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = SCALES.find((s) => !form[s.key]);
    if (missing) return setError(`Please answer: “${missing.label}”`);
    setBusy(true);
    setError(null);
    try {
      if (current && editing) {
        await repo.update("check_ins", current.id, form);
        toast.success("Check-in updated");
        setEditing(false);
      } else {
        await repo.insert("check_ins", { ...form, client_id: cid, coach_id: client.data[0].coach_id, week_of: week });
        if (form.weight && form.weight !== lastWeight) {
          const todayRow = metrics.data.find((m) => m.date === today());
          if (todayRow) await repo.update("body_metrics", todayRow.id, { weight: form.weight });
          else await repo.insert("body_metrics", { client_id: cid, date: today(), weight: form.weight });
        }
        toast.success("Check-in sent to your coach");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (cis.error) return <ErrorState message={cis.error} onRetry={cis.reload} />;
  if (cis.loading || client.loading) return <LoadingBlock rows={4} />;
  const showForm = !current || editing;
  const history = cis.data.filter((c) => c.id !== current?.id);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Weekly check-in</h1>
      <p className="mt-0.5 text-[13px] text-muted">Week of {fmtDate(week, { month: "long", day: "numeric" })}</p>

      {!showForm && current ? (
        <div className="mt-5 space-y-4">
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-accent" />
              <p className="flex-1 font-medium">Submitted {fmtDateTime(current.submitted_at)}</p>
              <CheckInStatusBadge ci={current} />
            </div>
            {current.coach_feedback ? <CheckInFeedback ci={current} /> : <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] text-muted">Your coach will review this soon — you&apos;ll get a notification.</p>}
            <div className="mt-5"><CheckInAnswers ci={current} prevWeight={history[0]?.weight} /></div>
            {current.status === "submitted" && <Button size="sm" className="mt-4" onClick={() => startEdit(current)}>Edit answers</Button>}
          </Card>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-6">
          <Card className="space-y-6 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight this week (kg)"><NumberInput step="0.1" value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} /></Field>
              <Field label="Avg sleep (hours)"><NumberInput step="0.5" min={0} max={14} value={form.sleep_hours} onChange={(v) => setForm({ ...form, sleep_hours: v })} /></Field>
            </div>
            {SCALES.map((s) => <ScalePicker key={s.key} label={s.label} low={s.low} high={s.high} value={form[s.key]} onChange={(v) => setForm({ ...form, [s.key]: v })} />)}
            <div>
              <label htmlFor="adh" className="mb-2 flex justify-between text-sm font-medium"><span>How closely did you follow the plan?</span><span className="text-accent tnum">{form.adherence}%</span></label>
              <input id="adh" type="range" min={0} max={100} step={5} value={form.adherence} onChange={(e) => setForm({ ...form, adherence: Number(e.target.value) })} className="w-full accent-[var(--color-accent)]" />
            </div>
          </Card>
          <Card className="space-y-4 p-4">
            <Field label="Wins this week"><Textarea rows={2} placeholder="PRs, habits you nailed, how you handled a tough moment…" value={form.wins} onChange={(e) => setForm({ ...form, wins: e.target.value })} /></Field>
            <Field label="Challenges"><Textarea rows={2} placeholder="What got in the way? Cravings, schedule, soreness…" value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} /></Field>
            <Field label="Questions for your coach"><Textarea rows={2} value={form.questions} onChange={(e) => setForm({ ...form, questions: e.target.value })} /></Field>
          </Card>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            {editing && <Button type="button" variant="ghost" size="lg" onClick={() => setEditing(false)}>Cancel</Button>}
            <Button type="submit" variant="primary" size="lg" className="flex-1" loading={busy}>{editing ? "Save changes" : "Submit check-in"}</Button>
          </div>
        </form>
      )}

      {history.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-[13px] font-semibold uppercase tracking-wide text-muted">Past check-ins</h2>
          <div className="space-y-3">
            {history.map((ci) => (
              <details key={ci.id} className="group rounded-2xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                  <span className="flex-1 text-sm font-medium">{weekLabel(ci)}</span>
                  <span className="text-xs text-muted tnum">{ci.adherence}% · {ci.weight ?? "—"} kg</span>
                  <CheckInStatusBadge ci={ci} />
                </summary>
                <div className="space-y-4 border-t border-line px-4 py-4">
                  <CheckInFeedback ci={ci} />
                  <CheckInAnswers ci={ci} />
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </>
  );
}

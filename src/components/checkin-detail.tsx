"use client";

import { useState } from "react";
import { MessageSquareReply } from "lucide-react";
import { useSession } from "@/lib/app-context";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import type { CheckIn } from "@/lib/types";
import { Badge, Button, cx, Textarea, useToast } from "./ui";

const SCALE_LABELS: Record<string, string[]> = {
  progress_rating: ["", "Poor", "Below par", "OK", "Good", "Great"],
  energy: ["", "Very low", "Low", "OK", "Good", "High"],
  hunger: ["", "Very low", "Low", "Manageable", "High", "Very high"],
  sleep_quality: ["", "Very poor", "Poor", "OK", "Good", "Great"],
};

function Scale({ label, value, field, invert }: { label: string; value: number; field: string; invert?: boolean }) {
  const good = invert ? value <= 3 : value >= 4;
  const bad = invert ? value >= 5 : value <= 2;
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1.5 flex items-center gap-1" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cx("h-1.5 flex-1 rounded-full", i <= value ? (bad ? "bg-danger" : good ? "bg-accent" : "bg-warn") : "bg-surface-3")} />
        ))}
      </div>
      <p className="mt-1.5 text-sm">{SCALE_LABELS[field][value]}</p>
    </div>
  );
}

export function CheckInAnswers({ ci, prevWeight }: { ci: CheckIn; prevWeight?: number | null }) {
  const delta = ci.weight != null && prevWeight != null ? Math.round((ci.weight - prevWeight) * 10) / 10 : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-muted">Weight</p>
          <p className="mt-1 text-lg font-semibold tnum">{ci.weight ?? "—"}<span className="ml-1 text-xs font-normal text-muted">kg</span></p>
          {delta != null && <p className={cx("text-xs tnum", delta < 0 ? "text-accent" : delta > 0 ? "text-warn" : "text-muted")}>{delta > 0 ? "+" : ""}{delta} kg vs last</p>}
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-muted">Plan adherence</p>
          <p className="mt-1 text-lg font-semibold tnum">{ci.adherence}%</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-muted">Sleep</p>
          <p className="mt-1 text-lg font-semibold tnum">{ci.sleep_hours ?? "—"}<span className="ml-1 text-xs font-normal text-muted">h / night</span></p>
        </div>
        <Scale label="Overall progress" value={ci.progress_rating} field="progress_rating" />
        <Scale label="Energy" value={ci.energy} field="energy" />
        <Scale label="Hunger" value={ci.hunger} field="hunger" invert />
        <Scale label="Sleep quality" value={ci.sleep_quality} field="sleep_quality" />
      </div>
      {[["Wins this week", ci.wins], ["Challenges", ci.challenges], ["Questions for coach", ci.questions]].map(([label, text]) => text ? (
        <div key={label}>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
        </div>
      ) : null)}
    </div>
  );
}

export function CheckInFeedback({ ci }: { ci: CheckIn }) {
  if (!ci.coach_feedback) return null;
  return (
    <div className="rounded-xl border border-accent/25 bg-accent/5 p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-accent"><MessageSquareReply className="size-3.5" /> Coach feedback{ci.reviewed_at ? ` · ${fmtDateTime(ci.reviewed_at)}` : ""}</p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{ci.coach_feedback}</p>
    </div>
  );
}

export function CheckInReview({ ci, onDone }: { ci: CheckIn; onDone?: () => void }) {
  const { repo } = useSession();
  const toast = useToast();
  const [text, setText] = useState(ci.coach_feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!ci.coach_feedback);

  if (!editing) {
    return (
      <div className="space-y-2">
        <CheckInFeedback ci={ci} />
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit feedback</Button>
      </div>
    );
  }

  const submit = async () => {
    if (!text.trim()) return toast.error("Write some feedback first.");
    setBusy(true);
    try {
      await repo.update("check_ins", ci.id, { coach_feedback: text.trim(), status: "reviewed", reviewed_at: new Date().toISOString() });
      toast.success("Feedback sent");
      setEditing(false);
      onDone?.();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-muted" htmlFor={`fb-${ci.id}`}>Your feedback</label>
      <Textarea id={`fb-${ci.id}`} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What went well, what to adjust next week, answers to their questions…" />
      <div className="flex justify-end gap-2">
        {ci.coach_feedback && <Button variant="ghost" onClick={() => { setText(ci.coach_feedback ?? ""); setEditing(false); }}>Cancel</Button>}
        <Button variant="primary" loading={busy} onClick={submit}>{ci.status === "reviewed" ? "Update feedback" : "Send feedback & mark reviewed"}</Button>
      </div>
    </div>
  );
}

export function CheckInStatusBadge({ ci }: { ci: CheckIn }) {
  return ci.status === "reviewed" ? <Badge>Reviewed</Badge> : <Badge tone="accent">Needs review</Badge>;
}

export function weekLabel(ci: CheckIn) {
  return `Week of ${fmtDate(ci.week_of)}`;
}

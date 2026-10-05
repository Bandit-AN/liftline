"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { fmtDate, today } from "@/lib/dates";
import type { BodyMetric } from "@/lib/types";
import { Button, Card, cx, EmptyState, ErrorState, Field, IconButton, Input, LoadingBlock, NumberInput, Segmented, useToast } from "@/components/ui";
import { MeasurementChart, WeightChart } from "@/components/charts";
import { PhotoGallery } from "@/components/photos";
import { withSuspense } from "@/components/with-suspense";

type View = "weight" | "measurements" | "photos";
const PARTS = [["waist", "Waist"], ["chest", "Chest"], ["hips", "Hips"], ["arm", "Arm"], ["thigh", "Thigh"]] as const;

function Progress() {
  const { session, repo } = useSession();
  const cid = session.clientId!;
  const toast = useToast();
  const params = useSearchParams();
  const [view, setView] = useState<View>((params.get("view") as View) || "weight");
  const metrics = useList("body_metrics", { eq: { client_id: cid }, order: { col: "date" } });
  const client = useList("clients", { eq: { id: cid } });
  const c = client.data[0];

  const [wDate, setWDate] = useState(today());
  const [weight, setWeight] = useState<number | null>(null);
  const [mDate, setMDate] = useState(today());
  const [meas, setMeas] = useState<Partial<Record<(typeof PARTS)[number][0], number | null>>>({});
  const [busy, setBusy] = useState(false);

  /** One metrics row per day: update it if it exists, otherwise create it. */
  const upsert = async (date: string, patch: Partial<BodyMetric>) => {
    const existing = metrics.data.find((m) => m.date === date);
    if (existing) await repo.update("body_metrics", existing.id, patch);
    else await repo.insert("body_metrics", { client_id: cid, date, ...patch });
  };

  const weights = metrics.data.filter((m) => m.weight != null);
  const current = weights.at(-1)?.weight ?? null;
  const start = c?.start_weight ?? weights[0]?.weight ?? null;
  const change = current != null && start != null ? Math.round((current - start) * 10) / 10 : null;
  const toGo = current != null && c?.target_weight ? Math.round((current - c.target_weight) * 10) / 10 : null;
  const measured = metrics.data.filter((m) => PARTS.some(([k]) => m[k] != null));

  if (metrics.error) return <ErrorState message={metrics.error} onRetry={metrics.reload} />;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
      <Segmented className="mt-4 w-full [&>button]:flex-1" value={view} onChange={setView} options={[{ value: "weight", label: "Weight" }, { value: "measurements", label: "Measurements" }, { value: "photos", label: "Photos" }]} />

      {metrics.loading ? <div className="mt-5"><LoadingBlock rows={3} /></div> : view === "weight" ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[["Current", current != null ? `${current}` : "—", "kg"], ["Change", change != null ? `${change > 0 ? "+" : ""}${change}` : "—", "kg"], ["To goal", toGo != null ? `${Math.abs(toGo)}` : "—", toGo != null ? "kg" : ""]].map(([l, v, u]) => (
              <Card key={l} className="p-3 text-center">
                <p className="text-[11px] text-muted">{l}</p>
                <p className={cx("mt-0.5 text-lg font-semibold tnum", l === "Change" && change != null && change < 0 && "text-accent")}>{v}<span className="ml-0.5 text-xs font-normal text-muted">{u}</span></p>
              </Card>
            ))}
          </div>
          <Card className="p-4">
            <form className="flex items-end gap-2" onSubmit={async (e) => {
              e.preventDefault();
              if (!weight || weight < 20 || weight > 400) return toast.error("Enter a weight between 20 and 400 kg.");
              setBusy(true);
              try { await upsert(wDate, { weight }); setWeight(null); toast.success("Weight logged"); } catch (err) { toast.error(err); } finally { setBusy(false); }
            }}>
              <Field label="Weight (kg)" className="flex-1"><NumberInput step="0.1" placeholder={current ? String(current) : "e.g. 78.4"} value={weight} onChange={setWeight} /></Field>
              <Field label="Date" className="w-36"><Input type="date" max={today()} value={wDate} onChange={(e) => setWDate(e.target.value)} /></Field>
              <Button type="submit" variant="primary" loading={busy}>Log</Button>
            </form>
          </Card>
          <Card className="px-2 py-4"><WeightChart metrics={metrics.data} target={c?.target_weight} height={240} /></Card>
          {weights.length > 0 && (
            <Card>
              <ul className="divide-y divide-line">
                {[...weights].reverse().slice(0, 10).map((m) => (
                  <li key={m.id} className="flex items-center px-4 py-2.5 text-sm">
                    <span className="flex-1 text-muted">{fmtDate(m.date, { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span className="tnum">{m.weight} kg</span>
                    <IconButton label="Delete weigh-in" className="ml-2" onClick={async () => {
                      try {
                        const hasMeas = PARTS.some(([k]) => m[k] != null);
                        if (hasMeas) await repo.update("body_metrics", m.id, { weight: null });
                        else await repo.remove("body_metrics", m.id);
                      } catch (e) { toast.error(e); }
                    }}><Trash2 className="size-4" /></IconButton>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      ) : view === "measurements" ? (
        <div className="mt-5 space-y-4">
          <Card className="p-4">
            <form className="grid grid-cols-3 gap-2.5" onSubmit={async (e) => {
              e.preventDefault();
              const patch = Object.fromEntries(Object.entries(meas).filter(([, v]) => v != null && v > 0));
              if (!Object.keys(patch).length) return toast.error("Enter at least one measurement.");
              setBusy(true);
              try { await upsert(mDate, patch); setMeas({}); toast.success("Measurements saved"); } catch (err) { toast.error(err); } finally { setBusy(false); }
            }}>
              {PARTS.map(([k, label]) => (
                <Field key={k} label={`${label} (cm)`}><NumberInput step="0.1" value={meas[k] ?? null} onChange={(v) => setMeas({ ...meas, [k]: v })} /></Field>
              ))}
              <Field label="Date"><Input type="date" max={today()} value={mDate} onChange={(e) => setMDate(e.target.value)} /></Field>
              <Button type="submit" variant="primary" loading={busy} className="col-span-3 mt-1">Save measurements</Button>
            </form>
            <p className="mt-3 text-xs text-faint">Measure first thing in the morning, relaxed, at the widest point.</p>
          </Card>
          <Card className="px-2 py-4"><MeasurementChart metrics={metrics.data} /></Card>
          {measured.length === 0 ? <EmptyState title="No measurements yet" /> : (
            <Card className="overflow-x-auto">
              <table className="w-full text-[13px] tnum">
                <thead className="text-left text-xs text-muted"><tr><th className="px-4 py-2.5 font-medium">Date</th>{PARTS.map(([, l]) => <th key={l} className="py-2.5 font-medium">{l}</th>)}</tr></thead>
                <tbody className="divide-y divide-line">
                  {[...measured].reverse().map((m) => <tr key={m.id}><td className="px-4 py-2.5 text-muted">{fmtDate(m.date)}</td>{PARTS.map(([k]) => <td key={k}>{m[k] ?? "—"}</td>)}</tr>)}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      ) : (
        <div className="mt-5"><PhotoGallery clientId={cid} canUpload /></div>
      )}
    </>
  );
}

export default withSuspense(Progress);

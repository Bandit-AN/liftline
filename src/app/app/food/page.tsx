"use client";

import { useMemo, useState } from "react";
import { Camera, ChevronDown, ChevronLeft, ChevronRight, PencilLine, Plus, Sparkles, Trash2 } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { addDays, fmtDate, today } from "@/lib/dates";
import { totals } from "@/lib/stats";
import type { FoodEntry, MealSlot } from "@/lib/types";
import { Badge, Button, Card, cx, ErrorState, Field, IconButton, Input, LoadingBlock, Modal, NumberInput, Ring, Segmented, Unavailable, useToast } from "@/components/ui";
import { ScanFoodSheet } from "@/components/client/scan-food";
import { MACRO_COLORS } from "@/components/macro-split";

const MEALS: { value: MealSlot; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snacks", label: "Snacks" },
];

type Draft = {
  name: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null;
  fiber: number | null; sugar: number | null; sodium: number | null;
};
const emptyDraft: Draft = { name: "", calories: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null, sodium: null };

export default function FoodDiary() {
  const { session, repo } = useSession();
  const cid = session.clientId!;
  const toast = useToast();
  const [date, setDate] = useState(today());
  const entries = useList("food_entries", { eq: { client_id: cid, date }, order: { col: "created_at" } });
  const recent = useList("food_entries", { eq: { client_id: cid }, gte: { date: addDays(today(), -21) }, order: { col: "created_at", asc: false }, limit: 200 });
  const plan = useList("nutrition_plans", { eq: { client_id: cid, active: true } });
  const n = plan.data[0];
  const t = totals(entries.data);

  const [adding, setAdding] = useState<MealSlot | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const recentFoods = useMemo(() => {
    const seen = new Map<string, FoodEntry>();
    for (const f of recent.data) if (!seen.has(f.name.toLowerCase())) seen.set(f.name.toLowerCase(), f);
    return [...seen.values()].slice(0, 8);
  }, [recent.data]);

  const open = (meal: MealSlot) => { setDraft(emptyDraft); setError(null); setMore(false); setAdding(meal); };

  const kcalFromMacros = Math.round((draft.protein ?? 0) * 4 + (draft.carbs ?? 0) * 4 + (draft.fat ?? 0) * 9);

  const save = async (e?: React.FormEvent, quick?: FoodEntry) => {
    e?.preventDefault();
    const src: Draft & { portion?: string | null; estimated?: boolean } = quick ?? draft;
    const calories = src.calories ?? (kcalFromMacros || null);
    if (!src.name.trim()) return setError("Name the food.");
    if (calories == null || calories < 0) return setError("Enter calories (or macros and we'll calculate them).");
    setBusy(true);
    try {
      await repo.insert("food_entries", {
        client_id: cid, date, meal: adding ?? "snacks", name: src.name.trim(), calories: Math.round(calories),
        protein: src.protein ?? 0, carbs: src.carbs ?? 0, fat: src.fat ?? 0,
        fiber: src.fiber ?? null, sugar: src.sugar ?? null, sodium: src.sodium ?? null,
        portion: src.portion ?? null,
        // Re-adding a scanned food keeps its "estimate" label; typed entries are the client's own numbers.
        source: "manual", estimated: !!src.estimated,
      });
      toast.success(`Added to ${adding}`);
      setAdding(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isToday = date === today();

  return (
    <>
      <div className="flex items-center justify-between">
        <IconButton label="Previous day" onClick={() => setDate(addDays(date, -1))}><ChevronLeft className="size-5" /></IconButton>
        <div className="text-center">
          <h1 className="text-lg font-semibold">{isToday ? "Today" : date === addDays(today(), -1) ? "Yesterday" : fmtDate(date, { weekday: "long" })}</h1>
          <p className="text-xs text-muted">{fmtDate(date, { month: "long", day: "numeric" })}</p>
        </div>
        <IconButton label="Next day" disabled={isToday} onClick={() => setDate(addDays(date, 1))}><ChevronRight className="size-5" /></IconButton>
      </div>

      <Card className="mt-4 p-5">
        {entries.loading || plan.loading ? <LoadingBlock rows={2} /> : (
          <div className="flex items-center gap-5">
            <Ring value={t.calories} max={n?.calories ?? 0} size={112} stroke={10}>
              <span className="text-xl font-semibold tnum leading-none">{t.calories.toLocaleString()}</span>
              <span className="mt-1 text-[11px] text-muted">{n ? `of ${n.calories.toLocaleString()}` : "kcal"}</span>
            </Ring>
            <div className="flex-1 space-y-3">
              {([["Protein", t.protein, n?.protein, MACRO_COLORS.protein], ["Carbs", t.carbs, n?.carbs, MACRO_COLORS.carbs], ["Fat", t.fat, n?.fat, MACRO_COLORS.fat]] as const).map(([l, v, max, col]) => (
                <div key={l}>
                  <div className="flex justify-between text-xs"><span className="text-muted">{l}</span><span className="tnum">{Math.round(v)}g{max ? <span className="text-faint"> / {max}g</span> : null}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: max ? `${Math.min(100, (v / max) * 100)}%` : "0%", background: col }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {n && !entries.loading && (
          <p className="mt-4 text-center text-[13px] text-muted">
            {t.calories <= n.calories ? <><span className="text-ink tnum">{(n.calories - t.calories).toLocaleString()}</span> kcal remaining</> : <><span className="text-warn tnum">{(t.calories - n.calories).toLocaleString()}</span> kcal over target</>}
            {" · "}<span className="text-ink tnum">{Math.max(0, n.protein - Math.round(t.protein))}g</span> protein to go
          </p>
        )}
        {!entries.loading && t.tracked > 0 && (
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center text-xs">
            <div><dt className="text-muted">Fiber</dt><dd className="text-sm tnum">{Math.round(t.fiber)}g</dd></div>
            <div><dt className="text-muted">Sugar</dt><dd className="text-sm tnum">{Math.round(t.sugar)}g</dd></div>
            <div><dt className="text-muted">Sodium</dt><dd className="text-sm tnum">{Math.round(t.sodium).toLocaleString()}mg</dd></div>
          </dl>
        )}
        {!entries.loading && t.tracked > 0 && t.tracked < entries.data.length && (
          <p className="mt-1.5 text-center text-[11px] text-faint">Fiber, sugar and sodium cover {t.tracked} of {entries.data.length} foods logged.</p>
        )}
      </Card>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <Button variant="primary" size="lg" icon={<Camera className="size-5" />} onClick={() => setScanOpen(true)}>Scan food</Button>
        <Button size="lg" icon={<PencilLine className="size-4" />} onClick={() => open("snacks")}>Manual</Button>
      </div>

      {entries.error ? <div className="mt-4"><ErrorState message={entries.error} onRetry={entries.reload} /></div> : (
        <div className="mt-5 space-y-4">
          {MEALS.map((m) => {
            const items = entries.data.filter((e) => e.meal === m.value);
            const suggestion = n?.meals.find((x) => x.name.toLowerCase().startsWith(m.label.toLowerCase().slice(0, 5)))?.suggestion;
            return (
              <Card key={m.value} className="overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-3.5">
                  <div>
                    <h2 className="font-semibold">{m.label}</h2>
                    {items.length > 0 && <p className="text-xs text-muted tnum">{totals(items).calories.toLocaleString()} kcal</p>}
                  </div>
                  <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => open(m.value)}>Add</Button>
                </div>
                {items.length === 0 ? (
                  <p className="px-4 pb-4 pt-1 text-[13px] text-faint">{suggestion ? `Coach suggests: ${suggestion}` : "Nothing logged"}</p>
                ) : (
                  <ul className="mt-1 divide-y divide-line">
                    {items.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-sm"><span className="truncate">{f.name}</span>{f.estimated && <Badge tone="warn" className="shrink-0"><Sparkles className="size-3" />Est.</Badge>}</p>
                          <p className="text-xs text-muted tnum">{f.portion ? `${f.portion} · ` : ""}P {Math.round(Number(f.protein))}g · C {Math.round(Number(f.carbs))}g · F {Math.round(Number(f.fat))}g</p>
                        </div>
                        <span className="text-sm tnum">{f.calories}</span>
                        <IconButton label={`Delete ${f.name}`} onClick={async () => {
                          try { await repo.remove("food_entries", f.id); } catch (e) { toast.error(e); }
                        }}><Trash2 className="size-4" /></IconButton>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {n?.notes && <p className="mt-5 rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-muted"><span className="text-ink">Coach notes:</span> {n.notes}</p>}

      <Modal open={adding !== null} onClose={() => setAdding(null)} title="Add food" footer={<>
        <Button variant="ghost" onClick={() => setAdding(null)}>Cancel</Button>
        <Button variant="primary" type="submit" form="food-form" loading={busy}>Add</Button>
      </>}>
        <Segmented className="mb-4 w-full justify-between" value={adding ?? "snacks"} onChange={(v) => setAdding(v)} options={MEALS.map((m) => ({ value: m.value, label: m.label }))} />
        {recentFoods.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[13px] text-muted">Recent — tap to add</p>
            <div className="flex flex-wrap gap-1.5">
              {recentFoods.map((f) => (
                <button key={f.id} type="button" disabled={busy} onClick={() => save(undefined, f)} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-left text-xs hover:border-line-strong">
                  {f.name} <span className="text-faint tnum">{f.calories}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <form id="food-form" onSubmit={save} className="grid grid-cols-2 gap-3">
          <Field label="Food" className="col-span-2"><Input required autoFocus placeholder="e.g. Chicken rice bowl" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="Calories" className="col-span-2" hint={draft.calories == null && kcalFromMacros ? `Will use ${kcalFromMacros} kcal from macros` : undefined}>
            <NumberInput min={0} value={draft.calories} onChange={(v) => setDraft({ ...draft, calories: v })} />
          </Field>
          <Field label="Protein (g)"><NumberInput min={0} step="0.1" value={draft.protein} onChange={(v) => setDraft({ ...draft, protein: v })} /></Field>
          <Field label="Carbs (g)"><NumberInput min={0} step="0.1" value={draft.carbs} onChange={(v) => setDraft({ ...draft, carbs: v })} /></Field>
          <Field label="Fat (g)"><NumberInput min={0} step="0.1" value={draft.fat} onChange={(v) => setDraft({ ...draft, fat: v })} /></Field>
          <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className="col-span-2 flex items-center gap-1 justify-self-start text-[13px] text-accent">
            <ChevronDown className={cx("size-4 transition", more && "rotate-180")} /> Fiber, sugar &amp; sodium (optional)
          </button>
          {more && (
            <>
              <Field label="Fiber (g)"><NumberInput min={0} step="0.1" value={draft.fiber} onChange={(v) => setDraft({ ...draft, fiber: v })} /></Field>
              <Field label="Sugar (g)"><NumberInput min={0} step="0.1" value={draft.sugar} onChange={(v) => setDraft({ ...draft, sugar: v })} /></Field>
              <Field label="Sodium (mg)"><NumberInput min={0} step="1" value={draft.sodium} onChange={(v) => setDraft({ ...draft, sodium: v })} /></Field>
            </>
          )}
          {error && <p role="alert" className="col-span-2 text-sm text-danger">{error}</p>}
        </form>
        <div className="mt-4"><Unavailable label="Scan a barcode" note="Food database lookup isn't connected yet. Use Scan food for photos of meals." /></div>
      </Modal>

      <ScanFoodSheet open={scanOpen} onClose={() => setScanOpen(false)} date={date} onManual={(meal) => open(meal)} />
    </>
  );
}

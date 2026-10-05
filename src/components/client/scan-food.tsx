"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, ChevronDown, ImagePlus, Info, Minus, PencilLine, Plus, RotateCcw, Sparkles, Trash2, WifiOff } from "lucide-react";
import { useSession } from "@/lib/app-context";
import { blobToDataUrl, compressImage } from "@/lib/image";
import { ScanError, scaleItem, sumItems, type FoodScanResult, type ScanQuestion, type ScannedItem } from "@/lib/food-scan";
import type { MealSlot } from "@/lib/types";
import { Badge, Button, cx, Field, IconButton, Input, Modal, NumberInput, Segmented, Skeleton, useToast } from "@/components/ui";

const MEALS: { value: MealSlot; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snacks", label: "Snacks" },
];

type Phase = "pick" | "analyzing" | "review" | "error" | "notfood";

interface Row {
  key: string;
  item: ScannedItem;
  /** Values the scaling is based on (the AI estimate, or the client's own edit). */
  base: ScannedItem;
  open: boolean;
}

const newKey = () => Math.random().toString(36).slice(2);
const r1 = (n: number) => Math.round(n * 10) / 10;

function mealFromClock(): MealSlot {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snacks";
}

export function ScanFoodSheet({ open, onClose, date, initialMeal, onManual }: {
  open: boolean;
  onClose: () => void;
  date: string;
  initialMeal?: MealSlot;
  onManual: (meal: MealSlot) => void;
}) {
  const { session, repo } = useSession();
  const toast = useToast();
  const demo = !repo.canScanFood;
  const [phase, setPhase] = useState<Phase>("pick");
  const [meal, setMeal] = useState<MealSlot>(initialMeal ?? mealFromClock());
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<{ b64: string; preview: string } | null>(null);
  const [mealName, setMealName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [questions, setQuestions] = useState<ScanQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [aiNote, setAiNote] = useState("");
  const [error, setError] = useState<{ message: string; code: ScanError["code"] } | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  // Fresh state every time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setPhase("pick");
    setMeal(initialMeal ?? mealFromClock());
    setNote("");
    setPhoto(null);
    setRows([]);
    setQuestions([]);
    setAnswers({});
    setError(null);
    setAiNote("");
  }, [open, initialMeal]);

  const applyResult = (res: FoodScanResult) => {
    if (!res.is_food || !res.items.length) {
      setPhase("notfood");
      return;
    }
    setMealName(res.meal_name);
    setRows(res.items.map((i) => ({ key: newKey(), item: i, base: i, open: false })));
    setQuestions(res.questions ?? []);
    setAnswers({});
    setAiNote(res.note ?? "");
    setPhase("review");
  };

  const analyze = async (img: { b64: string }, extra?: { answers: { question: string; answer: string }[] }) => {
    setPhase("analyzing");
    setError(null);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError({ message: "You're offline. Connect to the internet and try again, or add the food manually.", code: "upstream" });
      setPhase("error");
      return;
    }
    try {
      const res = await repo.analyzeFood({
        image: img.b64,
        media_type: "image/jpeg",
        note: note.trim() || undefined,
        answers: extra?.answers,
        previous: extra ? rows.map((r) => ({ name: r.item.name, portion: r.item.portion })) : undefined,
      });
      applyResult(res);
    } catch (e) {
      const err = e instanceof ScanError ? e : new ScanError((e as Error).message || "Something went wrong.");
      setError({ message: err.message, code: err.code });
      setPhase("error");
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await compressImage(file, 1280, 0.85);
      const dataUrl = await blobToDataUrl(blob);
      const img = { b64: dataUrl.split(",")[1], preview: dataUrl };
      setPhoto(img);
      analyze(img);
    } catch (e) {
      setError({ message: (e as Error).message, code: "unknown" });
      setPhase("error");
    }
  };

  const updateRow = (key: string, fn: (r: Row) => Row) => setRows((rs) => rs.map((r) => (r.key === key ? fn(r) : r)));
  const setGrams = (key: string, grams: number) =>
    updateRow(key, (r) => {
      const g = Math.max(0, grams);
      // The AI's portion text ("1 cup (180 g)") no longer applies once the weight changes.
      const portion = g === r.base.grams ? r.base.portion : `${Math.round(g)} g`;
      return { ...r, item: { ...scaleItem(r.item, r.base, g), portion } };
    });
  const setNutrient = (key: string, field: keyof ScannedItem, value: number) =>
    updateRow(key, (r) => {
      const item = { ...r.item, [field]: Math.max(0, value) };
      return { ...r, item, base: item }; // future portion changes scale from the client's numbers
    });

  const active = rows;
  const total = useMemo(() => sumItems(active.map((r) => r.item)), [active]);
  const unanswered = questions.filter((q) => !answers[q.id]?.trim()).length;

  const save = async () => {
    const valid = rows.filter((r) => r.item.name.trim());
    if (!valid.length) return toast.error("Add at least one food before saving.");
    setSaving(true);
    const group = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined;
    let saved = 0;
    try {
      for (const r of valid) {
        const i = r.item;
        await repo.insert("food_entries", {
          client_id: session.clientId!, date, meal, name: i.name.trim(), calories: Math.round(i.calories),
          protein: r1(i.protein), carbs: r1(i.carbs), fat: r1(i.fat), fiber: r1(i.fiber), sugar: r1(i.sugar), sodium: Math.round(i.sodium),
          portion: i.portion?.trim() ? `${i.portion.trim()}` : `${Math.round(i.grams)} g`,
          source: "scan", estimated: true, meal_group: group ?? null,
        });
        saved++;
      }
      toast.success(`${mealName || "Meal"} saved · ${Math.round(total.calories).toLocaleString()} kcal added`);
      onClose();
    } catch (e) {
      toast.error(saved ? `Saved ${saved} of ${valid.length} foods. ${(e as Error).message}` : e);
      if (saved) setRows((rs) => rs.filter((r) => !valid.slice(0, saved).some((v) => v.key === r.key)));
    } finally {
      setSaving(false);
    }
  };

  const goManual = () => {
    onClose();
    onManual(meal);
  };

  const footer =
    phase === "review" ? (
      <div className="flex w-full items-center gap-2">
        <Button variant="ghost" onClick={() => { setPhoto(null); setPhase("pick"); }} icon={<RotateCcw className="size-4" />}>Rescan</Button>
        <Button variant="primary" className="flex-1" loading={saving} onClick={save}>
          Save to {MEALS.find((m) => m.value === meal)?.label.toLowerCase()} · {Math.round(total.calories).toLocaleString()} kcal
        </Button>
      </div>
    ) : undefined;

  return (
    <Modal open={open} onClose={onClose} title="Scan food" footer={footer}>
      {/* hidden inputs: camera on phones, file picker everywhere */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-hidden tabIndex={-1}
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={libraryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" className="sr-only" aria-hidden tabIndex={-1}
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />

      {phase === "pick" && (
        <div className="space-y-4">
          <Segmented className="w-full [&>button]:flex-1" value={meal} onChange={setMeal} options={MEALS} />
          {demo ? (
            <div className="rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm">
              <p className="flex items-center gap-2 font-medium text-warn"><Info className="size-4" /> Scanning is off in the demo</p>
              <p className="mt-1 text-muted">Food scanning sends your photo to an AI service, which needs a real account. You can still log food manually here.</p>
              <Button className="mt-3" onClick={goManual} icon={<PencilLine className="size-4" />}>Enter food manually</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => cameraRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 px-3 py-6 text-sm font-medium text-ink active:bg-accent/20">
                  <Camera className="size-7 text-accent" /> Take photo
                </button>
                <button type="button" onClick={() => libraryRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-6 text-sm font-medium text-ink active:bg-surface-3">
                  <ImagePlus className="size-7 text-muted" /> Upload photo
                </button>
              </div>
              <Field label="Anything the photo can't show? (optional)" hint="e.g. “cooked in 1 tbsp olive oil”, “ate half”, “oat milk latte”">
                <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
              </Field>
              <p className="text-xs text-faint">Tip: shoot from above in good light with the whole plate in frame. Your photo is only used to estimate this meal and isn&apos;t saved.</p>
            </>
          )}
        </div>
      )}

      {phase === "analyzing" && (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.preview} alt="Your meal" className="max-h-56 w-full rounded-xl object-cover opacity-80" />
          )}
          <p className="flex items-center gap-2 text-sm"><Sparkles className="size-4 animate-pulse text-accent" /> Identifying foods and estimating portions…</p>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <p className="text-xs text-faint">This usually takes 5–15 seconds.</p>
        </div>
      )}

      {phase === "error" && error && (
        <div className="space-y-4" role="alert">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.preview} alt="Your meal" className="max-h-40 w-full rounded-xl object-cover opacity-60" />
          )}
          <div className="flex gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm">
            {error.code === "upstream" && /offline/i.test(error.message) ? <WifiOff className="mt-0.5 size-4 shrink-0 text-danger" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />}
            <p>{error.message}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {photo && error.code !== "not_configured" && error.code !== "rate_limited" && error.code !== "unavailable" && (
              <Button variant="primary" className="flex-1" icon={<RotateCcw className="size-4" />} onClick={() => analyze(photo)}>Try again</Button>
            )}
            <Button className="flex-1" onClick={() => { setPhoto(null); setPhase("pick"); }} icon={<Camera className="size-4" />}>Use a different photo</Button>
            <Button className="flex-1" onClick={goManual} icon={<PencilLine className="size-4" />}>Enter manually</Button>
          </div>
        </div>
      )}

      {phase === "notfood" && (
        <div className="space-y-4">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.preview} alt="Your photo" className="max-h-40 w-full rounded-xl object-cover opacity-60" />
          )}
          <p className="text-sm">We couldn&apos;t find any food or drink in this photo. Try again with the whole plate in frame, or enter the food manually.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" className="flex-1" icon={<Camera className="size-4" />} onClick={() => { setPhoto(null); setPhase("pick"); }}>Try another photo</Button>
            <Button className="flex-1" icon={<PencilLine className="size-4" />} onClick={goManual}>Enter manually</Button>
          </div>
        </div>
      )}

      {phase === "review" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.preview} alt="Your meal" className="size-16 shrink-0 rounded-xl object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <Input aria-label="Meal name" value={mealName} onChange={(e) => setMealName(e.target.value)} className="h-9 font-medium" />
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone="warn"><Sparkles className="size-3" /> AI estimate</Badge>
                <span className="text-xs text-muted">Check portions before saving</span>
              </div>
            </div>
          </div>

          <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-muted">
            Photo estimates can be off by 20% or more, mostly from oils, sauces and portions that are hard to see. Adjust anything that looks wrong.
            {aiNote ? <span className="mt-1 block text-ink">{aiNote}</span> : null}
          </p>

          {questions.length > 0 && (
            <div className="rounded-2xl border border-info/30 bg-info/5 p-4">
              <p className="text-sm font-medium">A few details will make this more accurate</p>
              <div className="mt-3 space-y-4">
                {questions.map((q) => (
                  <fieldset key={q.id}>
                    <legend className="mb-2 text-[13px]">{q.question}</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map((o) => (
                        <button key={o} type="button" aria-pressed={answers[q.id] === o} onClick={() => setAnswers({ ...answers, [q.id]: answers[q.id] === o ? "" : o })}
                          className={cx("min-h-9 rounded-lg border px-3 text-[13px]", answers[q.id] === o ? "border-accent bg-accent text-accent-ink font-medium" : "border-line bg-surface-2 text-ink")}>
                          {o}
                        </button>
                      ))}
                    </div>
                    <Input className="mt-2 h-9 text-[13px]" placeholder="Or type your answer" aria-label={`Your answer: ${q.question}`}
                      value={q.options.includes(answers[q.id] ?? "") ? "" : answers[q.id] ?? ""}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                  </fieldset>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" disabled={unanswered === questions.length || !photo}
                  onClick={() => photo && analyze(photo, { answers: questions.filter((q) => answers[q.id]?.trim()).map((q) => ({ question: q.question, answer: answers[q.id].trim() })) })}>
                  Update estimate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setQuestions([])}>Skip, keep estimate</Button>
              </div>
              <p className="mt-2 text-[11px] text-faint">Updating re-checks the photo with your answers and replaces the list below.</p>
            </div>
          )}

          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li key={r.key} className="rounded-2xl border border-line bg-surface-2/60 p-3">
                <div className="flex items-start gap-2">
                  <Input aria-label="Food name" value={r.item.name} onChange={(e) => updateRow(r.key, (x) => ({ ...x, item: { ...x.item, name: e.target.value } }))} className="h-9 flex-1 font-medium" />
                  <IconButton label={`Remove ${r.item.name}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}><Trash2 className="size-4" /></IconButton>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" aria-label={`Less ${r.item.name}`} onClick={() => setGrams(r.key, Math.max(0, Math.round(r.item.grams * 0.75)))}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 active:bg-line"><Minus className="size-4" /></button>
                  <label className="flex flex-1 items-center gap-1.5 rounded-xl border border-line bg-surface px-3">
                    <input type="number" inputMode="decimal" min={0} aria-label={`${r.item.name} grams`} value={Math.round(r.item.grams)}
                      onChange={(e) => setGrams(r.key, Number(e.target.value) || 0)}
                      className="h-10 w-full bg-transparent text-center text-[15px] tnum focus:outline-none" />
                    <span className="text-xs text-muted">g</span>
                  </label>
                  <button type="button" aria-label={`More ${r.item.name}`} onClick={() => setGrams(r.key, Math.round((r.item.grams || 10) * 1.25))}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 active:bg-line"><Plus className="size-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="font-semibold tnum text-ink">{Math.round(r.item.calories)} kcal</span>
                  <span className="text-muted tnum">P {r1(r.item.protein)}g · C {r1(r.item.carbs)}g · F {r1(r.item.fat)}g</span>
                  {r.item.confidence === "low" && <Badge tone="warn">Unsure</Badge>}
                  {r.item.confidence === "medium" && <Badge>Likely</Badge>}
                </div>
                {(r.item.portion || r.item.assumption) && (
                  <p className="mt-1 text-[11.5px] text-faint">{[r.item.portion, r.item.assumption].filter(Boolean).join(" · ")}</p>
                )}
                <button type="button" onClick={() => updateRow(r.key, (x) => ({ ...x, open: !x.open }))} aria-expanded={r.open}
                  className="mt-2 flex items-center gap-1 text-xs text-accent">
                  <ChevronDown className={cx("size-3.5 transition", r.open && "rotate-180")} /> {r.open ? "Hide nutrition" : "Edit nutrition"}
                </button>
                {r.open && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {([["calories", "kcal"], ["protein", "Protein g"], ["carbs", "Carbs g"], ["fat", "Fat g"], ["fiber", "Fiber g"], ["sugar", "Sugar g"], ["sodium", "Sodium mg"]] as const).map(([k, label]) => (
                      <Field key={k} label={label}>
                        <NumberInput min={0} step="any" value={r.item[k] as number} onChange={(v) => setNutrient(r.key, k, v ?? 0)} className="h-9" />
                      </Field>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => setRows((rs) => [...rs, {
            key: newKey(), open: true,
            item: { name: "", portion: "", grams: 100, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, confidence: "high", assumption: "Added by you" },
            base: { name: "", portion: "", grams: 100, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, confidence: "high", assumption: "" },
          }])}>Add a food the scan missed</Button>

          <div className="rounded-2xl border border-line p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">Meal total <span className="text-xs font-normal text-muted">(estimated)</span></p>
              <p className="text-xl font-semibold tnum">{Math.round(total.calories).toLocaleString()} <span className="text-xs font-normal text-muted">kcal</span></p>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-y-2 text-center text-xs">
              {([["Protein", total.protein, "g"], ["Carbs", total.carbs, "g"], ["Fat", total.fat, "g"], ["Fiber", total.fiber, "g"], ["Sugar", total.sugar, "g"], ["Sodium", total.sodium, "mg"]] as const).map(([l, v, u]) => (
                <div key={l}><dt className="text-muted">{l}</dt><dd className="text-sm tnum">{u === "mg" ? Math.round(v).toLocaleString() : r1(v)}{u}</dd></div>
              ))}
            </dl>
          </div>
          <Segmented className="w-full [&>button]:flex-1" value={meal} onChange={setMeal} options={MEALS} />
        </div>
      )}
    </Modal>
  );
}

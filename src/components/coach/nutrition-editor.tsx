"use client";

import { Plus, Trash2 } from "lucide-react";
import type { MealSuggestion } from "@/lib/types";
import { Button, Field, IconButton, Input, NumberInput, Textarea } from "@/components/ui";

export interface NutritionDraft {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: MealSuggestion[];
  notes: string;
}

export const blankNutrition = (): NutritionDraft => ({
  name: "", calories: 2200, protein: 150, carbs: 240, fat: 70, notes: "",
  meals: ["Breakfast", "Lunch", "Dinner", "Snack"].map((name) => ({ id: Math.random().toString(36).slice(2), name, suggestion: "" })),
});

export function validateNutrition(d: NutritionDraft): string | null {
  if (!d.name.trim()) return "Give the plan a name.";
  if (!d.calories || d.calories < 800 || d.calories > 8000) return "Calories should be between 800 and 8,000.";
  if ([d.protein, d.carbs, d.fat].some((x) => x == null || x < 0)) return "Macros can't be negative.";
  return null;
}

export function NutritionEditor({ value, onChange }: { value: NutritionDraft; onChange: (v: NutritionDraft) => void }) {
  const set = (p: Partial<NutritionDraft>) => onChange({ ...value, ...p });
  const fromMacros = Math.round(value.protein * 4 + value.carbs * 4 + value.fat * 9);
  const diff = fromMacros - value.calories;
  const pct = (g: number, k: number) => (value.calories ? Math.round(((g * k) / value.calories) * 100) : 0);

  return (
    <div className="space-y-5">
      <Field label="Plan name">
        <Input required placeholder="e.g. Fat loss — 2,000 kcal" value={value.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Calories (kcal)">
          <NumberInput min={0} value={value.calories} onChange={(v) => set({ calories: v ?? 0 })} />
        </Field>
        <Field label={`Protein (g) · ${pct(value.protein, 4)}%`}>
          <NumberInput min={0} value={value.protein} onChange={(v) => set({ protein: v ?? 0 })} />
        </Field>
        <Field label={`Carbs (g) · ${pct(value.carbs, 4)}%`}>
          <NumberInput min={0} value={value.carbs} onChange={(v) => set({ carbs: v ?? 0 })} />
        </Field>
        <Field label={`Fat (g) · ${pct(value.fat, 9)}%`}>
          <NumberInput min={0} value={value.fat} onChange={(v) => set({ fat: v ?? 0 })} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-muted">Macros add up to <span className="text-ink tnum">{fromMacros.toLocaleString()}</span> kcal</span>
        {Math.abs(diff) > 50 ? (
          <>
            <span className="text-warn">({diff > 0 ? "+" : ""}{diff} vs target)</span>
            <Button size="sm" variant="ghost" onClick={() => set({ calories: fromMacros })}>Use {fromMacros.toLocaleString()} kcal</Button>
          </>
        ) : <span className="text-accent">· matches target</span>}
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-muted">Meal suggestions</p>
        <div className="space-y-2">
          {value.meals.map((m, i) => (
            <div key={m.id} className="flex gap-2">
              <Input aria-label="Meal name" value={m.name} onChange={(e) => set({ meals: value.meals.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} className="w-32 shrink-0" />
              <Input aria-label={`${m.name} suggestion`} placeholder="e.g. Greek yogurt, berries, 30 g whey" value={m.suggestion} onChange={(e) => set({ meals: value.meals.map((x, k) => (k === i ? { ...x, suggestion: e.target.value } : x)) })} />
              <IconButton label="Remove meal" onClick={() => set({ meals: value.meals.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></IconButton>
            </div>
          ))}
        </div>
        <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="size-4" />} onClick={() => set({ meals: [...value.meals, { id: Math.random().toString(36).slice(2), name: "Meal", suggestion: "" }] })}>Add meal</Button>
      </div>

      <Field label="Notes for the client">
        <Textarea placeholder="Guidelines, swaps, hydration…" value={value.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
    </div>
  );
}

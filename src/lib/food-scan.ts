// Shared types for AI food scanning (server: supabase/functions/analyze-food).

export interface ScannedItem {
  name: string;
  portion: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number; // mg
  confidence: "low" | "medium" | "high";
  assumption: string;
}

export interface ScanQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface FoodScanResult {
  is_food: boolean;
  meal_name: string;
  items: ScannedItem[];
  questions: ScanQuestion[];
  note: string;
}

export interface FoodScanRequest {
  image: string; // base64, no data: prefix
  media_type: "image/jpeg" | "image/png" | "image/webp";
  note?: string;
  answers?: { question: string; answer: string }[];
  previous?: { name: string; portion: string }[];
}

export class ScanError extends Error {
  constructor(message: string, readonly code: "not_configured" | "rate_limited" | "upstream" | "unauthorized" | "not_client" | "unavailable" | "unknown" = "unknown") {
    super(message);
    this.name = "ScanError";
  }
}

/** Nutrients scale linearly with the portion weight the client confirms. */
export function scaleItem(item: ScannedItem, base: ScannedItem, grams: number): ScannedItem {
  const f = base.grams > 0 ? grams / base.grams : 1;
  const r1 = (n: number) => Math.round(n * f * 10) / 10;
  return {
    ...item,
    grams,
    calories: Math.round(base.calories * f),
    protein: r1(base.protein),
    carbs: r1(base.carbs),
    fat: r1(base.fat),
    fiber: r1(base.fiber),
    sugar: r1(base.sugar),
    sodium: Math.round(base.sodium * f),
  };
}

export function sumItems(items: Pick<ScannedItem, "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "sodium">[]) {
  return items.reduce(
    (a, i) => ({
      calories: a.calories + i.calories, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat,
      fiber: a.fiber + i.fiber, sugar: a.sugar + i.sugar, sodium: a.sodium + i.sodium,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  );
}

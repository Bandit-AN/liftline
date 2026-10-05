// Food photo → estimated nutrition, using Claude's vision model.
// The Anthropic API key lives only in this function's environment
// (Supabase secret ANTHROPIC_API_KEY) and is never sent to the browser.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODEL = Deno.env.get("FOOD_VISION_MODEL") ?? "claude-sonnet-5-5";
const DAILY_LIMIT = Number(Deno.env.get("FOOD_SCANS_PER_DAY") ?? "40");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const SYSTEM = `You are a registered-dietitian-level nutrition estimator inside a fitness coaching app.
You look at a photo of a meal and estimate what is on the plate and its nutrition.

Rules:
- Identify each distinct food or drink separately (e.g. "white rice", "grilled chicken thigh", "avocado slices", "ranch dressing").
- Estimate each portion in grams (or ml for drinks, reported as grams) using visual cues: plate/bowl size, utensils, hands, packaging.
- Give nutrition for the estimated portion, not per 100 g. Base values on standard references (USDA FoodData Central style).
- Include cooking fats, oils, butter, sauces and dressings you can see or that are very likely for the dish, as their own items.
- Be honest about uncertainty. Set confidence to "low" when portion or identity is a guess.
- Ask clarifying questions (max 3) only when the answer would change calories by roughly 15% or more:
  hidden oil/butter, sauce or dressing type and amount, drink contents, portion size when no scale reference is visible,
  ingredients you cannot see (e.g. what is inside a burrito), whole vs. partially eaten. Give 2-4 short answer options each.
- If the user already answered questions, apply the answers and do not ask the same questions again.
- If the photo does not show food or drink, set is_food to false and return no items.
- Never invent brand names. Never give medical advice.`;

const TOOL = {
  name: "report_meal",
  description: "Report the foods identified in the photo with estimated portions and nutrition.",
  input_schema: {
    type: "object",
    properties: {
      is_food: { type: "boolean", description: "False if the image does not show food or drink." },
      meal_name: { type: "string", description: "Short name for the whole meal, e.g. 'Chicken burrito bowl'." },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            portion: { type: "string", description: "Human-friendly portion, e.g. '1 cup (160 g)'." },
            grams: { type: "number", description: "Estimated weight in grams." },
            calories: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
            fiber_g: { type: "number" },
            sugar_g: { type: "number" },
            sodium_mg: { type: "number" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            assumption: { type: "string", description: "One short line on what was assumed (cooking method, oil, etc.). Empty if none." },
          },
          required: ["name", "portion", "grams", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "sodium_mg", "confidence"],
        },
      },
      questions: {
        type: "array",
        description: "Clarifying questions, only when they would materially change the estimate. Max 3.",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
          },
          required: ["id", "question", "options"],
        },
      },
      note: { type: "string", description: "Optional one-line note for the user." },
    },
    required: ["is_food", "meal_name", "items", "questions"],
  },
};

const num = (v: unknown, max: number) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, Math.round(n * 10) / 10);
};
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  // 1. Who is calling? Must be a signed-in client linked to a coach.
  const authHeader = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: auth } = await asUser.auth.getUser();
  if (!auth?.user) return reply(401, { error: "Please sign in again.", code: "unauthorized" });

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: client } = await admin.from("clients").select("id, status").eq("user_id", auth.user.id).maybeSingle();
  if (!client) return reply(403, { error: "Food scanning is available to coached clients.", code: "not_client" });

  // 2. Configuration and fair-use limit.
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return reply(503, { error: "Food scanning isn't switched on yet. Your coach's app needs an AI key configured. You can still add food manually.", code: "not_configured" });
  }
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin.from("food_scans").select("id", { count: "exact", head: true }).eq("client_id", client.id).gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return reply(429, { error: `You've reached today's limit of ${DAILY_LIMIT} scans. Add food manually or try again tomorrow.`, code: "rate_limited" });
  }

  // 3. Validate input.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "Invalid request." });
  }
  const image = typeof body.image === "string" ? body.image.replace(/^data:[^,]+,/, "") : "";
  const mediaType = String(body.media_type ?? "image/jpeg");
  if (!image) return reply(400, { error: "No photo received. Try again." });
  if (!TYPES.has(mediaType)) return reply(400, { error: "Use a JPEG, PNG or WebP photo." });
  if (image.length * 0.75 > MAX_IMAGE_BYTES) return reply(413, { error: "That photo is too large. Try a smaller one." });

  const note = str(body.note, 300);
  const answers = Array.isArray(body.answers) ? body.answers.slice(0, 5).map((a) => ({ question: str(a?.question, 200), answer: str(a?.answer, 200) })).filter((a) => a.question && a.answer) : [];
  const previous = Array.isArray(body.previous) ? body.previous.slice(0, 20).map((i) => ({ name: str(i?.name, 80), portion: str(i?.portion, 80) })) : [];

  let text = "Identify the foods in this photo and estimate portions and nutrition. Call report_meal.";
  if (note) text += `\nThe client added this note: "${note}"`;
  if (previous.length) text += `\nYour previous identification was: ${previous.map((p) => `${p.name} (${p.portion})`).join("; ")}.`;
  if (answers.length) {
    text += `\nThe client answered your questions:\n${answers.map((a) => `- ${a.question} → ${a.answer}`).join("\n")}\nUpdate the items using these answers. Only ask a new question if something important is still unclear.`;
  }

  // 4. Ask the model.
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "report_meal" },
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text },
          ],
        }],
      }),
    });
  } catch (e) {
    await admin.from("food_scans").insert({ client_id: client.id, user_id: auth.user.id, ok: false, error: `network: ${e}` });
    return reply(502, { error: "Couldn't reach the food recognition service. Check your connection and try again.", code: "upstream" });
  }

  if (!res.ok) {
    const detail = await res.text();
    await admin.from("food_scans").insert({ client_id: client.id, user_id: auth.user.id, ok: false, error: `${res.status}: ${detail.slice(0, 300)}` });
    const busy = res.status === 429 || res.status === 529;
    const keyProblem = res.status === 401 || res.status === 403;
    return reply(keyProblem ? 503 : 502, {
      error: busy ? "The food recognition service is busy. Try again in a moment."
        : keyProblem ? "Food scanning is misconfigured (the AI key was rejected). You can still add food manually."
        : "Food recognition failed. Try again, or add food manually.",
      code: keyProblem ? "not_configured" : "upstream",
    });
  }

  const data = await res.json();
  const call = (data.content ?? []).find((c: { type: string; name?: string }) => c.type === "tool_use" && c.name === "report_meal");
  if (!call?.input) {
    await admin.from("food_scans").insert({ client_id: client.id, user_id: auth.user.id, ok: false, error: "no tool output" });
    return reply(502, { error: "The scan didn't return a result. Try again with a clearer photo.", code: "upstream" });
  }

  // 5. Sanitise before returning.
  const out = call.input as Record<string, unknown>;
  const items = (Array.isArray(out.items) ? out.items : []).slice(0, 20).map((i: Record<string, unknown>) => ({
    name: str(i.name, 80) || "Food",
    portion: str(i.portion, 80),
    grams: num(i.grams, 3000),
    calories: Math.round(num(i.calories, 5000)),
    protein: num(i.protein_g, 400),
    carbs: num(i.carbs_g, 800),
    fat: num(i.fat_g, 400),
    fiber: num(i.fiber_g, 200),
    sugar: num(i.sugar_g, 400),
    sodium: Math.round(num(i.sodium_mg, 20000)),
    confidence: ["low", "medium", "high"].includes(String(i.confidence)) ? i.confidence : "low",
    assumption: str(i.assumption, 160),
  }));
  const questions = (Array.isArray(out.questions) ? out.questions : []).slice(0, 3).map((q: Record<string, unknown>, n: number) => ({
    id: str(q.id, 40) || `q${n + 1}`,
    question: str(q.question, 200),
    options: (Array.isArray(q.options) ? q.options : []).slice(0, 4).map((o) => str(o, 60)).filter(Boolean),
  })).filter((q) => q.question);

  await admin.from("food_scans").insert({ client_id: client.id, user_id: auth.user.id, ok: true, item_count: items.length });

  return reply(200, {
    is_food: out.is_food !== false && items.length > 0,
    meal_name: str(out.meal_name, 80),
    items,
    questions,
    note: str(out.note, 200),
    model: MODEL,
  });
});

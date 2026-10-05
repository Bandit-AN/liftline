// Realistic sample data for demo mode, generated relative to today so the
// dashboards always look current. Deterministic (seeded PRNG).
import type { DemoDB } from "./demo-repo";
import type {
  BodyMetric, CheckIn, Client, FoodEntry, Habit, HabitLog, LoggedExercise, MealSlot, Message,
  NutritionPlan, NutritionTemplate, PlanExercise, Profile, ProgressPhoto, WorkoutDay, WorkoutLog, WorkoutPlan,
  WorkoutTemplate,
} from "./types";
import { addDays, parseDate, today, weekday, weekStart } from "./dates";
import { builtinByName } from "./exercise-library";

let seed = 42;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
let counter = 0;
const id = (p: string) => `${p}-${(++counter).toString(36)}-${Math.floor(rand() * 1e6).toString(36)}`;
const at = (date: string, hour = 9, min = 0) => {
  const d = parseDate(date);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};
const round1 = (n: number) => Math.round(n * 10) / 10;

export const DEMO_COACH_MAYA = "demo-coach-maya";
export const DEMO_COACH_DEV = "demo-coach-dev";

function ex(name: string, sets: number, reps: string, rest_sec: number, notes = ""): PlanExercise {
  const demo = builtinByName(name);
  return { id: id("ex"), name, sets, reps, rest_sec, notes, demo_id: demo ? `b:${demo.key}` : null, equipment: demo?.equipment ?? "" };
}

function upperLower(): WorkoutDay[] {
  return [
    { id: id("day"), name: "Upper A", weekdays: [1], exercises: [
      ex("Barbell Bench Press", 4, "6-8", 150, "2 sec lowering, pause on chest."),
      ex("Chest-Supported Dumbbell Row", 4, "8-10", 120, "Drive elbows to hips."),
      ex("Seated Dumbbell Press", 3, "8-10", 90),
      ex("Lat Pulldown", 3, "10-12", 90),
      ex("Seated Cable Lateral Raise", 3, "12-15", 60, "Light and controlled."),
    ] },
    { id: id("day"), name: "Lower A", weekdays: [2], exercises: [
      ex("Back Squat", 4, "5-6", 180, "Leave 1-2 reps in the tank."),
      ex("Romanian Deadlift", 3, "8", 150),
      ex("Walking Lunge", 3, "10 / leg", 90),
      ex("Lying Leg Curl", 3, "12", 60),
      ex("Standing Calf Raise", 4, "12-15", 60),
    ] },
    { id: id("day"), name: "Upper B", weekdays: [4], exercises: [
      ex("Weighted Pull-Up", 4, "5-7", 150),
      ex("Incline Dumbbell Press", 4, "8-10", 120),
      ex("Single-Arm Cable Row", 3, "10-12", 90),
      ex("Dips", 3, "AMRAP", 90, "Stop 1 rep before failure."),
      ex("Hammer Curl", 3, "10-12", 60),
    ] },
    { id: id("day"), name: "Lower B", weekdays: [5], exercises: [
      ex("Trap Bar Deadlift", 4, "5", 180),
      ex("Bulgarian Split Squat", 3, "8 / leg", 120),
      ex("Hip Thrust", 3, "10", 90),
      ex("Leg Extension", 3, "12-15", 60),
      ex("Plank", 3, "45 s", 45),
    ] },
  ];
}

function fullBody(): WorkoutDay[] {
  return [
    { id: id("day"), name: "Full Body A", weekdays: [1], exercises: [
      ex("Back Squat", 3, "5", 180), ex("Barbell Bench Press", 3, "5", 150), ex("Chest-Supported Dumbbell Row", 3, "8-10", 90), ex("Plank", 3, "40 s", 45),
    ] },
    { id: id("day"), name: "Full Body B", weekdays: [3], exercises: [
      ex("Conventional Deadlift", 3, "4", 180, "Brace hard; reset each rep."), ex("Overhead Press", 3, "6", 120), ex("Lat Pulldown", 3, "10", 90), ex("Goblet Squat", 2, "12", 60),
    ] },
    { id: id("day"), name: "Full Body C", weekdays: [5], exercises: [
      ex("Front Squat", 3, "6", 150), ex("Incline Dumbbell Press", 3, "8-10", 90), ex("Single-Arm Cable Row", 3, "10", 90), ex("Hip Thrust", 3, "10", 90),
    ] },
  ];
}

function ppl(): WorkoutDay[] {
  return [
    { id: id("day"), name: "Push", weekdays: [1, 4], exercises: [
      ex("Barbell Bench Press", 4, "6-8", 150), ex("Seated Dumbbell Press", 3, "8-10", 90), ex("Incline Dumbbell Press", 3, "10-12", 90), ex("Seated Cable Lateral Raise", 3, "15", 60), ex("Rope Triceps Pushdown", 3, "12", 60),
    ] },
    { id: id("day"), name: "Pull", weekdays: [2, 5], exercises: [
      ex("Weighted Pull-Up", 4, "6-8", 150), ex("Chest-Supported Dumbbell Row", 3, "8-10", 90), ex("Face Pull", 3, "15", 60), ex("Hammer Curl", 3, "10-12", 60),
    ] },
    { id: id("day"), name: "Legs", weekdays: [3, 6], exercises: [
      ex("Back Squat", 4, "6-8", 180), ex("Romanian Deadlift", 3, "8-10", 150), ex("Leg Extension", 3, "12-15", 60), ex("Lying Leg Curl", 3, "12-15", 60), ex("Standing Calf Raise", 4, "15", 60),
    ] },
  ];
}

const BASE_WEIGHT: Record<string, number> = {
  "Barbell Bench Press": 80, "Chest-Supported Dumbbell Row": 32, "Seated Dumbbell Press": 24, "Lat Pulldown": 65,
  "Seated Cable Lateral Raise": 7.5, "Back Squat": 100, "Romanian Deadlift": 90, "Walking Lunge": 20, "Lying Leg Curl": 45,
  "Standing Calf Raise": 80, "Weighted Pull-Up": 10, "Incline Dumbbell Press": 28, "Single-Arm Cable Row": 30,
  "Dips": 0, "Hammer Curl": 16, "Trap Bar Deadlift": 140, "Bulgarian Split Squat": 18, "Hip Thrust": 100,
  "Leg Extension": 50, "Plank": 0, "Conventional Deadlift": 110, "Overhead Press": 40, "Goblet Squat": 24,
  "Front Squat": 65, "Rope Triceps Pushdown": 25, "Face Pull": 20,
};

function meals(kind: "cut" | "gain" | "maintain") {
  const base = {
    cut: ["Greek yogurt, berries, 30 g whey", "Chicken, rice and roasted veg bowl", "Salmon, potatoes, green salad", "Apple + 2 string cheese"],
    gain: ["Oats with milk, banana, peanut butter, whey", "Steak burrito bowl with extra rice", "Pasta with lean beef ragu", "Bagel with eggs; trail mix"],
    maintain: ["Eggs on sourdough with avocado", "Turkey wrap and fruit", "Stir-fry with tofu or chicken and noodles", "Cottage cheese and pineapple"],
  }[kind];
  return ["Breakfast", "Lunch", "Dinner", "Snack"].map((name, i) => ({ id: id("meal"), name, suggestion: base[i] }));
}

interface ClientSpec {
  name: string; email: string; goal: string; coach: string; userId: string | null; status: Client["status"];
  program: () => WorkoutDay[]; programName: string; nutrition: "cut" | "gain" | "maintain";
  kcal: number; p: number; c: number; f: number; startWeight: number; weeklyChange: number;
  target: number | null; height: number; adherence: number; inactiveDays: number; checkInDay: number;
  latestCheckIn: "pending" | "reviewed" | "missing"; preferences: string;
}

export function buildSeed(): DemoDB {
  seed = 42;
  counter = 0;
  const T = today();
  const db: DemoDB = {
    profiles: [], clients: [], invites: [], workout_templates: [], workout_plans: [], nutrition_templates: [],
    nutrition_plans: [], workout_logs: [], food_entries: [], body_metrics: [], progress_photos: [], habits: [],
    habit_logs: [], check_ins: [], messages: [], coach_notes: [], notifications: [], groups: [], group_members: [],
    group_posts: [], food_scans: [], exercise_demos: [],
  };

  const profile = (p: Omit<Profile, "created_at">): Profile => {
    const full = { ...p, created_at: at(addDays(T, -120)) };
    db.profiles.push(full);
    return full;
  };
  profile({ id: DEMO_COACH_MAYA, role: "coach", full_name: "Maya Reyes", email: "maya@demo.liftline.app", business_name: "Reyes Performance" });
  profile({ id: DEMO_COACH_DEV, role: "coach", full_name: "Dev Patel", email: "dev@demo.liftline.app", business_name: "Patel Strength Co." });

  // Templates for both coaches
  const templatesFor = (coach: string) => {
    const t = (name: string, description: string, days: WorkoutDay[]): WorkoutTemplate => {
      const tpl = { id: id("wt"), coach_id: coach, name, description, days, created_at: at(addDays(T, -90)), updated_at: at(addDays(T, -30)) };
      db.workout_templates.push(tpl);
      return tpl;
    };
    t("Upper / Lower — 4 day", "Balanced strength + hypertrophy split for intermediates.", upperLower());
    t("Full Body Foundations — 3 day", "Big lifts three times a week. Great for beginners or busy schedules.", fullBody());
    t("Hypertrophy PPL — 6 day", "High-volume push/pull/legs for experienced lifters.", ppl());
    const n = (name: string, kind: "cut" | "gain" | "maintain", calories: number, protein: number, carbs: number, fat: number, notes: string) => {
      const tpl: NutritionTemplate = { id: id("nt"), coach_id: coach, name, calories, protein, carbs, fat, meals: meals(kind), notes, created_at: at(addDays(T, -90)), updated_at: at(addDays(T, -30)) };
      db.nutrition_templates.push(tpl);
    };
    n("Fat loss — 2,000 kcal", "cut", 2000, 170, 190, 62, "Protein first at every meal. 2 refeed meals per week allowed.");
    n("Lean gain — 2,900 kcal", "gain", 2900, 165, 380, 80, "Aim for +0.25 kg/week. Carbs around training.");
    n("Maintenance — 2,300 kcal", "maintain", 2300, 140, 260, 75, "Focus on consistency and fibre (30 g+).");
  };
  templatesFor(DEMO_COACH_MAYA);
  templatesFor(DEMO_COACH_DEV);

  const specs: ClientSpec[] = [
    { name: "Jordan Ellis", email: "jordan@demo.liftline.app", goal: "Lose 6 kg while keeping strength", coach: DEMO_COACH_MAYA, userId: "demo-user-jordan", status: "active",
      program: upperLower, programName: "Upper / Lower — Phase 2", nutrition: "cut", kcal: 2000, p: 170, c: 190, f: 62,
      startWeight: 86.2, weeklyChange: -0.5, target: 80, height: 180, adherence: 0.9, inactiveDays: 0, checkInDay: 0, latestCheckIn: "pending",
      preferences: "Trains at 6am before work. Dislikes fish. Has adjustable dumbbells at home." },
    { name: "Priya Nair", email: "priya@demo.liftline.app", goal: "Deadlift 140 kg by spring", coach: DEMO_COACH_MAYA, userId: "demo-user-priya", status: "active",
      program: fullBody, programName: "Strength Block 3", nutrition: "maintain", kcal: 2200, p: 135, c: 250, f: 70,
      startWeight: 63.4, weeklyChange: 0.02, target: null, height: 166, adherence: 0.95, inactiveDays: 0, checkInDay: 5, latestCheckIn: "reviewed",
      preferences: "Vegetarian. Competes in local powerlifting meets." },
    { name: "Marcus Chen", email: "marcus@demo.liftline.app", goal: "Gain 4 kg of lean mass", coach: DEMO_COACH_MAYA, userId: "demo-user-marcus", status: "active",
      program: ppl, programName: "Hypertrophy PPL", nutrition: "gain", kcal: 2900, p: 165, c: 380, f: 80,
      startWeight: 70.1, weeklyChange: 0.25, target: 74, height: 178, adherence: 0.6, inactiveDays: 6, checkInDay: 0, latestCheckIn: "missing",
      preferences: "Night shifts every other week; struggles with appetite." },
    { name: "Sofia Alvarez", email: "sofia@demo.liftline.app", goal: "Half marathon in March + stay strong", coach: DEMO_COACH_MAYA, userId: "demo-user-sofia", status: "active",
      program: fullBody, programName: "Run-Support Strength", nutrition: "maintain", kcal: 2300, p: 130, c: 290, f: 70,
      startWeight: 61.0, weeklyChange: -0.1, target: 59.5, height: 168, adherence: 0.85, inactiveDays: 1, checkInDay: 1, latestCheckIn: "pending",
      preferences: "Runs Tue/Thu/Sat. Prefers short sessions (45 min)." },
    { name: "Aisha Bello", email: "aisha@demo.liftline.app", goal: "Build a consistent gym habit", coach: DEMO_COACH_DEV, userId: "demo-user-aisha", status: "active",
      program: fullBody, programName: "Foundations", nutrition: "maintain", kcal: 2100, p: 120, c: 240, f: 68,
      startWeight: 72.0, weeklyChange: -0.2, target: 68, height: 170, adherence: 0.8, inactiveDays: 0, checkInDay: 0, latestCheckIn: "pending",
      preferences: "New to lifting. Prefers machines while learning." },
    { name: "Tom Becker", email: "tom@demo.liftline.app", goal: "Bench 120 kg", coach: DEMO_COACH_DEV, userId: "demo-user-tom", status: "active",
      program: upperLower, programName: "Bench Specialisation", nutrition: "gain", kcal: 3100, p: 180, c: 400, f: 90,
      startWeight: 92.0, weeklyChange: 0.15, target: null, height: 186, adherence: 0.88, inactiveDays: 2, checkInDay: 3, latestCheckIn: "reviewed",
      preferences: "Shoulder irritation on deep flys — avoid." },
  ];

  const clientIds: Record<string, string> = {};

  for (const s of specs) {
    const cid = id("cl");
    clientIds[s.name] = cid;
    const lastActive = addDays(T, -s.inactiveDays);
    if (s.userId) profile({ id: s.userId, role: "client", full_name: s.name, email: s.email, business_name: null });
    const client: Client = {
      id: cid, coach_id: s.coach, user_id: s.userId, full_name: s.name, email: s.email, goal: s.goal, status: s.status,
      check_in_day: s.checkInDay, start_weight: s.startWeight, target_weight: s.target, height_cm: s.height,
      preferences: s.preferences, notification_prefs: { messages: true, check_in_reminders: true, plan_updates: true },
      units: "kg", last_activity_at: at(lastActive, s.inactiveDays === 0 ? new Date().getHours() : 18, 12), created_at: at(addDays(T, -70)),
    };
    db.clients.push(client);

    const days = s.program();
    const plan: WorkoutPlan = { id: id("wp"), coach_id: s.coach, client_id: cid, name: s.programName, description: "Progress load when you hit the top of the rep range on all sets.", days, active: true, created_at: at(addDays(T, -42)), updated_at: at(addDays(T, -10)) };
    db.workout_plans.push(plan);
    const np: NutritionPlan = { id: id("np"), coach_id: s.coach, client_id: cid, name: `${s.kcal.toLocaleString()} kcal — ${s.nutrition === "cut" ? "fat loss" : s.nutrition === "gain" ? "lean gain" : "maintenance"}`, calories: s.kcal, protein: s.p, carbs: s.c, fat: s.f, meals: meals(s.nutrition), notes: "Hit protein daily; the rest can flex.", active: true, created_at: at(addDays(T, -42)), updated_at: at(addDays(T, -14)) };
    db.nutrition_plans.push(np);

    // Body weight: every 2-3 days for 10 weeks
    const metrics: BodyMetric[] = [];
    for (let d = -70; d <= -s.inactiveDays; d += rand() < 0.5 ? 2 : 3) {
      const date = addDays(T, d);
      const progress = (70 + d) / 7;
      const w = s.startWeight + s.weeklyChange * progress + (rand() - 0.5) * 0.8;
      const m: BodyMetric = { id: id("bm"), client_id: cid, date, weight: round1(w), waist: null, chest: null, hips: null, arm: null, thigh: null, created_at: at(date, 7, 15) };
      if (Math.abs(d) % 14 < 3 && !metrics.some((x) => x.waist && Math.abs(parseDate(x.date).getTime() - parseDate(date).getTime()) < 10 * 864e5)) {
        const shrink = s.weeklyChange * progress * 0.9;
        m.waist = round1((s.height > 175 ? 88 : 72) + shrink + (rand() - 0.5));
        m.chest = round1((s.height > 175 ? 104 : 90) + (s.weeklyChange > 0 ? progress * 0.3 : shrink * 0.3));
        m.hips = round1((s.height > 175 ? 100 : 96) + shrink * 0.5);
        m.arm = round1((s.height > 175 ? 36 : 29) + (s.weeklyChange > 0 ? progress * 0.15 : 0));
        m.thigh = round1((s.height > 175 ? 59 : 55) + shrink * 0.3);
      }
      metrics.push(m);
    }
    db.body_metrics.push(...metrics);

    // Workout logs for the last 4 weeks on scheduled days
    const strengthScale = s.height > 175 ? 1 : 0.62;
    for (let d = -28; d <= -s.inactiveDays; d++) {
      const date = addDays(T, d);
      if (d === 0) continue; // leave today open for the user to log
      const day = days.find((x) => x.weekdays.includes(weekday(date)));
      if (!day || rand() > s.adherence) continue;
      const progress = 1 + ((28 + d) / 28) * 0.06;
      const entries: LoggedExercise[] = day.exercises.map((e) => {
        const reps = parseInt(e.reps, 10) || 10;
        const base = (BASE_WEIGHT[e.name] ?? 20) * strengthScale * progress;
        const w = base === 0 ? null : Math.round(base / 2.5) * 2.5;
        return {
          exercise_id: e.id, exercise_name: e.name,
          sets: Array.from({ length: e.sets }, (_, i) => ({ reps: Math.max(1, reps - (i === e.sets - 1 && rand() < 0.4 ? 1 : 0)), weight: w, done: true })),
        };
      });
      const notes = rand() < 0.2 ? ["Felt strong today.", "Lower back a bit tight — kept RDLs light.", "Gym was packed, swapped to dumbbells.", "New rep PR on the top set!"][Math.floor(rand() * 4)] : "";
      db.workout_logs.push({ id: id("wl"), client_id: cid, plan_id: plan.id, day_id: day.id, day_name: day.name, date, completed: true, notes, entries, created_at: at(date, 7, 30) } satisfies WorkoutLog);
    }

    // Food diary: last 6 days + this morning
    const FOODS: Record<MealSlot, [string, number, number, number, number][]> = {
      breakfast: [["Greek yogurt + berries + whey", 380, 42, 38, 6], ["3 eggs on sourdough", 450, 24, 34, 22], ["Overnight oats", 420, 28, 58, 10]],
      lunch: [["Chicken rice bowl", 640, 52, 72, 14], ["Turkey & avocado wrap", 560, 38, 46, 22], ["Tofu poke bowl", 590, 30, 76, 18]],
      dinner: [["Steak, potatoes, broccoli", 720, 55, 58, 26], ["Salmon, rice, greens", 680, 46, 62, 24], ["Lentil pasta + meat sauce", 650, 48, 70, 16]],
      snacks: [["Protein bar", 210, 20, 22, 7], ["Apple + peanut butter", 280, 7, 28, 16], ["Cottage cheese", 160, 24, 8, 3]],
    };
    for (let d = -6; d <= 0; d++) {
      if (d > -s.inactiveDays && s.inactiveDays > 0) continue;
      const date = addDays(T, d);
      const slots: MealSlot[] = d === 0 ? ["breakfast"] : ["breakfast", "lunch", "dinner", "snacks"];
      for (const meal of slots) {
        const [name, cal, p, c, f] = FOODS[meal][Math.floor(rand() * 3)];
        const k = s.kcal / 2100;
        db.food_entries.push({ id: id("fe"), client_id: cid, date, meal, name, calories: Math.round(cal * k), protein: Math.round(p * Math.min(k, 1.2)), carbs: Math.round(c * k), fat: Math.round(f * k), fiber: null, sugar: null, sodium: null, portion: null, source: "manual", estimated: false, meal_group: null, created_at: at(date, meal === "breakfast" ? 8 : meal === "lunch" ? 13 : meal === "dinner" ? 19 : 16) } satisfies FoodEntry);
      }
    }

    // Habits
    const habits: Habit[] = [
      { id: id("hb"), coach_id: s.coach, client_id: cid, name: "Steps", target: 10000, unit: "steps", active: true, created_at: at(addDays(T, -42)) },
      { id: id("hb"), coach_id: s.coach, client_id: cid, name: "Water", target: 3, unit: "L", active: true, created_at: at(addDays(T, -42)) },
      { id: id("hb"), coach_id: s.coach, client_id: cid, name: "Sleep", target: 8, unit: "h", active: true, created_at: at(addDays(T, -42)) },
    ];
    if (s.nutrition === "cut") habits.push({ id: id("hb"), coach_id: s.coach, client_id: cid, name: "10-min evening walk", target: 1, unit: "done", active: true, created_at: at(addDays(T, -20)) });
    db.habits.push(...habits);
    for (let d = -14; d <= -Math.max(1, s.inactiveDays); d++) {
      const date = addDays(T, d);
      for (const h of habits) {
        if (rand() > s.adherence + 0.05) continue;
        const v = h.unit === "done" ? 1 : h.unit === "steps" ? Math.round((h.target * (0.7 + rand() * 0.5)) / 100) * 100 : round1(h.target * (0.75 + rand() * 0.35));
        db.habit_logs.push({ id: id("hl"), habit_id: h.id, client_id: cid, date, value: v, created_at: at(date, 21) } satisfies HabitLog);
      }
    }

    // Weekly check-ins
    const thisWeek = weekStart(T);
    for (let w = 6; w >= 0; w--) {
      const week = addDays(thisWeek, -7 * w);
      const submitDate = addDays(week, (s.checkInDay + 6) % 7);
      if (submitDate > T) continue;
      const latest = w === 0 || addDays(week, 7 + ((s.checkInDay + 6) % 7)) > T;
      if (latest && s.latestCheckIn === "missing") continue;
      if (s.latestCheckIn === "missing" && w === 1) continue;
      const weightAt = metrics.filter((m) => m.date <= submitDate).at(-1)?.weight ?? null;
      const pending = latest && s.latestCheckIn === "pending";
      const ci: CheckIn = {
        id: id("ci"), client_id: cid, coach_id: s.coach, week_of: week, weight: weightAt,
        progress_rating: 3 + Math.round(rand() * 2), energy: 3 + Math.round(rand() * 2) - (rand() < 0.2 ? 1 : 0),
        hunger: 2 + Math.round(rand() * 2), sleep_quality: 3 + Math.round(rand() * 2) - (rand() < 0.3 ? 1 : 0),
        sleep_hours: round1(6.5 + rand() * 1.5), adherence: Math.round(s.adherence * 100 - rand() * 10),
        wins: ["Hit all sessions and a squat PR.", "Stayed on plan through a work trip.", "Meal prepped Sunday — made the week easy.", "Hit protein 6/7 days."][Math.floor(rand() * 4)],
        challenges: ["Late-night snacking on Thursday.", "Sleep was rough midweek.", "Busy at work, cut one session short.", "Knee felt achy on lunges."][Math.floor(rand() * 4)],
        questions: pending ? (s.name.startsWith("Jordan") ? "Can we swap walking lunges for something knee-friendlier? Also, should I drop calories now that the scale has slowed?" : "Is it OK to move Friday's session to Saturday next week?") : "",
        status: pending ? "submitted" : "reviewed",
        coach_feedback: pending ? null : ["Great week — let's keep the momentum. Add 2.5 kg on squats next week.", "Solid adherence. Try a high-protein snack after dinner to curb the late cravings.", "Nice job handling the travel. Sleep is the lever this week — aim for lights out by 10:30.", "Swap lunges for step-ups for now; we'll reassess the knee in two weeks."][Math.floor(rand() * 4)],
        reviewed_at: pending ? null : at(addDays(submitDate, 1), 10),
        submitted_at: at(submitDate, 19, 30),
      };
      db.check_ins.push(ci);
    }

    // Photos (sample placeholders) for Jordan and Priya
    if (s.name.startsWith("Jordan") || s.name.startsWith("Priya")) {
      [-63, -35, -7].forEach((d, i) => {
        const date = addDays(T, d);
        (["front", "side"] as const).forEach((pose) => {
          db.progress_photos.push({ id: id("pp"), client_id: cid, date, pose, storage_path: `${cid}/sample-${s.name.startsWith("Jordan") ? i : 1}-${pose}.svg`, created_at: at(date, 7) } satisfies ProgressPhoto);
        });
      });
    }
  }

  // Pending invite (Maya → Liam)
  const liam: Client = {
    id: id("cl"), coach_id: DEMO_COACH_MAYA, user_id: null, full_name: "Liam O'Connor", email: "liam@demo.liftline.app",
    goal: "Get back in shape after an injury", status: "invited", check_in_day: 0, start_weight: null, target_weight: null,
    height_cm: null, preferences: "", notification_prefs: { messages: true, check_in_reminders: true, plan_updates: true },
    units: "kg", last_activity_at: null, created_at: at(addDays(T, -2)),
  };
  db.clients.push(liam);
  db.invites.push({ id: id("inv"), coach_id: DEMO_COACH_MAYA, client_id: liam.id, email: liam.email, token: "demo-liam-invite", accepted_at: null, expires_at: new Date(Date.now() + 12 * 864e5).toISOString(), created_at: at(addDays(T, -2)) });

  // Message threads
  const thread = (clientName: string, coach: string, userId: string, lines: [("coach" | "client"), string, number, number][], unreadFromClient = 0) => {
    const cid = clientIds[clientName];
    lines.forEach(([who, body, dayOffset, hour], i) => {
      const fromClient = who === "client";
      const isUnread = fromClient && i >= lines.length - unreadFromClient;
      db.messages.push({
        id: id("msg"), client_id: cid, sender_id: fromClient ? userId : coach, sender_role: who, body,
        read_at: isUnread ? null : at(addDays(T, dayOffset), hour + 1), created_at: at(addDays(T, dayOffset), hour, 10 + i),
      } satisfies Message);
    });
  };
  thread("Jordan Ellis", DEMO_COACH_MAYA, "demo-user-jordan", [
    ["coach", "Morning Jordan! Phase 2 is live — same split, slightly more volume on upper days.", -10, 8],
    ["client", "Looks good. Should I keep the 6am sessions or try lunchtime?", -10, 9],
    ["coach", "Stick with 6am if sleep is 7h+. Consistency beats the perfect time.", -10, 10],
    ["client", "Bench felt great today — 85 kg for 7 on the top set!", -3, 7],
    ["coach", "That's a rep PR. 🔥 Keep the 2-second lowering.", -3, 12],
    ["client", "Weekend was rough food-wise, two dinners out. Back on it today.", 0, 7],
    ["client", "Just submitted my check-in too.", 0, 7],
  ], 2);
  thread("Priya Nair", DEMO_COACH_MAYA, "demo-user-priya", [
    ["client", "Pulled 125 kg for a double today!", -4, 18],
    ["coach", "Huge. Let's plan an opener of 130 for the meet.", -4, 19],
    ["client", "Deal. Can you check my lockout video next week?", -2, 20],
    ["coach", "Of course — upload it here in the chat thread when video messages are available, or share a link for now.", -2, 21],
  ]);
  thread("Marcus Chen", DEMO_COACH_MAYA, "demo-user-marcus", [
    ["coach", "Hey Marcus, how did the night shifts go? Haven't seen logs since last week.", -2, 11],
  ]);
  thread("Sofia Alvarez", DEMO_COACH_MAYA, "demo-user-sofia", [
    ["client", "Long run was 16 km today, legs feel ok!", -1, 11],
    ["client", "Should I skip Friday lifting before my long run?", -1, 11],
  ], 2);
  thread("Aisha Bello", DEMO_COACH_DEV, "demo-user-aisha", [
    ["coach", "Welcome Aisha! Start with the Foundations plan — machines are perfect.", -14, 9],
    ["client", "Thank you! Day 1 done ✅", -13, 18],
  ], 1);

  // Coach notes
  db.coach_notes.push(
    { id: id("cn"), coach_id: DEMO_COACH_MAYA, client_id: clientIds["Jordan Ellis"], body: "Old left knee irritation (2023). Monitor lunges and deep knee flexion.", created_at: at(addDays(T, -60), 10) },
    { id: id("cn"), coach_id: DEMO_COACH_MAYA, client_id: clientIds["Jordan Ellis"], body: "Responds well to direct feedback. Prefers concise weekly targets.", created_at: at(addDays(T, -30), 10) },
    { id: id("cn"), coach_id: DEMO_COACH_MAYA, client_id: clientIds["Marcus Chen"], body: "Shift work weeks: reduce to 3 sessions and prioritise sleep.", created_at: at(addDays(T, -20), 10) },
  );

  // Community group
  const gid = id("grp");
  db.groups.push({ id: gid, coach_id: DEMO_COACH_MAYA, name: "12-Week Shred Crew", description: "Accountability group for this season's fat-loss cohort.", created_at: at(addDays(T, -40)) });
  for (const n of ["Jordan Ellis", "Sofia Alvarez", "Marcus Chen"]) {
    db.group_members.push({ id: id("gm"), group_id: gid, client_id: clientIds[n], created_at: at(addDays(T, -40)) });
  }
  db.group_posts.push(
    { id: id("gp"), group_id: gid, author_id: DEMO_COACH_MAYA, author_name: "Maya Reyes", author_role: "coach", body: "This week's challenge: 70,000 steps total. Post your Sunday screenshot (or just your number) here!", created_at: at(addDays(T, -3), 9) },
    { id: id("gp"), group_id: gid, author_id: "demo-user-sofia", author_name: "Sofia Alvarez", author_role: "client", body: "Long runs make this one easy 😅 82k so far.", created_at: at(addDays(T, -1), 19) },
    { id: id("gp"), group_id: gid, author_id: "demo-user-jordan", author_name: "Jordan Ellis", author_role: "client", body: "61k with a day to go. Evening walks are paying off.", created_at: at(addDays(T, -1), 21) },
  );

  // A few notifications
  const notif = (user_id: string, kind: Tables_Notification["kind"], title: string, body: string, link: string, offset: number, read: boolean) =>
    db.notifications.push({ id: id("nt"), user_id, kind, title, body, link, read_at: read ? at(addDays(T, offset), 12) : null, created_at: at(addDays(T, offset), 8) });
  const jordanCi = db.check_ins.filter((c) => c.client_id === clientIds["Jordan Ellis"]).at(-1);
  notif(DEMO_COACH_MAYA, "check_in", "Jordan Ellis submitted a check-in", "Week of this week", `/coach/check-ins?id=${jordanCi?.id ?? ""}`, 0, false);
  notif(DEMO_COACH_MAYA, "message", "Message from Sofia Alvarez", "Should I skip Friday lifting before my long run?", `/coach/messages?client=${clientIds["Sofia Alvarez"]}`, -1, false);
  notif(DEMO_COACH_MAYA, "system", "Liam O'Connor hasn't accepted yet", "Invite sent 2 days ago.", `/coach/clients/${liam.id}`, -1, true);
  notif("demo-user-jordan", "message", "New message from your coach", "That's a rep PR. 🔥 Keep the 2-second lowering.", "/app/messages", -3, true);
  notif("demo-user-jordan", "group", "New post in 12-Week Shred Crew", "This week's challenge: 70,000 steps total.", "/app/community", -3, false);

  return db;
}

type Tables_Notification = DemoDB["notifications"][number];

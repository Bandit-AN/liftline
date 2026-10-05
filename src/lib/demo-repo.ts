// Demo backend: a browser-local database with the same access rules as the
// Supabase RLS policies. Stored under its own localStorage keys, so demo data
// never mixes with real accounts.
import type { InviteInfo, Query, Repo } from "./repo";
import { emitTableChange, PermissionError } from "./repo";
import type {
  AppNotification, CheckIn, Client, Invite, Message, PhotoPose, Profile, ProgressPhoto, TableName, Tables,
} from "./types";
import { blobToDataUrl, compressImage } from "./image";
import { buildSeed } from "./demo-seed";
import { fmtDate } from "./dates";
import { storage } from "./storage";
import { ScanError, type FoodScanResult } from "./food-scan";

const DB_KEY = "liftline-demo-db-v1";
const PHOTO_KEY = "liftline-demo-photos-v1";
const USER_KEY = "liftline-demo-user";

export type DemoDB = { [K in TableName]: Tables[K][] };

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const now = () => new Date().toISOString();

// ─── storage ──────────────────────────────────────────────────

let cache: DemoDB | null = null;

export function loadDemoDb(): DemoDB {
  if (cache) return cache;
  try {
    const raw = storage.get(DB_KEY);
    if (raw) {
      cache = JSON.parse(raw) as DemoDB;
      // Older demo data: add tables/columns introduced later.
      cache.food_scans ??= [];
      cache.exercise_demos ??= [];
      for (const f of cache.food_entries) {
        f.fiber ??= null;
        f.sugar ??= null;
        f.sodium ??= null;
        f.portion ??= null;
        f.source ??= "manual";
        f.estimated ??= false;
        f.meal_group ??= null;
      }
      return cache;
    }
  } catch {
    /* corrupted — reseed */
  }
  cache = buildSeed();
  persist();
  return cache;
}

function persist() {
  if (!cache) return;
  try {
    storage.set(DB_KEY, JSON.stringify(cache));
  } catch {
    throw new Error("Demo storage is full. Reset the demo from the account menu to free space.");
  }
}

export function resetDemo() {
  storage.remove(DB_KEY);
  storage.remove(PHOTO_KEY);
  cache = null;
  loadDemoDb();
}

export function getDemoUser(): string | null {
  try {
    return storage.get(USER_KEY);
  } catch {
    return null;
  }
}
export function setDemoUser(id: string | null) {
  if (id) storage.set(USER_KEY, id);
  else storage.remove(USER_KEY);
}

function photoStore(): Record<string, string> {
  try {
    return JSON.parse(storage.get(PHOTO_KEY) ?? "{}");
  } catch {
    return {};
  }
}

// ─── defaults (mirror column defaults in SQL) ─────────────────

const DEFAULTS: Partial<{ [K in TableName]: () => Partial<Tables[K]> }> = {
  clients: () => ({
    user_id: null, goal: "", status: "invited", check_in_day: 0, start_weight: null, target_weight: null,
    height_cm: null, preferences: "", units: "kg", last_activity_at: null,
    notification_prefs: { messages: true, check_in_reminders: true, plan_updates: true },
  }),
  invites: () => ({
    token: Array.from({ length: 18 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join(""),
    accepted_at: null,
    expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
  }),
  workout_templates: () => ({ description: "", days: [], updated_at: now() }),
  workout_plans: () => ({ description: "", days: [], active: true, updated_at: now() }),
  nutrition_templates: () => ({ calories: 0, protein: 0, carbs: 0, fat: 0, meals: [], notes: "", updated_at: now() }),
  nutrition_plans: () => ({ calories: 0, protein: 0, carbs: 0, fat: 0, meals: [], notes: "", active: true, updated_at: now() }),
  workout_logs: () => ({ plan_id: null, day_id: null, day_name: "", completed: false, notes: "", entries: [] }),
  food_entries: () => ({
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: null, sugar: null, sodium: null, portion: null,
    source: "manual", estimated: false, meal_group: null,
  }),
  exercise_demos: () => ({ equipment: "", media_path: null, media_type: null, steps: [], breathing: "", mistakes: [], updated_at: now() }),
  body_metrics: () => ({ weight: null, waist: null, chest: null, hips: null, arm: null, thigh: null }),
  habits: () => ({ target: 1, unit: "", active: true }),
  habit_logs: () => ({ value: 0 }),
  check_ins: () => ({
    weight: null, sleep_hours: null, wins: "", challenges: "", questions: "",
    status: "submitted", coach_feedback: null, reviewed_at: null, submitted_at: now(),
  }),
  messages: () => ({ read_at: null }),
  notifications: () => ({ body: "", link: "", read_at: null }),
  groups: () => ({ description: "" }),
};

// ─── repo ─────────────────────────────────────────────────────

type Op = "insert" | "update" | "delete";

export class DemoRepo implements Repo {
  readonly mode = "demo" as const;
  constructor(private readonly me: string) {}

  private get db() {
    return loadDemoDb();
  }

  // Access helpers — same semantics as the SQL helper functions.
  private client(cid: string): Client | undefined {
    return this.db.clients.find((c) => c.id === cid);
  }
  private isCoachOf(cid: string) {
    return this.client(cid)?.coach_id === this.me;
  }
  private isClientSelf(cid: string) {
    return this.client(cid)?.user_id === this.me;
  }
  private canAccess(cid: string) {
    return this.isCoachOf(cid) || this.isClientSelf(cid);
  }
  private myCoachId() {
    return this.db.clients.find((c) => c.user_id === this.me)?.coach_id;
  }
  private isGroupCoach(gid: string) {
    return this.db.groups.find((g) => g.id === gid)?.coach_id === this.me;
  }
  private isGroupMember(gid: string) {
    return this.db.group_members.some((m) => m.group_id === gid && this.isClientSelf(m.client_id));
  }

  private canRead<K extends TableName>(table: K, row: Tables[K]): boolean {
    const r = row as unknown as Record<string, unknown>;
    const cid = r.client_id as string;
    switch (table) {
      case "profiles": {
        const id = r.id as string;
        return id === this.me || id === this.myCoachId() ||
          this.db.clients.some((c) => c.user_id === id && c.coach_id === this.me);
      }
      case "clients":
        return r.coach_id === this.me || r.user_id === this.me;
      case "invites":
      case "workout_templates":
      case "nutrition_templates":
        return r.coach_id === this.me;
      case "coach_notes":
        return this.isCoachOf(cid);
      case "exercise_demos":
        return r.coach_id === this.me || r.coach_id === this.myCoachId();
      case "notifications":
        return r.user_id === this.me;
      case "groups":
        return r.coach_id === this.me || this.isGroupMember(r.id as string);
      case "group_members":
        return this.isGroupCoach(r.group_id as string) || this.isGroupMember(r.group_id as string);
      case "group_posts":
        return this.isGroupCoach(r.group_id as string) || this.isGroupMember(r.group_id as string);
      default:
        return this.canAccess(cid);
    }
  }

  private canWrite<K extends TableName>(table: K, row: Tables[K], op: Op, old?: Tables[K]): boolean {
    const r = row as unknown as Record<string, unknown>;
    const o = (old ?? row) as unknown as Record<string, unknown>;
    const cid = r.client_id as string;
    switch (table) {
      case "profiles":
        return op === "update" && r.id === this.me && o.role === r.role;
      case "clients":
        if (o.coach_id === this.me && r.coach_id === this.me) return true;
        if (op === "update" && o.user_id === this.me) {
          return r.coach_id === o.coach_id && r.user_id === o.user_id && r.status === o.status &&
            r.email === o.email && r.check_in_day === o.check_in_day;
        }
        return false;
      case "invites":
        return r.coach_id === this.me && this.isCoachOf(cid);
      case "workout_templates":
      case "nutrition_templates":
      case "groups":
      case "exercise_demos":
        return r.coach_id === this.me && o.coach_id === this.me;
      case "food_scans":
        return false;
      case "workout_plans":
      case "nutrition_plans":
      case "habits":
      case "coach_notes":
        return r.coach_id === this.me && this.isCoachOf(cid);
      case "workout_logs":
      case "food_entries":
      case "body_metrics":
      case "progress_photos":
        return this.isClientSelf(cid) && this.isClientSelf(o.client_id as string);
      case "habit_logs":
        return this.isClientSelf(cid) &&
          this.db.habits.some((h) => h.id === r.habit_id && h.client_id === cid);
      case "check_ins": {
        const ci = r as unknown as CheckIn;
        const prev = o as unknown as CheckIn;
        if (op === "insert") {
          return this.isClientSelf(cid) && ci.coach_id === this.client(cid)?.coach_id &&
            ci.status === "submitted" && ci.coach_feedback == null;
        }
        if (op === "delete") return false;
        if (this.isClientSelf(cid)) {
          return prev.status === "submitted" && ci.status === prev.status &&
            ci.coach_feedback === prev.coach_feedback && ci.reviewed_at === prev.reviewed_at;
        }
        if (this.isCoachOf(cid)) {
          const answers: (keyof CheckIn)[] = ["weight", "progress_rating", "energy", "hunger", "sleep_quality",
            "sleep_hours", "adherence", "wins", "challenges", "questions", "client_id", "week_of"];
          return answers.every((k) => ci[k] === prev[k]);
        }
        return false;
      }
      case "messages": {
        const m = r as unknown as Message;
        const prev = o as unknown as Message;
        if (op === "insert") {
          return m.sender_id === this.me &&
            ((m.sender_role === "coach" && this.isCoachOf(cid)) || (m.sender_role === "client" && this.isClientSelf(cid)));
        }
        if (op === "update") {
          return this.canAccess(cid) && prev.sender_id !== this.me && m.body === prev.body && m.sender_id === prev.sender_id;
        }
        return false;
      }
      case "notifications":
        return op !== "insert" && r.user_id === this.me;
      case "group_members":
        return this.isGroupCoach(r.group_id as string) && (op === "delete" || this.isCoachOf(cid));
      case "group_posts":
        if (op === "insert") {
          return r.author_id === this.me &&
            (this.isGroupCoach(r.group_id as string) || this.isGroupMember(r.group_id as string));
        }
        if (op === "delete") return r.author_id === this.me || this.isGroupCoach(r.group_id as string);
        return false;
    }
    return false;
  }

  async list<K extends TableName>(table: K, q: Query<Tables[K]> = {}): Promise<Tables[K][]> {
    await tick();
    let rows = (this.db[table] as Tables[K][]).filter((row) => this.canRead(table, row));
    const get = (row: Tables[K], k: string) => (row as unknown as Record<string, unknown>)[k];
    for (const [k, v] of Object.entries(q.eq ?? {})) rows = rows.filter((r) => get(r, k) === v);
    for (const [k, v] of Object.entries(q.gte ?? {})) rows = rows.filter((r) => (get(r, k) as string) >= (v as string));
    for (const [k, v] of Object.entries(q.lte ?? {})) rows = rows.filter((r) => (get(r, k) as string) <= (v as string));
    for (const k of q.isNull ?? []) rows = rows.filter((r) => get(r, k as string) == null);
    if (q.in) {
      const set = new Set(q.in.values);
      rows = rows.filter((r) => set.has(get(r, q.in!.col as string) as string));
    }
    if (q.order) {
      const col = q.order.col as string;
      const dir = q.order.asc === false ? -1 : 1;
      rows = [...rows].sort((a, b) => {
        const av = get(a, col) as string, bv = get(b, col) as string;
        return av === bv ? 0 : av > bv ? dir : -dir;
      });
    }
    if (q.limit) rows = rows.slice(0, q.limit);
    return structuredClone(rows);
  }

  async get<K extends TableName>(table: K, id: string): Promise<Tables[K] | null> {
    const rows = await this.list(table, { eq: { id } as Partial<Tables[K]> });
    return rows[0] ?? null;
  }

  async insert<K extends TableName>(table: K, row: Partial<Tables[K]>): Promise<Tables[K]> {
    await tick();
    const defaults = (DEFAULTS[table]?.() ?? {}) as Partial<Tables[K]>;
    const full = { id: uid(), created_at: now(), ...defaults, ...row } as Tables[K];
    if (!this.canWrite(table, full, "insert")) throw new PermissionError("You don't have permission to do that.");
    this.uniqueCheck(table, full);
    (this.db[table] as Tables[K][]).push(full);
    this.afterWrite(table, full, "insert");
    persist();
    emitTableChange(table);
    return structuredClone(full);
  }

  private uniqueCheck<K extends TableName>(table: K, row: Tables[K]) {
    if (table === "habit_logs") {
      const r = row as unknown as Tables["habit_logs"];
      if (this.db.habit_logs.some((h) => h.habit_id === r.habit_id && h.date === r.date && h.id !== r.id)) {
        throw new Error("Already logged for that day.");
      }
    }
    if (table === "group_members") {
      const r = row as unknown as Tables["group_members"];
      if (this.db.group_members.some((m) => m.group_id === r.group_id && m.client_id === r.client_id)) {
        throw new Error("Already a member.");
      }
    }
  }

  async update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<Tables[K]> {
    await tick();
    const rows = this.db[table] as Tables[K][];
    const idx = rows.findIndex((r) => (r as { id: string }).id === id);
    if (idx < 0 || !this.canRead(table, rows[idx])) throw new PermissionError("You don't have permission to change that.");
    const old = rows[idx];
    const next = { ...old, ...patch } as Tables[K];
    if (!this.canWrite(table, next, "update", old)) throw new PermissionError("You don't have permission to change that.");
    rows[idx] = next;
    this.afterWrite(table, next, "update", old);
    persist();
    emitTableChange(table);
    return structuredClone(next);
  }

  async remove(table: TableName, id: string): Promise<void> {
    await tick();
    const rows = this.db[table] as { id: string }[];
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) return;
    const row = rows[idx] as Tables[typeof table];
    if (!this.canRead(table, row) || !this.canWrite(table, row, "delete")) {
      throw new PermissionError("You don't have permission to delete that.");
    }
    rows.splice(idx, 1);
    this.cascade(table, id);
    persist();
    emitTableChange(table);
  }

  private cascade(table: TableName, id: string) {
    const db = this.db;
    if (table === "clients") {
      for (const t of ["invites", "workout_plans", "nutrition_plans", "workout_logs", "food_entries", "body_metrics",
        "progress_photos", "habits", "habit_logs", "check_ins", "messages", "coach_notes", "group_members"] as const) {
        const loose = db as unknown as Record<string, { client_id: string }[]>;
        loose[t] = loose[t].filter((r) => r.client_id !== id);
      }
    }
    if (table === "habits") db.habit_logs = db.habit_logs.filter((l) => l.habit_id !== id);
    if (table === "groups") {
      db.group_members = db.group_members.filter((m) => m.group_id !== id);
      db.group_posts = db.group_posts.filter((p) => p.group_id !== id);
    }
  }

  // Equivalent of the SQL triggers: activity timestamps + notifications.
  private notify(user_id: string | null | undefined, n: Omit<AppNotification, "id" | "user_id" | "created_at" | "read_at">) {
    if (!user_id) return;
    this.db.notifications.push({ id: uid(), user_id, created_at: now(), read_at: null, ...n });
    emitTableChange("notifications");
  }

  private touch(cid: string) {
    const c = this.client(cid);
    if (c) {
      c.last_activity_at = now();
      emitTableChange("clients");
    }
  }

  private afterWrite<K extends TableName>(table: K, row: Tables[K], op: Op, old?: Tables[K]) {
    const r = row as unknown as Record<string, unknown>;
    const c = r.client_id ? this.client(r.client_id as string) : undefined;
    switch (table) {
      case "workout_logs":
      case "habit_logs":
        if (c) this.touch(c.id);
        break;
      case "food_entries":
      case "body_metrics":
      case "progress_photos":
        if (op === "insert" && c) this.touch(c.id);
        break;
      case "messages": {
        if (op !== "insert" || !c) break;
        const m = row as unknown as Message;
        if (m.sender_role === "client") {
          this.touch(c.id);
          this.notify(c.coach_id, { kind: "message", title: `Message from ${c.full_name}`, body: m.body.slice(0, 140), link: `/coach/messages?client=${c.id}` });
        } else if (c.notification_prefs.messages) {
          this.notify(c.user_id, { kind: "message", title: "New message from your coach", body: m.body.slice(0, 140), link: "/app/messages" });
        }
        break;
      }
      case "check_ins": {
        if (!c) break;
        const ci = row as unknown as CheckIn;
        if (op === "insert") {
          this.touch(c.id);
          this.notify(c.coach_id, { kind: "check_in", title: `${c.full_name} submitted a check-in`, body: `Week of ${fmtDate(ci.week_of)}`, link: `/coach/check-ins?id=${ci.id}` });
        } else if (ci.coach_feedback && ci.coach_feedback !== (old as unknown as CheckIn)?.coach_feedback) {
          this.notify(c.user_id, { kind: "feedback", title: "Your coach reviewed your check-in", body: ci.coach_feedback.slice(0, 140), link: "/app/check-in" });
        }
        break;
      }
      case "workout_plans":
      case "nutrition_plans": {
        if (!c || !r.active || !c.notification_prefs.plan_updates) break;
        const w = table === "workout_plans";
        this.notify(c.user_id, { kind: "plan", title: w ? "Workout plan updated" : "Nutrition plan updated", body: r.name as string, link: w ? "/app/workout" : "/app/food" });
        break;
      }
      case "group_posts": {
        const p = row as unknown as Tables["group_posts"];
        if (p.author_role !== "coach") break;
        const g = this.db.groups.find((x) => x.id === p.group_id);
        for (const m of this.db.group_members.filter((x) => x.group_id === p.group_id)) {
          this.notify(this.client(m.client_id)?.user_id, { kind: "group", title: `New post in ${g?.name ?? "your group"}`, body: p.body.slice(0, 140), link: `/app/community?group=${p.group_id}` });
        }
        break;
      }
    }
  }

  // ─── invites ────────────────────────────────────────────────

  async createInvite(clientId: string, email: string): Promise<Invite> {
    return this.insert("invites", { client_id: clientId, email, coach_id: this.me });
  }

  async getInvite(token: string): Promise<InviteInfo | null> {
    await tick();
    const inv = this.db.invites.find((i) => i.token === token);
    if (!inv) return null;
    const c = this.client(inv.client_id);
    const p = this.db.profiles.find((x) => x.id === inv.coach_id);
    return {
      client_name: c?.full_name ?? "",
      email: inv.email,
      coach_name: p?.full_name ?? "",
      business_name: p?.business_name ?? null,
      expired: new Date(inv.expires_at) < new Date(),
      accepted: inv.accepted_at !== null,
    };
  }

  /** Demo-only: create the invited client's demo account, then accept. */
  static createDemoClientAccount(fullName: string, email: string): Profile {
    const db = loadDemoDb();
    const existing = db.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      if (existing.role !== "client") throw new Error("That email belongs to a coach account in the demo.");
      return existing;
    }
    const profile: Profile = { id: `demo-user-${uid()}`, role: "client", full_name: fullName, email, business_name: null, created_at: now() };
    db.profiles.push(profile);
    persist();
    return profile;
  }

  async acceptInvite(token: string): Promise<string> {
    await tick();
    const me = this.db.profiles.find((p) => p.id === this.me);
    const inv = this.db.invites.find((i) => i.token === token);
    if (!me) throw new Error("Not signed in");
    if (me.role !== "client") throw new Error("Only client accounts can accept an invite");
    if (!inv) throw new Error("Invite not found");
    if (inv.accepted_at) throw new Error("Invite already used");
    if (new Date(inv.expires_at) < new Date()) throw new Error("Invite expired");
    if (inv.email.toLowerCase() !== me.email.toLowerCase()) throw new Error("Sign up with the email address the invite was sent to");
    if (this.db.clients.some((c) => c.user_id === me.id)) throw new Error("This account is already linked to a coach");
    const c = this.client(inv.client_id)!;
    c.user_id = me.id;
    c.status = "active";
    c.last_activity_at = now();
    inv.accepted_at = now();
    this.notify(inv.coach_id, { kind: "system", title: `${me.full_name} joined`, body: "Your invite was accepted.", link: `/coach/clients/${c.id}` });
    persist();
    emitTableChange("clients");
    return c.id;
  }

  // ─── photos ─────────────────────────────────────────────────

  async uploadPhoto(clientId: string, file: File, date: string, pose: PhotoPose): Promise<ProgressPhoto> {
    if (!this.isClientSelf(clientId)) throw new PermissionError();
    const blob = await compressImage(file, 720, 0.75);
    const dataUrl = await blobToDataUrl(blob);
    const path = `${clientId}/${date}-${pose}-${uid()}.jpg`;
    const store = photoStore();
    store[path] = dataUrl;
    try {
      storage.set(PHOTO_KEY, JSON.stringify(store));
    } catch {
      throw new Error("Demo photo storage is full (browser limit). Delete a photo or reset the demo.");
    }
    return this.insert("progress_photos", { client_id: clientId, date, pose, storage_path: path });
  }

  async photoUrl(path: string): Promise<string> {
    const cid = path.split("/")[0];
    if (!this.canAccess(cid)) throw new PermissionError();
    if (path.startsWith(`${cid}/sample-`)) return samplePhoto(path);
    const url = photoStore()[path];
    if (!url) throw new Error("Photo not found");
    return url;
  }

  // ─── food scan & exercise media ─────────────────────────────

  get canScanFood() {
    return false;
  }

  async analyzeFood(): Promise<FoodScanResult> {
    throw new ScanError(
      "Food scanning uses AI on your real account, so it's switched off in the demo. Add food manually here, or sign up to scan meals.",
      "unavailable",
    );
  }

  async uploadExerciseMedia(file: File): Promise<{ path: string; type: "video" | "image" }> {
    if (file.type.startsWith("video/")) {
      throw new Error("Video uploads need a real account (the demo only stores data in this browser). Use an image or GIF here.");
    }
    if (!file.type.startsWith("image/")) throw new Error("Choose an image or GIF.");
    if (file.size > 2 * 1024 * 1024) throw new Error("Demo uploads are limited to 2 MB. Use a smaller image or GIF.");
    const blob = file.type === "image/gif" ? file : await compressImage(file, 720, 0.8);
    const dataUrl = await blobToDataUrl(blob);
    const path = `media/${this.me}/${uid()}`;
    const store = photoStore();
    store[path] = dataUrl;
    try {
      storage.set(PHOTO_KEY, JSON.stringify(store));
    } catch {
      throw new Error("Demo storage is full (browser limit). Delete something or reset the demo.");
    }
    return { path, type: "image" };
  }

  async exerciseMediaUrl(path: string): Promise<string> {
    const owner = path.split("/")[1];
    if (owner !== this.me && owner !== this.myCoachId()) throw new PermissionError();
    const url = photoStore()[path];
    if (!url) throw new Error("Media not found");
    return url;
  }

  async deleteExerciseMedia(path: string): Promise<void> {
    if (path.split("/")[1] !== this.me) throw new PermissionError();
    const store = photoStore();
    delete store[path];
    storage.set(PHOTO_KEY, JSON.stringify(store));
  }

  async deletePhoto(photo: ProgressPhoto): Promise<void> {
    await this.remove("progress_photos", photo.id);
    const store = photoStore();
    delete store[photo.storage_path];
    storage.set(PHOTO_KEY, JSON.stringify(store));
  }
}

function tick() {
  return new Promise((r) => setTimeout(r, 60));
}

/** Seeded demo photos are drawn placeholders, clearly marked as samples. */
function samplePhoto(path: string): string {
  const m = /sample-(\d+)-(front|side|back)/.exec(path);
  const step = m ? Number(m[1]) : 0;
  const pose = m?.[2] ?? "front";
  const waist = 46 - step * 3;
  const side = pose === "side";
  const torso = side
    ? `<path d="M150 120 C ${150 + waist / 2} 160, ${150 + waist / 2} 230, 150 300 L 132 300 C 124 230, 124 160, 132 120 Z" fill="#3a3d44"/>`
    : `<path d="M${150 - waist} 120 C ${150 - waist - 6} 180, ${150 - waist + 10} 240, ${150 - waist + 6} 300 L ${150 + waist - 6} 300 C ${150 + waist - 10} 240, ${150 + waist + 6} 180, ${150 + waist} 120 Z" fill="#3a3d44"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <rect width="300" height="400" fill="#1d1f23"/>
    <circle cx="150" cy="80" r="30" fill="#3a3d44"/>${torso}
    <rect x="${side ? 128 : 112}" y="300" width="${side ? 26 : 30}" height="90" rx="12" fill="#3a3d44"/>
    ${side ? "" : `<rect x="158" y="300" width="30" height="90" rx="12" fill="#3a3d44"/>`}
    <text x="150" y="30" text-anchor="middle" font-family="system-ui" font-size="13" fill="#9b9ea6">Sample photo · ${pose}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

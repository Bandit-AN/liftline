import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { InviteInfo, Query, Repo } from "./repo";
import { emitTableChange } from "./repo";
import type { Invite, PhotoPose, ProgressPhoto, TableName, Tables } from "./types";
import { compressImage } from "./image";
import { ScanError, type FoodScanRequest, type FoodScanResult } from "./food-scan";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const liveConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!liveConfigured) throw new Error("Supabase is not configured");
  if (!client) client = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, flowType: "pkce" } });
  return client;
}

const PHOTO_BUCKET = "progress-photos";
const MEDIA_BUCKET = "exercise-media";
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/**
 * Creates a ready-to-use account through the `create-account` Edge Function
 * (no confirmation email), then signs in. Client accounts need a valid invite.
 */
export async function createAccountAndSignIn(input: {
  email: string; password: string; full_name: string; role: "coach" | "client";
  business_name?: string | null; invite_token?: string;
}): Promise<void> {
  const sb = supabase();
  const { error } = await sb.functions.invoke("create-account", { body: input });
  if (error) {
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      } catch {
        /* keep default */
      }
    }
    throw new Error(message);
  }
  const { error: signInError } = await sb.auth.signInWithPassword({ email: input.email, password: input.password });
  if (signInError) throw new Error(signInError.message);
}

function friendly(err: { message: string; code?: string } | null): Error {
  if (!err) return new Error("Unknown error");
  if (err.code === "42501" || /row-level security/i.test(err.message)) {
    return new Error("You don't have permission to do that.");
  }
  return new Error(err.message);
}

export class SupabaseRepo implements Repo {
  readonly mode = "live" as const;
  private sb = supabase();

  async list<K extends TableName>(table: K, q: Query<Tables[K]> = {}): Promise<Tables[K][]> {
    let query = this.sb.from(table).select("*");
    for (const [k, v] of Object.entries(q.eq ?? {})) query = query.eq(k, v as string);
    for (const [k, v] of Object.entries(q.gte ?? {})) query = query.gte(k, v as string);
    for (const [k, v] of Object.entries(q.lte ?? {})) query = query.lte(k, v as string);
    for (const k of q.isNull ?? []) query = query.is(k as string, null);
    if (q.in) query = query.in(q.in.col as string, q.in.values);
    if (q.order) query = query.order(q.order.col as string, { ascending: q.order.asc ?? true });
    if (q.limit) query = query.limit(q.limit);
    const { data, error } = await query;
    if (error) throw friendly(error);
    return (data ?? []) as Tables[K][];
  }

  async get<K extends TableName>(table: K, id: string): Promise<Tables[K] | null> {
    const { data, error } = await this.sb.from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw friendly(error);
    return data as Tables[K] | null;
  }

  async insert<K extends TableName>(table: K, row: Partial<Tables[K]>): Promise<Tables[K]> {
    const { data, error } = await this.sb.from(table).insert(row as never).select("*").single();
    if (error) throw friendly(error);
    emitTableChange(table);
    return data as Tables[K];
  }

  async update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<Tables[K]> {
    const { data, error } = await this.sb.from(table).update(patch as never).eq("id", id).select("*").maybeSingle();
    if (error) throw friendly(error);
    if (!data) throw new Error("You don't have permission to change that.");
    emitTableChange(table);
    return data as Tables[K];
  }

  async remove(table: TableName, id: string): Promise<void> {
    const { error } = await this.sb.from(table).delete().eq("id", id);
    if (error) throw friendly(error);
    emitTableChange(table);
  }

  async getInvite(token: string): Promise<InviteInfo | null> {
    const { data, error } = await this.sb.rpc("get_invite", { invite_token: token });
    if (error) throw friendly(error);
    return (data as InviteInfo[])[0] ?? null;
  }

  async acceptInvite(token: string): Promise<string> {
    const { data, error } = await this.sb.rpc("accept_invite", { invite_token: token });
    if (error) throw friendly(error);
    emitTableChange("clients");
    return data as string;
  }

  async createInvite(clientId: string, email: string): Promise<Invite> {
    const { data: auth } = await this.sb.auth.getUser();
    return this.insert("invites", { client_id: clientId, email, coach_id: auth.user?.id });
  }

  async uploadPhoto(clientId: string, file: File, date: string, pose: PhotoPose): Promise<ProgressPhoto> {
    const blob = await compressImage(file);
    const path = `${clientId}/${date}-${pose}-${crypto.randomUUID()}.jpg`;
    const { error } = await this.sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw friendly(error);
    try {
      return await this.insert("progress_photos", { client_id: clientId, date, pose, storage_path: path });
    } catch (e) {
      await this.sb.storage.from(PHOTO_BUCKET).remove([path]);
      throw e;
    }
  }

  private urlCache = new Map<string, { url: string; exp: number }>();
  async photoUrl(path: string): Promise<string> {
    const hit = this.urlCache.get(path);
    if (hit && hit.exp > Date.now()) return hit.url;
    const { data, error } = await this.sb.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
    if (error || !data) throw friendly(error);
    this.urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
    return data.signedUrl;
  }

  async deletePhoto(photo: ProgressPhoto): Promise<void> {
    const { error } = await this.sb.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
    if (error) throw friendly(error);
    await this.remove("progress_photos", photo.id);
  }

  get canScanFood() {
    return true;
  }

  async analyzeFood(req: FoodScanRequest): Promise<FoodScanResult> {
    const { data, error } = await this.sb.functions.invoke("analyze-food", { body: req });
    if (error) {
      let message = "Food recognition failed. Try again, or add food manually.";
      let code: ScanError["code"] = "unknown";
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          if (body?.error) message = body.error;
          if (body?.code) code = body.code;
        } catch {
          /* non-JSON response */
        }
      } else if (/fetch|network/i.test(error.message)) {
        message = "You appear to be offline. Check your connection and try again.";
        code = "upstream";
      }
      throw new ScanError(message, code);
    }
    return data as FoodScanResult;
  }

  async uploadExerciseMedia(file: File): Promise<{ path: string; type: "video" | "image" }> {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) throw new Error("Choose a video (MP4, WebM, MOV) or an image/GIF.");
    if (file.size > MAX_VIDEO_BYTES) throw new Error("That file is over 50 MB. Trim the clip or export at a lower resolution.");
    const { data: auth } = await this.sb.auth.getUser();
    if (!auth.user) throw new Error("Please sign in again.");
    // Re-encode still images (smaller, strips location data); keep GIFs and videos as-is.
    let body: Blob = file;
    let ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
    let contentType = file.type;
    if (isImage && file.type !== "image/gif") {
      body = await compressImage(file, 1080, 0.85);
      ext = "jpg";
      contentType = "image/jpeg";
    }
    const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.sb.storage.from(MEDIA_BUCKET).upload(path, body, { contentType });
    if (error) throw friendly(error);
    return { path, type: isVideo ? "video" : "image" };
  }

  async exerciseMediaUrl(path: string): Promise<string> {
    const key = `media:${path}`;
    const hit = this.urlCache.get(key);
    if (hit && hit.exp > Date.now()) return hit.url;
    const { data, error } = await this.sb.storage.from(MEDIA_BUCKET).createSignedUrl(path, 3600);
    if (error || !data) throw friendly(error);
    this.urlCache.set(key, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
    return data.signedUrl;
  }

  async deleteExerciseMedia(path: string): Promise<void> {
    const { error } = await this.sb.storage.from(MEDIA_BUCKET).remove([path]);
    if (error) throw friendly(error);
  }

  subscribe(table: TableName, onChange: () => void): () => void {
    const channel = this.sb
      .channel(`${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => onChange())
      .subscribe();
    return () => {
      this.sb.removeChannel(channel);
    };
  }
}

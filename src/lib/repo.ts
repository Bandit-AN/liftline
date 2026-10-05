import type { Invite, PhotoPose, ProgressPhoto, Session, TableName, Tables } from "./types";
import type { FoodScanRequest, FoodScanResult } from "./food-scan";

export interface Query<T> {
  eq?: Partial<T>;
  gte?: Partial<Record<keyof T, string | number>>;
  lte?: Partial<Record<keyof T, string | number>>;
  in?: { col: keyof T; values: (string | number)[] };
  isNull?: (keyof T)[];
  order?: { col: keyof T; asc?: boolean };
  limit?: number;
}

export interface InviteInfo {
  client_name: string;
  email: string;
  coach_name: string;
  business_name: string | null;
  expired: boolean;
  accepted: boolean;
}

/**
 * One interface, two backends: the browser-local demo store and Supabase.
 * Permission checks live in the backend (RLS for Supabase, an equivalent
 * rule set for demo mode) — UI code never filters for security.
 */
export interface Repo {
  readonly mode: "demo" | "live";
  list<K extends TableName>(table: K, q?: Query<Tables[K]>): Promise<Tables[K][]>;
  get<K extends TableName>(table: K, id: string): Promise<Tables[K] | null>;
  insert<K extends TableName>(table: K, row: Partial<Tables[K]>): Promise<Tables[K]>;
  update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<Tables[K]>;
  remove(table: TableName, id: string): Promise<void>;

  getInvite(token: string): Promise<InviteInfo | null>;
  acceptInvite(token: string): Promise<string>;
  createInvite(clientId: string, email: string): Promise<Invite>;

  uploadPhoto(clientId: string, file: File, date: string, pose: PhotoPose): Promise<ProgressPhoto>;
  photoUrl(path: string): Promise<string>;
  deletePhoto(photo: ProgressPhoto): Promise<void>;

  /** Whether this backend can run AI food scans (false in demo mode). */
  readonly canScanFood: boolean;
  /** AI food photo analysis (server-side). Throws ScanError. */
  analyzeFood(req: FoodScanRequest): Promise<FoodScanResult>;

  /** Coach-uploaded exercise demo media (video or image). */
  uploadExerciseMedia(file: File): Promise<{ path: string; type: "video" | "image" }>;
  exerciseMediaUrl(path: string): Promise<string>;
  deleteExerciseMedia(path: string): Promise<void>;

  /** Subscribe to live inserts (messages/notifications) where supported. */
  subscribe?(table: TableName, onChange: () => void): () => void;
}

export class PermissionError extends Error {
  constructor(msg = "You don't have access to that.") {
    super(msg);
    this.name = "PermissionError";
  }
}

// Tiny change bus so lists refresh after mutations anywhere in the app.
type Listener = (table: TableName) => void;
const listeners = new Set<Listener>();
export function onTableChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emitTableChange(table: TableName) {
  listeners.forEach((fn) => fn(table));
}

export type { Session };

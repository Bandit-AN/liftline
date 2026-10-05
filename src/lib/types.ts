// Domain types shared by the demo store and the Supabase backend.
// Column names match supabase/migrations exactly.

export type Role = "coach" | "client";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  business_name: string | null;
  created_at: string;
}

export type ClientStatus = "invited" | "active" | "paused";

export interface NotificationPrefs {
  messages: boolean;
  check_in_reminders: boolean;
  plan_updates: boolean;
}

export interface Client {
  id: string;
  coach_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  goal: string;
  status: ClientStatus;
  check_in_day: number; // 0 = Sunday
  start_weight: number | null;
  target_weight: number | null;
  height_cm: number | null;
  preferences: string;
  notification_prefs: NotificationPrefs;
  units: "kg" | "lb";
  last_activity_at: string | null;
  created_at: string;
}

export interface Invite {
  id: string;
  coach_id: string;
  client_id: string;
  email: string;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface PlanExercise {
  id: string;
  name: string;
  /** Demo reference: "b:<key>" for built-in demos, "c:<uuid>" for a coach's own. */
  demo_id?: string | null;
  equipment?: string;
  sets: number;
  reps: string; // "8-10", "12", "AMRAP"
  rest_sec: number;
  notes: string;
}

export interface WorkoutDay {
  id: string;
  name: string;
  weekdays: number[]; // 0..6
  exercises: PlanExercise[];
}

export interface WorkoutTemplate {
  id: string;
  coach_id: string;
  name: string;
  description: string;
  days: WorkoutDay[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutPlan {
  id: string;
  coach_id: string;
  client_id: string;
  name: string;
  description: string;
  days: WorkoutDay[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealSuggestion {
  id: string;
  name: string;
  suggestion: string;
}

export interface NutritionTemplate {
  id: string;
  coach_id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: MealSuggestion[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface NutritionPlan {
  id: string;
  coach_id: string;
  client_id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: MealSuggestion[];
  notes: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoggedSet {
  reps: number | null;
  weight: number | null;
  done: boolean;
}

export interface LoggedExercise {
  exercise_id: string;
  exercise_name: string;
  sets: LoggedSet[];
}

export interface WorkoutLog {
  id: string;
  client_id: string;
  plan_id: string | null;
  day_id: string | null;
  day_name: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  notes: string;
  entries: LoggedExercise[];
  created_at: string;
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snacks";

export interface FoodEntry {
  id: string;
  client_id: string;
  date: string;
  meal: MealSlot;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  /** milligrams */
  sodium: number | null;
  portion: string | null;
  source: "manual" | "scan";
  estimated: boolean;
  meal_group: string | null;
  created_at: string;
}

export interface FoodScanLog {
  id: string;
  client_id: string;
  user_id: string;
  ok: boolean;
  item_count: number;
  error: string | null;
  created_at: string;
}

export interface ExerciseDemo {
  id: string;
  coach_id: string;
  name: string;
  equipment: string;
  media_path: string | null;
  media_type: "video" | "image" | null;
  steps: string[];
  breathing: string;
  mistakes: string[];
  created_at: string;
  updated_at: string;
}

export interface BodyMetric {
  id: string;
  client_id: string;
  date: string;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  hips: number | null;
  arm: number | null;
  thigh: number | null;
  created_at: string;
}

export type PhotoPose = "front" | "side" | "back";

export interface ProgressPhoto {
  id: string;
  client_id: string;
  date: string;
  pose: PhotoPose;
  storage_path: string;
  created_at: string;
}

export interface Habit {
  id: string;
  coach_id: string;
  client_id: string;
  name: string;
  target: number;
  unit: string;
  active: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  client_id: string;
  date: string;
  value: number;
  created_at: string;
}

export type CheckInStatus = "submitted" | "reviewed";

export interface CheckIn {
  id: string;
  client_id: string;
  coach_id: string;
  week_of: string; // Monday of the week
  weight: number | null;
  progress_rating: number; // 1..5
  energy: number;
  hunger: number;
  sleep_quality: number;
  sleep_hours: number | null;
  adherence: number; // 0..100
  wins: string;
  challenges: string;
  questions: string;
  status: CheckInStatus;
  coach_feedback: string | null;
  reviewed_at: string | null;
  submitted_at: string;
}

export interface Message {
  id: string;
  client_id: string;
  sender_id: string;
  sender_role: Role;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface CoachNote {
  id: string;
  coach_id: string;
  client_id: string;
  body: string;
  created_at: string;
}

export type NotificationKind = "message" | "check_in" | "feedback" | "plan" | "group" | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  coach_id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  client_id: string;
  created_at: string;
}

export interface GroupPost {
  id: string;
  group_id: string;
  author_id: string;
  author_name: string;
  author_role: Role;
  body: string;
  created_at: string;
}

export interface Tables {
  profiles: Profile;
  clients: Client;
  invites: Invite;
  workout_templates: WorkoutTemplate;
  workout_plans: WorkoutPlan;
  nutrition_templates: NutritionTemplate;
  nutrition_plans: NutritionPlan;
  workout_logs: WorkoutLog;
  food_entries: FoodEntry;
  body_metrics: BodyMetric;
  progress_photos: ProgressPhoto;
  habits: Habit;
  habit_logs: HabitLog;
  check_ins: CheckIn;
  messages: Message;
  coach_notes: CoachNote;
  notifications: AppNotification;
  groups: Group;
  group_members: GroupMember;
  group_posts: GroupPost;
  food_scans: FoodScanLog;
  exercise_demos: ExerciseDemo;
}

export type TableName = keyof Tables;

export interface Session {
  mode: "demo" | "live";
  userId: string;
  role: Role;
  profile: Profile;
  /** For client users: their client record id. */
  clientId: string | null;
}

// Runs the real migrations against an in-process Postgres (PGlite) with a
// minimal stand-in for Supabase's auth/storage schemas, then checks that
// coach/client permissions hold. Usage: npm run test:rls
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";

const db = new PGlite({ extensions: { pgcrypto } });

const SUPABASE_STUBS = `
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create role authenticated; create role anon;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
create publication supabase_realtime;
`;

await db.exec(SUPABASE_STUBS);
for (const f of ["0001_schema.sql", "0002_storage.sql", "0003_realtime.sql", "0004_food_scan_and_demos.sql"]) {
  await db.exec(readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), "utf8"));
}
await db.exec(`
  grant usage on schema public, auth, storage to authenticated, anon;
  grant all on all tables in schema public to authenticated;
  grant all on storage.objects to authenticated;
  grant execute on all functions in schema public to authenticated;
  grant execute on function auth.uid() to authenticated, anon;
`);

const ids = {
  coachA: "00000000-0000-0000-0000-00000000000a",
  coachB: "00000000-0000-0000-0000-00000000000b",
  userA1: "00000000-0000-0000-0000-0000000000a1",
  userB1: "00000000-0000-0000-0000-0000000000b1",
  newUser: "00000000-0000-0000-0000-0000000000c1",
  wrongEmailUser: "00000000-0000-0000-0000-0000000000c2",
};

// Seed as superuser (signup trigger creates profiles).
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${ids.coachA}', 'a@coach.test', '{"role":"coach","full_name":"Coach A"}'),
    ('${ids.coachB}', 'b@coach.test', '{"role":"coach","full_name":"Coach B"}'),
    ('${ids.userA1}', 'a1@client.test', '{"role":"client","full_name":"Client A1"}'),
    ('${ids.userB1}', 'b1@client.test', '{"role":"client","full_name":"Client B1"}');
`);
const cA1 = (await db.query(
  `insert into clients (coach_id, user_id, full_name, email, status) values ($1, $2, 'Client A1', 'a1@client.test', 'active') returning id`,
  [ids.coachA, ids.userA1])).rows[0].id;
const cB1 = (await db.query(
  `insert into clients (coach_id, user_id, full_name, email, status) values ($1, $2, 'Client B1', 'b1@client.test', 'active') returning id`,
  [ids.coachB, ids.userB1])).rows[0].id;

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`); }
}

async function as(uid, fn) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  await db.exec(uid ? "set role authenticated" : "set role anon");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
async function fails(fn) {
  try { await fn(); return false; } catch { return true; }
}
const q = (sql, params) => db.query(sql, params).then((r) => r.rows);

console.log("Clients");
await as(ids.coachA, async () => {
  const rows = await q("select id from clients");
  check("coach A sees only their own client", rows.length === 1 && rows[0].id === cA1);
  check("coach A cannot add a client under coach B",
    await fails(() => q(`insert into clients (coach_id, full_name, email) values ($1,'X','x@x.test')`, [ids.coachB])));
  const upd = await q(`update clients set goal = 'hijack' where id = $1 returning id`, [cB1]);
  check("coach A cannot edit coach B's client", upd.length === 0);
});
await as(ids.userA1, async () => {
  const rows = await q("select id from clients");
  check("client sees only their own record", rows.length === 1 && rows[0].id === cA1);
  check("client cannot reassign their coach",
    await fails(() => q(`update clients set coach_id = $1 where id = $2`, [ids.coachB, cA1])));
  const ok = await q(`update clients set goal = 'Run a 10k' where id = $1 returning goal`, [cA1]);
  check("client can update their own goal", ok[0]?.goal === "Run a 10k");
  check("client cannot promote themselves to coach",
    await fails(() => q(`update profiles set role = 'coach' where id = $1`, [ids.userA1])));
  const named = await q(`update profiles set full_name = 'A1 Renamed' where id = $1 returning full_name`, [ids.userA1]);
  check("user can rename their own profile", named[0]?.full_name === "A1 Renamed");
  check("user cannot edit someone else's profile",
    (await q(`update profiles set full_name = 'x' where id = $1 returning id`, [ids.coachA])).length === 0);
});

console.log("Plans");
await as(ids.coachA, async () => {
  await q(`insert into workout_plans (coach_id, client_id, name) values ($1, $2, 'Push Pull Legs')`, [ids.coachA, cA1]);
  await q(`insert into nutrition_plans (coach_id, client_id, name, calories) values ($1, $2, 'Cut', 2100)`, [ids.coachA, cA1]);
  check("coach A cannot assign a plan to coach B's client",
    await fails(() => q(`insert into workout_plans (coach_id, client_id, name) values ($1, $2, 'X')`, [ids.coachA, cB1])));
});
await as(ids.userA1, async () => {
  check("client reads their workout plan", (await q("select * from workout_plans")).length === 1);
  check("client cannot create plans",
    await fails(() => q(`insert into workout_plans (coach_id, client_id, name) values ($1, $2, 'Self')`, [ids.coachA, cA1])));
});
await as(ids.userB1, async () => {
  check("other client cannot see that plan", (await q("select * from workout_plans")).length === 0);
});

console.log("Logs");
await as(ids.userA1, async () => {
  await q(`insert into workout_logs (client_id, date, completed, day_name) values ($1, current_date, true, 'Push')`, [cA1]);
  await q(`insert into food_entries (client_id, date, meal, name, calories) values ($1, current_date, 'lunch', 'Chicken bowl', 640)`, [cA1]);
  await q(`insert into body_metrics (client_id, date, weight) values ($1, current_date, 81.4)`, [cA1]);
  check("client cannot log for another client",
    await fails(() => q(`insert into food_entries (client_id, date, meal, name) values ($1, current_date, 'lunch', 'x')`, [cB1])));
});
await as(ids.coachA, async () => {
  check("coach reads client's workout logs", (await q("select * from workout_logs")).length === 1);
  check("coach reads client's food diary", (await q("select * from food_entries")).length === 1);
  check("coach cannot write into client's food diary",
    await fails(() => q(`insert into food_entries (client_id, date, meal, name) values ($1, current_date, 'lunch', 'x')`, [cA1])));
});
await as(ids.coachB, async () => {
  check("coach B cannot read coach A's client logs", (await q("select * from workout_logs")).length === 0);
  check("coach B cannot read coach A's client weights", (await q("select * from body_metrics")).length === 0);
});
const activity = (await q(`select last_activity_at from clients where id = $1`, [cA1]))[0];
check("logging updates last activity", activity.last_activity_at !== null);

console.log("Habits");
let habitId;
await as(ids.coachA, async () => {
  habitId = (await q(`insert into habits (coach_id, client_id, name, target, unit) values ($1,$2,'Steps',10000,'steps') returning id`, [ids.coachA, cA1]))[0].id;
});
await as(ids.userA1, async () => {
  await q(`insert into habit_logs (habit_id, client_id, date, value) values ($1, $2, current_date, 8500)`, [habitId, cA1]);
  check("client logs a coach-assigned habit", (await q("select * from habit_logs")).length === 1);
});
await as(ids.userB1, async () => {
  check("client cannot log against another client's habit",
    await fails(() => q(`insert into habit_logs (habit_id, client_id, date, value) values ($1, $2, current_date, 1)`, [habitId, cB1])));
});

console.log("Check-ins");
let checkInId;
await as(ids.userA1, async () => {
  checkInId = (await q(
    `insert into check_ins (client_id, coach_id, week_of, progress_rating, energy, hunger, sleep_quality, adherence, wins)
     values ($1, $2, current_date, 4, 4, 3, 3, 85, 'Hit every session') returning id`, [cA1, ids.coachA]))[0].id;
  check("client cannot submit a check-in to a different coach",
    await fails(() => q(`insert into check_ins (client_id, coach_id, week_of, progress_rating, energy, hunger, sleep_quality, adherence)
      values ($1, $2, current_date, 3,3,3,3,50)`, [cA1, ids.coachB])));
  check("client cannot write their own coach feedback",
    await fails(() => q(`update check_ins set coach_feedback = 'great job me' where id = $1`, [checkInId])));
});
await as(ids.coachA, async () => {
  check("coach cannot alter client's check-in answers",
    await fails(() => q(`update check_ins set adherence = 100 where id = $1`, [checkInId])));
  const r = await q(`update check_ins set coach_feedback = 'Great week', status = 'reviewed', reviewed_at = now() where id = $1 returning status`, [checkInId]);
  check("coach reviews and leaves feedback", r[0]?.status === "reviewed");
});
await as(ids.userA1, async () => {
  check("client cannot edit a check-in after review",
    (await q(`update check_ins set wins = 'edited' where id = $1 returning id`, [checkInId])).length === 0);
});
await as(ids.coachB, async () => {
  check("coach B cannot see coach A's check-ins", (await q("select * from check_ins")).length === 0);
});

console.log("Messages & notes");
await as(ids.coachA, async () => {
  await q(`insert into messages (client_id, sender_id, sender_role, body) values ($1, $2, 'coach', 'Welcome aboard!')`, [cA1, ids.coachA]);
  await q(`insert into coach_notes (coach_id, client_id, body) values ($1, $2, 'Knee history — avoid deep lunges')`, [ids.coachA, cA1]);
  check("coach cannot impersonate client in chat",
    await fails(() => q(`insert into messages (client_id, sender_id, sender_role, body) values ($1, $2, 'client', 'fake')`, [cA1, ids.userA1])));
});
await as(ids.userA1, async () => {
  check("client reads their thread", (await q("select * from messages")).length === 1);
  check("client cannot read private coach notes", (await q("select * from coach_notes")).length === 0);
  check("client cannot edit coach's message",
    await fails(() => q(`update messages set body = 'changed' where client_id = $1`, [cA1])));
  const read = await q(`update messages set read_at = now() where client_id = $1 and sender_role = 'coach' returning id`, [cA1]);
  check("client can mark coach's message as read", read.length === 1);
  await q(`insert into messages (client_id, sender_id, sender_role, body) values ($1, $2, 'client', 'Thanks coach')`, [cA1, ids.userA1]);
});
await as(ids.userB1, async () => {
  check("other client cannot read the thread", (await q("select * from messages")).length === 0);
  check("other client cannot post into the thread",
    await fails(() => q(`insert into messages (client_id, sender_id, sender_role, body) values ($1, $2, 'client', 'hi')`, [cA1, ids.userB1])));
});
await as(ids.coachB, async () => {
  check("coach B cannot read coach A's thread", (await q("select * from messages")).length === 0);
});

console.log("Notifications");
await as(ids.coachA, async () => {
  const n = await q("select kind from notifications order by created_at");
  check("coach notified of check-in and client message",
    n.some((x) => x.kind === "check_in") && n.some((x) => x.kind === "message"));
});
await as(ids.userA1, async () => {
  const n = await q("select kind from notifications");
  check("client notified of plan, feedback and message",
    ["plan", "feedback", "message"].every((k) => n.some((x) => x.kind === k)));
});
await as(ids.userB1, async () => {
  check("unrelated client gets no notifications", (await q("select * from notifications")).length === 0);
});

console.log("Progress photo storage");
await as(ids.userA1, async () => {
  await q(`insert into storage.objects (bucket_id, name) values ('progress-photos', $1)`, [`${cA1}/front.jpg`]);
  check("client cannot upload into another client's folder",
    await fails(() => q(`insert into storage.objects (bucket_id, name) values ('progress-photos', $1)`, [`${cB1}/sneaky.jpg`])));
});
await as(ids.coachA, async () => {
  check("coach can view their client's photo", (await q("select * from storage.objects")).length === 1);
  check("coach cannot upload into client's folder",
    await fails(() => q(`insert into storage.objects (bucket_id, name) values ('progress-photos', $1)`, [`${cA1}/coach.jpg`])));
});
await as(ids.coachB, async () => {
  check("other coach cannot view the photo", (await q("select * from storage.objects")).length === 0);
});
await as(ids.userB1, async () => {
  check("other client cannot view the photo", (await q("select * from storage.objects")).length === 0);
});

console.log("Groups");
let groupId;
await as(ids.coachA, async () => {
  groupId = (await q(`insert into groups (coach_id, name) values ($1, 'Spring Shred') returning id`, [ids.coachA]))[0].id;
  await q(`insert into group_members (group_id, client_id) values ($1, $2)`, [groupId, cA1]);
  check("coach cannot add another coach's client to a group",
    await fails(() => q(`insert into group_members (group_id, client_id) values ($1, $2)`, [groupId, cB1])));
  await q(`insert into group_posts (group_id, author_id, author_name, author_role, body) values ($1, $2, 'Coach A', 'coach', 'Week 1 challenge!')`, [groupId, ids.coachA]);
});
await as(ids.userA1, async () => {
  check("member sees group posts", (await q("select * from group_posts")).length === 1);
  await q(`insert into group_posts (group_id, author_id, author_name, author_role, body) values ($1, $2, 'Client A1', 'client', 'In!')`, [groupId, ids.userA1]);
  check("member received group notification", (await q("select * from notifications where kind = 'group'")).length === 1);
});
await as(ids.userB1, async () => {
  check("non-member cannot see group posts", (await q("select * from group_posts")).length === 0);
  check("non-member cannot post",
    await fails(() => q(`insert into group_posts (group_id, author_id, author_name, author_role, body) values ($1, $2, 'B1', 'client', 'hi')`, [groupId, ids.userB1])));
});

console.log("Invites");
let token;
await as(ids.coachA, async () => {
  const c = (await q(`insert into clients (coach_id, full_name, email) values ($1, 'New Client', 'new@client.test') returning id`, [ids.coachA]))[0].id;
  token = (await q(`insert into invites (coach_id, client_id, email) values ($1, $2, 'new@client.test') returning token`, [ids.coachA, c]))[0].token;
});
await as(null, async () => {
  const info = await q(`select * from get_invite($1)`, [token]);
  check("anyone with the link can see invite details", info[0]?.coach_name === "Coach A");
});
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${ids.newUser}', 'NEW@client.test', '{"role":"client","full_name":"New Client"}'),
    ('${ids.wrongEmailUser}', 'other@client.test', '{"role":"client","full_name":"Other"}');
`);
await as(ids.wrongEmailUser, async () => {
  check("invite rejects a different email", await fails(() => q(`select accept_invite($1)`, [token])));
});
await as(ids.coachB, async () => {
  check("coaches cannot accept client invites", await fails(() => q(`select accept_invite($1)`, [token])));
});
await as(ids.newUser, async () => {
  await q(`select accept_invite($1)`, [token]);
  const me = await q("select status, full_name from clients");
  check("invitee is linked and active", me.length === 1 && me[0].status === "active");
  check("invite cannot be reused", await fails(() => q(`select accept_invite($1)`, [token])));
  check("new client can read coach profile", (await q("select * from profiles where id = $1", [ids.coachA])).length === 1);
  check("new client cannot read other coaches' profiles", (await q("select * from profiles where id = $1", [ids.coachB])).length === 0);
});

console.log("Food scan fields & exercise demos");
await as(ids.userA1, async () => {
  const fe = await q(`insert into food_entries (client_id, date, meal, name, calories, fiber, sugar, sodium, source, estimated, portion)
    values ($1, current_date, 'dinner', 'Chicken burrito bowl', 720, 9, 6, 1180, 'scan', true, '1 bowl (450 g)') returning sodium, estimated`, [cA1]);
  check("client saves scanned meal with fiber/sugar/sodium", Number(fe[0]?.sodium) === 1180 && fe[0]?.estimated === true);
  check("client cannot write scan log directly",
    await fails(() => q(`insert into food_scans (client_id, user_id) values ($1, $2)`, [cA1, ids.userA1])));
});
let demoId;
await as(ids.coachA, async () => {
  demoId = (await q(`insert into exercise_demos (coach_id, name, equipment, media_path, media_type, steps, breathing, mistakes)
    values ($1, 'Landmine Press', 'Barbell + landmine', $2, 'video', '["Brace","Press up and forward"]', 'Exhale as you press', '["Flaring ribs"]') returning id`,
    [ids.coachA, `${ids.coachA}/landmine.mp4`]))[0].id;
  await q(`insert into storage.objects (bucket_id, name) values ('exercise-media', $1)`, [`${ids.coachA}/landmine.mp4`]);
  check("coach cannot create a demo for another coach",
    await fails(() => q(`insert into exercise_demos (coach_id, name) values ($1, 'X')`, [ids.coachB])));
  check("coach cannot upload into another coach's media folder",
    await fails(() => q(`insert into storage.objects (bucket_id, name) values ('exercise-media', $1)`, [`${ids.coachB}/x.mp4`])));
});
await as(ids.userA1, async () => {
  check("client sees their coach's custom demos", (await q("select * from exercise_demos")).length === 1);
  check("client can view their coach's demo video",
    (await q(`select * from storage.objects where bucket_id = 'exercise-media'`)).length === 1);
  check("client cannot edit coach's demo",
    (await q(`update exercise_demos set name = 'hacked' where id = $1 returning id`, [demoId])).length === 0);
  check("client cannot upload demo media",
    await fails(() => q(`insert into storage.objects (bucket_id, name) values ('exercise-media', $1)`, [`${ids.coachA}/client.mp4`])));
});
await as(ids.userB1, async () => {
  check("another coach's client cannot see the demo", (await q("select * from exercise_demos")).length === 0);
  check("another coach's client cannot view demo media",
    (await q(`select * from storage.objects where bucket_id = 'exercise-media'`)).length === 0);
});
await as(ids.coachB, async () => {
  check("other coach cannot see the demo", (await q("select * from exercise_demos")).length === 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

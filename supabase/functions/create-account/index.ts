// Creates a confirmed account so new coaches and invited clients can sign in
// immediately (no confirmation email needed). Public endpoint: validates input
// itself, and client accounts require a valid, unused invite for that email.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return reply(400, { error: "Invalid request" });
  }

  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const fullName = String(input.full_name ?? "").trim().slice(0, 120);
  const role = input.role === "client" ? "client" : "coach";
  const business = input.business_name ? String(input.business_name).trim().slice(0, 120) : null;
  const token = input.invite_token ? String(input.invite_token) : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return reply(400, { error: "Enter a valid email address." });
  if (password.length < 8 || password.length > 72) return reply(400, { error: "Use a password between 8 and 72 characters." });
  if (!fullName) return reply(400, { error: "Enter your name." });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (role === "client") {
    const { data: inv, error } = await admin
      .from("invites")
      .select("email, accepted_at, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (error || !inv) return reply(400, { error: "This invite link isn't valid. Ask your coach for a new one." });
    if (inv.accepted_at) return reply(400, { error: "This invite has already been used. Sign in instead." });
    if (new Date(inv.expires_at) < new Date()) return reply(400, { error: "This invite has expired. Ask your coach for a new one." });
    if (inv.email.toLowerCase() !== email) return reply(400, { error: "Use the email address your coach invited." });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: fullName, business_name: role === "coach" ? business : null },
  });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return reply(exists ? 409 : 400, {
      error: exists ? "An account with this email already exists. Sign in instead." : error.message,
    });
  }
  return reply(200, { id: data.user?.id });
});

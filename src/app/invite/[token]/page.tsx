"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { DemoRepo, loadDemoDb } from "@/lib/demo-repo";
import { createAccountAndSignIn, SupabaseRepo, supabase } from "@/lib/supabase-repo";
import type { InviteInfo } from "@/lib/repo";
import { AuthShell } from "@/components/auth-shell";
import Link from "next/link";
import { Button, Field, Input, LinkButton, LoadingBlock, Segmented } from "@/components/ui";
import { DemoBadge } from "@/components/brand";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { liveConfigured, session, enterDemo, refresh, signOut } = useApp();
  const [kind, setKind] = useState<"demo" | "live" | null>(null);
  const [info, setInfo] = useState<InviteInfo | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const demoInvite = loadDemoDb().invites.find((i) => i.token === token);
        if (demoInvite) {
          setKind("demo");
          const i = await new DemoRepo(demoInvite.coach_id).getInvite(token);
          setInfo(i);
          setName(i?.client_name ?? "");
          return;
        }
        if (!liveConfigured) {
          setInfo(null);
          return;
        }
        setKind("live");
        const i = await new SupabaseRepo().getInvite(token);
        setInfo(i);
        setName(i?.client_name ?? "");
      } catch (e) {
        setLoadError((e as Error).message);
      }
    })();
  }, [token, liveConfigured]);

  const finishLive = async () => {
    await new SupabaseRepo().acceptInvite(token);
    await refresh();
    router.replace("/app?welcome=1");
  };

  // A signed-in client (e.g. returning after email confirmation) can accept directly.
  const signedInLiveClient = kind === "live" && session?.mode === "live" && session.role === "client" && !session.clientId;

  const submitDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info) return;
    setBusy(true);
    setError(null);
    try {
      const profile = DemoRepo.createDemoClientAccount(name.trim() || info.client_name, info.email);
      await new DemoRepo(profile.id).acceptInvite(token);
      if (session) await signOut();
      enterDemo(profile.id);
      router.replace("/app?welcome=1");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const submitLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info) return;
    setBusy(true);
    setError(null);
    try {
      const sb = supabase();
      if (session) await sb.auth.signOut();
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        await createAccountAndSignIn({ email: info.email, password, full_name: name.trim(), role: "client", invite_token: token });
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: info.email, password });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "Password is incorrect." : error.message);
      }
      await finishLive();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <AuthShell title="Couldn't load invite" subtitle={loadError}>
        <LinkButton href="/" variant="secondary">Go home</LinkButton>
      </AuthShell>
    );
  }
  if (info === undefined) {
    return (
      <AuthShell title="Loading your invite…">
        <LoadingBlock rows={2} />
      </AuthShell>
    );
  }
  if (!info) {
    return (
      <AuthShell title="Invite not found" subtitle="This link may be mistyped, or it was created on a different deployment. Ask your coach to send a new one.">
        <LinkButton href="/" variant="secondary">Go home</LinkButton>
      </AuthShell>
    );
  }
  if (info.accepted || info.expired) {
    return (
      <AuthShell title={info.accepted ? "Invite already used" : "Invite expired"} subtitle={info.accepted ? "Sign in with the account you created." : `Ask ${info.coach_name} to send a new invite.`}>
        <LinkButton href={kind === "demo" ? "/demo" : "/login"} variant="primary" className="w-full">Sign in</LinkButton>
      </AuthShell>
    );
  }
  const coachLine = info.business_name ? `${info.coach_name} · ${info.business_name}` : info.coach_name;

  return (
    <AuthShell
      title={`Join ${info.coach_name}'s coaching`}
      subtitle={<>Hi {info.client_name.split(" ")[0]}! Create your account to see your plan, log workouts and message your coach.{kind === "demo" && <><br /><DemoBadge className="mt-2" /></>}</>}
    >
      <div className="mb-6 rounded-xl border border-line bg-surface p-4 text-sm">
        <p className="text-muted">Coach</p>
        <p className="font-medium">{coachLine}</p>
        <p className="mt-3 text-muted">Your email</p>
        <p className="font-medium">{info.email}</p>
      </div>

      {signedInLiveClient ? (
        <Button variant="primary" size="lg" className="w-full" loading={busy} onClick={async () => {
          setBusy(true);
          try { await finishLive(); } catch (e) { setError((e as Error).message); setBusy(false); }
        }}>Accept invite</Button>
      ) : kind === "demo" ? (
        <form onSubmit={submitDemo} className="space-y-4">
          <Field label="Your name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <p className="text-xs text-faint">Demo accounts don&apos;t need a password and live only in this browser.</p>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>Create demo client account</Button>
        </form>
      ) : (
        <form onSubmit={submitLive} className="space-y-4">
          <Segmented value={mode} onChange={setMode} options={[{ value: "signup", label: "New account" }, { value: "signin", label: "I have an account" }]} />
          {mode === "signup" && (
            <Field label="Your name">
              <Input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          )}
          <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
            <Input type="password" required autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>{mode === "signup" ? "Create account & join" : "Sign in & join"}</Button>
        <p className="text-xs text-faint">By continuing you agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>, and consent to Liftline processing the health and fitness data you enter.</p>
        </form>
      )}
    </AuthShell>
  );
}

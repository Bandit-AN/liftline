"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase-repo";
import { appUrl } from "@/lib/urls";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, Input, LinkButton } from "@/components/ui";
import { SetupNotice } from "@/components/setup-notice";

export default function Login() {
  const { liveConfigured, session, ready, refresh } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace(session.role === "coach" ? "/coach" : "/app");
  }, [ready, session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Email or password is incorrect." : error.message);
      setBusy(false);
      return;
    }
    await refresh();
  };

  const forgot = async () => {
    if (!email) {
      setError("Enter your email first, then tap “Forgot password”.");
      return;
    }
    setBusy(true);
    const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: appUrl("/reset-password") });
    setBusy(false);
    if (error) setError(error.message);
    else setInfo("Check your inbox for a password reset link.");
  };

  if (!liveConfigured) {
    return (
      <AuthShell title="Sign in" subtitle="Real accounts aren't set up on this deployment yet.">
        <SetupNotice />
        <LinkButton href="/demo" variant="primary" className="mt-5 w-full">Explore the demo instead</LinkButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your coach or client account."
      footer={<>New coach? <Link href="/signup" className="text-accent hover:underline">Create an account</Link>. Clients join through their coach&apos;s invite link.</>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-accent">{info}</p>}
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">Sign in</Button>
        <button type="button" onClick={forgot} className="w-full text-center text-[13px] text-muted hover:text-ink">Forgot password?</button>
      </form>
    </AuthShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { createAccountAndSignIn } from "@/lib/supabase-repo";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, Input, LinkButton } from "@/components/ui";
import { SetupNotice } from "@/components/setup-notice";

export default function Signup() {
  const { liveConfigured, session, ready, refresh } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", business: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace(session.role === "coach" ? "/coach" : "/app");
  }, [ready, session, router]);

  if (!liveConfigured) {
    return (
      <AuthShell title="Create a coach account" subtitle="Real accounts aren't set up on this deployment yet.">
        <SetupNotice />
        <LinkButton href="/demo" variant="primary" className="mt-5 w-full">Explore the demo instead</LinkButton>
      </AuthShell>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    setError(null);
    try {
      await createAccountAndSignIn({ email: form.email.trim(), password: form.password, full_name: form.name.trim(), role: "coach", business_name: form.business.trim() || null });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your coach account"
      subtitle="Free to set up. Invite clients once you're in."
      footer={<>Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Your name">
          <Input required autoComplete="name" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Business name" hint="Optional — shown to clients on their invite.">
          <Input value={form.business} onChange={set("business")} />
        </Field>
        <Field label="Email">
          <Input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input type="password" required autoComplete="new-password" value={form.password} onChange={set("password")} />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">Create account</Button>
        <p className="text-center text-xs text-faint">Are you a client? Use the invite link from your coach.</p>
      </form>
    </AuthShell>
  );
}

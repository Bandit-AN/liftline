"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/lib/supabase-repo";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, Input, LinkButton } from "@/components/ui";

export default function ResetPassword() {
  const { liveConfigured, session, refresh } = useApp();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!liveConfigured) {
    return (
      <AuthShell title="Reset password" subtitle="Real accounts aren't set up on this deployment.">
        <LinkButton href="/demo" variant="primary" className="w-full">Explore the demo</LinkButton>
      </AuthShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    await refresh();
    router.replace(session?.role === "client" ? "/app" : "/coach");
  };

  return (
    <AuthShell title="Choose a new password" subtitle="Opened from the reset link in your email.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">Save password</Button>
      </form>
    </AuthShell>
  );
}

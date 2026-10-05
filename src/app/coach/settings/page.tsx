"use client";

import { useState } from "react";
import { useApp, useSession } from "@/lib/app-context";
import { Button, Card, CardHeader, Field, Input, PageHeader, Unavailable, useToast, useConfirm } from "@/components/ui";
import { DemoBadge } from "@/components/brand";

export default function CoachSettings() {
  const { session, repo } = useSession();
  const ask = useConfirm();
  const { refresh, resetDemoData } = useApp();
  const toast = useToast();
  const [form, setForm] = useState({ full_name: session.profile.full_name, business_name: session.profile.business_name ?? "" });
  const [busy, setBusy] = useState(false);

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader title="Your profile" subtitle="Shown to clients on invites and in messages" />
          <form className="grid gap-4 px-5 pb-5 sm:grid-cols-2" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await repo.update("profiles", session.userId, { full_name: form.full_name.trim(), business_name: form.business_name.trim() || null });
              await refresh();
              toast.success("Profile saved");
            } catch (err) { toast.error(err); } finally { setBusy(false); }
          }}>
            <Field label="Name"><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Business name"><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></Field>
            <Field label="Email" className="sm:col-span-2"><Input value={session.profile.email} disabled /></Field>
            <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="primary" loading={busy}>Save</Button></div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Integrations" subtitle="Planned — not connected in this version" />
          <div className="space-y-2 px-5 pb-5">
            <Unavailable label="Invite & reminder emails" note="Invites are shared as links for now. Requires an email provider." />
            <Unavailable label="Apple Health / Google Fit" note="Steps, sleep and weight sync need a native mobile app." />
            <Unavailable label="Barcode food scanning" note="Needs a food database integration." />
            <Unavailable label="Voice & video messages" note="Text messaging is available today." />
          </div>
        </Card>

        {session.mode === "demo" && (
          <Card>
            <CardHeader title={<span className="flex items-center gap-2">Demo data <DemoBadge /></span>} subtitle="Everything you change is stored only in this browser." />
            <div className="px-5 pb-5">
              <Button variant="danger" onClick={async () => {
                if (!(await ask({ title: "Reset demo data?", body: "All demo changes go back to the original sample data.", confirmLabel: "Reset", danger: true }))) return;
                resetDemoData();
                toast.success("Demo data reset");
              }}>Reset demo data</Button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Mail } from "lucide-react";
import { useSession } from "@/lib/app-context";
import { appUrl } from "@/lib/urls";
import { WEEKDAYS_LONG } from "@/lib/dates";
import type { Client, Invite } from "@/lib/types";
import { Button, Field, Input, Modal, NumberInput, Select, useToast } from "@/components/ui";

export function inviteUrl(token: string) {
  return appUrl(`/invite/${token}`);
}

export function InviteLinkBox({ invite, clientName, coachName }: { invite: Invite; clientName: string; coachName: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { session } = useSession();
  const embedded = typeof window !== "undefined" && !!window.__LIFTLINE_HASH_ROUTER__;
  const url = inviteUrl(invite.token);
  const subject = encodeURIComponent(`${coachName} invited you to Liftline`);
  const body = encodeURIComponent(`Hi ${clientName.split(" ")[0]},\n\nHere's your link to set up your coaching account — you'll see your training plan, log workouts and message me there:\n\n${url}\n\nSee you inside!\n${coachName}`);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input readOnly value={url} onFocus={(e) => e.target.select()} className="font-mono text-xs" aria-label="Invite link" />
        <Button
          aria-label="Copy invite link"
          icon={copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              toast.error("Couldn't access the clipboard — select the link and copy it manually.");
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <a href={`mailto:${invite.email}?subject=${subject}&body=${body}`} className="inline-flex items-center gap-2 text-sm text-accent hover:underline">
        <Mail className="size-4" /> Open an email draft to {invite.email}
      </a>
      {session.mode === "demo" && (
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-[13px] text-muted">
          Demo accounts live only in this browser{embedded ? ", so the link won't work for anyone else" : ""}. To try onboarding yourself, open the invite here as the client.
          <Button size="sm" variant="primary" className="mt-2" onClick={() => router.push(`/invite/${invite.token}`)}>Open invite as {clientName.split(" ")[0]}</Button>
        </div>
      )}
      <p className="text-xs text-faint">Automatic invite emails aren&apos;t set up yet — send this link yourself. It expires {new Date(invite.expires_at).toLocaleDateString()}.</p>
    </div>
  );
}

export function InviteModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (c: Client) => void }) {
  const { session, repo } = useSession();
  const toast = useToast();
  const [form, setForm] = useState({ full_name: "", email: "", goal: "", check_in_day: 0, start_weight: null as number | null, target_weight: null as number | null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ client: Client; invite: Invite } | null>(null);

  const close = () => {
    setCreated(null);
    setForm({ full_name: "", email: "", goal: "", check_in_day: 0, start_weight: null, target_weight: null });
    setError(null);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const email = form.email.trim().toLowerCase();
      const existing = await repo.list("clients", { eq: { coach_id: session.userId, email } });
      if (existing.length) throw new Error(`${existing[0].full_name} already uses that email.`);
      const client = await repo.insert("clients", { ...form, email, full_name: form.full_name.trim(), coach_id: session.userId, status: "invited" });
      const invite = await repo.createInvite(client.id, email);
      setCreated({ client, invite });
      onCreated?.(client);
      toast.success(`${client.full_name} added`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={created ? "Send the invite link" : "Invite a client"}
      footer={created ? <Button variant="primary" onClick={close}>Done</Button> : (
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="invite-form" loading={busy}>Create invite</Button>
        </>
      )}
    >
      {created ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            <span className="text-ink">{created.client.full_name}</span> is set up. When they open this link and create their account, they&apos;ll be connected to you and can see the plans you assign.
          </p>
          <InviteLinkBox invite={created.invite} clientName={created.client.full_name} coachName={session.profile.full_name} />
          <p className="text-xs text-muted">Tip: you can build and assign their plans now — they&apos;ll be waiting when they join.</p>
        </div>
      ) : (
        <form id="invite-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2">
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="Email" className="sm:col-span-2" hint="They must sign up with this address.">
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Main goal" className="sm:col-span-2">
            <Input placeholder="e.g. Lose 5 kg and run a 10k" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </Field>
          <Field label="Check-in day">
            <Select value={form.check_in_day} onChange={(e) => setForm({ ...form, check_in_day: Number(e.target.value) })}>
              {WEEKDAYS_LONG.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Starting weight (kg)">
            <NumberInput step="0.1" value={form.start_weight} onChange={(v) => setForm({ ...form, start_weight: v })} />
          </Field>
          {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

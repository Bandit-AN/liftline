"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, ClipboardCheck, LogOut, UsersRound } from "lucide-react";
import { useApp, useList, useSession } from "@/lib/app-context";
import { WEEKDAYS_LONG } from "@/lib/dates";
import type { NotificationPrefs } from "@/lib/types";
import { Avatar, Button, Card, CardHeader, Field, Input, LoadingBlock, NumberInput, Textarea, Toggle, Unavailable, useToast } from "@/components/ui";
import { DemoBadge } from "@/components/brand";

export default function ClientProfile() {
  const { session, repo } = useSession();
  const { signOut, refresh } = useApp();
  const router = useRouter();
  const toast = useToast();
  const client = useList("clients", { eq: { id: session.clientId! } });
  const c = client.data[0];
  const [form, setForm] = useState({ full_name: "", goal: "", preferences: "", target_weight: null as number | null, height_cm: null as number | null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (c) setForm({ full_name: session.profile.full_name, goal: c.goal, preferences: c.preferences, target_weight: c.target_weight, height_cm: c.height_cm });
  }, [c, session.profile.full_name]);

  const setPref = async (k: keyof NotificationPrefs, v: boolean) => {
    if (!c) return;
    try { await repo.update("clients", c.id, { notification_prefs: { ...c.notification_prefs, [k]: v } }); } catch (e) { toast.error(e); }
  };

  if (client.loading || !c) return <LoadingBlock rows={4} />;

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar name={session.profile.full_name} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{session.profile.full_name}</h1>
          <p className="truncate text-[13px] text-muted">{session.profile.email}</p>
          {session.mode === "demo" && <DemoBadge className="mt-1" />}
        </div>
      </div>

      <Card className="mt-5 overflow-hidden">
        {[
          { href: "/app/check-in", icon: ClipboardCheck, label: "Weekly check-in", sub: `Due ${WEEKDAYS_LONG[c.check_in_day]}s` },
          { href: "/app/community", icon: UsersRound, label: "Community", sub: "Groups from your coach" },
          { href: "/app/notifications", icon: Bell, label: "Notifications", sub: "Messages, feedback and plan updates" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0 hover:bg-surface-2">
            <l.icon className="size-5 text-muted" />
            <div className="flex-1"><p className="text-sm">{l.label}</p><p className="text-xs text-faint">{l.sub}</p></div>
            <ChevronRight className="size-4 text-faint" />
          </Link>
        ))}
      </Card>

      <Card className="mt-5">
        <CardHeader title="Goals & preferences" subtitle="Shared with your coach" />
        <form className="space-y-4 px-4 pb-4" onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await repo.update("clients", c.id, { goal: form.goal, preferences: form.preferences, target_weight: form.target_weight, height_cm: form.height_cm });
            if (form.full_name.trim() && form.full_name.trim() !== session.profile.full_name) {
              await repo.update("profiles", session.userId, { full_name: form.full_name.trim() });
              await refresh();
            }
            toast.success("Profile saved");
          } catch (err) { toast.error(err); } finally { setBusy(false); }
        }}>
          <Field label="Name"><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Main goal"><Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Goal weight (kg)"><NumberInput step="0.1" value={form.target_weight} onChange={(v) => setForm({ ...form, target_weight: v })} /></Field>
            <Field label="Height (cm)"><NumberInput value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: v })} /></Field>
          </div>
          <Field label="Preferences" hint="Food likes/dislikes, equipment, schedule, injuries."><Textarea value={form.preferences} onChange={(e) => setForm({ ...form, preferences: e.target.value })} /></Field>
          <Button type="submit" variant="primary" className="w-full" loading={busy}>Save</Button>
        </form>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Notifications" subtitle="In-app notifications" />
        <div className="divide-y divide-line px-4 pb-2">
          <Toggle label="Messages from coach" checked={c.notification_prefs.messages} onChange={(v) => setPref("messages", v)} />
          <Toggle label="Plan updates" description="When your coach changes your workout or nutrition plan" checked={c.notification_prefs.plan_updates} onChange={(v) => setPref("plan_updates", v)} />
          <Toggle label="Check-in reminders" description="Highlight your check-in on the Today screen when it's due" checked={c.notification_prefs.check_in_reminders} onChange={(v) => setPref("check_in_reminders", v)} />
        </div>
        <p className="px-4 pb-4 text-xs text-faint">Push and email notifications aren&apos;t available yet.</p>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Connected apps" />
        <div className="space-y-2 px-4 pb-4">
          <Unavailable label="Apple Health" note="Step, sleep and weight sync needs the native app." />
          <Unavailable label="Google Fit" note="Step, sleep and weight sync needs the native app." />
        </div>
      </Card>

      <Button variant="ghost" className="mt-6 w-full" icon={<LogOut className="size-4" />} onClick={async () => { await signOut(); router.replace("/"); }}>
        {session.mode === "demo" ? "Exit demo" : "Sign out"}
      </Button>
    </>
  );
}

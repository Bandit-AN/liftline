"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { loadDemoDb } from "@/lib/demo-repo";
import type { Client, Profile } from "@/lib/types";
import { Avatar, Badge, Button, Card, LinkButton, useToast } from "@/components/ui";
import { DemoBadge, Logo } from "@/components/brand";

export default function DemoPicker() {
  const { enterDemo, resetDemoData, signOut, session } = useApp();
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<{ profiles: Profile[]; clients: Client[] } | null>(null);

  useEffect(() => {
    const db = loadDemoDb();
    setData({ profiles: db.profiles, clients: db.clients });
  }, []);

  const go = async (p: Profile) => {
    if (session && session.mode === "live") await signOut();
    enterDemo(p.id);
    router.push(p.role === "coach" ? "/coach" : "/app");
  };

  const reset = () => {
    resetDemoData();
    const db = loadDemoDb();
    setData({ profiles: db.profiles, clients: db.clients });
    toast.success("Demo data reset");
  };

  const coaches = data?.profiles.filter((p) => p.role === "coach") ?? [];
  const invites = data?.clients.filter((c) => c.status === "invited") ?? [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <LinkButton href="/" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />}>Back</LinkButton>
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Demo accounts</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted">Each account sees only what it&apos;s allowed to: coaches see their own clients, clients see their own data.</p>
        </div>
        <Button variant="ghost" size="sm" icon={<RotateCcw className="size-4" />} onClick={reset}>Reset demo data</Button>
      </div>

      {coaches.map((coach) => {
        const clients = data!.clients.filter((c) => c.coach_id === coach.id);
        return (
          <Card key={coach.id} className="mb-4 overflow-hidden">
            <button onClick={() => go(coach)} className="flex w-full items-center gap-3 border-b border-line px-5 py-4 text-left hover:bg-surface-2">
              <Avatar name={coach.full_name} />
              <div className="flex-1">
                <p className="font-medium">{coach.full_name}</p>
                <p className="text-xs text-muted">Coach · {coach.business_name}</p>
              </div>
              <Badge tone="accent">Sign in as coach</Badge>
            </button>
            <ul className="divide-y divide-line">
              {clients.map((c) => {
                const prof = data!.profiles.find((p) => p.id === c.user_id);
                return (
                  <li key={c.id}>
                    {prof ? (
                      <button onClick={() => go(prof)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2">
                        <Avatar name={c.full_name} size={30} />
                        <div className="flex-1">
                          <p className="text-sm">{c.full_name}</p>
                          <p className="text-xs text-faint">{c.goal}</p>
                        </div>
                        <span className="text-xs text-muted">Sign in as client</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 px-5 py-3">
                        <Avatar name={c.full_name} size={30} />
                        <div className="flex-1">
                          <p className="text-sm">{c.full_name}</p>
                          <p className="text-xs text-faint">Invited — hasn&apos;t created an account yet</p>
                        </div>
                        <Badge tone="warn">Invited</Badge>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      {invites.length > 0 && (
        <p className="mt-6 text-[13px] text-muted">
          Try onboarding: open <button className="text-accent underline-offset-2 hover:underline" onClick={() => router.push("/invite/demo-liam-invite")}>Liam&apos;s invite link</button> to create his client account.
        </p>
      )}
    </main>
  );
}

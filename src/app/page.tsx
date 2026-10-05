"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, Dumbbell, LineChart, MessageSquare, Salad, Users } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { DemoBadge, Logo } from "@/components/brand";
import { Button, Card, LinkButton } from "@/components/ui";
import { DEMO_COACH_MAYA } from "@/lib/demo-seed";
import { SetupNotice } from "@/components/setup-notice";

export default function Landing() {
  const { ready, session, enterDemo, liveConfigured } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (ready && session) router.replace(session.role === "coach" ? "/coach" : "/app");
  }, [ready, session, router]);

  const demo = (id: string, to: string) => {
    enterDemo(id);
    router.push(to);
  };

  return (
    <main className="mx-auto max-w-5xl px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <div className="flex gap-2">
          <LinkButton href="/login" variant="ghost" size="sm">Sign in</LinkButton>
          <LinkButton href="/signup" variant="secondary" size="sm">Create coach account</LinkButton>
        </div>
      </header>

      <section className="pt-12 pb-10 md:pt-20">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          Coach more clients <span className="text-accent">without losing the personal touch.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
          Build training and nutrition plans, review weekly check-ins, and message every client from one place. Clients get a simple phone-first app with today&apos;s workout, macros and habits.
        </p>
      </section>

      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Explore the demo</h2>
              <DemoBadge />
            </div>
            <p className="mt-1 text-sm text-muted">Sample coaches, clients and 10 weeks of history. Stored only in this browser — separate from real accounts.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button onClick={() => demo(DEMO_COACH_MAYA, "/coach")} className="group rounded-xl border border-line bg-surface-2 p-4 text-left transition hover:border-accent/50">
            <p className="text-[13px] text-muted">Coach view</p>
            <p className="mt-1 font-medium">Maya Reyes</p>
            <p className="text-xs text-faint">5 clients · Reyes Performance</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[13px] text-accent">Open dashboard <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" /></span>
          </button>
          <button onClick={() => demo("demo-user-jordan", "/app")} className="group rounded-xl border border-line bg-surface-2 p-4 text-left transition hover:border-accent/50">
            <p className="text-[13px] text-muted">Client view</p>
            <p className="mt-1 font-medium">Jordan Ellis</p>
            <p className="text-xs text-faint">Fat loss · coached by Maya</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[13px] text-accent">Open app <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" /></span>
          </button>
          <LinkButton href="/demo" className="h-auto flex-col items-start justify-center rounded-xl p-4 text-left" variant="secondary">
            <span className="text-[13px] text-muted">More accounts</span>
            <span className="font-medium">Pick any demo user</span>
            <span className="text-xs text-faint">2 coaches · 6 clients · invites</span>
          </LinkButton>
        </div>
      </Card>

      {!liveConfigured && <SetupNotice className="mt-6" />}

      <section className="mt-14 grid gap-x-8 gap-y-8 sm:grid-cols-2 md:grid-cols-3">
        {[
          [Dumbbell, "Workout builder", "Reusable templates with sets, reps, rest and cues. Assign and tweak per client."],
          [Salad, "Nutrition targets", "Calories and macros with meal suggestions. Clients log food against their targets."],
          [ClipboardCheck, "Weekly check-ins", "Progress, energy, hunger, sleep and adherence in one inbox with feedback."],
          [LineChart, "Progress tracking", "Weight, measurements and private progress photos with side-by-side comparisons."],
          [MessageSquare, "Private messaging", "One thread per client, visible only to that client and their coach."],
          [Users, "Community groups", "Optional coach-led groups for challenges and accountability."],
        ].map(([Icon, title, body]) => {
          const I = Icon as typeof Dumbbell;
          return (
            <div key={title as string}>
              <I className="size-5 text-accent" />
              <h3 className="mt-3 text-sm font-semibold">{title as string}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{body as string}</p>
            </div>
          );
        })}
      </section>
      <footer className="mt-16 border-t border-line pt-6 text-xs text-faint">
        Liftline · Built for online coaches.
        <Button variant="ghost" size="sm" className="ml-2" onClick={() => router.push("/demo")}>Demo accounts</Button>
      </footer>
    </main>
  );
}

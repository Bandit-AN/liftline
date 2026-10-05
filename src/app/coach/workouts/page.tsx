"use client";

import Link from "next/link";
import { Dumbbell, Plus } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { relativeTime, WEEKDAYS } from "@/lib/dates";
import { Badge, Card, EmptyState, ErrorState, LinkButton, LoadingBlock, PageHeader } from "@/components/ui";

export default function WorkoutTemplates() {
  const { session } = useSession();
  const tpl = useList("workout_templates", { eq: { coach_id: session.userId }, order: { col: "updated_at", asc: false } });
  const plans = useList("workout_plans", { eq: { coach_id: session.userId, active: true } });

  return (
    <>
      <PageHeader
        title="Workout templates"
        subtitle="Build a program once, then assign and tweak it for each client."
        actions={<LinkButton href="/coach/workouts/new" variant="primary" icon={<Plus className="size-4" />}>New template</LinkButton>}
      />
      {tpl.error ? <ErrorState message={tpl.error} onRetry={tpl.reload} /> : tpl.loading ? <LoadingBlock /> : tpl.data.length === 0 ? (
        <EmptyState icon={<Dumbbell className="size-7" />} title="No templates yet" body="Create your first program template — days, exercises, sets, reps, rest and coaching cues." action={<LinkButton href="/coach/workouts/new" variant="primary" icon={<Plus className="size-4" />}>New template</LinkButton>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tpl.data.map((t) => {
            const exCount = t.days.reduce((n, d) => n + d.exercises.length, 0);
            const inUse = plans.data.filter((p) => p.name === t.name).length;
            return (
              <Link key={t.id} href={`/coach/workouts/${t.id}`}>
                <Card className="flex h-full flex-col p-5 transition-colors hover:border-line-strong">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{t.name}</h3>
                    {inUse > 0 && <Badge tone="accent">{inUse} assigned</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted">{t.description || "No description"}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {t.days.map((d) => (
                      <span key={d.id} className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted">
                        {d.name}{d.weekdays.length ? ` · ${d.weekdays.map((w) => WEEKDAYS[w]).join("/")}` : ""}
                      </span>
                    ))}
                  </div>
                  <p className="mt-auto pt-4 text-xs text-faint">{t.days.length} days · {exCount} exercises · edited {relativeTime(t.updated_at)}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

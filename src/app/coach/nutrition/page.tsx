"use client";

import Link from "next/link";
import { Plus, Salad } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { relativeTime } from "@/lib/dates";
import { Card, EmptyState, ErrorState, LinkButton, LoadingBlock, PageHeader } from "@/components/ui";
import { MacroSplit } from "@/components/macro-split";

export default function NutritionTemplates() {
  const { session } = useSession();
  const tpl = useList("nutrition_templates", { eq: { coach_id: session.userId }, order: { col: "updated_at", asc: false } });

  return (
    <>
      <PageHeader
        title="Nutrition templates"
        subtitle="Calorie and macro targets with meal ideas, ready to assign."
        actions={<LinkButton href="/coach/nutrition/new" variant="primary" icon={<Plus className="size-4" />}>New template</LinkButton>}
      />
      {tpl.error ? <ErrorState message={tpl.error} onRetry={tpl.reload} /> : tpl.loading ? <LoadingBlock /> : tpl.data.length === 0 ? (
        <EmptyState icon={<Salad className="size-7" />} title="No nutrition templates yet" body="Set calories, protein, carbs and fat once, then assign to any client." action={<LinkButton href="/coach/nutrition/new" variant="primary" icon={<Plus className="size-4" />}>New template</LinkButton>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tpl.data.map((t) => (
            <Link key={t.id} href={`/coach/nutrition/${t.id}`}>
              <Card className="h-full p-5 transition-colors hover:border-line-strong">
                <h3 className="font-semibold">{t.name}</h3>
                <p className="mt-3 text-3xl font-semibold tnum">{t.calories.toLocaleString()}<span className="ml-1 text-sm font-normal text-muted">kcal</span></p>
                <MacroSplit protein={t.protein} carbs={t.carbs} fat={t.fat} className="mt-4" />
                <p className="mt-4 text-xs text-faint">{t.meals.length} meal suggestions · edited {relativeTime(t.updated_at)}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

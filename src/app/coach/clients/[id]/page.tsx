"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useList } from "@/lib/app-context";
import { checkInState } from "@/lib/stats";
import { Avatar, Badge, EmptyState, ErrorState, LinkButton, LoadingBlock, Tabs } from "@/components/ui";
import { CheckInBadge } from "@/components/coach/checkin-badge";
import { PlanTab } from "@/components/coach/profile/plan-tab";
import { CheckInsTab, ClientSettingsTab, NotesTab, NutritionTab, OverviewTab, ProgressTab, TrainingTab } from "@/components/coach/profile/tabs";
import { withSuspense } from "@/components/with-suspense";

const TABS = ["overview", "plan", "progress", "training", "nutrition", "check-ins", "notes", "settings"] as const;
type Tab = (typeof TABS)[number];

function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const tab = (TABS.includes(params.get("tab") as Tab) ? params.get("tab") : "overview") as Tab;
  const goTo = (t: string) => router.replace(`/coach/clients/${id}?tab=${t}`, { scroll: false });

  const client = useList("clients", { eq: { id } });
  const metrics = useList("body_metrics", { eq: { client_id: id }, order: { col: "date" } });
  const checkIns = useList("check_ins", { eq: { client_id: id }, order: { col: "week_of", asc: false } });
  const c = client.data[0];

  if (client.error) return <ErrorState message={client.error} onRetry={client.reload} />;
  if (client.loading) return <LoadingBlock rows={5} />;
  if (!c) return <EmptyState title="Client not found" body="They may have been removed, or they belong to another coach." action={<LinkButton href="/coach/clients">Back to clients</LinkButton>} />;

  const st = checkInState(c, checkIns.data);
  const pending = checkIns.data.filter((x) => x.status === "submitted").length;

  return (
    <>
      <LinkButton href="/coach/clients" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} className="-ml-3 mb-3">Clients</LinkButton>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={c.full_name} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{c.full_name}</h1>
            {c.status === "invited" && <Badge tone="warn">Invited</Badge>}
            {c.status === "paused" && <Badge>Paused</Badge>}
            {c.status === "active" && <CheckInBadge state={st.state} due={st.due} />}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{c.goal || "No goal set"} · {c.email}</p>
        </div>
        <LinkButton href={`/coach/messages?client=${c.id}`} icon={<MessageSquare className="size-4" />}>Message</LinkButton>
      </div>

      <Tabs<Tab> value={tab} onChange={goTo} tabs={[
        { value: "overview", label: "Overview" },
        { value: "plan", label: "Plan" },
        { value: "progress", label: "Progress" },
        { value: "training", label: "Workout log" },
        { value: "nutrition", label: "Nutrition log" },
        { value: "check-ins", label: "Check-ins", count: pending },
        { value: "notes", label: "Notes" },
        { value: "settings", label: "Settings" },
      ]} />

      {metrics.loading || checkIns.loading ? <LoadingBlock /> : (
        <>
          {tab === "overview" && <OverviewTab client={c} metrics={metrics.data} checkIns={checkIns.data} goTo={goTo} />}
          {tab === "plan" && <PlanTab client={c} />}
          {tab === "progress" && <ProgressTab client={c} metrics={metrics.data} />}
          {tab === "training" && <TrainingTab client={c} />}
          {tab === "nutrition" && <NutritionTab client={c} />}
          {tab === "check-ins" && <CheckInsTab checkIns={checkIns.data} />}
          {tab === "notes" && <NotesTab client={c} />}
          {tab === "settings" && <ClientSettingsTab key={c.id + c.status} client={c} />}
        </>
      )}
    </>
  );
}

export default withSuspense(ClientProfile);

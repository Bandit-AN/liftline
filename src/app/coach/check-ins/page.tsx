"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { relativeTime } from "@/lib/dates";
import { Avatar, Button, Card, cx, EmptyState, ErrorState, LoadingBlock, PageHeader, Segmented } from "@/components/ui";
import { CheckInAnswers, CheckInReview, CheckInStatusBadge, weekLabel } from "@/components/checkin-detail";
import { withSuspense } from "@/components/with-suspense";

function CheckInInbox() {
  const { session } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("id");
  const [filter, setFilter] = useState<"submitted" | "reviewed" | "all">("submitted");
  const cis = useList("check_ins", { eq: { coach_id: session.userId }, order: { col: "submitted_at", asc: false }, limit: 200 });
  const clients = useList("clients", { eq: { coach_id: session.userId } });
  const byId = Object.fromEntries(clients.data.map((c) => [c.id, c]));

  const list = useMemo(() => cis.data.filter((c) => filter === "all" || c.status === filter), [cis.data, filter]);
  const selected = cis.data.find((c) => c.id === selectedId) ?? null;
  const prev = selected ? cis.data.filter((c) => c.client_id === selected.client_id && c.week_of < selected.week_of).sort((a, b) => (a.week_of < b.week_of ? 1 : -1))[0] : undefined;
  const pendingCount = cis.data.filter((c) => c.status === "submitted").length;

  const open = (id: string) => router.push(`/coach/check-ins?id=${id}`, { scroll: false });

  return (
    <>
      <PageHeader title="Check-ins" subtitle={pendingCount ? `${pendingCount} waiting for review` : "You're all caught up"} />
      {cis.error ? <ErrorState message={cis.error} onRetry={cis.reload} /> : (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className={cx(selected && "hidden lg:block")}>
            <Segmented className="mb-3" value={filter} onChange={setFilter} options={[
              { value: "submitted", label: `Needs review ${pendingCount}` },
              { value: "reviewed", label: "Reviewed" },
              { value: "all", label: "All" },
            ]} />
            {cis.loading ? <LoadingBlock rows={5} /> : list.length === 0 ? (
              <EmptyState icon={<ClipboardCheck className="size-6" />} title={filter === "submitted" ? "No check-ins waiting" : "No check-ins yet"} body="Clients submit weekly check-ins from their app." />
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {list.map((ci) => {
                    const c = byId[ci.client_id];
                    return (
                      <li key={ci.id}>
                        <button onClick={() => open(ci.id)} className={cx("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2", ci.id === selectedId && "bg-surface-2")}>
                          <Avatar name={c?.full_name ?? "?"} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{c?.full_name ?? "Client"}</p>
                            <p className="truncate text-xs text-muted">{weekLabel(ci)} · {relativeTime(ci.submitted_at)}</p>
                          </div>
                          <CheckInStatusBadge ci={ci} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>

          <div className={cx(!selected && "hidden lg:block")}>
            {selected ? (
              <Card className="p-5">
                <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} className="-ml-2 mb-3 lg:hidden" onClick={() => router.push("/coach/check-ins")}>All check-ins</Button>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <Avatar name={byId[selected.client_id]?.full_name ?? "?"} size={40} />
                  <div className="flex-1">
                    <Link href={`/coach/clients/${selected.client_id}`} className="font-semibold hover:underline">{byId[selected.client_id]?.full_name}</Link>
                    <p className="text-[13px] text-muted">{weekLabel(selected)} · submitted {relativeTime(selected.submitted_at)}</p>
                  </div>
                  <CheckInStatusBadge ci={selected} />
                </div>
                <CheckInAnswers ci={selected} prevWeight={prev?.weight} />
                <div className="mt-6 border-t border-line pt-5">
                  <CheckInReview key={selected.id} ci={selected} onDone={() => {
                    const next = cis.data.find((c) => c.status === "submitted" && c.id !== selected.id);
                    if (next) setTimeout(() => open(next.id), 400);
                  }} />
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/coach/clients/${selected.client_id}`} className="text-[13px] text-accent hover:underline">Open full profile</Link>
                  <span className="text-faint">·</span>
                  <Link href={`/coach/messages?client=${selected.client_id}`} className="text-[13px] text-accent hover:underline">Message</Link>
                </div>
              </Card>
            ) : (
              <EmptyState className="h-full min-h-64" title="Select a check-in" body="Pick one from the list to review answers and leave feedback." />
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default withSuspense(CheckInInbox);

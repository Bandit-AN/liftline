"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, UserPlus, Users } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { addDays, relativeTime, today } from "@/lib/dates";
import { checkInState } from "@/lib/stats";
import type { ClientStatus } from "@/lib/types";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, LoadingBlock, PageHeader, Segmented } from "@/components/ui";
import { InviteModal } from "@/components/coach/invite-modal";
import { CheckInBadge } from "@/components/coach/checkin-badge";
import { withSuspense } from "@/components/with-suspense";

function ClientsPage() {
  const { session } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | ClientStatus>("all");
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (params.get("invite")) setInviteOpen(true);
  }, [params]);

  const clients = useList("clients", { eq: { coach_id: session.userId }, order: { col: "full_name" } });
  const checkIns = useList("check_ins", { eq: { coach_id: session.userId }, gte: { week_of: addDays(today(), -14) } });
  const plans = useList("workout_plans", { eq: { coach_id: session.userId, active: true } });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return clients.data
      .filter((c) => filter === "all" || c.status === filter)
      .filter((c) => !s || c.full_name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.goal.toLowerCase().includes(s));
  }, [clients.data, q, filter]);

  const counts = {
    all: clients.data.length,
    active: clients.data.filter((c) => c.status === "active").length,
    invited: clients.data.filter((c) => c.status === "invited").length,
    paused: clients.data.filter((c) => c.status === "paused").length,
  };

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${counts.active} active · ${counts.invited} invited`}
        actions={<Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setInviteOpen(true)}>Invite client</Button>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input placeholder="Search by name, email or goal" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Search clients" />
        </div>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: "all", label: `All ${counts.all}` },
          { value: "active", label: `Active ${counts.active}` },
          { value: "invited", label: `Invited ${counts.invited}` },
          { value: "paused", label: `Paused ${counts.paused}` },
        ]} />
      </div>

      {clients.error ? <ErrorState message={clients.error} onRetry={clients.reload} /> : clients.loading ? <LoadingBlock rows={5} /> : clients.data.length === 0 ? (
        <EmptyState icon={<Users className="size-7" />} title="No clients yet" body="Invite your first client — you can build their plan before they join." action={<Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setInviteOpen(true)}>Invite client</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState title="No matches" body="Try a different search or filter." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="hidden border-b border-line text-left text-xs text-muted md:table-header-group">
              <tr>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">Goal</th>
                <th className="px-3 py-3 font-medium">Program</th>
                <th className="px-3 py-3 font-medium">Last activity</th>
                <th className="px-5 py-3 font-medium">Check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => {
                const st = checkInState(c, checkIns.data);
                const plan = plans.data.find((p) => p.client_id === c.id);
                const stale = c.last_activity_at && Date.now() - new Date(c.last_activity_at).getTime() > 4 * 864e5;
                return (
                  <tr key={c.id} onClick={() => router.push(`/coach/clients/${c.id}`)} className="cursor-pointer hover:bg-surface-2">
                    <td className="px-5 py-3.5">
                      <Link href={`/coach/clients/${c.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <Avatar name={c.full_name} size={34} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.full_name}</p>
                          <p className="truncate text-xs text-muted md:hidden">{c.goal || "No goal set"}</p>
                          <div className="mt-1 flex gap-2 md:hidden">
                            {c.status === "active" ? <CheckInBadge state={st.state} due={st.due} /> : <Badge tone="warn">{c.status}</Badge>}
                            <span className="text-xs text-faint">{relativeTime(c.last_activity_at)}</span>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="hidden max-w-[220px] truncate px-3 py-3.5 text-muted md:table-cell">{c.goal || "—"}</td>
                    <td className="hidden px-3 py-3.5 text-muted md:table-cell">{plan?.name ?? <span className="text-faint">No plan</span>}</td>
                    <td className={`hidden px-3 py-3.5 md:table-cell ${stale ? "text-warn" : "text-muted"}`}>{c.status === "invited" ? <Badge tone="warn">Invited</Badge> : relativeTime(c.last_activity_at)}</td>
                    <td className="hidden px-5 py-3.5 md:table-cell">{c.status === "paused" ? <Badge>Paused</Badge> : <CheckInBadge state={st.state} due={st.due} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <InviteModal open={inviteOpen} onClose={() => { setInviteOpen(false); if (params.get("invite")) router.replace("/coach/clients"); }} />
    </>
  );
}

export default withSuspense(ClientsPage);

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UsersRound } from "lucide-react";
import { useList } from "@/lib/app-context";
import { EmptyState, ErrorState, LoadingBlock, Segmented } from "@/components/ui";
import { GroupFeed } from "@/components/group-feed";
import { withSuspense } from "@/components/with-suspense";

function Community() {
  const params = useSearchParams();
  const groups = useList("groups", { order: { col: "created_at" } });
  const members = useList("group_members", {});
  const [sel, setSel] = useState<string | null>(params.get("group"));
  useEffect(() => {
    if (!sel && groups.data[0]) setSel(groups.data[0].id);
  }, [groups.data, sel]);
  const g = groups.data.find((x) => x.id === sel);

  if (groups.error) return <ErrorState message={groups.error} onRetry={groups.reload} />;
  if (groups.loading) return <LoadingBlock />;
  if (!groups.data.length) return <EmptyState icon={<UsersRound className="size-7" />} title="No community groups" body="If your coach adds you to a group, you'll see it here." />;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
      {groups.data.length > 1 && <Segmented className="mt-3" value={sel ?? ""} onChange={setSel} options={groups.data.map((x) => ({ value: x.id, label: x.name }))} />}
      {g && (
        <>
          <div className="mb-4 mt-3">
            <p className="font-semibold">{g.name}</p>
            <p className="text-[13px] text-muted">{g.description} · {members.data.filter((m) => m.group_id === g.id).length} members</p>
          </div>
          <GroupFeed groupId={g.id} isCoach={false} />
        </>
      )}
    </>
  );
}

export default withSuspense(Community);

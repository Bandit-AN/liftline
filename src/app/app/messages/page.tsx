"use client";

import { useList, useSession } from "@/lib/app-context";
import { Avatar, LoadingBlock } from "@/components/ui";
import { ChatThread } from "@/components/chat-thread";

export default function ClientMessages() {
  const { session } = useSession();
  const client = useList("clients", { eq: { id: session.clientId! } });
  const coachId = client.data[0]?.coach_id;
  const coach = useList("profiles", coachId ? { eq: { id: coachId } } : null);
  const name = coach.data[0]?.full_name ?? "your coach";

  return (
    <div className="flex h-[calc(100dvh-56px-64px-env(safe-area-inset-bottom))] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        {coach.loading ? <LoadingBlock rows={1} /> : (
          <>
            <Avatar name={name} size={34} />
            <div>
              <p className="text-sm font-semibold">{name}</p>
              <p className="text-xs text-muted">{coach.data[0]?.business_name ?? "Your coach"} · private chat</p>
            </div>
          </>
        )}
      </div>
      <ChatThread clientId={session.clientId!} otherName={name} className="flex-1" />
    </div>
  );
}

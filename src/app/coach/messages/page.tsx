"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Search } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { relativeTime } from "@/lib/dates";
import { Avatar, Card, cx, EmptyState, ErrorState, IconButton, Input, LoadingBlock } from "@/components/ui";
import { ChatThread } from "@/components/chat-thread";
import { withSuspense } from "@/components/with-suspense";

function CoachMessages() {
  const { session } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const selected = params.get("client");
  const [q, setQ] = useState("");
  const clients = useList("clients", { eq: { coach_id: session.userId }, order: { col: "full_name" } });
  const msgs = useList("messages", { order: { col: "created_at", asc: false }, limit: 500 });

  const threads = useMemo(() => {
    return clients.data
      .map((c) => {
        const mine = msgs.data.filter((m) => m.client_id === c.id);
        return { client: c, last: mine[0], unread: mine.filter((m) => m.sender_role === "client" && !m.read_at).length };
      })
      .filter((t) => !q || t.client.full_name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));
  }, [clients.data, msgs.data, q]);

  const current = clients.data.find((c) => c.id === selected);

  return (
    <div className="-mx-4 -my-6 md:-mx-8 md:-my-8">
      <div className="grid h-[calc(100dvh-56px)] md:grid-cols-[300px_1fr]">
        <aside className={cx("flex min-h-0 flex-col border-r border-line", current && "hidden md:flex")}>
          <div className="border-b border-line p-4">
            <h1 className="mb-3 text-lg font-semibold">Messages</h1>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <Input placeholder="Search clients" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Search conversations" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {clients.error || msgs.error ? <div className="p-4"><ErrorState message={(clients.error || msgs.error)!} /></div> : clients.loading || msgs.loading ? <div className="p-4"><LoadingBlock /></div> : threads.length === 0 ? (
              <EmptyState className="m-4" title="No clients yet" body="Invite a client to start messaging." />
            ) : (
              <ul>
                {threads.map(({ client: c, last, unread }) => (
                  <li key={c.id}>
                    <button onClick={() => router.push(`/coach/messages?client=${c.id}`)} className={cx("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2", selected === c.id && "bg-surface-2")}>
                      <Avatar name={c.full_name} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={cx("truncate text-sm", unread && "font-semibold")}>{c.full_name}</p>
                          {last && <span className="shrink-0 text-[11px] text-faint">{relativeTime(last.created_at)}</span>}
                        </div>
                        <p className={cx("truncate text-[13px]", unread ? "text-ink" : "text-muted")}>
                          {last ? `${last.sender_role === "coach" ? "You: " : ""}${last.body}` : c.status === "invited" ? "Invited — not joined yet" : "No messages yet"}
                        </p>
                      </div>
                      {unread > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-ink">{unread}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <section className={cx("flex min-h-0 flex-col", !current && "hidden md:flex")}>
          {current ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <IconButton label="Back to conversations" className="md:hidden" onClick={() => router.push("/coach/messages")}><ArrowLeft className="size-4" /></IconButton>
                <Avatar name={current.full_name} size={32} />
                <div className="min-w-0 flex-1">
                  <Link href={`/coach/clients/${current.id}`} className="truncate text-sm font-semibold hover:underline">{current.full_name}</Link>
                  <p className="truncate text-xs text-muted">{current.goal || current.email}</p>
                </div>
              </div>
              {current.status === "invited" && <p className="border-b border-line bg-warn/5 px-4 py-2 text-xs text-warn">{current.full_name.split(" ")[0]} hasn&apos;t joined yet — they&apos;ll see your messages once they accept the invite.</p>}
              <ChatThread key={current.id} clientId={current.id} otherName={current.full_name} className="flex-1" />
            </>
          ) : (
            <Card className="m-6 flex flex-1 items-center justify-center border-dashed">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-3 size-6 text-faint" />
                <p className="text-sm font-medium">Select a conversation</p>
                <p className="mt-1 text-[13px] text-muted">Each thread is private to you and that client.</p>
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

export default withSuspense(CoachMessages);

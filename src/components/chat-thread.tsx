"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Mic, Send } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { fmtDate, fmtTime, toDateStr, today } from "@/lib/dates";
import type { Message } from "@/lib/types";
import { cx, ErrorState, IconButton, LoadingBlock, useToast } from "./ui";

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

export function ChatThread({ clientId, otherName, className }: { clientId: string; otherName: string; className?: string }) {
  const { session, repo } = useSession();
  const toast = useToast();
  const msgs = useList("messages", { eq: { client_id: clientId }, order: { col: "created_at" } });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to newest and mark the other side's messages as read.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    const unread = msgs.data.filter((m) => !m.read_at && m.sender_id !== session.userId);
    if (unread.length) {
      const at = new Date().toISOString();
      Promise.all(unread.map((m) => repo.update("messages", m.id, { read_at: at }))).catch(() => {});
    }
  }, [msgs.data, repo, session.userId]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await repo.insert("messages", { client_id: clientId, sender_id: session.userId, sender_role: session.role, body });
      setText("");
      inputRef.current?.focus();
    } catch (e) {
      toast.error(e);
    } finally {
      setSending(false);
    }
  };

  const groups: { day: string; items: Message[] }[] = [];
  for (const m of msgs.data) {
    const k = dayKey(m.created_at);
    if (groups.at(-1)?.day !== k) groups.push({ day: k, items: [] });
    groups.at(-1)!.items.push(m);
  }

  return (
    <div className={cx("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {msgs.error ? <ErrorState message={msgs.error} onRetry={msgs.reload} /> : msgs.loading ? <LoadingBlock rows={4} /> : msgs.data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <Lock className="mb-3 size-5 text-faint" />
            <p className="text-sm font-medium">Start the conversation</p>
            <p className="mt-1 max-w-xs text-[13px] text-muted">Messages here are private between you and {otherName}.</p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.day}>
              <p className="my-4 text-center text-[11px] uppercase tracking-wide text-faint">{(() => {
                const d = toDateStr(new Date(g.items[0].created_at));
                return d === today() ? "Today" : fmtDate(d, { weekday: "short", month: "short", day: "numeric" });
              })()}</p>
              <div className="space-y-1.5">
                {g.items.map((m) => {
                  const mine = m.sender_id === session.userId;
                  return (
                    <div key={m.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cx("max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug", mine ? "rounded-br-md bg-accent text-accent-ink" : "rounded-bl-md bg-surface-2 text-ink")}>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={cx("mt-0.5 text-[10.5px]", mine ? "text-accent-ink/60" : "text-faint")}>
                          {fmtTime(m.created_at)}{mine && m.read_at ? " · Seen" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-end gap-2 border-t border-line bg-surface p-3"
      >
        <IconButton type="button" label="Voice and video messages aren't available yet" disabled title="Voice and video messages aren't available yet">
          <Mic className="size-4" />
        </IconButton>
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${otherName.split(" ")[0]}…`}
          aria-label="Message"
          maxLength={5000}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-faint focus:border-accent/60 focus:outline-none"
        />
        <button type="submit" disabled={!text.trim() || sending} aria-label="Send message" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink transition disabled:opacity-40">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

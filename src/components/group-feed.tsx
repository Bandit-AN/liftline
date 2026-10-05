"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { relativeTime } from "@/lib/dates";
import { Avatar, Badge, Button, EmptyState, ErrorState, IconButton, LoadingBlock, Textarea, useToast, useConfirm } from "./ui";

export function GroupFeed({ groupId, isCoach }: { groupId: string; isCoach: boolean }) {
  const { session, repo } = useSession();
  const ask = useConfirm();
  const toast = useToast();
  const posts = useList("group_posts", { eq: { group_id: groupId }, order: { col: "created_at", asc: false } });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await repo.insert("group_posts", { group_id: groupId, author_id: session.userId, author_name: session.profile.full_name, author_role: session.role, body: text.trim() });
      setText("");
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-line bg-surface p-3">
        <Textarea rows={2} className="min-h-0 border-0 bg-transparent px-1 focus:ring-0" placeholder={isCoach ? "Share a challenge, tip or announcement…" : "Share a win or ask the group…"} value={text} onChange={(e) => setText(e.target.value)} aria-label="New post" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-faint">Visible to everyone in this group</span>
          <Button size="sm" variant="primary" icon={<Send className="size-3.5" />} disabled={!text.trim()} loading={busy} onClick={post}>Post</Button>
        </div>
      </div>
      {posts.error ? <ErrorState message={posts.error} onRetry={posts.reload} /> : posts.loading ? <LoadingBlock /> : posts.data.length === 0 ? (
        <EmptyState title="No posts yet" body={isCoach ? "Kick things off with a weekly challenge." : "Be the first to post."} />
      ) : (
        <ul className="space-y-3">
          {posts.data.map((p) => (
            <li key={p.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2.5">
                <Avatar name={p.author_name} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">{p.author_name}{p.author_role === "coach" && <Badge tone="accent">Coach</Badge>}</p>
                  <p className="text-xs text-faint">{relativeTime(p.created_at)}</p>
                </div>
                {(p.author_id === session.userId || isCoach) && (
                  <IconButton label="Delete post" onClick={async () => {
                    if (!(await ask({ title: "Delete this post?", confirmLabel: "Delete", danger: true }))) return;
                    try { await repo.remove("group_posts", p.id); } catch (e) { toast.error(e); }
                  }}><Trash2 className="size-4" /></IconButton>
                )}
              </div>
              <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed">{p.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

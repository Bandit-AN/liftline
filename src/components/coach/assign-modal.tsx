"use client";

import { useState } from "react";
import { useList, useSession } from "@/lib/app-context";
import { Avatar, Button, cx, EmptyState, LoadingBlock, Modal } from "@/components/ui";

/** Pick one or more clients; `onAssign` runs per client. */
export function AssignModal({ open, onClose, title, onAssign, currentLabel }: {
  open: boolean;
  onClose: () => void;
  title: string;
  onAssign: (clientIds: string[]) => Promise<void>;
  currentLabel?: (clientId: string) => string | undefined;
}) {
  const { session } = useSession();
  const clients = useList("clients", open ? { eq: { coach_id: session.userId }, order: { col: "full_name" } } : null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const eligible = clients.data.filter((c) => c.status !== "paused");

  return (
    <Modal
      open={open}
      onClose={() => { setPicked([]); onClose(); }}
      title={title}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!picked.length} loading={busy} onClick={async () => {
          setBusy(true);
          try { await onAssign(picked); setPicked([]); } finally { setBusy(false); }
        }}>Assign to {picked.length || ""} client{picked.length === 1 ? "" : "s"}</Button>
      </>}
    >
      <p className="mb-3 text-[13px] text-muted">This replaces each client&apos;s current plan. Their old plan stays in their history.</p>
      {clients.loading ? <LoadingBlock /> : eligible.length === 0 ? <EmptyState title="No clients to assign" body="Invite a client first." /> : (
        <ul className="space-y-1.5">
          {eligible.map((c) => {
            const on = picked.includes(c.id);
            const cur = currentLabel?.(c.id);
            return (
              <li key={c.id}>
                <button type="button" onClick={() => setPicked(on ? picked.filter((x) => x !== c.id) : [...picked, c.id])}
                  className={cx("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition", on ? "border-accent/60 bg-accent/5" : "border-line hover:bg-surface-2")}>
                  <Avatar name={c.full_name} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{c.full_name}</p>
                    <p className="truncate text-xs text-faint">{cur ? `Current: ${cur}` : "No active plan"}{c.status === "invited" ? " · invited" : ""}</p>
                  </div>
                  <span className={cx("size-4 rounded border", on ? "border-accent bg-accent" : "border-line-strong")} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

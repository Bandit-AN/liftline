"use client";

import { useEffect, useState } from "react";
import { Plus, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { Avatar, Button, Card, CardHeader, cx, EmptyState, ErrorState, Field, IconButton, Input, LoadingBlock, Modal, PageHeader, Select, Textarea, useToast, useConfirm } from "@/components/ui";
import { GroupFeed } from "@/components/group-feed";

export default function CoachCommunity() {
  const { session, repo } = useSession();
  const ask = useConfirm();
  const toast = useToast();
  const groups = useList("groups", { eq: { coach_id: session.userId }, order: { col: "created_at" } });
  const members = useList("group_members", {});
  const clients = useList("clients", { eq: { coach_id: session.userId }, order: { col: "full_name" } });
  const [sel, setSel] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [addId, setAddId] = useState("");

  useEffect(() => {
    if (!sel && groups.data.length) setSel(groups.data[0].id);
  }, [groups.data, sel]);

  const group = groups.data.find((g) => g.id === sel);
  const groupMembers = members.data.filter((m) => m.group_id === sel);
  const memberClients = groupMembers.map((m) => ({ m, c: clients.data.find((c) => c.id === m.client_id) })).filter((x) => x.c);
  const addable = clients.data.filter((c) => !groupMembers.some((m) => m.client_id === c.id));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const g = await repo.insert("groups", { coach_id: session.userId, name: form.name.trim(), description: form.description.trim() });
      setSel(g.id);
      setCreateOpen(false);
      setForm({ name: "", description: "" });
      toast.success("Group created");
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Community"
        subtitle="Optional coach-led groups for challenges and accountability. Only members can see a group."
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>New group</Button>}
      />
      {groups.error ? <ErrorState message={groups.error} onRetry={groups.reload} /> : groups.loading ? <LoadingBlock /> : groups.data.length === 0 ? (
        <EmptyState icon={<UsersRound className="size-7" />} title="No groups yet" body="Create a group for a cohort or challenge, then add clients to it." action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>New group</Button>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr_280px]">
          <div className="space-y-1">
            {groups.data.map((g) => (
              <button key={g.id} onClick={() => setSel(g.id)} className={cx("w-full rounded-xl px-3 py-2.5 text-left", g.id === sel ? "bg-surface-2" : "hover:bg-surface-2/60")}>
                <p className="text-sm font-medium">{g.name}</p>
                <p className="text-xs text-muted">{members.data.filter((m) => m.group_id === g.id).length} members</p>
              </button>
            ))}
          </div>
          {group && (
            <>
              <div>
                <h2 className="text-lg font-semibold">{group.name}</h2>
                {group.description && <p className="mb-4 mt-0.5 text-sm text-muted">{group.description}</p>}
                <GroupFeed groupId={group.id} isCoach />
              </div>
              <Card className="self-start">
                <CardHeader title="Members" subtitle={`${memberClients.length} client${memberClients.length === 1 ? "" : "s"}`} />
                <div className="px-5 pb-5">
                  <div className="mb-3 flex gap-2">
                    <Select aria-label="Add client to group" value={addId} onChange={(e) => setAddId(e.target.value)}>
                      <option value="">Add a client…</option>
                      {addable.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </Select>
                    <IconButton label="Add member" disabled={!addId} onClick={async () => {
                      try { await repo.insert("group_members", { group_id: group.id, client_id: addId }); setAddId(""); toast.success("Member added"); } catch (e) { toast.error(e); }
                    }}><UserPlus className="size-4" /></IconButton>
                  </div>
                  {memberClients.length === 0 ? <p className="text-[13px] text-muted">No members yet.</p> : (
                    <ul className="space-y-2">
                      {memberClients.map(({ m, c }) => (
                        <li key={m.id} className="flex items-center gap-2.5">
                          <Avatar name={c!.full_name} size={28} />
                          <span className="flex-1 truncate text-sm">{c!.full_name}</span>
                          <IconButton label={`Remove ${c!.full_name}`} onClick={async () => {
                            try { await repo.remove("group_members", m.id); } catch (e) { toast.error(e); }
                          }}><UserMinus className="size-4" /></IconButton>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button variant="danger" size="sm" className="mt-5 w-full" onClick={async () => {
                    if (!(await ask({ title: `Delete “${group.name}”?`, body: "The group and all its posts will be removed.", confirmLabel: "Delete group", danger: true }))) return;
                    try { await repo.remove("groups", group.id); setSel(null); toast.success("Group deleted"); } catch (e) { toast.error(e); }
                  }}>Delete group</Button>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New group" footer={<>
        <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
        <Button variant="primary" type="submit" form="group-form" loading={busy}>Create group</Button>
      </>}>
        <form id="group-form" onSubmit={create} className="space-y-4">
          <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Spring Shred 2027" /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </form>
      </Modal>
    </>
  );
}

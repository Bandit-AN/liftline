"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Send, Trash2 } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { assignWorkout } from "@/lib/assign";
import type { WorkoutDay } from "@/lib/types";
import { Button, Card, EmptyState, ErrorState, Field, Input, LinkButton, LoadingBlock, PageHeader, Textarea, useToast, useConfirm } from "@/components/ui";
import { blankDay, validateDays, WorkoutEditor } from "@/components/coach/workout-editor";
import { AssignModal } from "@/components/coach/assign-modal";

export default function WorkoutTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { session, repo } = useSession();
  const ask = useConfirm();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(isNew ? "ready" : "loading");
  const [loadErr, setLoadErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const plans = useList("workout_plans", { eq: { coach_id: session.userId, active: true } });

  useEffect(() => {
    if (isNew) {
      setDays([blankDay(1)]);
      return;
    }
    repo.get("workout_templates", id).then((t) => {
      if (!t) return setState("missing");
      setName(t.name);
      setDescription(t.description);
      setDays(t.days);
      setState("ready");
    }).catch((e) => { setLoadErr(e.message); setState("error"); });
  }, [id, isNew, repo]);

  const update = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setDirty(true); };

  const save = async (): Promise<string | null> => {
    if (!name.trim()) { toast.error("Give the template a name."); return null; }
    const err = validateDays(days);
    if (err) { toast.error(err); return null; }
    setSaving(true);
    try {
      if (isNew) {
        const t = await repo.insert("workout_templates", { coach_id: session.userId, name: name.trim(), description, days });
        toast.success("Template created");
        setDirty(false);
        router.replace(`/coach/workouts/${t.id}`);
        return t.id;
      }
      await repo.update("workout_templates", id, { name: name.trim(), description, days, updated_at: new Date().toISOString() });
      toast.success("Template saved");
      setDirty(false);
      return id;
    } catch (e) {
      toast.error(e);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await ask({ title: `Delete “${name}”?`, body: "Plans already assigned to clients aren't affected.", confirmLabel: "Delete", danger: true }))) return;
    try {
      await repo.remove("workout_templates", id);
      toast.success("Template deleted");
      router.replace("/coach/workouts");
    } catch (e) {
      toast.error(e);
    }
  };

  if (state === "loading") return <LoadingBlock rows={4} />;
  if (state === "error") return <ErrorState message={loadErr} />;
  if (state === "missing") return <EmptyState title="Template not found" body="It may have been deleted." action={<LinkButton href="/coach/workouts">Back to templates</LinkButton>} />;

  return (
    <>
      <LinkButton href="/coach/workouts" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} className="-ml-3 mb-2">Templates</LinkButton>
      <PageHeader
        title={isNew ? "New workout template" : name || "Untitled template"}
        subtitle={dirty ? "Unsaved changes" : isNew ? "Days, exercises, sets, reps, rest and coaching cues" : "All changes saved"}
        actions={<>
          {!isNew && <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={remove}>Delete</Button>}
          {!isNew && <Button icon={<Send className="size-4" />} onClick={async () => { if (dirty && !(await save())) return; setAssignOpen(true); }}>Assign to clients</Button>}
          <Button variant="primary" icon={<Save className="size-4" />} loading={saving} onClick={save}>{isNew ? "Create template" : "Save"}</Button>
        </>}
      />
      <Card className="mb-5 grid gap-4 p-5 md:grid-cols-2">
        <Field label="Template name">
          <Input placeholder="e.g. Upper / Lower — 4 day" value={name} onChange={(e) => update(setName)(e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea className="min-h-10" rows={1} placeholder="Who it's for, how to progress…" value={description} onChange={(e) => update(setDescription)(e.target.value)} />
        </Field>
      </Card>
      <WorkoutEditor days={days} onChange={update(setDays)} />

      <AssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={`Assign “${name}”`}
        currentLabel={(cid) => plans.data.find((p) => p.client_id === cid)?.name}
        onAssign={async (ids) => {
          try {
            for (const cid of ids) await assignWorkout(repo, session.userId, cid, { name, description, days });
            toast.success(`Assigned to ${ids.length} client${ids.length > 1 ? "s" : ""}`);
            setAssignOpen(false);
          } catch (e) {
            toast.error(e);
          }
        }}
      />
    </>
  );
}

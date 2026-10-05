"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Send, Trash2 } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { assignNutrition } from "@/lib/assign";
import { Button, Card, EmptyState, ErrorState, LinkButton, LoadingBlock, PageHeader, useToast, useConfirm } from "@/components/ui";
import { blankNutrition, NutritionEditor, validateNutrition, type NutritionDraft } from "@/components/coach/nutrition-editor";
import { AssignModal } from "@/components/coach/assign-modal";

export default function NutritionTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { session, repo } = useSession();
  const ask = useConfirm();
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<NutritionDraft>(blankNutrition());
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(isNew ? "ready" : "loading");
  const [loadErr, setLoadErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const plans = useList("nutrition_plans", { eq: { coach_id: session.userId, active: true } });

  useEffect(() => {
    if (isNew) return;
    repo.get("nutrition_templates", id).then((t) => {
      if (!t) return setState("missing");
      setDraft({ name: t.name, calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat, meals: t.meals, notes: t.notes });
      setState("ready");
    }).catch((e) => { setLoadErr(e.message); setState("error"); });
  }, [id, isNew, repo]);

  const save = async (): Promise<boolean> => {
    const err = validateNutrition(draft);
    if (err) { toast.error(err); return false; }
    setSaving(true);
    try {
      if (isNew) {
        const t = await repo.insert("nutrition_templates", { ...draft, coach_id: session.userId });
        toast.success("Template created");
        setDirty(false);
        router.replace(`/coach/nutrition/${t.id}`);
      } else {
        await repo.update("nutrition_templates", id, { ...draft, updated_at: new Date().toISOString() });
        toast.success("Template saved");
        setDirty(false);
      }
      return true;
    } catch (e) {
      toast.error(e);
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (state === "loading") return <LoadingBlock rows={4} />;
  if (state === "error") return <ErrorState message={loadErr} />;
  if (state === "missing") return <EmptyState title="Template not found" action={<LinkButton href="/coach/nutrition">Back to templates</LinkButton>} />;

  return (
    <>
      <LinkButton href="/coach/nutrition" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} className="-ml-3 mb-2">Templates</LinkButton>
      <PageHeader
        title={isNew ? "New nutrition template" : draft.name || "Untitled"}
        subtitle={dirty ? "Unsaved changes" : isNew ? "Calories, macros and meal suggestions" : "All changes saved"}
        actions={<>
          {!isNew && <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={async () => {
            if (!(await ask({ title: `Delete “${draft.name}”?`, body: "Assigned plans aren't affected.", confirmLabel: "Delete", danger: true }))) return;
            try { await repo.remove("nutrition_templates", id); toast.success("Template deleted"); router.replace("/coach/nutrition"); } catch (e) { toast.error(e); }
          }}>Delete</Button>}
          {!isNew && <Button icon={<Send className="size-4" />} onClick={async () => { if (dirty && !(await save())) return; setAssignOpen(true); }}>Assign to clients</Button>}
          <Button variant="primary" icon={<Save className="size-4" />} loading={saving} onClick={save}>{isNew ? "Create template" : "Save"}</Button>
        </>}
      />
      <Card className="max-w-3xl p-5">
        <NutritionEditor value={draft} onChange={(v) => { setDraft(v); setDirty(true); }} />
      </Card>
      <AssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={`Assign “${draft.name}”`}
        currentLabel={(cid) => plans.data.find((p) => p.client_id === cid)?.name}
        onAssign={async (ids) => {
          try {
            for (const cid of ids) await assignNutrition(repo, session.userId, cid, draft);
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

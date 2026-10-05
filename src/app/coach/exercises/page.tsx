"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useSession } from "@/lib/app-context";
import { BUILTIN_DEMOS, normalizeExerciseName } from "@/lib/exercise-library";
import { customHasContent, fromBuiltin, fromCustom, useExerciseDemos, type ResolvedDemo } from "@/lib/demos";
import type { ExerciseDemo } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, Input, LoadingBlock, PageHeader, Segmented, useConfirm, useToast } from "@/components/ui";
import { DemoThumb, ExerciseDemoSheet } from "@/components/exercise-demo";
import { ExerciseDemoEditor } from "@/components/coach/demo-editor";

export default function ExerciseLibrary() {
  const { repo } = useSession();
  const toast = useToast();
  const ask = useConfirm();
  const { custom } = useExerciseDemos();
  const [view, setView] = useState<"all" | "mine">("all");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<ResolvedDemo | null>(null);
  const [editing, setEditing] = useState<{ open: boolean; demo: ExerciseDemo | null }>({ open: false, demo: null });

  const items = useMemo(() => {
    const mine = custom.data.map(fromCustom);
    const overridden = new Set(custom.data.filter(customHasContent).map((d) => normalizeExerciseName(d.name)));
    const builtins = BUILTIN_DEMOS.filter((b) => !overridden.has(normalizeExerciseName(b.name))).map(fromBuiltin);
    const list = view === "mine" ? mine : [...mine, ...builtins];
    const s = q.trim().toLowerCase();
    return list
      .filter((d) => !s || d.name.toLowerCase().includes(s) || d.equipment.toLowerCase().includes(s) || (d.kind === "builtin" && d.demo.muscles.toLowerCase().includes(s)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [custom.data, view, q]);

  return (
    <>
      <PageHeader
        title="Exercise library"
        subtitle="Every exercise has a form demo clients can open mid-workout. Add your own with a video or images."
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing({ open: true, demo: null })}>New exercise</Button>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input placeholder="Search by name, equipment or muscle" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Search exercises" />
        </div>
        <Segmented value={view} onChange={setView} options={[{ value: "all", label: `All ${BUILTIN_DEMOS.length + custom.data.length}` }, { value: "mine", label: `Yours ${custom.data.length}` }]} />
      </div>

      {custom.error ? <ErrorState message={custom.error} onRetry={custom.reload} /> : custom.loading ? <LoadingBlock rows={4} /> : items.length === 0 ? (
        <EmptyState title={view === "mine" ? "You haven't added any exercises yet" : "No matches"} body={view === "mine" ? "Add exercises the built-in library doesn't cover, with your own video, steps and cues." : "Try a different search."}
          action={view === "mine" ? <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing({ open: true, demo: null })}>New exercise</Button> : undefined} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                <button type="button" onClick={() => setPreview(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Preview ${d.name} demo`}>
                  <DemoThumb demo={d} className="size-14 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{d.name}</span>
                    <span className="block truncate text-xs text-muted">{d.equipment}{d.kind === "builtin" ? ` · ${d.demo.muscles}` : ""}</span>
                  </span>
                </button>
                {d.kind === "custom" ? (
                  <>
                    {!customHasContent(d.demo) && <Badge tone="warn">No demo yet</Badge>}
                    <Badge tone="accent">Yours</Badge>
                    <IconButton label={`Edit ${d.name}`} onClick={() => setEditing({ open: true, demo: d.demo })}><Pencil className="size-4" /></IconButton>
                    <IconButton label={`Delete ${d.name}`} onClick={async () => {
                      if (!(await ask({ title: `Delete “${d.name}”?`, body: "Plans that use it keep the exercise but lose this demo.", confirmLabel: "Delete", danger: true }))) return;
                      try {
                        await repo.remove("exercise_demos", d.demo.id);
                        if (d.demo.media_path) repo.deleteExerciseMedia(d.demo.media_path).catch(() => {});
                        toast.success("Exercise deleted");
                      } catch (e) { toast.error(e); }
                    }}><Trash2 className="size-4" /></IconButton>
                  </>
                ) : <Badge className="hidden sm:inline-flex">Built-in</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ExerciseDemoSheet demo={preview} open={!!preview} onClose={() => setPreview(null)} />
      <ExerciseDemoEditor open={editing.open} initial={editing.demo} onClose={() => setEditing({ open: false, demo: null })} />
    </>
  );
}

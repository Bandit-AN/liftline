"use client";

import { useEffect, useRef, useState } from "react";
import { Film, Trash2, Upload } from "lucide-react";
import { useSession } from "@/lib/app-context";
import { builtinByName } from "@/lib/exercise-library";
import type { ExerciseDemo } from "@/lib/types";
import { Button, Field, Input, Modal, Textarea, useToast } from "@/components/ui";
import { CustomMedia } from "@/components/exercise-demo";

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export function ExerciseDemoEditor({ open, onClose, initial, prefillName, onSaved }: {
  open: boolean;
  onClose: () => void;
  initial?: ExerciseDemo | null;
  prefillName?: string;
  onSaved?: (demo: ExerciseDemo) => void;
}) {
  const { session, repo } = useSession();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState("");
  const [steps, setSteps] = useState("");
  const [breathing, setBreathing] = useState("");
  const [mistakes, setMistakes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [keepMedia, setKeepMedia] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? prefillName ?? "");
    setEquipment(initial?.equipment ?? "");
    setSteps((initial?.steps ?? []).join("\n"));
    setBreathing(initial?.breathing ?? "");
    setMistakes((initial?.mistakes ?? []).join("\n"));
    setFile(null);
    setPreview(null);
    setKeepMedia(true);
    setError(null);
  }, [open, initial, prefillName]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const builtinClash = !initial && name.trim() ? builtinByName(name) : undefined;
  const hasExistingMedia = !!initial?.media_path && keepMedia;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name the exercise.");
    if (!equipment.trim()) return setError("Add the equipment so clients set up the same way you do.");
    if (!file && !hasExistingMedia && lines(steps).length === 0) {
      return setError("Add a video or image, or write the steps, so clients have something to follow.");
    }
    setBusy(true);
    let uploaded: { path: string; type: "video" | "image" } | null = null;
    try {
      if (file) uploaded = await repo.uploadExerciseMedia(file);
      const media = uploaded ?? (hasExistingMedia ? { path: initial!.media_path!, type: initial!.media_type! } : null);
      const row = {
        name: name.trim(), equipment: equipment.trim(), steps: lines(steps), breathing: breathing.trim(), mistakes: lines(mistakes),
        media_path: media?.path ?? null, media_type: media?.type ?? null, updated_at: new Date().toISOString(),
      };
      const saved = initial
        ? await repo.update("exercise_demos", initial.id, row)
        : await repo.insert("exercise_demos", { ...row, coach_id: session.userId });
      // Remove the replaced/removed file only after the record points elsewhere.
      if (initial?.media_path && initial.media_path !== saved.media_path) {
        repo.deleteExerciseMedia(initial.media_path).catch(() => {});
      }
      toast.success(initial ? "Exercise updated" : "Exercise added to your library");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (uploaded) repo.deleteExerciseMedia(uploaded.path).catch(() => {});
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit exercise" : "New exercise"} footer={<>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button variant="primary" type="submit" form="demo-form" loading={busy}>{busy && file ? "Uploading…" : "Save exercise"}</Button>
    </>}>
      <form id="demo-form" onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Exercise name"><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landmine Press" /></Field>
          <Field label="Equipment"><Input required value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="e.g. Barbell + landmine" /></Field>
        </div>
        {builtinClash && (
          <p className="rounded-xl bg-info/5 px-3 py-2 text-xs text-info">
            The library already has a demo for {builtinClash.name} ({builtinClash.equipment}). Saving this will use your version instead for your clients.
          </p>
        )}

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-muted">Demonstration video or image</p>
          {preview && file ? (
            file.type.startsWith("video/")
              ? <video src={preview} className="aspect-[4/3] w-full rounded-xl bg-black object-contain" muted loop autoPlay playsInline controls />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={preview} alt="Preview" className="aspect-[4/3] w-full rounded-xl bg-surface-2 object-contain" />
          ) : hasExistingMedia ? (
            <CustomMedia path={initial!.media_path!} type={initial!.media_type!} name={name} />
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm text-muted hover:border-line-strong">
              <Film className="size-6" /> Add a short clip (MP4, MOV, WebM) or an image/GIF
              <span className="text-xs text-faint">Up to 50 MB · film from the side so the whole movement is visible</span>
            </button>
          )}
          {(file || hasExistingMedia) && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" type="button" icon={<Upload className="size-3.5" />} onClick={() => fileRef.current?.click()}>Replace</Button>
              <Button size="sm" type="button" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => { setFile(null); setPreview(null); setKeepMedia(false); }}>Remove</Button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,image/*" className="sr-only" aria-label="Choose demonstration file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (preview) URL.revokeObjectURL(preview);
              setFile(f);
              setPreview(URL.createObjectURL(f));
            }} />
          {session.mode === "demo" && <p className="mt-1.5 text-xs text-faint">Demo accounts can add images or GIFs up to 2 MB. Video uploads work on real accounts.</p>}
        </div>

        <Field label="Steps (one per line)" hint="Short, simple instructions in order.">
          <Textarea rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={"Set up with…\nLower until…\nDrive back up…"} />
        </Field>
        <Field label="Breathing cue">
          <Input value={breathing} onChange={(e) => setBreathing(e.target.value)} placeholder="e.g. Exhale as you press, inhale as you lower" />
        </Field>
        <Field label="Common mistakes (one per line)">
          <Textarea rows={3} value={mistakes} onChange={(e) => setMistakes(e.target.value)} placeholder={"Elbows flaring\nArching the lower back"} />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

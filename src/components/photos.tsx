"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, ImageOff, Lock, Trash2, Upload } from "lucide-react";
import { useList, useSession } from "@/lib/app-context";
import { daysBetween, fmtDate, today } from "@/lib/dates";
import type { PhotoPose, ProgressPhoto } from "@/lib/types";
import { Button, cx, EmptyState, ErrorState, Field, IconButton, Input, LoadingBlock, Modal, Segmented, Select, Skeleton, useToast, useConfirm } from "./ui";

export function PhotoImg({ photo, className }: { photo: ProgressPhoto; className?: string }) {
  const { repo } = useSession();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    setFailed(false);
    repo.photoUrl(photo.storage_path).then((u) => alive && setUrl(u)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [photo.storage_path, repo]);
  if (failed) return <div className={cx("flex items-center justify-center bg-surface-2 text-faint", className)}><ImageOff className="size-5" /></div>;
  if (!url) return <Skeleton className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={`${photo.pose} progress photo, ${fmtDate(photo.date)}`} className={cx("object-cover", className)} />;
}

const POSES: PhotoPose[] = ["front", "side", "back"];

export function PhotoGallery({ clientId, canUpload }: { clientId: string; canUpload: boolean }) {
  const { repo } = useSession();
  const ask = useConfirm();
  const toast = useToast();
  const photos = useList("progress_photos", { eq: { client_id: clientId }, order: { col: "date", asc: false } });
  const dates = useMemo(() => [...new Set(photos.data.map((p) => p.date))], [photos.data]);
  const [pose, setPose] = useState<PhotoPose>("front");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (dates.length) {
      setB((x) => (x && dates.includes(x) ? x : dates[0]));
      setA((x) => (x && dates.includes(x) ? x : dates[dates.length - 1]));
    }
  }, [dates]);

  const find = (d: string) => photos.data.find((p) => p.date === d && p.pose === pose);
  const before = find(a), after = find(b);

  if (photos.error) return <ErrorState message={photos.error} onRetry={photos.reload} />;
  if (photos.loading) return <LoadingBlock rows={2} />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted"><Lock className="size-3.5" /> Private — visible only to {canUpload ? "you and your coach" : "you and this client"}</span>
        <div className="flex-1" />
        {canUpload && <Button size="sm" variant="primary" icon={<Camera className="size-4" />} onClick={() => setUploadOpen(true)}>Add photos</Button>}
      </div>

      {photos.data.length === 0 ? (
        <EmptyState icon={<Camera className="size-6" />} title="No progress photos yet" body={canUpload ? "Take front, side and back photos every 2–4 weeks in similar lighting." : "Photos the client uploads will appear here."} />
      ) : (
        <>
          <div className="mb-3 space-y-3">
            <Segmented value={pose} onChange={setPose} options={POSES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))} />
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <Field label="Before">
                <Select value={a} onChange={(e) => setA(e.target.value)}>{dates.map((d) => <option key={d} value={d}>{fmtDate(d, { month: "short", day: "numeric", year: "numeric" })}</option>)}</Select>
              </Field>
              <Field label="After">
                <Select value={b} onChange={(e) => setB(e.target.value)}>{dates.map((d) => <option key={d} value={d}>{fmtDate(d, { month: "short", day: "numeric", year: "numeric" })}</option>)}</Select>
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: "Before", d: a, p: before }, { label: "After", d: b, p: after }].map(({ label, d, p }) => (
              <figure key={label}>
                {p ? <PhotoImg photo={p} className="aspect-[3/4] w-full rounded-xl" /> : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl border border-dashed border-line text-center text-xs text-faint">No {pose} photo<br />on this date</div>
                )}
                <figcaption className="mt-1.5 text-xs text-muted">{label} · {d && fmtDate(d)}</figcaption>
              </figure>
            ))}
          </div>
          {a && b && a !== b && <p className="mt-2 text-xs text-faint">{Math.abs(daysBetween(a, b))} days apart</p>}

          <h4 className="mb-2 mt-6 text-[13px] font-medium text-muted">All photos</h4>
          <div className="space-y-4">
            {dates.map((d) => (
              <div key={d}>
                <p className="mb-1.5 text-xs text-faint">{fmtDate(d, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {photos.data.filter((p) => p.date === d).map((p) => (
                    <div key={p.id} className="group relative">
                      <PhotoImg photo={p} className="aspect-[3/4] w-full rounded-lg" />
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] capitalize">{p.pose}</span>
                      {canUpload && (
                        <IconButton label="Delete photo" className="absolute right-1 top-1 size-7 bg-black/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={async () => {
                            if (!(await ask({ title: "Delete this photo?", body: "This can't be undone.", confirmLabel: "Delete", danger: true }))) return;
                            try { await repo.deletePhoto(p); toast.success("Photo deleted"); } catch (e) { toast.error(e); }
                          }}>
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {canUpload && <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} clientId={clientId} />}
    </div>
  );
}

function UploadModal({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const { repo } = useSession();
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [files, setFiles] = useState<Partial<Record<PhotoPose, File>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = Object.keys(files).length;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      for (const pose of POSES) {
        const f = files[pose];
        if (f) await repo.uploadPhoto(clientId, f, date, pose);
      }
      toast.success(`${count} photo${count > 1 ? "s" : ""} uploaded`);
      setFiles({});
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add progress photos" footer={<>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button variant="primary" icon={<Upload className="size-4" />} disabled={!count} loading={busy} onClick={submit}>Upload {count || ""}</Button>
    </>}>
      <Field label="Date taken" className="mb-4">
        <Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        {POSES.map((pose) => {
          const f = files[pose];
          return (
            <label key={pose} className="cursor-pointer">
              <span className="mb-1.5 block text-[13px] capitalize text-muted">{pose}</span>
              <div className={cx("flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-dashed text-faint", f ? "border-accent/50" : "border-line hover:border-line-strong")}>
                {f ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(f)} alt={`${pose} preview`} className="size-full object-cover" />
                ) : <Camera className="size-5" />}
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setFiles({ ...files, [pose]: file });
              }} />
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-faint">Photos are resized on your device and stored privately. Only you and your coach can see them.</p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </Modal>
  );
}

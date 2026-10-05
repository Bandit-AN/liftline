"use client";

import { useEffect, useState } from "react";
import { ImageOff, Pause, Play, PlayCircle, Wind, XCircle } from "lucide-react";
import { useSession } from "@/lib/app-context";
import { builtinFrame, DEMO_IMAGE_CREDIT } from "@/lib/exercise-library";
import type { ResolvedDemo } from "@/lib/demos";
import { Badge, cx, Modal, Skeleton } from "./ui";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** Start/finish photos played as a looping movement animation. */
export function FrameAnimation({ demoKey, name, className }: { demoKey: string; name: string; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [frame, setFrame] = useState<0 | 1>(0);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!playing || reduced) return;
    const t = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1300);
    return () => clearInterval(t);
  }, [playing, reduced]);

  if (failed) {
    return <div className={cx("flex aspect-[4/3] items-center justify-center rounded-xl bg-surface-2 text-sm text-muted", className)}><ImageOff className="mr-2 size-4" /> Demo images couldn&apos;t load</div>;
  }

  if (reduced) {
    // Side-by-side stills instead of motion.
    return (
      <div className={cx("grid grid-cols-2 gap-2", className)}>
        {([0, 1] as const).map((f) => (
          <figure key={f}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={builtinFrame(demoKey, f)} alt={`${name}: ${f === 0 ? "start" : "finish"} position`} onError={() => setFailed(true)} className="aspect-[4/3] w-full rounded-xl bg-surface-2 object-cover" />
            <figcaption className="mt-1 text-center text-xs text-muted">{f === 0 ? "Start" : "Finish"}</figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className={cx("relative overflow-hidden rounded-xl bg-surface-2", className)}>
      <div className="relative aspect-[4/3] w-full">
        {([0, 1] as const).map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f} src={builtinFrame(demoKey, f)} alt={f === frame ? `${name}: ${f === 0 ? "start" : "finish"} position` : ""} aria-hidden={f !== frame}
            onError={() => setFailed(true)}
            className={cx("absolute inset-0 size-full object-cover transition-opacity duration-500", f === frame ? "opacity-100" : "opacity-0")} />
        ))}
      </div>
      <div className="absolute inset-x-2 bottom-2 flex items-center gap-2">
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause demo" : "Play demo"}
          className="flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <div className="flex rounded-full bg-black/60 p-0.5 text-[11px] text-white backdrop-blur">
          {([0, 1] as const).map((f) => (
            <button key={f} type="button" onClick={() => { setPlaying(false); setFrame(f); }}
              className={cx("rounded-full px-2.5 py-1", frame === f && "bg-white/20 font-medium")}>{f === 0 ? "Start" : "Finish"}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Coach-uploaded video or image, loaded through a short-lived private link. */
export function CustomMedia({ path, type, name, className }: { path: string; type: "video" | "image"; name: string; className?: string }) {
  const { repo } = useSession();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    setFailed(false);
    repo.exerciseMediaUrl(path).then((u) => alive && setUrl(u)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [path, repo]);
  if (failed) return <div className={cx("flex aspect-[4/3] items-center justify-center rounded-xl bg-surface-2 text-sm text-muted", className)}><ImageOff className="mr-2 size-4" /> Demo couldn&apos;t load</div>;
  if (!url) return <Skeleton className={cx("aspect-[4/3] w-full rounded-xl", className)} />;
  if (type === "video") {
    return <video src={url} className={cx("aspect-[4/3] w-full rounded-xl bg-black object-contain", className)} autoPlay muted loop playsInline controls aria-label={`${name} demonstration video`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={`${name} demonstration`} className={cx("aspect-[4/3] w-full rounded-xl bg-surface-2 object-contain", className)} />;
}

export function DemoMedia({ demo, className }: { demo: ResolvedDemo; className?: string }) {
  if (demo.kind === "builtin") return <FrameAnimation demoKey={demo.demo.key} name={demo.name} className={className} />;
  if (demo.demo.media_path && demo.demo.media_type) return <CustomMedia path={demo.demo.media_path} type={demo.demo.media_type} name={demo.name} className={className} />;
  return null;
}

export function DemoThumb({ demo, className }: { demo: ResolvedDemo; className?: string }) {
  if (demo.kind === "builtin") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={builtinFrame(demo.demo.key, 1)} alt="" loading="lazy" className={cx("rounded-lg bg-surface-2 object-cover", className)} />;
  }
  return (
    <span className={cx("flex items-center justify-center rounded-lg bg-surface-2 text-muted", className)}>
      <PlayCircle className="size-5" />
    </span>
  );
}

export function DemoDetails({ demo, coachCue, prescription }: { demo: ResolvedDemo; coachCue?: string; prescription?: string }) {
  const d = demo.demo;
  const steps = d.steps;
  const mistakes = d.mistakes;
  return (
    <div className="space-y-4">
      <DemoMedia demo={demo} />
      <div className="flex flex-wrap items-center gap-2">
        {demo.equipment && <Badge>{demo.equipment}</Badge>}
        {demo.kind === "builtin" && <span className="text-xs text-muted">{demo.demo.muscles}</span>}
        {demo.kind === "custom" && <Badge tone="accent">From your coach</Badge>}
        {prescription && <span className="text-xs text-muted tnum">{prescription}</span>}
      </div>
      {coachCue && (
        <p className="rounded-xl border border-info/30 bg-info/5 px-3 py-2.5 text-[13px]"><span className="font-medium text-info">Coach cue: </span>{coachCue}</p>
      )}
      {steps.length > 0 && (
        <section>
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">How to do it</h3>
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/12 text-xs font-semibold text-accent tnum">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {d.breathing && (
        <section className="flex gap-3 rounded-xl bg-surface-2 p-3">
          <Wind className="mt-0.5 size-4 shrink-0 text-info" />
          <div>
            <h3 className="text-[13px] font-semibold">Breathing</h3>
            <p className="mt-0.5 text-sm text-muted">{d.breathing}</p>
          </div>
        </section>
      )}
      {mistakes.length > 0 && (
        <section>
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Common mistakes</h3>
          <ul className="space-y-1.5">
            {mistakes.map((m, i) => (
              <li key={i} className="flex gap-2 text-sm"><XCircle className="mt-0.5 size-4 shrink-0 text-danger/80" />{m}</li>
            ))}
          </ul>
        </section>
      )}
      {demo.kind === "builtin" && <p className="text-[11px] text-faint">{DEMO_IMAGE_CREDIT}</p>}
    </div>
  );
}

export function ExerciseDemoSheet({ demo, open, onClose, coachCue, prescription }: {
  demo: ResolvedDemo | null;
  open: boolean;
  onClose: () => void;
  coachCue?: string;
  prescription?: string;
}) {
  return (
    <Modal open={open && !!demo} onClose={onClose} title={demo?.name ?? "Exercise demo"}>
      {demo && <DemoDetails demo={demo} coachCue={coachCue} prescription={prescription} />}
    </Modal>
  );
}

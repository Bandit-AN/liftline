import clsx from "clsx";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <rect x="1" y="1" width="22" height="22" rx="7" fill="var(--color-accent)" />
        <path d="M7 16.5 L11 12.5 L13.5 15 L17.5 8" stroke="var(--color-accent-ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && <span className="text-[17px]">Liftline</span>}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/10 px-2.5 py-0.5 text-[11.5px] font-medium text-warn", className)}>
      <span className="size-1.5 rounded-full bg-warn" />
      Demo mode
    </span>
  );
}

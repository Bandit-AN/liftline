"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RotateCcw, Settings, Users } from "lucide-react";
import { useApp, useSession } from "@/lib/app-context";
import { Avatar, useToast, useConfirm } from "./ui";
import { DemoBadge } from "./brand";

export function AccountMenu({ settingsHref }: { settingsHref: string }) {
  const { session } = useSession();
  const { signOut, resetDemoData } = useApp();
  const ask = useConfirm();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const item = "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted hover:bg-surface-2 hover:text-ink";

  return (
    <div className="relative" ref={ref}>
      <button aria-label="Account menu" onClick={() => setOpen((o) => !o)} className="rounded-full focus-visible:outline-2 focus-visible:outline-accent">
        <Avatar name={session.profile.full_name || session.profile.email} size={32} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-2xl">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">{session.profile.full_name || "Your account"}</p>
            <p className="truncate text-xs text-muted">{session.profile.email}</p>
            {session.mode === "demo" && <DemoBadge className="mt-2" />}
          </div>
          <button className={item} onClick={() => { setOpen(false); router.push(settingsHref); }}>
            <Settings className="size-4" /> {session.role === "coach" ? "Settings" : "Profile & settings"}
          </button>
          {session.mode === "demo" && (
            <>
              <button className={item} onClick={() => { setOpen(false); router.push("/demo"); }}>
                <Users className="size-4" /> Switch demo account
              </button>
              <button className={item} onClick={async () => {
                setOpen(false);
                if (!(await ask({ title: "Reset demo data?", body: "All demo changes go back to the original sample data.", confirmLabel: "Reset", danger: true }))) return;
                resetDemoData();
                toast.success("Demo data reset");
              }}>
                <RotateCcw className="size-4" /> Reset demo data
              </button>
            </>
          )}
          <button className={item} onClick={async () => { setOpen(false); await signOut(); router.replace("/"); }}>
            <LogOut className="size-4" /> {session.mode === "demo" ? "Exit demo" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

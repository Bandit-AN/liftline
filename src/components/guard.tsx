"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import type { Role } from "@/lib/types";
import { Logo } from "./brand";
import { Skeleton } from "./ui";

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { ready, session } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/");
    else if (session.role !== role) router.replace(session.role === "coach" ? "/coach" : "/app");
  }, [ready, session, role, router]);

  if (!ready || !session || session.role !== role) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4" aria-busy="true">
        <Logo compact />
        <Skeleton className="h-2 w-32" />
      </div>
    );
  }
  return <>{children}</>;
}

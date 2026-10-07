import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./brand";
import { LEGAL } from "@/lib/legal";

export const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/coach-terms", label: "Coach agreement" },
  { href: "/delete-account", label: "Delete account" },
];

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-faint ${className}`}>
      {LEGAL_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="hover:text-muted hover:underline">{l.label}</Link>
      ))}
    </nav>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
      <Link href="/" className="mb-10 inline-block"><Logo /></Link>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-muted">Effective {LEGAL.effectiveDate}</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2 [&_ul]:space-y-1 [&_a]:text-accent [&_a]:underline">
        {children}
      </div>
      <LegalLinks className="mt-12 border-t border-line pt-5" />
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

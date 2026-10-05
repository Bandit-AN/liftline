import Link from "next/link";
import { Logo } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <Logo compact />
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted">That link doesn&apos;t go anywhere.</p>
      <Link href="/" className="text-sm text-accent hover:underline">Go home</Link>
    </main>
  );
}

import clsx from "clsx";
import { Database } from "lucide-react";

export function SetupNotice({ className }: { className?: string }) {
  return (
    <div className={clsx("rounded-2xl border border-info/25 bg-info/5 p-5 text-sm", className)}>
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 size-4 shrink-0 text-info" />
        <div>
          <p className="font-medium">Real accounts need a Supabase project</p>
          <p className="mt-1 text-muted">Demo mode works now. To enable sign-up, sign-in and real data:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
            <li>Create a project at supabase.com.</li>
            <li>In the SQL editor, run the three files in <code className="rounded bg-surface-3 px-1 text-ink">supabase/migrations/</code> in order.</li>
            <li>Copy <code className="rounded bg-surface-3 px-1 text-ink">.env.example</code> to <code className="rounded bg-surface-3 px-1 text-ink">.env.local</code> and add your project URL and anon key.</li>
            <li>Add your site URL under Authentication → URL Configuration, then restart the app.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

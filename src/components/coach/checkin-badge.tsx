import { fmtDate } from "@/lib/dates";
import type { CheckInState } from "@/lib/stats";
import { Badge } from "@/components/ui";

export function CheckInBadge({ state, due }: { state: CheckInState; due: string }) {
  switch (state) {
    case "submitted":
      return <Badge tone="accent">Needs review</Badge>;
    case "reviewed":
      return <Badge>Reviewed</Badge>;
    case "due":
      return <Badge tone="info">Due today</Badge>;
    case "overdue":
      return <Badge tone="danger">Overdue</Badge>;
    case "upcoming":
      return <Badge>Due {fmtDate(due, { weekday: "short" })}</Badge>;
    default:
      return <span className="text-xs text-faint">—</span>;
  }
}

"use client";

import { Button, Card, ErrorState, LoadingBlock } from "@/components/ui";
import { NotificationList, useMarkAllRead, useNotifications, useOpenNotification } from "@/components/notifications";

export default function ClientNotifications() {
  const n = useNotifications();
  const open = useOpenNotification();
  const markAll = useMarkAllRead(n.data);
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <Button size="sm" variant="ghost" onClick={markAll} disabled={!n.data.some((x) => !x.read_at)}>Mark all read</Button>
      </div>
      {n.error ? <ErrorState message={n.error} onRetry={n.reload} /> : n.loading ? <LoadingBlock /> : <Card className="overflow-hidden"><NotificationList items={n.data} onOpen={open} /></Card>}
    </>
  );
}

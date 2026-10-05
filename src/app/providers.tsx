"use client";

import { AppProvider } from "@/lib/app-context";
import { ConfirmProvider, ToastProvider } from "@/components/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ToastProvider><ConfirmProvider>{children}</ConfirmProvider></ToastProvider>
    </AppProvider>
  );
}

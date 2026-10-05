"use client";

import { Suspense, type ComponentType } from "react";
import { LoadingBlock } from "./ui";

/** Pages that read search params must render inside Suspense in the App Router. */
export function withSuspense<P extends object>(C: ComponentType<P>) {
  return function Wrapped(props: P) {
    return (
      <Suspense fallback={<LoadingBlock />}>
        <C {...props} />
      </Suspense>
    );
  };
}

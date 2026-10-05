declare global {
  interface Window {
    __LIFTLINE_HASH_ROUTER__?: boolean;
  }
}

/** Absolute, shareable URL for an in-app path (works for both the Next app and the hash-routed build). */
export function appUrl(path: string): string {
  if (typeof window === "undefined") return path;
  if (window.__LIFTLINE_HASH_ROUTER__) return `${window.location.origin}${window.location.pathname}#${path}`;
  return `${window.location.origin}${path}`;
}

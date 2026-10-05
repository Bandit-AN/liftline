// In-memory router used by the single-file build (Next's router needs a server).
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

// "hash": URLs like site/#/coach (hosted site, shareable invite links).
// "memory": no URL changes (embedded artifact, where the URL can't be used).
const HASH = import.meta.env.VITE_ROUTER === "hash";

function fromHash() {
  const h = window.location.hash.replace(/^#/, "");
  return h.startsWith("/") ? h : "/";
}

let location = HASH ? fromHash() : "/";
const subs = new Set<() => void>();
const stack: string[] = [];

if (HASH) {
  window.addEventListener("popstate", () => {
    location = fromHash();
    subs.forEach((f) => f());
  });
}

export function setInitialLocation(path: string) {
  if (!HASH) location = path;
}

export function navigate(url: string, replace = false, scroll = true) {
  if (!url.startsWith("/")) url = "/" + url;
  if (!replace) stack.push(location);
  location = url;
  if (HASH) {
    const target = `${window.location.pathname}${window.location.search}#${url}`;
    if (replace) history.replaceState(null, "", target);
    else history.pushState(null, "", target);
  }
  subs.forEach((f) => f());
  if (scroll) window.scrollTo(0, 0);
}

function subscribe(f: () => void) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}

export function useLocationString() {
  return useSyncExternalStore(subscribe, () => location, () => location);
}

export function usePathname() {
  return useLocationString().split("?")[0];
}

export function useSearchParams() {
  const s = useLocationString();
  return useMemo(() => new URLSearchParams(s.split("?")[1] ?? ""), [s]);
}

export const ParamsContext = createContext<Record<string, string>>({});
export function useParams<T = Record<string, string>>(): T {
  return useContext(ParamsContext) as T;
}

type NavOpts = { scroll?: boolean };
const router = {
  push: (u: string, o?: NavOpts) => navigate(u, false, o?.scroll !== false),
  replace: (u: string, o?: NavOpts) => navigate(u, true, o?.scroll !== false),
  back: () => {
    if (HASH) return history.back();
    const prev = stack.pop();
    if (prev) navigate(prev, true);
  },
  forward: () => {},
  refresh: () => {},
  prefetch: () => {},
};
export function useRouter() {
  return router;
}

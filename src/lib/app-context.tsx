"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Query, Repo } from "./repo";
import { onTableChange } from "./repo";
import type { Profile, Session, TableName, Tables } from "./types";
import { DemoRepo, getDemoUser, loadDemoDb, resetDemo, setDemoUser } from "./demo-repo";
import { liveConfigured, supabase, SupabaseRepo } from "./supabase-repo";

interface AppState {
  ready: boolean;
  session: Session | null;
  repo: Repo | null;
  liveConfigured: boolean;
  enterDemo: (userId: string) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  resetDemoData: () => void;
}

const AppCtx = createContext<AppState | null>(null);

async function loadLiveSession(): Promise<{ session: Session | null; repo: Repo | null }> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user) return { session: null, repo: null };
  const repo = new SupabaseRepo();
  let profile = await repo.get("profiles", user.id);
  if (!profile) {
    // Profile row is created by a database trigger; tolerate a short delay.
    await new Promise((r) => setTimeout(r, 600));
    profile = await repo.get("profiles", user.id);
  }
  if (!profile) throw new Error("Your profile couldn't be loaded. Make sure the database migration has been run.");
  let clientId: string | null = null;
  if (profile.role === "client") {
    const rows = await repo.list("clients", { eq: { user_id: user.id } });
    clientId = rows[0]?.id ?? null;
  }
  return { session: { mode: "live", userId: user.id, role: profile.role, profile, clientId }, repo };
}

function loadDemoSession(userId: string): { session: Session | null; repo: Repo | null } {
  const db = loadDemoDb();
  const profile = db.profiles.find((p) => p.id === userId) as Profile | undefined;
  if (!profile) return { session: null, repo: null };
  const clientId = profile.role === "client" ? db.clients.find((c) => c.user_id === userId)?.id ?? null : null;
  return { session: { mode: "demo", userId, role: profile.role, profile, clientId }, repo: new DemoRepo(userId) };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [repo, setRepo] = useState<Repo | null>(null);

  const refresh = useCallback(async () => {
    const demoUser = getDemoUser();
    if (demoUser) {
      const s = loadDemoSession(demoUser);
      if (s.session) {
        setSession(s.session);
        setRepo(s.repo);
        setReady(true);
        return;
      }
      setDemoUser(null);
    }
    if (liveConfigured) {
      try {
        const s = await loadLiveSession();
        setSession(s.session);
        setRepo(s.repo);
      } catch (e) {
        console.error(e);
        setSession(null);
        setRepo(null);
      }
    } else {
      setSession(null);
      setRepo(null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    if (!liveConfigured) return;
    const { data } = supabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const enterDemo = useCallback((userId: string) => {
    setDemoUser(userId);
    const s = loadDemoSession(userId);
    setSession(s.session);
    setRepo(s.repo);
  }, []);

  const signOut = useCallback(async () => {
    if (getDemoUser()) {
      setDemoUser(null);
    } else if (liveConfigured) {
      await supabase().auth.signOut();
    }
    setSession(null);
    setRepo(null);
  }, []);

  const resetDemoData = useCallback(() => {
    const current = getDemoUser();
    resetDemo();
    if (current) {
      const s = loadDemoSession(current);
      if (!s.session) setDemoUser(null);
      setSession(s.session);
      setRepo(s.repo);
    }
  }, []);

  const value = useMemo<AppState>(
    () => ({ ready, session, repo, liveConfigured, enterDemo, signOut, refresh, resetDemoData }),
    [ready, session, repo, enterDemo, signOut, refresh, resetDemoData],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}

/** For pages behind an auth guard: session and repo are guaranteed. */
export function useSession(): { session: Session; repo: Repo } {
  const { session, repo } = useApp();
  if (!session || !repo) throw new Error("No session");
  return { session, repo };
}

export interface ListState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Fetch rows and refetch whenever that table changes anywhere in the app. */
export function useList<K extends TableName>(table: K, q: Query<Tables[K]> | null, extraTables: TableName[] = []): ListState<Tables[K]> {
  const { repo } = useApp();
  const [data, setData] = useState<Tables[K][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = q ? JSON.stringify(q) : null;
  const seq = useRef(0);
  const loaded = useRef(false);

  const load = useCallback(() => {
    if (!repo || key === null) {
      setLoading(key !== null);
      return;
    }
    const mine = ++seq.current;
    if (!loaded.current) setLoading(true);
    repo
      .list(table, JSON.parse(key))
      .then((rows) => {
        if (mine !== seq.current) return;
        setData(rows);
        setError(null);
        loaded.current = true;
      })
      .catch((e: Error) => mine === seq.current && setError(e.message || "Something went wrong"))
      .finally(() => mine === seq.current && setLoading(false));
  }, [repo, table, key]);

  useEffect(() => {
    loaded.current = false;
    load();
  }, [load]);

  const extraKey = extraTables.join(",");
  useEffect(() => {
    const watch = new Set<TableName>([table, ...(extraKey ? (extraKey.split(",") as TableName[]) : [])]);
    const off = onTableChange((t) => watch.has(t) && load());
    let offLive: (() => void) | undefined;
    if (repo?.subscribe && (table === "messages" || table === "notifications")) {
      offLive = repo.subscribe(table, load);
    }
    return () => {
      off();
      offLive?.();
    };
  }, [table, extraKey, load, repo]);

  return { data, loading, error, reload: load };
}

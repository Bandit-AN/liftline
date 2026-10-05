"use client";

import { useCallback } from "react";
import { useList, useSession } from "./app-context";
import { builtinByKey, builtinByName, normalizeExerciseName, type BuiltinDemo } from "./exercise-library";
import type { ExerciseDemo, PlanExercise } from "./types";

export type ResolvedDemo =
  | { kind: "builtin"; id: string; name: string; equipment: string; demo: BuiltinDemo }
  | { kind: "custom"; id: string; name: string; equipment: string; demo: ExerciseDemo };

export function fromBuiltin(demo: BuiltinDemo): ResolvedDemo {
  return { kind: "builtin", id: `b:${demo.key}`, name: demo.name, equipment: demo.equipment, demo };
}
export function fromCustom(demo: ExerciseDemo): ResolvedDemo {
  return { kind: "custom", id: `c:${demo.id}`, name: demo.name, equipment: demo.equipment, demo };
}

/** A custom demo only counts if it actually shows something or explains the movement. */
export function customHasContent(d: ExerciseDemo) {
  return !!d.media_path || d.steps.length > 0;
}

/**
 * Coach: their own custom demos. Client: their coach's custom demos (RLS decides).
 * resolve() matches a plan exercise to its demo: an explicit link first, then
 * the coach's own exercise with that name, then the built-in library.
 */
export function useExerciseDemos() {
  const { session } = useSession();
  const custom = useList("exercise_demos", session.role === "coach" ? { eq: { coach_id: session.userId }, order: { col: "name" } } : { order: { col: "name" } });

  const resolve = useCallback(
    (ex: Pick<PlanExercise, "name" | "demo_id">): ResolvedDemo | null => {
      const id = ex.demo_id ?? "";
      if (id.startsWith("c:")) {
        const d = custom.data.find((x) => x.id === id.slice(2));
        if (d && customHasContent(d)) return fromCustom(d);
      }
      if (id.startsWith("b:")) {
        const b = builtinByKey(id.slice(2));
        if (b) return fromBuiltin(b);
      }
      const n = normalizeExerciseName(ex.name || "");
      if (!n) return null;
      const own = custom.data.find((x) => normalizeExerciseName(x.name) === n && customHasContent(x));
      if (own) return fromCustom(own);
      const b = builtinByName(ex.name);
      return b ? fromBuiltin(b) : null;
    },
    [custom.data],
  );

  return { custom, resolve };
}

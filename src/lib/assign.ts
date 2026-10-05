import type { Repo } from "./repo";
import type { NutritionPlan, WorkoutDay, WorkoutPlan } from "./types";

/** Assigning replaces the client's current plan; old plans are kept (inactive) as history. */
export async function assignWorkout(repo: Repo, coachId: string, clientId: string, src: { name: string; description: string; days: WorkoutDay[] }): Promise<WorkoutPlan> {
  const current = await repo.list("workout_plans", { eq: { client_id: clientId, active: true } });
  for (const p of current) await repo.update("workout_plans", p.id, { active: false });
  return repo.insert("workout_plans", {
    coach_id: coachId, client_id: clientId, name: src.name, description: src.description,
    days: structuredClone(src.days), active: true,
  });
}

export async function assignNutrition(
  repo: Repo, coachId: string, clientId: string,
  src: Pick<NutritionPlan, "name" | "calories" | "protein" | "carbs" | "fat" | "meals" | "notes">,
): Promise<NutritionPlan> {
  const current = await repo.list("nutrition_plans", { eq: { client_id: clientId, active: true } });
  for (const p of current) await repo.update("nutrition_plans", p.id, { active: false });
  return repo.insert("nutrition_plans", {
    coach_id: coachId, client_id: clientId, name: src.name, calories: src.calories, protein: src.protein,
    carbs: src.carbs, fat: src.fat, meals: structuredClone(src.meals), notes: src.notes, active: true,
  });
}

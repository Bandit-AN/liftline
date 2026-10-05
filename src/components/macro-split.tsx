import clsx from "clsx";

export const MACRO_COLORS = { protein: "#3df58c", carbs: "#6cb6ff", fat: "#f5c451" };

export function MacroSplit({ protein, carbs, fat, className }: { protein: number; carbs: number; fat: number; className?: string }) {
  const kp = protein * 4, kc = carbs * 4, kf = fat * 9;
  const total = kp + kc + kf || 1;
  return (
    <div className={clsx(className)}>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">
        <div style={{ width: `${(kp / total) * 100}%`, background: MACRO_COLORS.protein }} />
        <div style={{ width: `${(kc / total) * 100}%`, background: MACRO_COLORS.carbs }} />
        <div style={{ width: `${(kf / total) * 100}%`, background: MACRO_COLORS.fat }} />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: MACRO_COLORS.protein }} /> P <span className="text-ink tnum">{protein}g</span></span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: MACRO_COLORS.carbs }} /> C <span className="text-ink tnum">{carbs}g</span></span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: MACRO_COLORS.fat }} /> F <span className="text-ink tnum">{fat}g</span></span>
      </div>
    </div>
  );
}

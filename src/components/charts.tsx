"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtDate } from "@/lib/dates";
import type { BodyMetric } from "@/lib/types";

const axis = { stroke: "#6b6e76", fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { background: "#1d1f23", border: "1px solid #2a2c32", borderRadius: 12, fontSize: 12, color: "#f5f6f7" },
  labelStyle: { color: "#9b9ea6" },
  cursor: { stroke: "#3a3d44" },
};

export function WeightChart({ metrics, target, height = 220, unit = "kg" }: { metrics: BodyMetric[]; target?: number | null; height?: number; unit?: string }) {
  const data = metrics.filter((m) => m.weight != null).sort((a, b) => (a.date < b.date ? -1 : 1)).map((m) => ({ date: m.date, weight: m.weight }));
  if (data.length < 2) return <p className="py-10 text-center text-sm text-muted">Log at least two weigh-ins to see a trend.</p>;
  const vals = data.map((d) => d.weight as number).concat(target ? [target] : []);
  const min = Math.floor(Math.min(...vals) - 1), max = Math.ceil(Math.max(...vals) + 1);
  return (
    <div style={{ height }} role="img" aria-label={`Weight trend from ${data[0].weight} to ${data.at(-1)!.weight} ${unit}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#2a2c32" vertical={false} />
          <XAxis dataKey="date" {...axis} tickFormatter={(d) => fmtDate(d)} minTickGap={28} />
          <YAxis {...axis} domain={[min, max]} width={48} />
          <Tooltip {...tooltipStyle} labelFormatter={(d) => fmtDate(String(d), { weekday: "short", month: "short", day: "numeric" })} formatter={(v) => [`${v} ${unit}`, "Weight"]} />
          {target ? <ReferenceLine y={target} stroke="#9b9ea6" strokeDasharray="4 4" label={{ value: `Goal ${target}`, fill: "#9b9ea6", fontSize: 11, position: "insideTopRight" }} /> : null}
          <Line type="monotone" dataKey="weight" stroke="#3df58c" strokeWidth={2.25} dot={false} activeDot={{ r: 4, fill: "#3df58c", stroke: "#0f1012" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const MEAS: { key: keyof BodyMetric; label: string; color: string }[] = [
  { key: "waist", label: "Waist", color: "#3df58c" },
  { key: "chest", label: "Chest", color: "#6cb6ff" },
  { key: "hips", label: "Hips", color: "#f5c451" },
  { key: "arm", label: "Arm", color: "#c49bff" },
  { key: "thigh", label: "Thigh", color: "#ff9b7a" },
];

export function MeasurementChart({ metrics, height = 220 }: { metrics: BodyMetric[]; height?: number }) {
  const data = metrics.filter((m) => MEAS.some((x) => m[x.key] != null)).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (data.length < 2) return <p className="py-10 text-center text-sm text-muted">Log measurements at least twice to see changes.</p>;
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#2a2c32" vertical={false} />
            <XAxis dataKey="date" {...axis} tickFormatter={(d) => fmtDate(d)} minTickGap={28} />
            <YAxis {...axis} width={48} domain={["auto", "auto"]} />
            <Tooltip {...tooltipStyle} labelFormatter={(d) => fmtDate(String(d))} formatter={(v, n) => [`${v} cm`, String(n)]} />
            {MEAS.map((m) => <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2} dot={{ r: 2.5 }} connectNulls />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
        {MEAS.map((m) => <span key={m.key} className="flex items-center gap-1.5"><i className="h-0.5 w-3 rounded" style={{ background: m.color }} />{m.label}</span>)}
      </div>
    </div>
  );
}

export function CaloriesChart({ days, target, height = 180 }: { days: { date: string; calories: number }[]; target: number | null; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#2a2c32" vertical={false} />
          <XAxis dataKey="date" {...axis} tickFormatter={(d) => fmtDate(d, { weekday: "short" })} />
          <YAxis {...axis} width={48} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "#ffffff08" }} labelFormatter={(d) => fmtDate(String(d), { weekday: "short", month: "short", day: "numeric" })} formatter={(v) => [`${Number(v).toLocaleString()} kcal`, "Eaten"]} />
          {target ? <ReferenceLine y={target} stroke="#9b9ea6" strokeDasharray="4 4" /> : null}
          <Bar dataKey="calories" fill="#3df58c" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

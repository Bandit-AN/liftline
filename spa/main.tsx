import { createRoot } from "react-dom/client";
import type { ComponentType, ReactNode } from "react";
import "../src/app/globals.css";
import { Providers } from "../src/app/providers";
import { ParamsContext, setInitialLocation, useLocationString } from "./shims/navigation";

import Landing from "../src/app/page";
import NotFound from "../src/app/not-found";
import Demo from "../src/app/demo/page";
import Login from "../src/app/login/page";
import Signup from "../src/app/signup/page";
import Reset from "../src/app/reset-password/page";
import Invite from "../src/app/invite/[token]/page";
import CoachLayout from "../src/app/coach/layout";
import CoachHome from "../src/app/coach/page";
import CoachClients from "../src/app/coach/clients/page";
import CoachClient from "../src/app/coach/clients/[id]/page";
import CoachCheckIns from "../src/app/coach/check-ins/page";
import CoachMessages from "../src/app/coach/messages/page";
import CoachWorkouts from "../src/app/coach/workouts/page";
import CoachWorkout from "../src/app/coach/workouts/[id]/page";
import CoachExercises from "../src/app/coach/exercises/page";
import CoachNutrition from "../src/app/coach/nutrition/page";
import CoachNutritionTpl from "../src/app/coach/nutrition/[id]/page";
import CoachCommunity from "../src/app/coach/community/page";
import CoachSettings from "../src/app/coach/settings/page";
import ClientLayout from "../src/app/app/layout";
import Today from "../src/app/app/page";
import Workout from "../src/app/app/workout/page";
import Food from "../src/app/app/food/page";
import Progress from "../src/app/app/progress/page";
import CheckIn from "../src/app/app/check-in/page";
import Messages from "../src/app/app/messages/page";
import Community from "../src/app/app/community/page";
import Notifications from "../src/app/app/notifications/page";
import Profile from "../src/app/app/profile/page";

window.__LIFTLINE_HASH_ROUTER__ = true;

type Layout = ComponentType<{ children: ReactNode }> | null;
const ROUTES: [string, ComponentType, Layout][] = [
  ["/", Landing, null], ["/demo", Demo, null], ["/login", Login, null], ["/signup", Signup, null],
  ["/reset-password", Reset, null], ["/invite/:token", Invite, null],
  ["/coach", CoachHome, CoachLayout], ["/coach/clients", CoachClients, CoachLayout], ["/coach/clients/:id", CoachClient, CoachLayout],
  ["/coach/check-ins", CoachCheckIns, CoachLayout], ["/coach/messages", CoachMessages, CoachLayout],
  ["/coach/workouts", CoachWorkouts, CoachLayout], ["/coach/workouts/:id", CoachWorkout, CoachLayout], ["/coach/exercises", CoachExercises, CoachLayout],
  ["/coach/nutrition", CoachNutrition, CoachLayout], ["/coach/nutrition/:id", CoachNutritionTpl, CoachLayout],
  ["/coach/community", CoachCommunity, CoachLayout], ["/coach/settings", CoachSettings, CoachLayout],
  ["/app", Today, ClientLayout], ["/app/workout", Workout, ClientLayout], ["/app/food", Food, ClientLayout],
  ["/app/progress", Progress, ClientLayout], ["/app/check-in", CheckIn, ClientLayout], ["/app/messages", Messages, ClientLayout],
  ["/app/community", Community, ClientLayout], ["/app/notifications", Notifications, ClientLayout], ["/app/profile", Profile, ClientLayout],
];

function match(path: string) {
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
  for (const [pattern, Page, Layout] of ROUTES) {
    const pp = pattern.split("/").filter(Boolean);
    if (pp.length !== parts.length) continue;
    const params: Record<string, string> = {};
    if (pp.every((seg, i) => (seg.startsWith(":") ? ((params[seg.slice(1)] = decodeURIComponent(parts[i])), true) : seg === parts[i]))) {
      return { pattern, Page, Layout, params };
    }
  }
  return null;
}

function App() {
  const loc = useLocationString();
  const m = match(loc.split("?")[0]);
  if (!m) return <NotFound />;
  const page = <m.Page key={`${m.pattern}:${JSON.stringify(m.params)}`} />;
  return (
    <ParamsContext.Provider value={m.params}>
      {m.Layout ? <m.Layout key={m.pattern.split("/")[1]}>{page}</m.Layout> : page}
    </ParamsContext.Provider>
  );
}

// Plain #anchors on the shared link jump straight into a view.
const anchor = window.location.hash.replace(/^#/, "");
if (anchor === "demo") setInitialLocation("/demo");

createRoot(document.getElementById("root")!).render(
  <Providers>
    <App />
  </Providers>,
);

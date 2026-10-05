// Builds the hosted website (static, one HTML file, real accounts via Supabase).
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Supabase settings come from the environment (CI) or .env.local (your machine).
const fileEnv = existsSync(".env.local")
  ? Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]))
  : {};
const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("Set Supabase keys in .env.local first");
execSync("npx vite build --config spa/vite.config.ts", { stdio: "inherit", env: { ...process.env, ...env, LIFTLINE_LIVE: "1", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" } });
// Full HTML document for a normal web host.
let html = readFileSync("site/index.html", "utf8");
if (!/<!doctype/i.test(html)) {
  html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0f1012"></head><body>${html}</body></html>`;
}
const title = html.match(/<title>.*?<\/title>/)?.[0] ?? "<title>Liftline</title>";
html = html.replace(title, "").replace("</head>", `${title}</head>`);
writeFileSync("site/index.html", html);
writeFileSync("site/_redirects", "/*  /index.html  200\n"); // Netlify
writeFileSync("site/.nojekyll", ""); // GitHub Pages: serve files as-is
console.log("site/ ready");

// Builds the demo-only single-file version (in-memory router, no server needed).
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

execSync("npx vite build --config spa/vite.config.ts", { stdio: "inherit", env: { ...process.env, VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" } });
let html = readFileSync("spa-dist/index.html", "utf8");
const title = html.match(/<title>.*?<\/title>/)[0];
html = html
  .replace(/<!doctype html>/i, "")
  .replace(/<\/?(html|head|body)[^>]*>/gi, "")
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .replace(title, "");
const out = `${title}\n<style>:root{color-scheme:dark}html,body{background:#0f1012;color:#f5f6f7}</style>\n${html.trim()}\n`;
mkdirSync("artifact", { recursive: true });
writeFileSync("artifact/liftline.html", out);
console.log(`artifact/liftline.html ${(out.length / 1024).toFixed(0)} KB`);

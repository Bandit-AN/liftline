import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const live = process.env.LIFTLINE_LIVE === "1";

export default defineConfig({
  root: r("."),
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: r("./shims/link.tsx") },
      { find: /^next\/navigation$/, replacement: r("./shims/navigation.ts") },
      { find: /^@\//, replacement: r("../src/") + "/" },
    ],
  },
  define: {
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(live ? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "" : ""),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(live ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" : ""),
    "import.meta.env.VITE_ROUTER": JSON.stringify(live ? "hash" : "memory"),
  },
  publicDir: r("../public"),
  build: process.env.LIFTLINE_HARNESS
    ? { outDir: process.env.LIFTLINE_HARNESS, emptyOutDir: true, chunkSizeWarningLimit: 4000, rollupOptions: { input: r("./harness.html") } }
    : { outDir: r(live ? "../site" : "../spa-dist"), emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  logLevel: "warn",
});

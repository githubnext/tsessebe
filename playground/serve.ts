/**
 * Local development server for the tsb playground.
 *
 * Usage: bun run playground (or: bun run playground/serve.ts)
 *
 * Builds the tsb browser bundle and TypeScript compiler into playground/dist/,
 * then serves the playground on http://localhost:3000.
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";

const PORT = 3000;
const PLAYGROUND_DIR = import.meta.dir;
const PROJECT_ROOT = join(PLAYGROUND_DIR, "..");
const DIST_DIR = join(PLAYGROUND_DIR, "dist");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

async function buildBundle() {
  console.log("Building tsb browser bundle…");
  const result = await Bun.build({
    entrypoints: [join(PROJECT_ROOT, "src", "index.ts")],
    outdir: DIST_DIR,
    target: "browser",
    minify: true,
  });
  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }
  console.log("  → playground/dist/index.js");
}

function copyTypeScript() {
  const src = join(PROJECT_ROOT, "node_modules", "typescript", "lib", "typescript.js");
  const dest = join(DIST_DIR, "typescript.js");
  if (!existsSync(src)) {
    console.warn("⚠ TypeScript compiler not found at", src);
    console.warn("  Run `npm install` first. CDN fallback will be used.");
    return;
  }
  copyFileSync(src, dest);
  console.log("  → playground/dist/typescript.js");
}

async function main() {
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }

  await buildBundle();
  copyTypeScript();

  console.log(`\nPlayground ready at http://localhost:${PORT}\n`);

  Bun.serve({
    port: PORT,
    fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = join(PLAYGROUND_DIR, pathname);

      const file = Bun.file(filePath);
      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    },
    error() {
      return new Response("Not found", { status: 404 });
    },
  });
}

main();

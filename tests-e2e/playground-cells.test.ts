/**
 * Playground page execution tests (Playwright + Chromium).
 *
 * For every interactive playground page under `playground/`, this test
 * launches a real headless browser, clicks ▶ Run on every code cell, and
 * asserts that:
 *
 *   1. The cell does not produce a TypeScript or runtime error
 *      (the playground runtime renders these with a leading "❌" and
 *      sets the .error class on `.playground-output`).
 *   2. The cell produces non-empty output (i.e. it actually called
 *      console.log / console.error / console.warn — no
 *      "(no output — add console.log() …)" sentinel).
 *
 * This catches the class of bugs called out in the playground-test issue —
 * for example, pages where cells reference variables/imports from a previous
 * cell (cells run in isolated `new Function` scopes so nothing persists), or
 * pages where the "TypeScript" cell actually contains Python source.
 *
 * ── Known failures allowlist ─────────────────────────────────────────
 *
 * Many existing pages currently fail. To make the test useful immediately
 * (catch *new* regressions, surface the existing breakage) without blocking
 * CI on a 78-page rewrite, the file `tests-e2e/known-failures.json`
 * enumerates the (file → cell numbers) that are currently broken.
 *
 *   - A failing cell that IS in the allowlist is reported but does not
 *     fail the test (encoded as a passing assertion with `console.warn`).
 *   - A failing cell that is NOT in the allowlist fails the test
 *     (regression).
 *   - A passing cell that IS in the allowlist also fails the test —
 *     please remove it from the allowlist (forward progress).
 *
 * As pages get fixed, their entries should be removed from
 * `known-failures.json`.
 *
 * ── Running locally ──────────────────────────────────────────────────
 *
 *   bun install
 *   bunx playwright install chromium
 *   bun run test:e2e
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { type Browser, type BrowserContext, type Locator, type Page, chromium } from "playwright";

const PROJECT_ROOT = join(import.meta.dir, "..");
const PLAYGROUND_DIR = join(PROJECT_ROOT, "playground");
const KNOWN_FAILURES_PATH = join(import.meta.dir, "known-failures.json");

// Pages that are intentionally not interactive playgrounds.
const NON_PLAYGROUND_PAGES = new Set<string>(["index.html", "benchmarks.html", "examples.html"]);

const PORT = 3399;
const BASE_URL = `http://localhost:${PORT}`;

// Number of pages tested in parallel. Chosen empirically: low enough that a
// shared GitHub Actions runner (2 vCPU) doesn't thrash on V8 isolates and
// network I/O, high enough that the full suite (~130 pages) finishes well
// inside a minute. Increasing this past ~8 yields diminishing returns and
// risks flaky timeouts on constrained runners.
const PAGE_CONCURRENCY = 6;

type KnownFailures = Record<string, number[]>;

function loadKnownFailures(): KnownFailures {
  const raw = readFileSync(KNOWN_FAILURES_PATH, "utf8");
  return JSON.parse(raw) as KnownFailures;
}

function listPlaygroundHtmlFiles(): string[] {
  return readdirSync(PLAYGROUND_DIR)
    .filter((f) => f.endsWith(".html"))
    .filter((f) => !NON_PLAYGROUND_PAGES.has(f))
    .sort();
}

type CellOutcome = {
  cellIndex: number; // 1-based to match human-readable allowlist entries
  ok: boolean;
  reason: string; // empty when ok
};

type ServerHandle = { kill: () => void };

async function startPlaygroundServer(): Promise<ServerHandle> {
  // Re-use the project's serve.ts but on a non-default port via env override.
  // serve.ts hard-codes the port, so we instead build the bundle once and
  // start a minimal Bun.serve on PORT here.
  await Bun.$`mkdir -p ${join(PLAYGROUND_DIR, "dist")}`.quiet();
  const buildResult = await Bun.build({
    entrypoints: [join(PROJECT_ROOT, "src", "index.ts")],
    outdir: join(PLAYGROUND_DIR, "dist"),
    target: "browser",
    minify: true,
  });
  if (!buildResult.success) {
    const buildLogs = buildResult.logs.map((l) => String(l)).join("\n");
    throw new Error(`Failed to build tsb browser bundle:\n${buildLogs}`);
  }
  const tsSrc = join(PROJECT_ROOT, "node_modules", "typescript", "lib", "typescript.js");
  await Bun.write(join(PLAYGROUND_DIR, "dist", "typescript.js"), Bun.file(tsSrc));

  const MIME: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
  };
  const server = Bun.serve({
    port: PORT,
    fetch(req: Request): Response {
      const url = new URL(req.url);
      const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = join(PLAYGROUND_DIR, pathname);
      const dotIdx = filePath.lastIndexOf(".");
      const ext = dotIdx >= 0 ? filePath.slice(dotIdx) : "";
      return new Response(Bun.file(filePath), {
        headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
      });
    },
    error(): Response {
      return new Response("Not found", { status: 404 });
    },
  });
  return {
    kill: (): void => {
      server.stop(true);
    },
  };
}

function classifyOutput(text: string, cls: string): CellOutcome["reason"] | null {
  const trimmed = text.trim();
  if (cls.includes("error") || trimmed.startsWith("❌")) {
    return `error: ${trimmed.slice(0, 200)}`;
  }
  if (trimmed === "" || trimmed.startsWith("(no output") || trimmed.startsWith("Click ▶")) {
    return "no output produced";
  }
  return null; // success
}

async function runCell(block: Locator, cellIndex: number, page: Page): Promise<CellOutcome> {
  try {
    await block.locator(".playground-run").click();
    // Output is updated synchronously inside the click handler, but give
    // the event loop a tick for the DOM update to flush.
    await page.waitForTimeout(50);
    const outputLoc = block.locator(".playground-output").first();
    const text = (await outputLoc.textContent()) ?? "";
    const cls = (await outputLoc.getAttribute("class")) ?? "";
    const reason = classifyOutput(text, cls);
    if (reason !== null) {
      return { cellIndex, ok: false, reason };
    }
    return { cellIndex, ok: true, reason: "" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { cellIndex, ok: false, reason: `playwright error: ${msg}` };
  }
}

async function executePageCells(ctx: BrowserContext, file: string): Promise<CellOutcome[]> {
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  const outcomes: CellOutcome[] = [];
  try {
    await page.goto(`${BASE_URL}/${file}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    // Wait until all Run buttons are enabled (signals runtime is initialized).
    await page.waitForFunction(
      () => {
        const btns = document.querySelectorAll(".playground-run");
        if (btns.length === 0) return false;
        return Array.from(btns).every((b) => !(b as HTMLButtonElement).disabled);
      },
      { timeout: 25000 },
    );
    const blocks = await page.locator(".playground-block").all();
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!block) {
        continue;
      }
      outcomes.push(await runCell(block, i + 1, page));
    }
  } finally {
    if (pageErrors.length > 0) {
      // Surface uncaught page errors as a synthetic cell-0 failure.
      outcomes.unshift({
        cellIndex: 0,
        ok: false,
        reason: `page error(s): ${pageErrors.join(" || ").slice(0, 300)}`,
      });
    }
    await page.close();
  }
  return outcomes;
}

function assertPageOutcomes(
  file: string,
  outcomes: CellOutcome[] | undefined,
  allowed: KnownFailures,
): void {
  if (outcomes === undefined) {
    throw new Error(`no outcomes recorded for ${file}`);
  }
  const allowedCells = new Set(allowed[file] ?? []);
  const unexpectedFailures: string[] = [];
  const unexpectedPasses: number[] = [];

  for (const o of outcomes ?? []) {
    if (o.cellIndex === 0) {
      // Page-level failure (e.g., uncaught page error) — never allowlist.
      unexpectedFailures.push(`page-level: ${o.reason}`);
      continue;
    }
    const inAllowlist = allowedCells.has(o.cellIndex);
    if (!(o.ok || inAllowlist)) {
      unexpectedFailures.push(`cell ${o.cellIndex}: ${o.reason}`);
    } else if (o.ok && inAllowlist) {
      unexpectedPasses.push(o.cellIndex);
    }
  }

  const messages: string[] = [];
  if (unexpectedFailures.length > 0) {
    messages.push(
      `${unexpectedFailures.length} regression(s) in ${file}:\n  - ${unexpectedFailures.join("\n  - ")}`,
    );
  }
  if (unexpectedPasses.length > 0) {
    messages.push(
      `${unexpectedPasses.length} cell(s) in ${file} now PASS but are still listed in tests-e2e/known-failures.json — please remove them: [${unexpectedPasses.join(", ")}]`,
    );
  }
  if (messages.length > 0) {
    throw new Error(messages.join("\n\n"));
  }
}

let server: ServerHandle | null = null;
let browser: Browser | null = null;
let context: BrowserContext | null = null;
const allOutcomes: Map<string, CellOutcome[]> = new Map();
const knownFailures = loadKnownFailures();
const files = listPlaygroundHtmlFiles();

beforeAll(async () => {
  server = await startPlaygroundServer();
  browser = await chromium.launch();
  context = await browser.newContext();

  // Pre-execute every page in parallel (bounded concurrency) to keep total
  // wall-clock under a few minutes. We still create a per-page `it()` below
  // so failures are reported with file granularity.
  let nextIdx = 0;
  async function worker(): Promise<void> {
    while (nextIdx < files.length) {
      const i = nextIdx++;
      const file = files[i];
      if (!(file && context)) {
        continue;
      }
      const outcomes = await executePageCells(context, file);
      allOutcomes.set(file, outcomes);
    }
  }
  await Promise.all(Array.from({ length: PAGE_CONCURRENCY }, worker));
}, 600_000);

afterAll(async () => {
  if (context) {
    await context.close();
  }
  if (browser) {
    await browser.close();
  }
  if (server) {
    server.kill();
  }
});

describe("playground page execution", () => {
  it("discovered playground pages", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`every cell on ${file} produces non-error, non-empty output`, () => {
      assertPageOutcomes(file, allOutcomes.get(file), knownFailures);
    });
  }
});

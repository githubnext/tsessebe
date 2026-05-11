/**
 * Playground page conformance tests.
 *
 * Every interactive playground page under `playground/` must follow the
 * standardized structure documented in `docs/playground.md`:
 *
 *   1. Loads the shared `playground-runtime.js` runtime (no per-page demo JS).
 *   2. Includes a `#playground-loading` overlay shown until the runtime is ready.
 *   3. Contains at least one `.playground-block` with `.playground-editor`,
 *      a `.playground-run` button, and a `.playground-output` target.
 *   4. Uses the dark-theme CSS variables (`--bg`, `--accent`, …).
 *   5. Does NOT reference legacy artifacts that never existed in the repo
 *      (`style.css`, `./runtime.js`).
 *
 * These checks make sure all docs-site playgrounds are interactive and
 * consistently styled — preventing regressions to the legacy patterns.
 */

import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PLAYGROUND_DIR = join(import.meta.dir, "..", "playground");

// Pages that are intentionally not interactive playgrounds.
const NON_PLAYGROUND_PAGES = new Set<string>([
  // The landing page is a roadmap/index — no executable code blocks.
  "index.html",
  // The benchmarks page is a results chart (tsb vs pandas), not a playground.
  "benchmarks.html",
  // The examples page is an index/gallery page linking to individual examples.
  "examples.html",
]);

function listPlaygroundHtmlFiles(): string[] {
  return readdirSync(PLAYGROUND_DIR)
    .filter((f) => f.endsWith(".html"))
    .filter((f) => !NON_PLAYGROUND_PAGES.has(f))
    .sort();
}

function read(file: string): string {
  return readFileSync(join(PLAYGROUND_DIR, file), "utf8");
}

describe("playground page conformance", () => {
  const files = listPlaygroundHtmlFiles();

  it("discovers playground pages", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    describe(file, () => {
      const html = read(file);

      it("loads the shared playground-runtime.js", () => {
        expect(html).toContain("playground-runtime.js");
      });

      it("has a #playground-loading overlay", () => {
        expect(html).toMatch(/id\s*=\s*["']playground-loading["']/);
      });

      it("contains at least one .playground-block", () => {
        expect(html).toMatch(/class\s*=\s*["'][^"']*\bplayground-block\b/);
      });

      it("contains a .playground-editor textarea", () => {
        expect(html).toMatch(/class\s*=\s*["'][^"']*\bplayground-editor\b/);
      });

      it("contains a .playground-run button", () => {
        expect(html).toMatch(/class\s*=\s*["'][^"']*\bplayground-run\b/);
      });

      it("contains a .playground-output target", () => {
        expect(html).toMatch(/class\s*=\s*["'][^"']*\bplayground-output\b/);
      });

      it("uses the dark-theme CSS variables", () => {
        expect(html).toContain("--bg");
        expect(html).toContain("--accent");
      });

      it("does not reference the legacy missing style.css", () => {
        expect(html).not.toMatch(/href\s*=\s*["']style\.css["']/);
      });

      it("does not import from the legacy missing ./runtime.js", () => {
        expect(html).not.toMatch(/from\s*["']\.\/runtime\.js["']/);
      });
    });
  }
});

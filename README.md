# Tsessebe

<img src="assets/tsessebe-logo.png" alt="Tsessebe logo — stylized head of a tsessebe antelope" width="180" align="left" style="margin-right: 16px;" />

A TypeScript port of [pandas](https://github.com/pandas-dev/pandas), built from first principles using [Autoloop](https://github.com/githubnext/autoloop) — an automated research and experimentation platform that runs iterative optimization loops on [GitHub Agentic Workflows](https://github.github.com/gh-aw/).

> **Pronounced** *tseh-SEH-bee* · IPA /tsɛˈsɛbi/ — named after the [tsessebe](https://en.wikipedia.org/wiki/Common_tsessebe) (*Damaliscus lunatus*), a southern African antelope. The word is Setswana; it carries the "ts" as one sound, the middle "se" takes the stress, and the final "be" is unstressed.

<br clear="left">

## Project conventions

- **Package name:** `tsb` — all imports and usage use `tsb`, not `tsessebe`. `import { DataFrame } from 'tsb'`
- **Runtime & tooling:** [Bun](https://bun.sh) for everything — runtime, bundler, test runner, package manager
- **Language:** TypeScript in strictest mode — no `any`, no `as` casts, no `@ts-ignore`, no escape hatches
- **Dependencies:** Zero for core library. External deps only where absolutely required for non-core tooling (e.g. Playwright, WASM toolchains).
- **Linting:** Biome with all rules enabled, zero warnings tolerated
- **Testing:** 100% coverage — unit, property-based (fast-check), fuzz, and Playwright e2e for the web playground
- **Build from scratch:** Every pandas feature is implemented from first principles. No wrapping or porting existing JS/TS data libraries.

## Goals

- **Full feature parity with pandas** — identical APIs adapted to TypeScript conventions and idiomatic structures. Every pandas feature is built from scratch, ground up, first principles. No ports of existing JS/TS data libraries.
- **Interactive web playground** — every feature ships with a rich, interactive tutorial, deployed to GitHub Pages. WASM where needed and useful.
- **Performance** — aggressive optimization throughout. Speed is a first-class concern.
- **Exhaustive testing** — pandas' own test suite as a baseline, extended with property-based testing, fuzzing, and e2e coverage. Target: 100%.

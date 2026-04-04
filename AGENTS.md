# Agent Instructions (AGENTS.md)

This file provides project-specific conventions for AI coding agents working in this repository.

## Project Overview

**tsb** is a TypeScript port of [pandas](https://pandas.pydata.org/), built from first principles.
- Package name: `tsb` — all imports use `tsb`
- Runtime: Bun
- Language: TypeScript (strictest mode)

## Key Rules

1. **Never modify `README.md`** — it is read-only, the source of truth for project parameters.
2. **Never modify `.autoloop/programs/**`** or autoloop workflow files.
3. **Strict TypeScript only** — no `any`, no `as` casts, no `@ts-ignore`, no escape hatches.
4. **Zero core dependencies** — implement everything from scratch.
5. **100% test coverage** required — unit + property-based (fast-check) + fuzz where applicable.
6. **Every feature gets a playground page** in `playground/`.
7. **One feature per commit** — keep changes small and targeted.

## Project Structure

```
src/
  index.ts          — package entry point, re-exports all features
  types.ts          — shared type definitions
  core/             — core data structures (Series, DataFrame, Index, Dtype)
  io/               — I/O utilities (read_csv, read_json, etc.)
  groupby/          — groupby and aggregation
  reshape/          — pivot, melt, stack, unstack
  merge/            — merge, join, concat
  window/           — rolling, expanding, ewm
  stats/            — statistical functions
tests/
  setup.ts          — global test setup (loaded via bunfig.toml)
  *.test.ts         — mirrors src/ structure
playground/
  index.html        — landing page
  *.html            — one page per feature
```

## Adding a New Feature

1. Create `src/{module}/{feature}.ts` with the implementation.
2. Export from `src/index.ts`.
3. Create `tests/{module}/{feature}.test.ts` with full coverage.
4. Create `playground/{feature}.html` with an interactive tutorial.
5. Update `playground/index.html` to mark the feature as complete.

## Running Locally

```bash
bun install          # install devDependencies
bun test             # run all tests
bun run lint         # check linting
bun run typecheck    # TypeScript strict check
```

## Autoloop Coordination

This project is built by [Autoloop](https://github.com/githubnext/autoloop), an iterative optimization agent.
- Long-running branch: `autoloop/build-tsb-pandas-typescript-migration`
- State file: `build-tsb-pandas-typescript-migration.md` on `memory/autoloop` branch
- Issue #1 is the program definition — do not modify it.

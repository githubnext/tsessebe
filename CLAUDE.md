---
description: Coding preferences for Claude when working on tsb.
---

# Claude Code Configuration (CLAUDE.md)

## Behavior

- Always read `AGENTS.md` first for project conventions.
- Read `README.md` to understand the project requirements — treat it as read-only.
- Read the state file in `.autoloop/memory/` for current migration progress.

## Code Style

- TypeScript strict mode — no `any`, no `as`, no `@ts-ignore`
- Biome formatting (spaces, 100-col lines, double quotes, trailing commas)
- JSDoc for all exported symbols
- Unit tests with `bun:test` + property tests with `fast-check`

## Commands

```bash
bun install          # install deps
bun test             # run tests
bun run lint         # Biome lint
bun run typecheck    # tsc --noEmit
```

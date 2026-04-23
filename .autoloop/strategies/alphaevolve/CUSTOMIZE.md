# Adopting the AlphaEvolve strategy for a new program

This file is a **creator-time guide** — it is read by the maintainer (or a "create program" agent) **once**, when authoring a new program that wants to use AlphaEvolve. It is **not** copied into the program's `strategy/` directory and is **not** read by the iteration agent at runtime.

If you are an iteration agent and have somehow ended up here: stop, go back to `strategy/alphaevolve.md` in the program directory, and follow that.

## When to pick AlphaEvolve

AlphaEvolve is the right strategy when **all** of the following are true:

- The target is a **self-contained artifact** — a single function, a single file, a config blob — that can be replaced atomically each iteration.
- Fitness is a **scalar metric** the evaluator can produce in a few seconds to a few minutes (lower or higher is better — pick one).
- There are **multiple plausible algorithmic families**, not just one obvious approach with knobs to tune. AlphaEvolve's island model is wasted if everything collapses to one family.
- Iterations are **independent** — a candidate's fitness does not depend on the previous candidate's state. (If you need to *accumulate* changes, use the default loop, not AlphaEvolve.)

If the program is "add another test", "port another feature", or any kind of coverage / accumulation task — **do not use AlphaEvolve**. Use the default loop.

## Steps to adopt

1. Create `.autoloop/programs/<program-name>/` with the usual layout: a `program.md` and a `code/` directory containing the target artifact and the evaluator.
2. Copy the strategy template into the program:

   ```bash
   mkdir -p .autoloop/programs/<program-name>/strategy/prompts
   cp .autoloop/strategies/alphaevolve/strategy.md \
      .autoloop/programs/<program-name>/strategy/alphaevolve.md
   cp .autoloop/strategies/alphaevolve/prompts/mutation.md \
      .autoloop/programs/<program-name>/strategy/prompts/mutation.md
   cp .autoloop/strategies/alphaevolve/prompts/crossover.md \
      .autoloop/programs/<program-name>/strategy/prompts/crossover.md
   ```

3. Resolve every `<CUSTOMIZE: …>` marker in `strategy/alphaevolve.md` and the two prompt files. See the marker-by-marker guidance below.
4. Add the `## Evolution Strategy` pointer block to `program.md` (template below).
5. Sanity-check: `grep -R "<CUSTOMIZE" .autoloop/programs/<program-name>/strategy/` should return **nothing**.

## The pointer block for `program.md`

Replace (or add) `program.md`'s `## Evolution Strategy` section with exactly this:

```markdown
## Evolution Strategy

This program uses the **AlphaEvolve** strategy. On every iteration, read `strategy/alphaevolve.md` and follow it literally — it supersedes the generic analyze/accept/reject steps in the default autoloop loop.

Support files:
- `strategy/alphaevolve.md` — the runtime playbook (operators, parent selection, population rules).
- `strategy/prompts/mutation.md` — framing for exploitation and exploration operators.
- `strategy/prompts/crossover.md` — framing for crossover and migration operators.

Population state lives in the state file on the `memory/autoloop` branch under the `## 🧬 Population` subsection (see the playbook for the schema).
```

## Marker-by-marker guidance

### `strategy.md` markers

- **`# AlphaEvolve Strategy — <CUSTOMIZE: program-name>`** — the program name as it appears in the file path.
- **`## Problem framing`** — 2–4 sentences. State the artifact, the fitness function, and the validity invariants. The agent reads this every iteration; make it dense.
- **Operator weight table** — only change defaults if you have a strong prior. The defaults bias toward exploitation, which is right for most perf problems.
- **Islands** — the most important thing to get right. Pick 3–6 **algorithmic families** that span the design space. Examples:
  - For a numeric optimization: gradient-based, gradient-free local, evolutionary, hybrid.
  - For a layout problem: grid, hex, force-directed, hierarchical.
  - For a tsb perf evolve: column scan, iterator pipeline, gather/scatter, WASM, SoA batched.
  Give each island a one-line description that is concrete enough that the agent can tell which island a new candidate belongs to.
- **Validity pre-check invariants** — list the *cheap* checks. Things the agent can verify by reading the candidate, before running the full evaluator. (E.g. "no `any`", "no new dependencies", "exported function signature unchanged".)
- **Diff style** — "full rewrite" if the artifact is a single small function; "minimal diff" if it is a larger file where most of the surface is fixed.
- **`population_size`, `archive_size`** — tune to your problem's scale. Defaults (40 / 10) are reasonable for most cases. Smaller populations converge faster but lose diversity; larger ones explore more but the per-iteration parent-selection cost grows.
- **Feature dimensions** — pick 2–3 *qualitative* dimensions that distinguish meaningfully-different solutions. Avoid using fitness as a dimension (that defeats the point). Good examples: "memory layout (AoS / SoA / typed-array)", "algorithm (sort-then-scan / hash / bitmap)". Bad examples: "fast / medium / slow".
- **Population schema language tag** — the `<CUSTOMIZE: language>` in the code fence (e.g. `typescript`, `python`, `yaml`).

### `prompts/mutation.md` markers

This prompt frames how the agent reasons about *single-parent* changes (exploitation refining the best, exploration trying something new in an under-represented island). Customize:

- **Mutation vocabulary** — list 5–10 concrete mutation moves that make sense for this problem. (E.g. "replace `Array.prototype.map` with a preallocated typed array", "split a hot loop into chunks of 64".) These act as a menu the agent can sample from.
- **Domain knowledge** — anything you, the maintainer, know about the problem space that the agent might not derive on its own. Keep it short (10–20 bullets max) — the agent reads this every iteration.

### `prompts/crossover.md` markers

This prompt frames *two-parent* operations (crossover combines, migration grafts). Customize:

- **Combination patterns** — what does "combining two solutions" look like for this problem? (For code: "take the data structure from parent A and the loop body from parent B". For configs: "merge non-conflicting keys, agent picks for conflicts".)
- **Migration patterns** — what does "porting a technique from island A to island B" mean concretely? Spell out one or two worked examples.

## A tiny worked example

Suppose you are creating `tsb-perf-evolve` to make `Series.sort_values` faster than pandas. Filled-in islands might be:

- **Island 0 — Comparison sort**: `Array.prototype.sort` with custom comparator.
- **Island 1 — Typed array sort**: copy into `Float64Array`, sort in place, gather indices.
- **Island 2 — Radix / counting sort**: dispatch on dtype, use a non-comparison sort where applicable.
- **Island 3 — WASM**: call a tiny WASM module compiled from Zig/Rust.
- **Island 4 — SoA batched**: sort multiple columns together in a single pass.

Feature dimensions:

- **Memory layout**: AoS / SoA / typed-array
- **Algorithm class**: comparison / non-comparison / hybrid

That's the kind of fill-in to aim for — concrete, distinguishable, exhaustive enough that interesting candidates land in different cells.

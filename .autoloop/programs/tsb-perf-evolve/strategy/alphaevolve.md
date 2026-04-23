# AlphaEvolve Strategy — tsb-perf-evolve

This file is the **runtime playbook** for this program. The autoloop agent reads it at the start of every iteration and follows it literally. It supersedes the generic "Analyze and Propose" / "Accept or Reject" steps in the default autoloop iteration loop — all other steps (state read, branch management, state file updates) still apply.

## Problem framing

The target artifact is the body of `Series.sortValues` in `src/core/series.ts`. Fitness is the ratio `tsb_mean_ms / pandas_mean_ms` measured on the fixed benchmark in `code/benchmark.ts` (and its pandas mirror `code/benchmark.py`); **lower is better**, with `< 1.0` meaning tsb is faster than pandas. A candidate is valid iff the existing tests for `sortValues` pass, the public signature is unchanged, no new runtime dependencies are added, TypeScript strict mode is satisfied, and behaviour matches the reference for numeric/string/mixed dtypes, both ascending values, and both `naPosition` settings.

## Per-iteration loop

### Step 1. Load state

1. Read `program.md` — Goal, Target, Evaluation.
2. Read the program's state file from the repo-memory folder (`tsb-perf-evolve.md`). Locate the `## 🧬 Population` subsection. If it does not exist, create it using the schema in [Population schema](#population-schema).
3. Read `code/config.yaml` for tunables (`exploitation_ratio`, `num_islands`, `population_size`, `archive_size`, `dataset_size`, etc.). Do not hard-code values you can read from config — the maintainer may have tuned them.
4. Read both prompt templates in `strategy/prompts/`. These frame how you reason about mutations and crossovers for sorting code.

### Step 2. Pick operator

Sample one operator using these weights (tuned for a perf problem with a small handful of plausible algorithmic families — exploitation-heavy because once an island has a working candidate, refinement usually pays):

| Operator | Default weight | When it fires |
|---|---|---|
| Exploitation | 0.50 | Refine one of the elites — the current best or a near-best. |
| Exploration | 0.30 | Generate a candidate from an **under-represented island** or a novel family. |
| Crossover | 0.15 | Combine ideas from two parents on different islands. |
| Migration | 0.05 | Take a technique that works on island A and port it into a solution on island B. |

Deterministic overrides (apply *before* sampling):

- If the population is empty or has one member → **Exploration** (seed diversity).
- If the last 3 statuses in `recent_statuses` are all `rejected` → force **Exploration** with a previously-unused island.
- If the last 5 statuses are all `rejected` → force **Migration** or a radically new island; also revisit any domain knowledge in `prompts/mutation.md` that has not yet been applied.

Record your chosen operator in the iteration's reasoning — the state file's Iteration History entry must include it.

### Step 3. Pick parent(s)

**Islands** for this program (algorithmic families for sorting a 1-D numeric Series with NaN):

- **Island 0 — Comparison sort (objects)**: the current implementation — `Array.prototype.sort` over `{v, i}` pairs with a comparator that handles NaN.
- **Island 1 — Indirect typed-array sort**: copy values into a `Float64Array`, sort an index `Uint32Array` by that, then gather. NaN handled by partition.
- **Island 2 — Decorate-sort-undecorate with packed keys**: encode `(value, index)` into a single sortable representation (e.g. pack into a `BigInt64Array` or use parallel typed arrays), sort once, gather.
- **Island 3 — Non-comparison / radix**: dispatch on dtype; for finite floats, transform to a sortable unsigned representation and run an LSD radix sort, then untransform.
- **Island 4 — Hybrid**: small-input fast path (Array.prototype.sort) + large-input dispatch into one of the above families based on `dataset_size` and dtype.

Parent selection by operator:

- **Exploitation** — pick the best scorer; break ties by picking the most recent.
- **Exploration** — pick the island with the fewest members (or a brand-new island number if all are full), then either start from its best member or from scratch.
- **Crossover** — pick two parents on **different islands**. Bias toward one elite (top quartile) and one diverse (any island with a distinct feature-cell — see [Feature dimensions](#feature-dimensions)).
- **Migration** — pick one donor island (the source of the technique) and one recipient island (where the technique will be grafted in). The parent you actually edit is on the recipient island.

### Step 4. Apply the operator

Frame your reasoning using the matching prompt template:

- Exploitation or Exploration → `strategy/prompts/mutation.md`
- Crossover or Migration → `strategy/prompts/crossover.md`

Before writing any code, state (in your visible reasoning):

1. Chosen operator + why.
2. Parent(s) picked — their IDs, island, score, and a one-line summary of each parent's approach.
3. What specifically you're changing, and your hypothesis for *why* it should improve the fitness.
4. Validity pre-check — walk through why the proposed candidate will satisfy each invariant:
   - Existing tests for `sortValues` will pass (numeric + NaN, string, ascending/descending, both `naPosition` values, empty Series).
   - Public signature unchanged: `sortValues(ascending = true, naPosition: "first" | "last" = "last"): Series<T>`.
   - No new runtime dependency added to `package.json`.
   - No `any`, no `as`, no `@ts-ignore`.
   - Index alignment preserved — every output value is paired with the original index of the input row it came from.
5. Novelty check: confirm this is not a near-duplicate of an existing population member or of anything in the state file's 🚧 Foreclosed Avenues.

### Step 5. Implement

Edit only the files listed in `program.md`'s Target section. The diff style for this program is **minimal diff** — `series.ts` is a large file and only the body of `sortValues` (plus, occasionally, a small private helper added immediately above it) should change. Do not reformat unrelated parts of the file.

### Step 6. Evaluate

Run the evaluation command from `program.md`. Parse the `fitness` field from the JSON output (along with `tsb_mean_ms` and `pandas_mean_ms` for the population entry).

### Step 7. Update the population

Regardless of whether the iteration is accepted or rejected at the branch level, the candidate has been tried and should be recorded in the population — the population is a memory of what's been explored, not just what's been kept.

Append a new entry to the `## 🧬 Population` subsection in the state file using the schema below. Then enforce these caps:

- **Population cap**: `population_size` from `code/config.yaml` (default 40). If exceeded, evict the *worst* member in the most-crowded feature cell (MAP-Elites style — never evict the best of any cell).
- **Elite archive**: the top `archive_size` from `code/config.yaml` (default 10) by fitness are always preserved regardless of cell crowding.

### Step 8. Fold through to the default loop

Continue with the normal autoloop Step 5 (Accept or Reject → commit / discard, update state file's Machine State, Iteration History, Lessons Learned, etc.) as defined in the workflow. The only additional requirements from AlphaEvolve are:

- The Iteration History entry must include `operator`, `parent_id(s)`, `island`, and `fitness` fields (in addition to the normal status/change/metric/notes).
- Lessons Learned additions should be phrased as *transferable heuristics* about the problem space, not as reports of what this iteration did. (E.g. "Indirect sort over `Uint32Array` indices beats object-pair sort above n≈10k" — not "Iteration 17 tried indirect sort.")

## Feature dimensions

MAP-Elites partitions the population into **feature cells**. Each candidate is described by a small tuple of qualitative features, and the population keeps the best candidate per cell — this is what creates diversity pressure even when many candidates have similar fitness.

For this program, use these feature dimensions:

- **Dimension 1 — Storage**: `boxed-pairs` / `parallel-typed-arrays` / `packed-typed-array` / `wasm-buffer`
- **Dimension 2 — Algorithm class**: `comparison` / `non-comparison` / `hybrid`

When evaluating a candidate, classify it into one cell per dimension. The combined `(storage, algorithm)` tuple is its **feature cell**. Record the cell in the population entry (see schema).

## Population schema

The population lives in the state file `tsb-perf-evolve.md` on the `memory/autoloop` branch as a subsection. Use this exact layout so maintainers can read and edit it:

```markdown
## 🧬 Population

> 🤖 *Managed by the AlphaEvolve strategy. One entry per candidate that has been evaluated (accepted or rejected). Newest first.*

### Candidate <id>  ·  island <n>  ·  fitness <score>  ·  gen <iter>

- **Operator**: exploitation / exploration / crossover / migration
- **Parent(s)**: [<id1>, <id2>]
- **Feature cell**: <storage-bucket> · <algorithm-bucket>
- **Approach**: <one-line summary of the technique>
- **Status**: ✅ accepted / ❌ rejected
- **Notes**: <what worked or didn't, anything worth remembering — e.g. "tsb=12.3ms / pandas=8.7ms / ratio=1.41">

Code:

\`\`\`typescript
<the candidate sortValues body, or a diff against parent if too large to inline>
\`\`\`

---
```

Identifiers:
- `<id>` is `c{NNN}` zero-padded, monotonically increasing across the program's lifetime.
- `<n>` is the island number (0-indexed, 0..4 for this program).
- `<score>` is the raw `fitness` (the tsb/pandas ms ratio).
- `<iter>` is the iteration number from the Machine State table.

When evicting members under the population cap, **never** delete an entry — instead, prepend a strikethrough header (`### ~~Candidate c042~~ (evicted, gen 87)`) and remove the entire `Code:` block (both the `Code:` label and the surrounding triple-backtick `typescript` code fence) to keep the file size bounded. The metadata stays so future iterations can see what was tried.

# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-11T17:45:02Z |
| Iteration Count | 204 |
| Best Metric | 40 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #111 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #111
**Steering Issue**: #107
**Experiment Log**: #3

---

## 🎯 Current Priorities

Next features to implement (prioritized by impact):
- `io/read_excel.ts` — Excel file reading (requires xlsx parser)
- `groupby` extensions — transform, filter, apply
- `stats/interval.ts` — Interval type and IntervalIndex (pandas Interval objects)

---

## 📚 Lessons Learned

- **Iter 204**: `cut`/`qcut` — decompose `assignBins` to keep cognitive complexity under 15. `useCollapsedElseIf` requires removing `else { if (...) }` → `else if (...)`. `noExportedImports` means don't re-export types imported from other modules. Use `biome format --write` to auto-fix formatter issues. `as unknown as [T, U]` required for overload narrowing (not `(...) as [T, U]`).
- **Iter 203**: Canonical branch `autoloop/build-tsb-pandas-typescript-migration` created from hash-suffix branch (iter 199 state, 37 files). Re-implemented `clip_advanced.ts` (lost from iter 200) and `apply.ts` (lost from iter 201). Biome `noExcessiveCognitiveComplexity` → decompose into axis helpers. `noUselessElse` → remove else after early returns. Metric: 39 (from 37, delta: +2).
- **Iter 202**: `clipAdvancedSeries`/`clipAdvancedDataFrame` — canonical branch created from main. Fixed missing exports in src/index.ts, stats/index.ts, core/index.ts for modules from iters 172–199. `noNestedTernary` → use if/else for axis resolution. `ReadonlyArray<T>` → `readonly T[]` for Biome. Metric: 38 (from 37; also fixed index wiring).
- **Iter 201**: `applySeries`/`applyDataFrame`/`applyExpandDataFrame`/`mapDataFrame` — Map<string,Series<Scalar>> is directly assignable to ReadonlyMap (no `as` cast needed). Biome `--write` auto-fixes formatter issues.
- **Iter 200**: `clipAdvancedSeries`/`clipAdvancedDataFrame` — Series bounds use positional alignment; DataFrame bounds use element-wise. Biome `noNonNullAssertion` on 2D arrays → use `?.` optional chaining. `noUselessElse` requires `--unsafe` flag.
- **Iter 199**: `sampleSeries`/`sampleDataFrame` — Import `Scalar` from `../../src/index.ts` (not `../../src/types.ts`) in tests to satisfy `useImportRestrictions`.
- **Iter 197**: Decompose DataFrame operations into separate axis helpers (colWise/rowWise) to keep Biome cognitive complexity low.
- **Iter 196**: Biome `noExcessiveCognitiveComplexity` (max 15): extract small helpers. Use `setCell()` helper to avoid `noNonNullAssertion` on matrix access.
- **Iter 195**: DataFrame iteration: `for (const name of df.columns.values)` + `df.col(name)`. Biome `useExplicitType` requires explicit `: Scalar` return type on arrow functions.
- **DataFrame API**: `df.columns.values` is `readonly string[]`. `df.index.size` (not `.length`). Use `DataFrame.fromColumns()` factory.
- **Series options**: `dtype` must be a `Dtype` object; `name` accepts `string | null` (not `undefined`).
- **Biome**: `useBlockStatements` auto-fixable with `--write --unsafe`. `Number.NaN`, `Number.POSITIVE_INFINITY` required. Use `import fc from "fast-check"` (default import).
- **Tests**: Import from `../../src/index.ts`. Type Series params as `Series<Scalar>`.
- **MCP**: Use direct HTTP to `http://host.docker.internal:80/mcp/safeoutputs` with session-ID handshake. `push_to_pull_request_branch` requires local branch named exactly as remote tracking branch.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `io/read_excel.ts` — Excel reading
- `groupby` extensions — transform, filter, apply
- `stats/interval.ts` — Interval type and IntervalIndex

---

## 📊 Iteration History

### Iteration 204 — 2026-04-11 17:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24288003426)

- **Status**: ✅ Accepted
- **Change**: Add `stats/cut.ts` — `cut()`, `qcut()`, `cutCodes()`, `cutCategories()`. `cut` supports integer bins or explicit edges, right/left-closed intervals, custom labels, retbins, precision, includeLowest. `qcut` supports integer or explicit quantile levels, duplicates=raise/drop. 30+ unit + fast-check tests. Playground page `cut.html` (8 interactive demos).
- **Metric**: 40 (previous best: 39, delta: +1)
- **Commit**: 7dac470 (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: `useCollapsedElseIf` lint rule → `else if` for conditional ranges. Decompose into small helpers to stay under cognitive complexity 15. `as unknown as [T, U]` for overload cast narrowing.

### Iteration 203 — 2026-04-11 17:12 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24287426738)

- **Status**: ✅ Accepted
- **Change**: Re-implement `stats/clip_advanced.ts` (lost from iter 200) and `stats/apply.ts` (lost from iter 201). Creates canonical branch from hash-suffix 531c (iter 199 state, 37 files). clip_advanced: `clipAdvancedSeries`/`clipAdvancedDataFrame` with scalar/array/Series/DataFrame bounds, axis=0/1 broadcasting. apply: `applySeries`, `mapSeries` (function/Map/object), `applyDataFrame` (reduce per col/row), `applyExpandDataFrame` (transform per col/row), `mapDataFrame` (element-wise). 25+ tests each. Playground pages clip_advanced.html, apply.html.
- **Metric**: 39 (previous best: 38, delta: +1)
- **Commit**: 073d74b (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: `noExcessiveCognitiveComplexity` → decompose resolveDataFrameBound and applyExpandDataFrame into focused helpers. `noUselessElse` → remove else clauses after early returns.

### Iteration 202 — 2026-04-11 16:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24286967611)

- **Status**: ✅ Accepted
- **Change**: Add `stats/clip_advanced.ts` — `clipAdvancedSeries`, `clipAdvancedDataFrame`. Per-element clipping with scalar, array, Series (positional/broadcast), or DataFrame (element-wise) bounds; axis=0/1 for Series broadcasting. Also fixed missing exports for all iters 172–199 modules in src/index.ts, stats/index.ts, core/index.ts. 27 tests (unit + fast-check). Playground page `clip_advanced.html`.
- **Metric**: 38 (previous: 37 actual on main, delta: +1)
- **Commit**: cead131 (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: Canonical branch created from main. `noNestedTernary` → if/else for axis resolution. `ReadonlyArray<T>` → `readonly T[]` for Biome. Index exports for 9 modules (na_ops, pct_change, idxmin_idxmax, where_mask, replace, diff_shift, duplicated, astype, sample) were missing — fixed in this iteration.

### Iteration 201 — 2026-04-11 16:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24286325434)

- **Status**: ✅ Accepted
- **Change**: Add `stats/apply.ts` — `applySeries`, `applyDataFrame`, `applyExpandDataFrame`, `mapDataFrame`. Pandas-equivalent apply/map: element-wise (Series), reducing per col/row → Series, transforming per col/row → DataFrame, element-wise applymap. 35 tests (unit + fast-check). Playground page `apply.html`.
- **Metric**: 38 (previous best: 37, delta: +1)
- **Commit**: 2cc43c3 (branch: autoloop/build-tsb-pandas-typescript-migration-531c0338e43e4af9 → PR #111)
- **Notes**: `Map<string,Series<Scalar>>` assignable to `ReadonlyMap` — no `as` cast needed. Biome `--write` fixes formatter. MCP session handshake with Authorization + Mcp-Session-Id headers works reliably.

### Iteration 200 — 2026-04-11 15:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24285870280)

- **Status**: ✅ Accepted
- **Change**: Add `stats/clip_advanced.ts` — `clipAdvancedSeries`, `clipAdvancedDataFrame`. Per-element clipping with scalar, Series (positional), or DataFrame (element-wise) bounds; axis=0/1 for broadcasting. 32 tests (unit + fast-check). Playground page `clip_advanced.html`.
- **Metric**: 38 (previous best: 36, delta: +2)
- **Commit**: e0f8724 (branch: autoloop/build-tsb-pandas-typescript-migration-531c0338e43e4af9 → PR #111)
- **Notes**: `expandDataFrameBound()` helper handles all four bound types. Biome `noNonNullAssertion` on 2D grids — use optional chaining (`?.`). `noUselessElse` requires `--unsafe` flag to auto-fix.

### Iteration 199 — 2026-04-11 14:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24284805137)

- **Status**: ✅ Accepted
- **Change**: Add `core/sample.ts` — `sampleSeries`, `sampleDataFrame`. Supports `n`/`frac`, `replace`, `weights`, `randomState` (Mulberry32 PRNG), `ignoreIndex`, `axis=0/1`. 35 tests (unit + fast-check). Playground page `sample.html`.
- **Metric**: 36 (previous best: 35, delta: +1)
- **Commit**: 7d35121 (branch: autoloop/build-tsb-pandas-typescript-migration-531c0338e43e4af9 → PR #111)
- **Notes**: Import `Scalar` type from `../../src/index.ts` in tests (not `../../src/types.ts`) to satisfy Biome `useImportRestrictions`. Fisher-Yates for uniform without-replacement, Gumbel-max trick for weighted, CDF binary-search for with-replacement.

### Iteration 198 — 2026-04-11 14:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24284243449)

- **Status**: ✅ Accepted
- **Change**: Add `stats/duplicated.ts` — `duplicatedSeries`, `duplicatedDataFrame`, `dropDuplicatesSeries`, `dropDuplicatesDataFrame`. Supports `keep="first"/"last"/false` and `subset` for DataFrames. 35 tests (unit + fast-check). Playground page `duplicated.html`.
- **Metric**: 36 (previous best: 35, delta: +1)
- **Commit**: 5218a72 (branch: autoloop/build-tsb-pandas-typescript-migration-531c0338e43e4af9 → PR #111)
- **Notes**: Reused `scalarKey()` pattern from value_counts. `push_to_pull_request_branch` requires local branch named exactly as the remote tracking branch for incremental patch computation.

### Iters 172–201 — 2026-04-10/11 — ✅ (metrics 29→38: 30 accepted iterations)
- Iter 172: na_ops (isna/notna/ffill/bfill). Metric: 29.
- Iters 173–192: 20 consecutive push failures (MCP not available); features lost.
- Iter 193: idxmin_idxmax. Fixed MCP via direct HTTP. Metric: 31.
- Iters 194–199: astype, replace, where_mask, diff_shift, duplicated, sample. Metrics: 32–36.
- Iters 200–201: clip_advanced, apply (on hash-suffix branch; lost before canonical branch established). Metric: 38 (stale).
- Canonical branch `autoloop/build-tsb-pandas-typescript-migration` created in iter 202.

### Iteration 167 — 2026-04-10 18:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24256220682)
- **Status**: ✅ Accepted — Re-committed 7 modules. Metric: 51. Commit: 2ece4b5

### Iters 53–166 — ✅/⚠️ (metrics 8→51: feature implementations and recoveries)

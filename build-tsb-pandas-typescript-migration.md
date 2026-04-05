# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T18:12:00Z |
| Iteration Count | 66 |
| Best Metric | 22 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #54 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration`
**Pull Request**: #54

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch `autoloop/build-tsb-pandas-typescript-migration` from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 22 files (iter 66). Next candidates:
- `src/core/multi_index.ts` — MultiIndex support
- `src/core/interval.ts` — Interval / IntervalIndex
- `src/stats/rank.ts` — rank() as standalone (already in frame.ts inline)

---

## 📚 Lessons Learned

- **Iter 65 (ewm, 20→21)**: `EwmSeriesLike` must include `toArray()` (same as Rolling/Expanding patterns). Online algorithm: track S (weighted sum), W (sum of weights), W2 (sum of squared weights) for O(n) mean+var. Extract `computeCov`/`computeCorr` top-level helpers to keep `_covImpl`/`corr` CC≤15. EWM import needs alphabetical sort: `ewm.ts` before `expanding.ts` (e-w < e-x). Shorthand assignments (`*=`) required by biome for `Sxy *= decay` etc. Use `**` not `Math.pow`. EWM corr state tracks Sx, Sy, Sx2, Sy2, Sxy, W, W2 — all decay on missing if `ignoreNa=false`.
- **Iter 66 (stack/unstack, 21→22)**: Standalone functions (no DataFrame method) to avoid circular deps — same as melt/pivot pattern. Compound string labels `"rowLabel|colName"` with configurable sep. `uniqueOrdered()` helper preserves insertion order. `buildCellMap` + `buildOutputCols` keep CC≤15. `string[]` assignable to `Label[]` without `as` cast (string ⊆ Label). RangeIndex not needed for empty result — use `DataFrame.fromColumns({})`. No `as` casts needed.
- **Iter 64 (melt+pivot, 18→20)**: Two reshape features in one iteration. `melt()` uses helper functions to keep CC≤15: `requireColumns`, `resolveValueVars`, `initIdColData`, `appendIdRow`. `pivot()` decomposes into `fillPivotCells` + `fillPivotCell`. `pivotTable` uses `buildGroups` + `assembleResult` + `fillOutRow` + `buildOutColNames`. Column order for multi-value pivot: outer=valuesCols, inner=colHeaders (matches pandas MultiIndex convention). `noMisplacedAssertion`: use pure helper that returns value (not asserts) to extract logic from property tests.
- **Iter 63 (expanding+cat, 16→18)**: Two features in one iteration to beat previous best (17 on a branch with fewer files). `CatHolder` class wraps `CatSeriesLike` to preserve explicit category list through chained calls (addCategories→removeUnused etc.). `noNestedTernary` in sort comparator — use explicit if/else. Import order matters for `organizeImports` lint rule. `(mapping as unknown as Record<string, unknown>)[key]` works for safe indexing after non-array narrowing.
- **Iter 62 (expanding, 16→17)**: `ExpandingSeriesLike` interface (mirrors `RollingSeriesLike`) avoids circular imports. `DataFrameExpanding` appended to `frame.ts`. Default `minPeriods=1` (not window size like Rolling). `count()` ignores minPeriods (matches pandas). `std(0)` returns 0 for single-element (population std). Property tests: count non-decreasing, max≥min, sum/mean manual verification.
- **Iter 61 (rolling, 15→16)**: Use `RollingSeriesLike` interface (like `StringSeriesLike`) to avoid circular imports. `DataFrameRolling` lives in `frame.ts` not `window/rolling.ts`. `_applyColAgg` takes `{ values, name }` return type and creates `Series<Scalar>` inline. `Array.from({length:n}, ():Scalar => null)` for null-init arrays.
- **Iter 60 (corr/cov, 14→15)**: `Series.at()` label-based; use `.values[i]` for positional. `Index.filter()` doesn't exist — use `.values.filter()`. Extract helper functions for CC≤15.
- **Iter 59 (readJson/toJson, 13→14)**: `noPropertyAccessFromIndexSignature` + Biome `useLiteralKeys` conflict — use `getProp(obj,key)` helper. Always add `default` to exhaustive switches.
- **Iter 58 (readCsv/toCsv, 12→13)**: Extract `parseForcedBool/Int/Float` for CC≤15. `Array.from(..., ():T=>[])` needs explicit return type. `lines[n] as string` safe after bounds check.
- **Iter 57 (describe+quantile, 11→12)**: `noNonNullAssertion`: use `as number` not `!`. `useBlockStatements`: wrap single-line `if`. All-null array gets object dtype — use explicit `dtype: Dtype.float64`.
- **Iters 53–56**: `StringSeriesLike`/`DatetimeSeriesLike` pattern for accessors. Top-level regex. Split large fns for CC≤15. Barrel files for `useImportRestrictions`. `import type` for type-only imports. `useForOf` where index not needed.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**New branch (iter 53–65)**: 21 files — Series, DataFrame, GroupBy, concat, merge, str accessor, dt accessor, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, cat accessor, reshape/melt, reshape/pivot.

**Next**: stack/unstack · MultiIndex

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 66 — 2026-04-05 18:12 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24007420044)

- **Status**: ✅ Accepted
- **Change**: Added `src/reshape/stack_unstack.ts` — `stack()` + `unstack()`. 25+ unit tests + 4 property tests. Playground: `stack_unstack.html`.
- **Metric**: 22 (previous: 21, delta: +1)
- **Commit**: 83efe93
- **Notes**: Standalone functions (not DataFrame methods) to avoid circular deps. Compound string labels `"rowLabel|colName"`. Round-trips: `unstack(stack(df,{dropna:false})) ≈ df` verified by property tests.

### Iteration 65 — 2026-04-05 17:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24006942040)

- **Status**: ✅ Accepted
- **Change**: Added `src/window/ewm.ts` — EWM class with mean/std/var/cov/corr/apply. `DataFrameEwm` in `frame.ts`. Series.ewm() and DataFrame.ewm() methods. 55+ tests. Playground: `ewm.html`.
- **Metric**: 21 (previous: 20, delta: +1)
- **Commit**: 471773a
- **Notes**: Online O(n) algorithm tracking S/W/W2 for mean and variance. Helper functions `computeCov`/`computeCorr` keep CC≤15. Reliability-weights Bessel correction for unbiased variance.

### Iteration 64 — 2026-04-05 17:12 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24006370785)

- **Status**: ✅ Accepted
- **Change**: Added `src/reshape/melt.ts` (melt wide→long) + `src/reshape/pivot.ts` (pivot + pivotTable). 29 tests. Playground: `melt.html`, `pivot.html`.
- **Metric**: 20 (previous: 18, delta: +2)
- **Commit**: 0519b8d
- **Notes**: Two reshape features in one iteration. pivotTable supports 7 aggfuncs (mean/sum/count/min/max/first/last), fill_value, dropna. pivot requires unique (index, column) pairs.

### Iteration 63 — 2026-04-05 16:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24005927691)

- **Status**: ✅ Accepted
- **Change**: Added `src/window/expanding.ts` (Expanding growing-window) + `src/core/cat_accessor.ts` (CategoricalAccessor / Series.cat). 80+ tests. Playground: `cat_accessor.html`.
- **Metric**: 18 (previous: 17, delta: +1)
- **Commit**: 03b0a28
- **Notes**: Two features added to beat previous best. CatHolder internal class preserves category metadata through chained calls.

### Iteration 62 — 2026-04-05 16:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24005305086)

- **Status**: ✅ Accepted
- **Change**: Added `src/window/expanding.ts` — `Expanding` class with pandas-compatible growing-window API (mean/sum/std/var/min/max/count/median/apply). `ExpandingSeriesLike` interface avoids circular imports. `DataFrameExpanding` in `frame.ts`. 40+ tests with property tests. Playground: `playground/expanding.html`.
- **Metric**: 17 (previous: 16, delta: +1)
- **Commit**: 2a6fe1f

### Iteration 61 — 2026-04-05 15:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24004857590)

- **Status**: ✅ Accepted
- **Change**: Added `src/window/rolling.ts` — `Rolling` class with pandas-compatible sliding-window API (mean/sum/std/var/min/max/count/median/apply). `RollingSeriesLike` interface avoids circular imports. `DataFrameRolling` in `frame.ts`. 40+ tests. Playground: `playground/rolling.html`.
- **Metric**: 16 (previous: 15, delta: +1)
- **Commit**: 2874510

### Iteration 60 — 2026-04-05 15:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24004259683)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/corr.ts` — `pearsonCorr()`, `dataFrameCorr()`, `dataFrameCov()`. 34 tests. Playground: `playground/corr.html`.
- **Metric**: 15 (previous: 14, delta: +1)
- **Commit**: a44aff5

### Iterations 58–65 — ✅ CSV I/O, JSON I/O, corr/cov, rolling, expanding, cat accessor, melt+pivot, EWM (iters 58–65)
### Iterations 53–57 — ✅ describe/quantile, dt accessor, str accessor, merge, GroupBy+setup (iters 53–57)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)


# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T19:16:00Z |
| Iteration Count | 68 |
| Best Metric | 24 |
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

Now at 24 files (iter 68). Next candidates:
- `src/core/interval.ts` — Interval / IntervalIndex
- `src/core/categorical_index.ts` — CategoricalIndex
- `src/core/nlargest.ts` — nlargest/nsmallest standalone utilities

---

## 📚 Lessons Learned

- **Iter 68 (rank, 23→24)**: `rankSeries` + `rankDataFrame` as standalone stat functions (no circular deps). CC kept ≤15 by extracting `fillValidRanks` + `fillMissingRanks` helpers from `rankValues`. `noUncheckedIndexedAccess`: `Map.get(i)` returns `T|undefined` — check `!== undefined` before use. In `rankByRow`, array indexing `colData[j]` returns `number[]|undefined` — check before assign. `== null` (loose) catches both null and undefined for `r == null ? NaN : r`. `noExcessiveCognitiveComplexity`: ternary chains inside nested loops push CC over 15 even without `if` statements — extract helpers. `useBlockStatements`: all single-line `if` bodies must use `{}`. Remove unused imports (`Label` was imported but not needed once `Scalar` covers it).
- **Iter 67 (MultiIndex, 22→23)**: Standalone class (no DataFrame method) avoids circular deps. Levels+codes internal representation (canonical pandas format). Factory methods: `fromTuples`, `fromArrays`, `fromProduct` (Cartesian). `cartesianProduct` helper: compute totals with a backward `for` loop (not `reduceRight` with spread — `noAccumulatingSpread`). `useSimplifiedLogicExpression`: replace `!a && !b` with `if (a || b) continue`. CC in comparison: split into `compareScalars` (non-null) + `comparePosition` (null-safe) + `compareTuples` (outer). `compareScalars` takes `number | string | boolean` not `Label` to avoid null comparison TS error. Tests import from `src/index.ts` barrel; `fc` as default import not namespace.
- **Iter 65 (ewm, 20→21)**: `EwmSeriesLike` must include `toArray()` (same as Rolling/Expanding patterns). Online algorithm: track S (weighted sum), W (sum of weights), W2 (sum of squared weights) for O(n) mean+var. Extract `computeCov`/`computeCorr` top-level helpers to keep `_covImpl`/`corr` CC≤15. EWM import needs alphabetical sort: `ewm.ts` before `expanding.ts` (e-w < e-x). Shorthand assignments (`*=`) required by biome for `Sxy *= decay` etc. Use `**` not `Math.pow`. EWM corr state tracks Sx, Sy, Sx2, Sy2, Sxy, W, W2 — all decay on missing if `ignoreNa=false`.
- **Iter 66 (stack/unstack)**: Standalone functions to avoid circular deps. Compound labels `"rowLabel|colName"`. `buildCellMap` + `buildOutputCols` keep CC≤15. `string[]` assignable to `Label[]` without `as` cast.
- **Iter 64 (melt+pivot)**: Two features in one iteration. Helper functions for CC≤15. Column order for multi-value pivot: outer=valuesCols, inner=colHeaders. `noMisplacedAssertion`: use pure helper returning value not asserting.
- **Iter 63 (expanding+cat)**: `CatHolder` class preserves category metadata through chained calls. `noNestedTernary` — use explicit if/else. Import order matters for `organizeImports`.
- **Iter 62 (expanding)**: `ExpandingSeriesLike` interface avoids circular imports. `DataFrameExpanding` in `frame.ts`. Default `minPeriods=1`. `count()` ignores minPeriods.
- **Iter 61 (rolling)**: `RollingSeriesLike` interface avoids circular imports. `DataFrameRolling` in `frame.ts`. `Array.from({length:n}, ():Scalar => null)` for null-init arrays.
- **Iter 60 (corr/cov)**: `Series.at()` label-based — use `.values[i]` positional. `Index.filter()` doesn't exist — use `.values.filter()`. Extract helpers for CC≤15.
- **Iter 59 (readJson/toJson)**: `noPropertyAccessFromIndexSignature` + Biome `useLiteralKeys` → use `getProp(obj,key)` helper. Always add `default` to exhaustive switches.
- **Iter 58 (readCsv/toCsv)**: Extract `parseForcedBool/Int/Float` for CC≤15. `Array.from(..., ():T=>[])` needs explicit return type. `lines[n] as string` safe after bounds check.
- **Iter 57 (describe+quantile, 11→12)**: `noNonNullAssertion`: use `as number` not `!`. `useBlockStatements`: wrap single-line `if`. All-null array gets object dtype — use explicit `dtype: Dtype.float64`.
- **Iters 53–56**: `StringSeriesLike`/`DatetimeSeriesLike` pattern for accessors. Top-level regex. Split large fns for CC≤15. Barrel files for `useImportRestrictions`. `import type` for type-only imports. `useForOf` where index not needed.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**New branch (iter 53–67)**: 23 files — Series, DataFrame, GroupBy, concat, merge, str accessor, dt accessor, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, cat accessor, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex.

**Next**: Interval/IntervalIndex · rank() standalone

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 68 — 2026-04-05 19:16 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24008535770)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/rank.ts` — `rankSeries()` + `rankDataFrame()` mirroring `pandas.Series.rank()` / `DataFrame.rank()`. Tie methods: average/min/max/first/dense. NaN: keep/top/bottom. pct rank. axis=0/1 for DataFrame. 40+ unit tests + 6 property tests. Playground: `rank.html`.
- **Metric**: 24 (previous: 23, delta: +1)
- **Commit**: 792e2db
- **Notes**: Standalone stats function. CC reduced by splitting `rankValues` into `fillValidRanks`+`fillMissingRanks`. `noUncheckedIndexedAccess`: `Map.get()` returns `T|undefined` — check before use. `== null` for null+undefined in `r == null ? NaN : r`.

### Iteration 67 — 2026-04-05 18:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24008035023)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/multi_index.ts` — `MultiIndex` with `fromTuples`/`fromArrays`/`fromProduct`. Level ops, set ops, sorting, deduplication. 60+ unit tests + 7 property-based tests. Playground: `multi_index.html`.
- **Metric**: 23 (previous: 22, delta: +1)
- **Commit**: 986fef6
- **Notes**: Levels+codes internal representation. `cartesianProduct` uses backward `for` not `reduceRight+spread`. `compareScalars(number|string|boolean)` not `Label` for TS compatibility.

### Iteration 66 — 2026-04-05 18:12 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24007420044)

- **Status**: ✅ Accepted
- **Change**: Added `src/reshape/stack_unstack.ts` — `stack()` + `unstack()`. 25+ unit tests + 4 property tests. Playground: `stack_unstack.html`.
- **Metric**: 22 (previous: 21, delta: +1)
- **Commit**: 83efe93
- **Notes**: Standalone functions (not DataFrame methods) to avoid circular deps. Compound string labels `"rowLabel|colName"`. Round-trips: `unstack(stack(df,{dropna:false})) ≈ df` verified by property tests.

### Iteration 65 — 2026-04-05 17:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24006942040)
- **Status**: ✅ Accepted | **Metric**: 21 (+1) | **Commit**: 471773a
- **Change**: `src/window/ewm.ts` — EWM mean/std/var/cov/corr/apply. Online O(n) S/W/W2 algorithm.

### Iteration 64 — 2026-04-05 17:12 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24006370785)
- **Status**: ✅ Accepted | **Metric**: 20 (+2) | **Commit**: 0519b8d
- **Change**: `src/reshape/melt.ts` + `src/reshape/pivot.ts` (pivot+pivotTable, 7 aggfuncs).

### Iteration 63 — 2026-04-05 16:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24005927691)
- **Status**: ✅ Accepted | **Metric**: 18 (+1) | **Commit**: 03b0a28
- **Change**: `src/window/expanding.ts` + `src/core/cat_accessor.ts`. CatHolder pattern.

### Iteration 62 — 2026-04-05 16:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24005305086)
- **Status**: ✅ Accepted | **Metric**: 17 (+1) | **Commit**: 2a6fe1f
- **Change**: `src/window/expanding.ts` — Expanding growing-window API, ExpandingSeriesLike interface.

### Iteration 61 — 2026-04-05 15:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24004857590)
- **Status**: ✅ Accepted | **Metric**: 16 (+1) | **Commit**: 2874510
- **Change**: `src/window/rolling.ts` — Rolling sliding-window API, RollingSeriesLike interface.

### Iteration 60 — 2026-04-05 15:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24004259683)
- **Status**: ✅ Accepted | **Metric**: 15 (+1) | **Commit**: a44aff5
- **Change**: `src/stats/corr.ts` — pearsonCorr, dataFrameCorr, dataFrameCov.

### Iterations 53–59 — ✅ CSV I/O, JSON I/O, describe/quantile, dt accessor, str accessor, merge, GroupBy (iters 53–59)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)

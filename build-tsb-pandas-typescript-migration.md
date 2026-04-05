# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T20:09:00Z |
| Iteration Count | 70 |
| Best Metric | 26 |
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

Now at 26 files (iter 70). Next candidates:
- `src/core/interval.ts` — Interval / IntervalIndex
- `src/core/categorical_index.ts` — CategoricalIndex
- `src/stats/elem_ops.ts` — clip(), abs(), round() element-wise ops

---

## 📚 Lessons Learned

- **Iter 70 (cum_ops, 25→26)**: Cumulative ops as standalone stats functions. `cumulateNum` + `cumulateSc` core helpers. `skipna=true`: NaN positions return NaN/null but accumulator continues. `skipna=false`: `poisoned` flag propagates NaN. `isFiniteNum`/`isNonNull` type guards avoid unsafe `as number` casts. `NonNullScalar = number | string | boolean | bigint | Date`. DataFrame `colWiseCum` (axis=0) + `rowWiseCum` (axis=1). `buildRow` helper keeps CC≤15. `Number.NaN` not `NaN`. `vals.at(-1)` not `vals[vals.length-1]`.
- **Iter 69 (nlargest/nsmallest, 24→25)**: Standalone stat functions `nlargestSeries`/`nsmallestSeries`/`nlargestDataFrame`/`nsmallestDataFrame`. `ValPos` interface for (value, position) pairs. `buildValidPairs` skips NaN/null. `selectAllPositions` creates `[...pairs]` copy before sort to avoid mutating `pairs`. `sortPairsByValAndPos` mutates pairs in-place (owned, safe). `Index.at(i)` returns `Label` (not `Label|undefined`) — no cast needed; `series.values[i] as Scalar` is safe after bounds. `cmpScalar` null-safe for DataFrame row comparison. `Array.from({length:n}, (_, i) => i)` for row indices — `_` prefix suppresses unused-param warning.
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

**New branch (iter 53–70)**: 26 files — Series, DataFrame, GroupBy, concat, merge, str accessor, dt accessor, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, cat accessor, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops.

**Next**: Interval/IntervalIndex · CategoricalIndex · element-wise ops (clip/abs/round)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 70 — 2026-04-05 20:09 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24009460051)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/cum_ops.ts` — `cumsum()`, `cumprod()`, `cummax()`, `cummin()` for Series; `dataFrameCumsum/Cumprod/Cummax/Cummin()` for DataFrame. `skipna` + `axis` support.
- **Metric**: 26 (previous: 25, delta: +1)
- **Commit**: 86d00e9
- **Notes**: `cumulateNum`/`cumulateSc` helpers. `poisoned` flag for skipna=false. `isFiniteNum`/`isNonNull` type guards. `buildRow` for axis=1. Biome: `Number.NaN`, `vals.at(-1)`.

### Iteration 69 — 2026-04-05 19:44 UTC — ✅ nlargest/nsmallest (24→25) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24009034419)

### Iteration 67 — 2026-04-05 18:47 UTC — ✅ MultiIndex (22→23) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24008035023)
### Iteration 68 — 2026-04-05 19:16 UTC — ✅ rank (23→24) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24008535770)
### Iters 60–66 — ✅ corr/cov(15), rolling(16), expanding×2(17–18), cat_accessor, melt+pivot(20), ewm(21), stack/unstack(22)
### Iterations 53–59 — ✅ GroupBy, merge, str, dt, describe/quantile, csv I/O, json I/O (metrics 8–14)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)

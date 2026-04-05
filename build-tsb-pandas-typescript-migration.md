# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T23:45:49Z |
| Iteration Count | 77 |
| Best Metric | 33 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #54 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration`
**Pull Request**: #54

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch `autoloop/build-tsb-pandas-typescript-migration` from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 33 files (iter 77). Next candidates:
- `src/core/interval.ts` — Interval / IntervalIndex
- `src/core/categorical_index.ts` — CategoricalIndex
- `src/merge/concat.ts` — concat with axis=0/1, ignore_index, keys

---

## 📚 Lessons Learned

- **Iter 77 (fillna, 32→33)**: `fillnaSeries`/`fillnaDataFrame`. Three fill strategies: scalar value (constant fill), `ColumnFillMap` (per-column scalars for DataFrame), `Series<Scalar>` (index labels matched to column names). Methods: `ffill`/`pad` (forward fill) and `bfill`/`backfill` (backward fill). `limit` caps consecutive fills per run. `axis=0/1` for DataFrame method fills. `isColumnFillMap` type guard distinguishes plain objects from Series/DataFrame. `isMissing` helper covers null/undefined/NaN. No dependency on `FillMethod` from types.ts (defined locally as `FillnaMethod` to avoid confusion).
- **Iter 76 (interpolate, 31→32)**: `interpolateSeries`/`dataFrameInterpolate`. Methods: linear (interior-only), ffill/pad/zero (forward fill), bfill/backfill, nearest. `limit`/`limitDirection` parameters. Key lesson: linear fills ONLY interior gaps (between two known values), never leading/trailing — pandas convention. Helper functions `fillLinearGap`, `fillConstantRun`, `fillNearestGap` extracted to keep CC≤15. `assertNoMissingInRange` helper in test caused `noMisplacedAssertion` warning (acceptable false positive). `.at(-1)` for last-element access.
- **Iter 75 (shift_diff, 30→31)**: `shiftSeries`/`diffSeries` and `dataFrameShift`/`dataFrameDiff`. `shiftVals` with separate positive/negative paths. `diffVals` supports positive/negative periods with `isFiniteNum` guard. Inline arrow functions need explicit return types (`(): Scalar[] =>`) for Biome `useExplicitType`. Property tests: length preserved; shift(n)+shift(-n) round-trips inner slice; shift fills nulls; diff equals current-previous for finite sequences.
- **Iter 74 (compare, 29→30)**: `seriesEq`/`seriesNe`/`seriesLt`/`seriesGt`/`seriesLe`/`seriesGe` and DataFrame counterparts. `compareScalars` dispatch fn with `isComparable` guard. Returns `Scalar[]` (not `boolean[]`) so constructor types align. Property tests: lt+ge and gt+le partition every finite-numeric element (exactly one true, no overlap, no gap). Missing values (null/NaN) always yield false, matching pandas NaN convention.
- **Iter 73 (where/mask, 28→29)**: `whereSeries`/`maskSeries`/`whereDataFrame`/`maskDataFrame`. Three condition types: element-wise predicate, boolean `Series`/array, boolean `DataFrame`. `applyCondition` shared helper with `keepWhenTrue` flag. `resolveSeriesCond` + `resolveDataFrameCond` dispatch functions. Missing column in cond-DataFrame defaults all-false. Property test: `where` + `mask` partition every element (exactly one keeps original).
- **Iter 72 (value_counts, 27→28)**: `valueCounts`/`dataFrameValueCounts` as standalone stat functions. `scalarKey` mapper for stable Map keys. `buildCountMap` uses `Map<key,{label,count}>`. `df.get(name)` not `df.tryCol()`. `import type` for type-only imports. Biome: `as number` not `!` for non-null assertions. Wire barrel exports in same commit.
- **Iter 71 (elem_ops, 26→27)**: `mapNumeric` helper + `makeClipFn`/`makeRoundFn` closures. `Number.NEGATIVE_INFINITY`/`Number.POSITIVE_INFINITY` not bare `Infinity`. Named exports `seriesAbs`/`seriesRound` avoid collision with built-ins. `colWiseElem` for DataFrame column-wise transforms.
- **Iter 70 (cum_ops, 25→26)**: `cumulateNum`/`cumulateSc` helpers. `poisoned` flag for skipna=false. `isFiniteNum`/`isNonNull` type guards. `Number.NaN`, `vals.at(-1)`.
- **Iters 67–69**: `nlargest`/`nsmallest`/`rank`/`MultiIndex` as standalone stat functions. CC≤15 by extracting helpers. `noUncheckedIndexedAccess`: check `Map.get()` before use. `Array.from({length:n},(_, i)=>i)` for row indices. `cartesianProduct` with backward loop not `reduceRight`.
- **Iters 63–66**: EWM online algorithm O(n). `buildCellMap`+`buildOutputCols` for CC. `CatHolder` preserves metadata. `noNestedTernary` → explicit if/else. `**` not `Math.pow`. Shorthand assignments `*=`.
- **Iters 57–62**: `RollingSeriesLike`/`ExpandingSeriesLike`/`EwmSeriesLike` interfaces avoid circular imports. `.values[i]` positional (not `.at()`). `getProp(obj,key)` for index-signature access. `noNonNullAssertion`: `as number` not `!`. `useBlockStatements`: wrap single-line `if`.
- **Iters 53–56**: Accessor `*SeriesLike` pattern. Top-level regex. Barrel files for `useImportRestrictions`. `import type` for type-only imports. `useForOf` where index not needed.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**Current state (iter 77)**: 33 files — Series, DataFrame, GroupBy, concat, merge, str/dt/cat accessors, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops, stats/elem_ops, stats/value_counts, stats/where_mask, stats/compare, stats/shift_diff, stats/interpolate, stats/fillna.

**Next**: Interval/IntervalIndex · CategoricalIndex · concat with axis/keys

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 77 — 2026-04-05 23:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24013124690)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/fillna.ts` — `fillnaSeries`, `fillnaDataFrame`. Scalar, ColumnFillMap, Series fill values; ffill/pad and bfill/backfill methods; `limit` and `axis` options.
- **Metric**: 33 (previous: 32, delta: +1)
- **Commit**: c6d0b5e
- **Notes**: `isColumnFillMap` type guard distinguishes plain objects from Series. `fillForward`/`fillBackward` helpers keep CC≤15. 35+ tests including property-based tests verifying correctness of fill values.

### Iteration 76 — 2026-04-05 23:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24012563442)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/interpolate.ts` — `interpolateSeries`, `dataFrameInterpolate`. Linear (interior-only), ffill/pad/zero, bfill/backfill, nearest methods with `limit`/`limitDirection` parameters.
- **Metric**: 32 (previous: 31, delta: +1)
- **Commit**: 6d87858
- **Notes**: Linear only fills interior gaps (between two known values); leading/trailing left as-is. Helper extraction (`fillLinearGap`, `fillConstantRun`, `fillNearestGap`) keeps CC≤15. 39 tests pass including property-based tests.

### Iteration 75 — 2026-04-05 22:50 UTC — ✅ shift_diff (30→31) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24012145919)
### Iteration 74 — 2026-04-05 22:09 UTC — ✅ compare (29→30) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24011536762)
### Iteration 73 — 2026-04-05 21:50 UTC — ✅ where_mask (28→29) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24011120613)
### Iteration 72 — 2026-04-05 21:25 UTC — ✅ value_counts (27→28) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24010521196)
### Iteration 71 — 2026-04-05 20:46 UTC — ✅ elem_ops (26→27) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24010099827)

### Iteration 70 — 2026-04-05 20:09 UTC — ✅ cum_ops (25→26) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24009460051)
### Iteration 69 — 2026-04-05 19:44 UTC — ✅ nlargest/nsmallest (24→25) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24009034419)
### Iteration 68 — 2026-04-05 19:16 UTC — ✅ rank (23→24) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24008535770)
### Iteration 67 — 2026-04-05 18:47 UTC — ✅ MultiIndex (22→23) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24008035023)
### Iters 60–66 — ✅ corr/cov(15), rolling(16), expanding×2(17–18), cat_accessor, melt+pivot(20), ewm(21), stack/unstack(22)
### Iterations 53–59 — ✅ GroupBy, merge, str, dt, describe/quantile, csv I/O, json I/O (metrics 8–14)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)

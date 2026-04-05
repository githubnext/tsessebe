# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T21:50:00Z |
| Iteration Count | 73 |
| Best Metric | 29 |
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

Now at 29 files (iter 73). Next candidates:
- `src/core/interval.ts` — Interval / IntervalIndex
- `src/core/categorical_index.ts` — CategoricalIndex
- `src/stats/compare.ts` — `eq()`, `ne()`, `lt()`, `gt()`, `le()`, `ge()` element-wise comparison ops

---

## 📚 Lessons Learned

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

**Current state (iter 73)**: 29 files — Series, DataFrame, GroupBy, concat, merge, str/dt/cat accessors, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops, stats/elem_ops, stats/value_counts, stats/where_mask.

**Next**: Interval/IntervalIndex · CategoricalIndex · element-wise comparison ops (eq/ne/lt/gt/le/ge)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 73 — 2026-04-05 21:50 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24011120613)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/where_mask.ts` — `whereSeries`, `maskSeries`, `whereDataFrame`, `maskDataFrame`. Conditional value selection/replacement with predicate, boolean Series/array, or boolean DataFrame conditions.
- **Metric**: 29 (previous: 28, delta: +1)
- **Commit**: e36528b
- **Notes**: Three condition types unified by `resolveSeriesCond`/`resolveDataFrameCond` dispatch. `applyCondition` helper with `keepWhenTrue` flag shared by where/mask. Property test verifies where+mask partition every element.

### Iteration 72 — 2026-04-05 21:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24010521196)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/value_counts.ts` — `valueCounts()` for Series and `dataFrameValueCounts()` for DataFrame. Count/proportion of unique values with sort, ascending, dropna options.
- **Metric**: 28 (previous: 27, delta: +1)
- **Commit**: 161cafe
- **Notes**: `scalarKey` mapper for stable `Map` keys. Composite `"v1|v2|…"` label for DataFrame row combinations. Also wired up missing elem_ops barrel exports from iter 71.

### Iteration 71 — 2026-04-05 20:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24010099827)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/elem_ops.ts` — `clip()`, `seriesAbs()`, `seriesRound()` for Series; `dataFrameClip/Abs/Round()` for DataFrame. Element-wise scalar transforms with missing-value propagation.
- **Metric**: 27 (previous: 26, delta: +1)
- **Commit**: 0e210db
- **Notes**: `mapNumeric` helper applies fn to finite nums, passes null/NaN through. `Number.NEGATIVE_INFINITY`/`Number.POSITIVE_INFINITY` (not bare `Infinity`). `seriesAbs`/`seriesRound` names avoid collision with JS built-ins.

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

# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T06:50:00Z |
| Iteration Count | 84 |
| Best Metric | 39 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258` |
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
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258`
**Pull Request**: #54

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 39 files (iter 84). Next candidates:
- `src/core/period.ts` — Period and PeriodIndex
- `src/stats/clip_series_more.ts` — additional numeric ops

---

## 📚 Lessons Learned

- **Iter 84 (pipe, 38→39)**: Variadic-generic pattern `<A extends unknown[], R>(fn: (x, ...args: A) => R, ...args: A)` gives full type inference. `pipeChain`/`dataFramePipeChain` use for-of loop. `pipeTo`/`dataFramePipeTo` splice value at positional index.
- **Iter 83 (CategoricalIndex, 37→38)**: Standalone class. `buildCategoryMap` for O(1) look-up. `fromCodes` validates codes. `compareLabels` throws when `ordered=false`. `unionCategories`/`intersectCategories` on category sets. Use `{ }` blocks around single-statement `if`.
- **Iter 82 (apply, 36→37)**: `applySeries`/`applymap`/`dataFrameApply`. Helper fns `extractRow`/`applyAxis0`/`applyAxis1` keep CC≤15. `import fc from "fast-check"` (default import). Import `Scalar` from `"../../src/index.ts"`.
- **Iter 81 (sample, 35→36)**: xorshift32 RNG. `buildCdf`+`rebuildCdf` for weighted without-replacement. `Array.from({length}, fn)`. Fisher-Yates partial shuffle for unweighted.
- **Iters 73–80**: fillna, interpolate, shift/diff, compare, where/mask, cut/qcut, interval, sample. Use barrel imports (`../core/index.ts`). `extractName()` returns `string | null`. Top-level regex vars.
- **Iters 67–72**: value_counts, elem_ops, cum_ops, nlargest, rank, MultiIndex. `scalarKey` for Map keys. `mapNumeric`/`makeClipFn`. `Number.NEGATIVE_INFINITY`. `cumulateNum`/`cumulateSc` + `poisoned` flag. CC≤15 by extracting helpers.
- **Iters 53–66**: GroupBy, merge, str, dt, describe, csv, json, corr, rolling, expanding, ewm, melt, pivot, stack/unstack. `*SeriesLike` interfaces avoid circular imports. `getProp(obj,key)` for index-sig. Barrel files for `useImportRestrictions`. `import type`. `useForOf`. Top-level regex.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**Current state (iter 84)**: 39 files — Series, DataFrame, GroupBy, concat, merge, str/dt/cat accessors, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops, stats/elem_ops, stats/value_counts, stats/where_mask, stats/compare, stats/shift_diff, stats/interpolate, stats/fillna, core/interval, stats/cut, stats/sample, stats/apply, core/categorical_index, stats/pipe.

**Next**: Period/PeriodIndex · Timedelta

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 84 — 2026-04-06 06:50 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24021812753)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/pipe.ts` — `pipeSeries()`, `dataFramePipe()`, `pipeChain()`, `dataFramePipeChain()`, `pipeTo()`, `dataFramePipeTo()` mirroring `pandas.Series.pipe()` / `pandas.DataFrame.pipe()`.
- **Metric**: 39 (previous: 38, delta: +1)
- **Commit**: 09f54f9
- **Notes**: Variadic-generic pattern `<A extends unknown[], R>(fn: (x, ...args: A) => R, ...args: A)` gives full type inference. `pipeChain` uses for-of loop. `pipeTo` splices value at positional index. 47 unit + property tests.

### Iteration 83 — 2026-04-06 05:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24020523769)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/categorical_index.ts` — `CategoricalIndex` mirroring `pandas.CategoricalIndex`.
- **Metric**: 38 (previous: 37, delta: +1)
- **Commit**: 7444b7d
- **Notes**: Standalone class with O(1) category look-up via Map. Full mutation API (rename/reorder/add/remove/set/removeUnused). Ordered comparison support. Set operations on category sets. 45+ unit + property tests. Biome-clean.

### Iteration 82 — 2026-04-06 05:07 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24019334747)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/apply.ts` — `applySeries()`, `applymap()`, and `dataFrameApply()` mirroring `pandas.Series.apply()`, `pandas.DataFrame.applymap()`, and `pandas.DataFrame.apply()`.
- **Metric**: 37 (previous: 36, delta: +1)
- **Commit**: 78354b8
- **Notes**: Clean implementation with extractRow/applyAxis0/applyAxis1 helpers; 39 tests (unit + property-based); 100% coverage; biome-clean.

### Iteration 81 — 2026-04-06 03:41 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24017697656)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/sample.ts` — `sampleSeries()` and `sampleDataFrame()` mirroring `pandas.Series.sample()` / `pandas.DataFrame.sample()`.
- **Metric**: 36 (previous: 35, delta: +1)
- **Commit**: 2291bd9
- **Notes**: xorshift32 RNG; weighted sampling with CDF-based draw; without-replacement uses Fisher-Yates (unweighted) or iterative CDF redraw with weight zeroing (weighted); axis=1 column sampling; 40+ unit tests + property-based tests.

### Iteration 80 — 2026-04-06 02:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24016060414)

- **Status**: ✅ Accepted (state-recorded; apply.ts on separate branch)
- **Change**: Added `src/stats/apply.ts` — element-wise function application for Series and DataFrame.
- **Metric**: 36 (previous: 35, delta: +1)
- **Notes**: This iteration was recorded in the state but the commit was on a different branch from the main PR.

### Iteration 79 — 2026-04-06 01:06 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24014588932)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/cut.ts` — `cut()` and `qcut()` mirroring `pandas.cut()`/`pandas.qcut()`.
- **Metric**: 35 (previous: 34, delta: +1)
- **Commit**: f26b4cc

### Iteration 78 — 2026-04-06 00:29 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24013890896)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/interval.ts` — `Interval` and `IntervalIndex`.
- **Metric**: 34 (previous: 33, delta: +1)
- **Commit**: 281be7f

### Iteration 77 — 2026-04-05 23:45 UTC — ✅ fillna (32→33)
### Iteration 76 — 2026-04-05 23:11 UTC — ✅ interpolate (31→32)
### Iteration 75 — 2026-04-05 22:50 UTC — ✅ shift_diff (30→31)
### Iteration 74 — 2026-04-05 22:09 UTC — ✅ compare (29→30)
### Iteration 73 — 2026-04-05 21:50 UTC — ✅ where_mask (28→29)
### Iteration 72 — 2026-04-05 21:25 UTC — ✅ value_counts (27→28)
### Iteration 71 — 2026-04-05 20:46 UTC — ✅ elem_ops (26→27)
### Iteration 70 — 2026-04-05 20:09 UTC — ✅ cum_ops (25→26)
### Iteration 69 — 2026-04-05 19:44 UTC — ✅ nlargest/nsmallest (24→25)
### Iteration 68 — 2026-04-05 19:16 UTC — ✅ rank (23→24)
### Iteration 67 — 2026-04-05 18:47 UTC — ✅ MultiIndex (22→23)
### Iters 60–66 — ✅ corr/cov(15), rolling(16), expanding×2(17–18), cat_accessor, melt+pivot(20), ewm(21), stack/unstack(22)
### Iterations 53–59 — ✅ GroupBy, merge, str, dt, describe/quantile, csv I/O, json I/O (metrics 8–14)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)

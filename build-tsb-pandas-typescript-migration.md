# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T05:07:00Z |
| Iteration Count | 82 |
| Best Metric | 37 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258` |
| PR | #54 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258`
**Pull Request**: #54

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 37 files (iter 82). Next candidates:
- `src/core/categorical_index.ts` — CategoricalIndex
- `src/stats/pipe.ts` — pipe/pipe-through for chained operations

---

## 📚 Lessons Learned

- **Iter 82 (apply, 36→37)**: `applySeries(series, fn(v,label))` / `applymap(df, fn(v,colName))` / `dataFrameApply(df, fn, {axis})`. Helper functions `extractRow`/`applyAxis0`/`applyAxis1` keep CC≤15. Use `import fc from "fast-check"` (default import, not namespace). Import `Scalar` from `"../../src/index.ts"` not `"../../src/types.ts"` (useImportRestrictions). Biome auto-formats multi-line function signatures onto one line when ≤100 cols.
- **Iter 81 (sample, 35→36)**: xorshift32 RNG (zero deps). `buildCdf` + `rebuildCdf` pattern for weighted without-replacement. Use `Array.from({length}, fn)` instead of for-loops where index isn't needed (avoids `useForOf` lint). `(arr as number[]).findIndex((v) => r < v)` cleaner than manual loop. `resolveWeights` separates weight validation from CDF construction. Fisher-Yates partial shuffle for unweighted without-replacement.
- **Iter 80 (apply/applymap, 35→36)**: `allSeries([])` must return `false` (vacuously-true empty case returns wrong type). Use `new Array(n).fill(v)` not `Array(n).fill(v)`. Extract small helpers (broadcastAxis0/1, expandAxis0/1, fillColBuffers) to keep CC≤15. `Series.values` is `readonly` — use separate mutable `Scalar[]` buffers for assembly.
- **Iter 79 (cut/qcut, 34→35)**: Import from `"../core/index.ts"` barrel (not sub-files) for `useImportRestrictions`. `extractName()` must return `string | null` not `string | undefined` (exactOptionalPropertyTypes). Top-level regex vars required (`useTopLevelRegex`). Shared `cutCore()` + `assignBins()` + `resolveLabels()` keep CC≤15. `cutIntervalIndex()`/`qcutIntervalIndex()` expose bins for downstream use.
- **Iter 78 (interval, 33→34)**: `IntervalIndex` standalone class (not extending `Index<Label>`). `noUncheckedIndexedAccess`: `this.left[i] as number` after bounds check. Overlap: check `right===other.left` and test both closures.
- **Iters 73–77**: fillna (3 strategies: scalar/ColumnFillMap/Series), interpolate (linear=interior only), shift/diff, compare (NaN→false), where/mask (partition property).
- **Iter 72 (value_counts, 27→28)**: `scalarKey` for stable Map keys. `df.get(name)` not `df.tryCol()`. `import type` for type-only. Biome: `as number` not `!`.
- **Iters 70–71**: `mapNumeric`/`makeClipFn`. `Number.NEGATIVE_INFINITY`/`Number.POSITIVE_INFINITY`. `cumulateNum`/`cumulateSc` + `poisoned` flag for skipna=false.
- **Iters 67–69**: CC≤15 by extracting helpers. `Array.from({length:n},(_, i)=>i)`. `cartesianProduct` backward loop.
- **Iters 63–66**: EWM online O(n). `buildCellMap`+`buildOutputCols`. `noNestedTernary`→if/else. `**` not `Math.pow`.
- **Iters 57–62**: `*SeriesLike` interfaces avoid circular imports. `getProp(obj,key)` for index-sig. `as number` not `!`. `useBlockStatements`.
- **Iters 53–56**: Barrel files for `useImportRestrictions`. `import type`. `useForOf`. Top-level regex.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**Current state (iter 82)**: 37 files — Series, DataFrame, GroupBy, concat, merge, str/dt/cat accessors, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops, stats/elem_ops, stats/value_counts, stats/where_mask, stats/compare, stats/shift_diff, stats/interpolate, stats/fillna, core/interval, stats/cut, stats/sample, stats/apply.

**Next**: CategoricalIndex · pipe

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

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

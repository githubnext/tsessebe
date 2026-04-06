# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T08:35:00Z |
| Iteration Count | 86 |
| Best Metric | 41 |
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

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258`
**Pull Request**: #54

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 41 files (iter 86). Next candidates:
- `src/stats/clip_series_more.ts` — additional numeric ops (clip with lower/upper bounds already exists; add abs/floor/ceil/round)
- `src/core/date_offset.ts` — DateOffset for calendar-aware date arithmetic

---

## 📚 Lessons Learned

- **Iter 86 (Timedelta/TimedeltaIndex, 40→41)**: Internal ms representation; `floorDiv` helper returns `[quotient, remainder]` tuple for clean component extraction. Use `first = arr[0]; if (first === undefined) throw` instead of `as` cast for safe first-element access with `noUncheckedIndexedAccess`. `biome-ignore lint/style/noNonNullAssertion:` comment works for bounds-checked array access.
- **Iter 85 (Period/PeriodIndex, 39→40)**: Ordinal-based internal representation (ms → periods since epoch) cleanly handles all 8 frequencies. `normFreq()` with for-of over const tuple handles aliases (Y→A, min→T). Biome auto-fix can corrupt JSDoc comment delimiters; fix manually after auto-write. Top-level regex constants required by `useTopLevelRegex`. Switch exhaustiveness via explicit `default: throw` satisfies `useDefaultSwitchClause`.
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

**Current state (iter 85)**: 40 files — Series, DataFrame, GroupBy, concat, merge, str/dt/cat accessors, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops, stats/elem_ops, stats/value_counts, stats/where_mask, stats/compare, stats/shift_diff, stats/interpolate, stats/fillna, core/interval, stats/cut, stats/sample, stats/apply, core/categorical_index, stats/pipe, core/period.

**Next**: DateOffset · additional numeric ops (abs/floor/ceil/round)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 86 — 2026-04-06 08:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24024993715)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/timedelta.ts` — `Timedelta` and `TimedeltaIndex` mirroring `pandas.Timedelta` / `pandas.TimedeltaIndex`.
- **Metric**: 41 (previous: 40, delta: +1)
- **Commit**: de7820d
- **Notes**: Internal ms representation with `floorDiv` helper for clean component extraction. Supports fromComponents, fromMilliseconds, parse (pandas-style / ISO 8601 / HH:MM:SS), add/sub/mul/negate/abs/divBy, compareTo/equals, toString/toISOString. TimedeltaIndex with fromTimedeltas/fromRange/fromStrings, sort/unique/shift/min/max/filter. 60+ unit + property tests.

### Iteration 85 — 2026-04-06 07:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24023324081)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/period.ts` — `Period` and `PeriodIndex` mirroring `pandas.Period` / `pandas.PeriodIndex`.
- **Metric**: 40 (previous: 39, delta: +1)
- **Commit**: 37c28bf
- **Notes**: Ordinal-based representation (periods since 1970-01-01). Supports A/Q/M/W/D/H/T/S frequencies with aliases Y→A, min→T. Period: fromDate, fromString, add, diff, compareTo, equals, contains, asfreq. PeriodIndex: fromRange, periodRange, fromPeriods, shift, sort, unique, asfreq. 65+ unit + property tests. Biome-clean.

### Iteration 84 — 2026-04-06 06:50 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24021812753)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/pipe.ts` — `pipeSeries()`, `dataFramePipe()`, `pipeChain()`, `dataFramePipeChain()`, `pipeTo()`, `dataFramePipeTo()` mirroring `pandas.Series.pipe()` / `pandas.DataFrame.pipe()`.
- **Metric**: 39 (previous: 38, delta: +1)
- **Commit**: 09f54f9
- **Notes**: Variadic-generic pattern `<A extends unknown[], R>(fn: (x, ...args: A) => R, ...args: A)` gives full type inference. `pipeChain` uses for-of loop. `pipeTo` splices value at positional index. 47 unit + property tests.

### Iteration 83 — 2026-04-06 05:49 UTC — ✅ CategoricalIndex (37→38) commit: 7444b7d
### Iteration 82 — 2026-04-06 05:07 UTC — ✅ apply/applymap/dataFrameApply (36→37) commit: 78354b8
### Iteration 81 — 2026-04-06 03:41 UTC — ✅ sample (35→36) commit: 2291bd9
### Iteration 79 — 2026-04-06 01:06 UTC — ✅ cut/qcut (34→35) commit: f26b4cc
### Iteration 78 — 2026-04-06 00:29 UTC — ✅ Interval/IntervalIndex (33→34) commit: 281be7f
### Iteration 77 — 2026-04-05 23:45 UTC — ✅ fillna (32→33)
### Iteration 76 — 2026-04-05 23:11 UTC — ✅ interpolate (31→32)
### Iteration 75 — 2026-04-05 22:50 UTC — ✅ shift_diff (30→31)
### Iteration 74 — 2026-04-05 22:09 UTC — ✅ compare (29→30)
### Iteration 73 — 2026-04-05 21:50 UTC — ✅ where_mask (28→29)
### Iters 67–72 — ✅ value_counts, elem_ops, cum_ops, nlargest, rank, MultiIndex (22→28)
### Iters 60–66 — ✅ corr/cov, rolling, expanding×2, cat_accessor, melt+pivot, ewm, stack/unstack (15→22)
### Iterations 53–59 — ✅ GroupBy, merge, str, dt, describe/quantile, csv I/O, json I/O (8→14)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)

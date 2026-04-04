# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T21:10:44Z |
| Iteration Count | 36 |
| Best Metric | 44 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-iter36-1751462400` |
| PR | — |
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
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-iter36-1751462400`

---

## 🎯 Current Priorities

Iter 36 complete (apply/pipe + to_datetime/to_timedelta + rankSeries + valueCounts/crosstab + cut/qcut + getDummies/fromDummies + assignDataFrame/filterDataFrame + explodeSeries/explodeDataFrame, 44 files).
Branch: `autoloop/build-tsb-pandas-typescript-migration-iter36-1751462400` (44 files).

Next candidates to beat 44 (need 2+ new files):
- `read_parquet` / `read_excel` I/O (+1-2 files)
- `Series.str.split`/`Series.str.extract` advanced string ops (+1 file)
- `DataFrame.eval` / `DataFrame.query` string-based query (+1 file)
- `pd.wide_to_long` / pivot_wider helpers (+1 file)
- `pd.get_option` / `pd.set_option` config system (+1 file)
- `Series.shift` / `Series.diff` (+1 file)

**IMPORTANT**: Best branch is `autoloop/build-tsb-pandas-typescript-migration-iter36-1751462400` (44 files).

---

## 📚 Lessons Learned

- **Iter 36 (assign/explode)**: Branch strategy confirmed — when a branch is lost, rebuild the same features from the last accessible base (datetime-tz-25) and add new ones. All 8 files fit on one branch. `assignDataFrame` wraps the existing `DataFrame.assign` method with callable-column support. `explodeSeries` flattens array-like scalars to rows.
- **Iter 35 (apply/datetime/rank/frequency/cut/dummies)**: Built on datetime-tz-25 base (36 files). 6 new files → 42, beats best of 40. Tests require explicit `as` casts for union return types (`cut()` returns `Series<Scalar>|CutResult`). Use `asSeries(r)` helper pattern for type narrowing in tests.
- **apply.ts (Iter 35)**: `Map<Scalar, Scalar>` (not `Map<Scalar, number>`) avoids T inference issues in tests where na=null is valid.
- **cut.ts (Iter 35)**: `CutResult.bins` is `IntervalIndex` (has `.toArray().length`); `QCutResult.bins` is `readonly number[]`. `cut()` / `qcut()` return union type — cast with helper function in tests.
- **rank.ts (Iter 35)**: Standalone `rankSeries` separate from `sort.ts`'s `rank`. Only export `rankSeries`, `RankNa`, `DataFrameRankOptions` to avoid conflicts.
- **apply.ts (Iter 34)**: `Series<T>` generic causes type inference issues in pipe tests — use `Series<Scalar>` explicit type. `cutToIntervals` must return `Array<Interval|null>` not `Series<Interval|null>` since Interval extends beyond Scalar constraint.
- **get_dummies.ts (Iter 34)**: `encodeDummiesDataFrame` helper needed to avoid CC>15 in main `getDummies` function. Use `Set<string>` for O(1) column lookup.
- **frequency.ts (Iter 34)**: Same pattern as Iter 33 but built on datetime-tz-25 base. `CrosstabNormalize = "all"|"index"|"columns"|false` confirmed.
- **General**: `exactOptionalPropertyTypes`: use `?? null`. `noUncheckedIndexedAccess`: guard array accesses. CC≤15: extract helpers. `useTopLevelRegex`: move regex to top. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default). `useForOf` requires for-of not for-let-i.
- **Imports**: import from `../../src/index.ts` (tests), barrel `../core/index.ts` (src). `import type` for type-only. `useDefaultSwitchClause`: default: in every switch.
- **Build env**: bun not available — use `npm install` then `node_modules/.bin/biome` / `node_modules/.bin/tsc`. Pre-existing TS errors in window/io/tests — only validate new files have 0 errors.
- **DatetimeIndex (Iter 25)**: `Date` not a `Label` — implement as standalone class, not extending `Index<T>`. Timezone via `Intl.DateTimeFormat.formatToParts`. applyPart helper for CC≤15.
- **Merge (Iter 10)**: composite keys use `\x00`+`__NULL__` for nulls; sentinel `-1` = right-only row.
- **Branch strategy**: Branches are per-run; old branches get lost. State best_metric may exceed what any single remote branch shows. Always build from most recent accessible branch.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

✅ Done through Iter 36: Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O, stats, categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut, applyMap/pipe, getDummies/fromDummies, to_datetime/to_timedelta, rankSeries, assignDataFrame/filterDataFrame, explodeSeries/explodeDataFrame.

**Next**: read_parquet/read_excel · str.split/str.extract advanced ops · wide_to_long · DataFrame.eval · Series.shift/diff

---

## 📊 Iteration History

### Iteration 36 — 2026-04-04 21:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23987627414)
- **Status**: ✅ Accepted
- **Change**: Re-built Iter 35 features (lost branch) + added assignDataFrame/filterDataFrame and explodeSeries/explodeDataFrame (8 new source files total)
- **Metric**: 44 (previous best: 42, delta: +2)
- **Commit**: ef97c23
- **Notes**: Branch `apply-dummies-35` was lost; rebuilt on datetime-tz-25 base. All 8 new files pass TypeScript checks. No pre-existing errors introduced.

### Iteration 35 — 2026-04-04 22:00 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23986612112)
- **Status**: ✅ Accepted
- **Change**: Added apply/pipe, to_datetime/to_timedelta, rankSeries, valueCounts/crosstab, cut/qcut, getDummies/fromDummies (6 new source files)
- **Metric**: 42 (previous best: 40, delta: +2)
- **Commit**: 370a1a2

### Iteration 34 — 2026-04-04 19:14 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23986612112)
- **Status**: ✅ Accepted
- **Change**: Added apply/pipe, valueCounts/crosstab, cut/qcut, getDummies/fromDummies on datetime-tz-25 base
- **Metric**: 40 (previous best: 36, delta: +4)

### Iteration 33 — earlier
- **Status**: ✅ Accepted
- **Change**: Added frequency/crosstab features
- **Metric**: 36


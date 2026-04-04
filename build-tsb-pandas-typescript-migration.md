# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T22:00:00Z |
| Iteration Count | 35 |
| Best Metric | 42 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-apply-dummies-35-17753334` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-apply-dummies-35-17753334`

---

## 🎯 Current Priorities

Iter 35 complete (apply/pipe + to_datetime/to_timedelta + rankSeries + valueCounts/crosstab + cut/qcut + getDummies/fromDummies, 42 files).
Branch: `autoloop/build-tsb-pandas-typescript-migration-apply-dummies-35-17753334` (42 files).

Next candidates to beat 42 (need 2+ new files):
- `read_parquet` / `read_excel` I/O (+1-2 files)
- `Series.str.split`/`Series.str.extract` advanced string ops (+1 file)
- `DataFrame.assign` / `DataFrame.query` / `DataFrame.eval` (+1 file)
- `Series.explode` / `DataFrame.explode` (+1 file)
- `pd.wide_to_long` / pivot_wider helpers (+1 file)

**IMPORTANT**: Best branch is `autoloop/build-tsb-pandas-typescript-migration-apply-dummies-35-17753334` (42 files). If inaccessible, fall back to previous known branches.

---

## 📚 Lessons Learned

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

✅ Done through Iter 35: Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O, stats, categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut, applyMap/pipe, getDummies/fromDummies, to_datetime/to_timedelta, rankSeries.

**Next**: read_parquet/read_excel · str.split/str.extract advanced ops · DataFrame.assign/query · Series.explode · wide_to_long

---

## 📊 Iteration History

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


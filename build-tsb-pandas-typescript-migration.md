# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-22T11:27:08Z |
| Iteration Count | 245 |
| Best Metric | 128 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #174 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | error, error, error, accepted, accepted, accepted, pending-ci, accepted, accepted, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174 | **Steering Issue**: #107 | **Experiment Log**: #3

---

## 🎯 Current Priorities

- `stats/swaplevel.ts` ✅ iter 239: swapLevelDataFrame/swapLevelSeries/reorderLevelsDataFrame/reorderLevelsSeries
- `stats/truncate.ts` ✅ iter 239: truncateDataFrame/truncateSeries
- `stats/between.ts` ✅ iter 240: seriesBetween (pandas Series.between)
- `stats/update.ts` ✅ iter 240: seriesUpdate/dataFrameUpdate (pandas DataFrame.update)
- `stats/filter_labels.ts` ✅ iter 240: filterDataFrame/filterSeries (pandas DataFrame.filter)
- `stats/combine.ts` ✅ iter 241: combineSeries/combineDataFrame (pandas Series/DataFrame.combine)
- `stats/notna_boolean.ts` ✅ iter 241: keepTrue/keepFalse/filterBy boolean-mask helpers
- `stats/rename_ops.ts` ✅ iter 243: renameSeriesIndex/renameDataFrame/addPrefixDataFrame/addSuffixDataFrame/addPrefixSeries/addSuffixSeries/setAxisSeries/setAxisDataFrame/seriesToFrame
- `stats/math_ops.ts` ✅ iter 243: absSeries/absDataFrame/roundSeries/roundDataFrame
- `stats/dot_matmul.ts` ✅ iter 244: seriesDotSeries/DataFrame/dataFrameDotSeries/DataFrame
- `stats/transform_agg.ts` ✅ iter 244: seriesTransform/dataFrameTransform (20 built-ins, single/array/record forms)
- Note: `stats/assign.ts` already exists as `core/assign.ts` (dataFrameAssign) — skip
- `stats/at_iat.ts` ✅ iter 245: seriesAt/seriesIat/dataFrameAt/dataFrameIat (fast scalar accessors)
- `stats/sort_ops.ts` ✅ iter 245: sortValuesSeries/sortIndexSeries/sortValuesDataFrame/sortIndexDataFrame
- Next: `stats/pop_insert.ts` — DataFrame.pop (remove column), DataFrame.insert (insert column at position)

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size` (not `.length`). `Series<Scalar>` (not `Series<unknown>`). Spread `readonly string[]` for toEqual. Use `.values` when comparing `Index<string>` in toEqual. Non-null assertion `arr[i]!` for `noUncheckedIndexedAccess` in loop bodies.
- **Biome**: `useBlockStatements --write --unsafe`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **TypeScript**: `(value as unknown) instanceof X` for instanceof. `as Scalar`/`as number` for noUncheckedIndexedAccess. `readonly T[]`. Extract helpers for ≤15 complexity. `df.columns.values` (not `.map(String)`) — `df.columns` is `Index<string>`. `(record[key] as T[]).push(v)` for pre-initialized Record dicts.
- **MultiIndex**: Does not extend `Index<Label>`. Use `mi as unknown as Index<Label>` cast when passing to Series/DataFrame constructor. `mi.at(i)` returns `readonly Label[]`. `mi.size` for length.
- **Tests**: Import from `../../src/index.ts`. `Series<Scalar>` type. `fc.float({ noNaN: true, noDefaultInfinity: true })` to avoid Infinity in multiply-by-zero tests.
- **MCP safeoutputs**: `push_to_pull_request_branch` (not create) when PR exists. Use PR #174.
- **Regex**: Global regex requires `lastIndex=0` reset before reuse. `strFindall` stores matches as JSON strings (Scalar-compatible). `strFindallExpand` uses dummy `re.exec("")` for named group detection.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame` (creates circular: `string_accessor → frame → series → string_accessor`). Use standalone stat functions for anything returning a DataFrame.
- **Label comparison**: Use `(value as unknown as number) < (bound as unknown as number)` for `<`/`>` on `Label` — TypeScript doesn't allow these operators on union types. This pattern is provably safe for number and string labels.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `core/str_accessor` — wire `.str.extractall()` via late-binding (inject DataFrame factory)
- `str.normalize()` — Unicode normalization (NFC/NFD/NFKC/NFKD) on StringAccessor
- Next: `stats/pop_insert.ts` — DataFrame.pop/insert column operations

---

## 📊 Iteration History

### Iter 245 — 2026-04-22 11:27 UTC — ⏳ Pending CI — +at_iat (seriesAt/seriesIat/dataFrameAt/dataFrameIat) +sort_ops (sortValuesSeries/sortIndexSeries/sortValuesDataFrame/sortIndexDataFrame). Metric: 128 (+2). Commit: 12687fd. [Run](https://github.com/githubnext/tsessebe/actions/runs/24775678901)
### Iter 243 — 2026-04-22 09:52 UTC — ✅ Accepted — +rename_ops (renameSeriesIndex/DataFrame, addPrefix/Suffix, setAxis, seriesToFrame) +math_ops (absSeries/absDataFrame/roundSeries/roundDataFrame). Metric: 124 (+2). Commit: ce632a1. [Run](https://github.com/githubnext/tsessebe/actions/runs/24771121921)
### Iters 239–245 — ✅ (metrics 117→128): +swapLevel/truncate, +between/Update/filter, +combine/keepTrue/keepFalse, +squeeze/item/bool/firstValidIndex/autoCorr/corrWith, +rename_ops/math_ops, +dot_matmul/transform_agg, +at_iat/sort_ops.
### Iters 218–238 — ✅/⚠️ (metrics 51→115): +jsonNormalize, +readExcel, +nancumops, +to_timedelta, +date_range, +timedelta_range, +queryDataFrame/evalDataFrame, +strFindall+toJson, +cutBinsToFrame+xs, fix-type-errors.
### Iters 53–217 — ✅/⚠️ (metrics 8→50): selectDtypes, interpolate, factorize, pivotTable, crosstab, getDummies, Interval, cut/qcut, clip, sample, duplicated, diff_shift, where_mask, replace, astype, idxmin/idxmax, na_ops, 22+ core features.

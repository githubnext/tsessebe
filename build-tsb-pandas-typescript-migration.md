# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-22T21:30:00Z |
| Iteration Count | 253 |
| Best Metric | 134 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #174 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, pending-ci, accepted, accepted, accepted, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174 | **Steering Issue**: #107 | **Experiment Log**: #3

---

## 🎯 Current Priorities

Completed iters 239–253:
- ✅ swaplevel, truncate, between, update, filter_labels, combine, notna_boolean
- ✅ rename_ops, math_ops, dot_matmul, transform_agg, map_values, at_iat
- ✅ join/joinAll/crossJoin (iter 247), infer_objects/convertDtypes (iter 247)
- ✅ merge_asof (iter 248), merge_ordered (iter 249)
- ✅ resample (SeriesResampler/DataFrameResampler, D/H/T/S/W/M/Q/A, agg fns) (iter 251)
- ✅ period_range (standalone top-level factory: start+periods, end+periods, start+end, freq inference) (iter 253)

Next:
- `str.normalize()` — Unicode normalization (NFC/NFD/NFKC/NFKD) on StringAccessor
- `stats/ewm_extended.ts` — ewm span/halflife/alpha/com variations (DataFrameEwm extended)

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size` (not `.length`). `Series<Scalar>` (not `Series<unknown>`). Spread `readonly string[]` for toEqual. Use `.values` when comparing `Index<string>` in toEqual. Non-null assertion `arr[i]!` for `noUncheckedIndexedAccess` in loop bodies.
- **Biome**: `useBlockStatements --write --unsafe`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **resample / Date as Label**: `Date` is NOT a `Label` (Label = number|string|boolean|null). Time-indexed Series/DataFrames must use ISO strings or numeric ms as index labels. Use `new Date(isoString).getTime()` when computing bucket keys. Output index comes from `DatetimeIndex.fromDates(dates) as unknown as Index<Label>`.
- **Biome imports**: All imports in `src/stats/*.ts` must come from `../core` (not `../core/specific-file.ts`), from `../types.ts`, or from sibling `../stats/` files. Tests must import from `../../src/index.ts` only.
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
- `stats/ewm_extended.ts` — DataFrame EWM extended (cov/corr per column pair)

---

## 📊 Iteration History
### Iter 253 — 2026-04-22 21:30 UTC — ⏳ pending-ci — +period_range (top-level factory: start+periods/end+periods/start+end, freq inference). Metric: 134 (+1). Commit: d0cb0a3. [Run](https://github.com/githubnext/tsessebe/actions/runs/24803209740)
### Iters 246–252 — ✅/⚠️ (metrics 128→133): +resample, +mergeOrdered, +mergeAsof, +join/joinAll/crossJoin, +inferObjects/convertDtypes. Two iterations lost due to branch sync issues.
### Iter 245 — 2026-04-22 11:55 UTC — ✅ Accepted — +seriesMap +dataFrameAt/dataFrameIat. Metric: 128 (+2). Commit: db85e5c.
### Iters 239–244 — ✅ (metrics 117→126): +swapLevel/truncate, +between/Update/filter, +combine/keepTrue/keepFalse, +squeeze/item/bool/firstValidIndex/autoCorr/corrWith, +rename_ops/math_ops, +dot_matmul/transform_agg.
### Iters 218–238 — ✅/⚠️ (metrics 51→115): +jsonNormalize, +readExcel, +nancumops, +to_timedelta, +date_range, +timedelta_range, +queryDataFrame/evalDataFrame, +strFindall+toJson, +cutBinsToFrame+xs.
### Iters 53–217 — ✅/⚠️ (metrics 8→50): selectDtypes, interpolate, factorize, pivotTable, crosstab, getDummies, Interval, cut/qcut, clip, sample, duplicated, diff_shift, where_mask, replace, astype, idxmin/idxmax, na_ops, 22+ core features.

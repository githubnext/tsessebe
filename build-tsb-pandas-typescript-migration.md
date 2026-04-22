# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-22T14:36:49Z |
| Iteration Count | 248 |
| Best Metric | 131 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #174 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, accepted, accepted, accepted, pending-ci, accepted, accepted, accepted, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174 | **Steering Issue**: #107 | **Experiment Log**: #3

---

## 🎯 Current Priorities

Completed iters 239–248:
- ✅ swaplevel, truncate, between, update, filter_labels, combine, notna_boolean
- ✅ rename_ops, math_ops, dot_matmul, transform_agg, map_values, at_iat
- ✅ join/joinAll/crossJoin (iter 247), infer_objects/convertDtypes (iter 247)
- ✅ merge_asof (iter 248, reimplemented after loss in iter 246)

Next:
- `stats/period_range.ts` — standalone `period_range()` wrapper
- `stats/map_values.ts` — Series.map (fn/dict/Map/Series mapper, na_action)
- `merge/merge_ordered.ts` — merge_ordered (ordered merge with optional fill)

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
- `merge/merge_ordered.ts` — merge_ordered (ordered merge with optional fill method)
- `stats/period_range.ts` — standalone `period_range()` top-level function

---

## 📊 Iteration History
### Iter 248 — 2026-04-22 14:36 UTC — ⏳ pending-ci — +merge_asof (backward/forward/nearest, by-groups, tolerance, allow_exact_matches, left_on/right_on, left_index/right_index). Metric: 131 (+1). Commit: 2d9afd6. [Run](https://github.com/githubnext/tsessebe/actions/runs/24784359725)

### Iter 247 — 2026-04-22 13:35 UTC — ⏳ pending-ci — +join/joinAll/crossJoin (label-based index join, multi-join chain, Cartesian product) +inferObjects/convertDtypes (dtype inference and string→numeric conversion). Metric: 130 (same, branch was at 128; +2 new files). Commit: 191e790. [Run](https://github.com/githubnext/tsessebe/actions/runs/24781267123)

### Iter 246 — 2026-04-22 12:51 UTC — ⚠️ Lost — +merge_asof +merge_ordered committed on canonical branch but commit not found; state file showed 130 but branch was at 128. [Run](https://github.com/githubnext/tsessebe/actions/runs/24779203996)

### Iter 245 — 2026-04-22 11:55 UTC — ✅ Accepted — +seriesMap +dataFrameAt/dataFrameIat. Metric: 128 (+2). Commit: db85e5c. [Run](https://github.com/githubnext/tsessebe/actions/runs/24776626741)
### Iters 239–244 — ✅ (metrics 117→126): +swapLevel/truncate, +between/Update/filter, +combine/keepTrue/keepFalse, +squeeze/item/bool/firstValidIndex/autoCorr/corrWith, +rename_ops/math_ops, +dot_matmul/transform_agg.
### Iters 218–238 — ✅/⚠️ (metrics 51→115): +jsonNormalize, +readExcel, +nancumops, +to_timedelta, +date_range, +timedelta_range, +queryDataFrame/evalDataFrame, +strFindall+toJson, +cutBinsToFrame+xs, fix-type-errors.
### Iters 53–217 — ✅/⚠️ (metrics 8→50): selectDtypes, interpolate, factorize, pivotTable, crosstab, getDummies, Interval, cut/qcut, clip, sample, duplicated, diff_shift, where_mask, replace, astype, idxmin/idxmax, na_ops, 22+ core features.

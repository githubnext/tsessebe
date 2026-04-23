# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-23T06:50:00Z |
| Iteration Count | 259 |
| Best Metric | 135 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | pending-ci |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, pending-ci, accepted, accepted, accepted, pending-ci, pending-ci, pending-ci, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174 | **Steering Issue**: #107 | **Experiment Log**: #3

---

## 🎯 Current Priorities

Completed iters 239–258:
- ✅ swaplevel, truncate, between, update, filter_labels, combine, notna_boolean
- ✅ rename_ops, math_ops, dot_matmul, transform_agg, map_values, at_iat
- ✅ join/joinAll/crossJoin, infer_objects/convertDtypes, merge_asof, merge_ordered
- ✅ resample (SeriesResampler/DataFrameResampler, D/H/T/S/W/M/Q/A, agg fns) (iter 251)
- ✅ str.normalize() (NFC/NFD/NFKC/NFKD) on StringAccessor, ewmCovMatrix/ewmCorrMatrix, xs (iter 254)
- ✅ dataFrameToHtml/dataFrameToMarkdown (iter 256), dataFrameToRecords/fromRecords (iter 256)
- ✅ dtIsocalendar() (iter 256), periodRange() (iter 256)
- ✅ getOption/setOption/resetOption/describeOption/listOptions/optionContext (iter 257)
- ✅ pd.testing: assertSeriesEqual/assertFrameEqual/assertIndexEqual/AssertionError (iter 258)

Next:
- ✅ `pd.util.hash_pandas_object()` — hashSeries / hashDataFrame (iter 259)
- `df.where(cond, other=df2)` — fill-with-other-dataframe/series variant
- `DataFrame.style` (basic styling API)

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size` not `.length`. `Series<Scalar>`. Use `.values` for `Index<string>` compare. Non-null `arr[i]!` for noUncheckedIndexedAccess.
- **Biome**: `useBlockStatements`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **Label now includes Date**: Fix 8d2e375 added `Date` to `Label` union.
- **Biome imports**: `src/stats/*.ts` imports from `../core`, `../types.ts`, or siblings only. Tests import from `../../src/index.ts`.
- **TypeScript**: `(v as unknown) instanceof X`. `as Scalar`/`as number` for noUncheckedIndexedAccess. `df.columns.values` not `.map(String)`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`. `mi.size`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **Label comparison**: `(v as unknown as number) < (bound as unknown as number)` for `<`/`>`.
- **CI action_required**: Means workflow needs human approval, not test failure. Real results from push-triggered CI runs.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `core/str_accessor` — wire `.str.extractall()` via late-binding (inject DataFrame factory)
- `DataFrame.pipe()` / `Series.pipe()` with arbitrary function composition
- `df.where(cond, other=df2)` — fill-with-other-dataframe variant

---

## 📊 Iteration History
### Iter 259 — 2026-04-23 06:50 UTC — ⏳ pending-ci — +hashSeries/hashDataFrame (pd.util.hash_pandas_object). Metric: 135 (+1 from 134). Commit: cea2db5. [Run](https://github.com/githubnext/tsessebe/actions/runs/24820886444)
### Iter 258 — 2026-04-23 03:15 UTC — ⏳ pending-ci — +pd.testing (assertSeriesEqual/assertFrameEqual/assertIndexEqual/AssertionError). Metric: 134 (+1 from branch base 133). Commit: bb30765. [Run](https://github.com/githubnext/tsessebe/actions/runs/24814455663)
### Iter 257 — 2026-04-23 01:37 UTC — ⏳ pending-ci — +options (getOption/setOption/resetOption/describeOption/listOptions/optionContext). Metric: 134 (+1). Commit: e1d8fc3. [Run](https://github.com/githubnext/tsessebe/actions/runs/24811857064)
### Iters 253–256 — ⏳ pending-ci — +dataFrameToHtml/Markdown, +dataFrameToRecords/fromRecords, +dtIsocalendar, +periodRange, +str.normalize, +ewmCovMatrix/ewmCorrMatrix. Metrics 134→137.
### Iters 246–252 — ✅/⚠️ (metrics 128→133): +resample, +mergeOrdered, +mergeAsof, +join/joinAll/crossJoin, +inferObjects/convertDtypes.
### Iter 245 — ✅ — +seriesMap +dataFrameAt/dataFrameIat. Metric: 128. Commit: db85e5c.
### Iters 239–244 — ✅ (117→126): +swapLevel/truncate, +between/Update/filter, +combine, +squeeze/item/bool, +rename_ops/math_ops, +dot_matmul/transform_agg.
### Iters 53–238 — ✅/⚠️ (8→115): 185+ pandas features ported.

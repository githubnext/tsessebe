# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-11T13:19:16Z |
| Iteration Count | 308 |
| Best Metric | 144 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, pending-ci, accepted, pending-ci, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: #248 | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core + Stats + IO + Merge + Reshape + Window + GroupBy complete (iters 1–295)
- ✅ hashPandasObject added (iter 296)
- ✅ hashArray + Series.items()/iteritems() + DataFrame.itertuples() added (iter 299)
- ✅ pd.Grouper spec object added (iter 300)
- ✅ pd.api.indexers (BaseIndexer, FixedForwardWindowIndexer, VariableOffsetWindowIndexer) added (iter 301)
- ✅ Series.map() dict/Series/Map overloads + hashBijectArray/hashBijectInverse added (iter 302)
- ✅ pd.options system (set_option, get_option, reset_option, option_context, options proxy) added (iter 303/304)
- ✅ pd.options system (options.ts) + pd.api namespace (pd_api.ts with api.types) added (iter 305)
- ✅ interval_range() added (iter 306)
- ✅ period_range() + pd.util namespace added (iter 307)
- ✅ infer_freq() added (iter 308)
- Next: pd.api.extensions, more type predicates, infer_freq improvements

---

## 📚 Lessons Learned

- **CI type errors**: Non-null `arr[i]!` for noUncheckedIndexedAccess. `as Scalar`/`as number` casts.
- **Biome**: `useBlockStatements`. `Number.NaN`. Default import fc. `import type` for unused imports.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **DataFrame construction**: Use `DataFrame.fromColumns({...})`. Options `{ index: [...] }` (not plain array).
- **Tests**: Avoid fast-check unless confirmed installed. No `new DataFrame({...})` — use `.fromColumns`.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- More `pd.api.types` predicates (is_float_dtype, is_integer_dtype, is_numeric_dtype, etc.)
- `infer_freq()` — infer frequency string from DatetimeIndex or TimedeltaIndex
- `DataFrame.xs()` improvements (multi-level key lookup)
- Full `groupby(Grouper)` integration (use Grouper.key in DataFrameGroupBy/SeriesGroupBy)
- `pd.api.extensions` — ExtensionDtype/ExtensionArray base classes

---

## 📊 Iteration History

### Iteration 308 — 2026-05-11 13:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25672568067)

- **Status**: pending-ci (awaiting CI gate)
- **Change**: Add `infer_freq()` — mirrors `pandas.infer_freq`
- **Metric**: 144 (previous best: 143, delta: +1)
- **Commit**: 684dc6b
- **Notes**: Supports fixed-ms and calendar frequencies, returns null for irregular inputs.

### Iters 273–307 — accepted/pending-ci (130→144): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +to_html, +hashPandasObject, +hashArray/iteritems, +Grouper spec, +api.indexers, +Series.map/hashBiject, +pd.options, +pd.api namespace, +interval_range, +period_range/pd.util.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.

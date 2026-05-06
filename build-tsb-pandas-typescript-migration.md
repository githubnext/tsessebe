# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-06T01:03:45Z |
| Iteration Count | 304 |
| Best Metric | 142 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #264 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, accepted, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted |

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
- Next: pd.api.types namespace object, DataFrame.map() alias, more pd.util utilities

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
- `pd.util.hash_biject_array()` — hash bijection for deduplicated categorical arrays
- `DataFrame.xs()` improvements (multi-level key lookup)
- `Series.map()` with dict/Series as mapper
- Full `groupby(Grouper)` integration (use Grouper.key in DataFrameGroupBy/SeriesGroupBy)

---

## 📊 Iteration History

### Iteration 304 — 2026-05-06 01:03 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25410851662)

- **Status**: ✅ Accepted (pending CI)
- **Change**: Add `pd.options` system — `setOption`, `getOption`, `resetOption`, `describeOption`, `optionContext`, `options` proxy, `registerOption`
- **Metric**: 142 (previous best: 141, delta: +1)
- **Commit**: 7084ec2
- **Notes**: New `src/core/options.ts` with 14 built-in options across `display.*`, `mode.*`, `compute.*` namespaces. Full proxy support. 50+ tests. Iteration 303 had same feature but code wasn't committed to branch; this iteration commits it cleanly.

### Iters 302–303 — accepted/pending-ci (141→142): +Series.map/hashBiject (302), +pd.options attempt (303, not committed).

### Iters 273–301 — accepted/pending-ci (130→141): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +to_html, +hashPandasObject, +hashArray/iteritems, +Grouper spec, +api.indexers, +Series.map/hashBiject.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.

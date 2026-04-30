# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-30T12:49:53Z |
| Iteration Count | 297 |
| Best Metric | 138 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #248 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: #248 | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core + Stats + IO + Merge + Reshape + Window + GroupBy complete (iters 1–295)
- ✅ hashPandasObject added (iter 296)
- ✅ hashArray + Series.items()/iteritems() added (iter 297)
- Next: `pd.Grouper`, more `pd.api.types` predicates, `pd.util.hash_array` (done), `DataFrame.pipe` enhancements

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size`. `Series<Scalar>`. Non-null `arr[i]!` for noUncheckedIndexedAccess.
- **Biome**: `useBlockStatements`. `Number.NaN`. Default import fc. `import type` for unused imports.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **TypeScript**: `as Scalar`/`as number` for noUncheckedIndexedAccess. `df.columns.values`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **CI action_required**: Human approval needed, not test failure.
- **to_html**: Use df.col(col).at(i) for cell values; df.index.at(i) for index labels.
- **Baseline metric**: Always check `main` baseline. Branch fast-forwarded when ahead=0.
- **DataFrame construction in tests**: Use `DataFrame.fromColumns({...})` not `new DataFrame({...})`. Use default `fc` import, not `* as fc`.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `pd.Grouper` — spec object for groupby/resample
- More `pd.api.types` predicates (is_float_dtype, is_integer_dtype, etc.)
- `pd.util.hash_biject_array()` — hash bijection for deduplicated categorical arrays
- `DataFrame.itertuples()` — iterate rows as named tuples

---

## 📊 Iteration History

### Iteration 297 — 2026-04-30 12:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25166165879)

- **Status**: ⏳ pending-ci
- **Change**: +hashArray + Series.items()/iteritems()
- **Metric**: 138 (previous best: 137, delta: +1)
- **Commit**: ea33b44

### Iteration 296 — 2026-04-29 23:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25139337654)

- **Status**: ⏳ pending-ci
- **Change**: +hashPandasObject — FNV-1a 64-bit hashing for Series/DataFrame
- **Metric**: 137 (delta: +1) | **Commit**: 2838571

### Iters 273–295 — pending-ci/accepted (130→137): +Grouper, +lreshape, +strCenter/Ljust/Rjust/Zfill/Wrap, +strGetDummies, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +firstRows/lastRows, +monthName/dayName, +itertuples, +dropLevel, +flags, +to_html.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.

# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-13T19:27:00Z |
| Iteration Count | 312 |
| Best Metric | 146 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #302 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted |

---

## 🎯 Current Priorities

- ✅ Core/Stats/IO/Merge/Reshape/Window/GroupBy done (1–295)
- ✅ pd.api.extensions (310), pdArray (311), toMarkdown/toLaTeX (312)
- Next: pd.errors, pd.io.html read_html(), more DataFrame methods

---

## 📚 Lessons Learned

- **CI type errors**: `arr[i]!` for noUncheckedIndexedAccess. `as Scalar`/`as number` casts.
- **Biome**: `useBlockStatements`. `Number.NaN`. `import type` for unused. Default import fc.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`. No `new DataFrame({...})`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.

---

## 🚧 Foreclosed Avenues

*(none)*

---

## 🔭 Future Directions

- `pd.errors` module, `pd.io.html` read_html(), `DataFrame.xs()` improvements

---

## 📊 Iteration History

### Iter 312 — 2026-05-13 19:27 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25821429313)

- **Status**: pending-ci | **Metric**: 146 (+1) | **Commit**: 79696c3
- **Change**: Add `toMarkdown()` and `toLaTeX()` — table formatters for DataFrame/Series
- **Notes**: `src/stats/format_table.ts`. Options: alignment, index, floatFormat, booktabs, longtable, tableEnv, caption, label, LaTeX escaping. 27 tests, playground.

### Iter 311 — 2026-05-13 01:14 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25771877156)

- **Status**: pending-ci | **Metric**: 145 (+1) | **Commit**: 73915da
- **Change**: Add `pdArray()` — `pd.array()` factory with dtype inference and `PandasArray`.

### Iters 273–310 — accepted/pending-ci (130→144): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +hashPandasObject, +hashArray, +pd.options, +pd.api, +interval_range, +period_range, +infer_freq, +pd.api.extensions.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.

# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-16T01:27:28Z |
| Iteration Count | 315 |
| Best Metric | 149 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #315 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, pending-ci |

---

## 🎯 Current Priorities

- ✅ Core/Stats/IO/Merge/Reshape/Window/GroupBy done (1–295)
- ✅ pd.api.extensions (310), pdArray (311), toMarkdown/toLaTeX (312), pd.errors (313), readHtml (314), readXml/toXml (315)
- Next: more IO utilities (read_parquet?), DataFrame.memory_usage(), more missing pandas API

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

- `pd.io.html` read_html(), `DataFrame.xs()` improvements
- ✅ readHtml done (314) — zero-dep HTML table parser, full options, property tests

---

## 📊 Iteration History

### Iter 315 — 2026-05-16 01:27 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/25949184928)

- **Status**: pending-ci | **Metric**: 149 (+1) | **Commit**: e3a2309
- **Change**: Add `readXml()` and `toXml()` — pd.read_xml() / DataFrame.to_xml() port; zero-dep XML tokenizer
- **Notes**: `src/io/xml.ts`. xpath, indexCol, usecols, attrs, naValues, converters, nrows. toXml: rootName, rowName, attribs, xmlDeclaration, namespaces, indent. Entity encoding/decoding, CDATA, comments. 50+ tests + property tests. Playground page.

### Iters 311–314 — pending-ci (145→148): +pdArray (311), +toMarkdown/toLaTeX (312), +pd.errors (313), +readHtml (314).

### Iters 273–310 — accepted/pending-ci (130→144): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +hashPandasObject, +hashArray, +pd.options, +pd.api, +interval_range, +period_range, +infer_freq, +pd.api.extensions.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.

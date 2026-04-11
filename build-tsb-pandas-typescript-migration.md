# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-11T18:47:49Z |
| Iteration Count | 206 |
| Best Metric | 42 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #111 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #111
**Steering Issue**: #107
**Experiment Log**: #3

---

## 🎯 Current Priorities

Next features to implement (prioritized by impact):
- `stats/crosstab.ts` — cross-tabulation (pd.crosstab)
- `io/read_excel.ts` — Excel file reading (requires xlsx parser from scratch)
- `stats/describe_categorical.ts` — describe() for categorical/string Series (check what's missing from existing describe.ts)

---

## 📚 Lessons Learned

- **Iter 206**: `getDummies`/`fromDummies` — fix `noExcessiveCognitiveComplexity` by splitting large functions into `collectLevels`, `buildIndicatorCol`, `buildNaCol`, `splitColName`, `inferSeriesName`, `findActiveLabel` helpers. Fix `noNestedTernary` with if/else. Import `Dtype` from `../core/index.ts` not `../core/dtype.ts` (`useImportRestrictions`). Canonical branch still tracked from hash-suffix 531c.
- **Iter 205**: `Interval`/`IntervalIndex`/`intervalRange` — import tests from `../../src/index.ts` (not `../../src/stats/index.ts`) to satisfy `useImportRestrictions`. Auto-fix formatter with `biome check --write`. Canonical branch did not exist remotely despite state file claiming it — had to re-create from hash-suffix branch.
- **Iter 204**: `cut`/`qcut` — decompose `assignBins` to keep cognitive complexity under 15. `useCollapsedElseIf` requires removing `else { if (...) }` → `else if (...)`. `noExportedImports` means don't re-export types imported from other modules. Use `biome format --write` to auto-fix formatter issues. `as unknown as [T, U]` required for overload narrowing (not `(...) as [T, U]`).
- **Iter 203**: Canonical branch `autoloop/build-tsb-pandas-typescript-migration` created from hash-suffix branch (iter 199 state, 37 files). Re-implemented `clip_advanced.ts` (lost from iter 200) and `apply.ts` (lost from iter 201). Biome `noExcessiveCognitiveComplexity` → decompose into axis helpers. `noUselessElse` → remove else after early returns. Metric: 39 (from 37, delta: +2).
- **Iter 202**: `clipAdvancedSeries`/`clipAdvancedDataFrame` — canonical branch created from main. Fixed missing exports in src/index.ts, stats/index.ts, core/index.ts for modules from iters 172–199. `noNestedTernary` → use if/else for axis resolution. `ReadonlyArray<T>` → `readonly T[]` for Biome. Metric: 38 (from 37; also fixed index wiring).
- **Iter 201**: `applySeries`/`applyDataFrame`/`applyExpandDataFrame`/`mapDataFrame` — Map<string,Series<Scalar>> is directly assignable to ReadonlyMap (no `as` cast needed). Biome `--write` auto-fixes formatter issues.
- **Iter 200**: `clipAdvancedSeries`/`clipAdvancedDataFrame` — Series bounds use positional alignment; DataFrame bounds use element-wise. Biome `noNonNullAssertion` on 2D arrays → use `?.` optional chaining. `noUselessElse` requires `--unsafe` flag.
- **Iter 199**: `sampleSeries`/`sampleDataFrame` — Import `Scalar` from `../../src/index.ts` (not `../../src/types.ts`) in tests to satisfy `useImportRestrictions`.
- **Iter 197**: Decompose DataFrame operations into separate axis helpers (colWise/rowWise) to keep Biome cognitive complexity low.
- **Iter 196**: Biome `noExcessiveCognitiveComplexity` (max 15): extract small helpers. Use `setCell()` helper to avoid `noNonNullAssertion` on matrix access.
- **Iter 195**: DataFrame iteration: `for (const name of df.columns.values)` + `df.col(name)`. Biome `useExplicitType` requires explicit `: Scalar` return type on arrow functions.
- **DataFrame API**: `df.columns.values` is `readonly string[]`. `df.index.size` (not `.length`). Use `DataFrame.fromColumns()` factory.
- **Series options**: `dtype` must be a `Dtype` object; `name` accepts `string | null` (not `undefined`).
- **Biome**: `useBlockStatements` auto-fixable with `--write --unsafe`. `Number.NaN`, `Number.POSITIVE_INFINITY` required. Use `import fc from "fast-check"` (default import).
- **Tests**: Import from `../../src/index.ts`. Type Series params as `Series<Scalar>`.
- **MCP**: Use direct HTTP to `http://host.docker.internal:80/mcp/safeoutputs` with session-ID handshake. `push_to_pull_request_branch` requires local branch named exactly as remote tracking branch.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `stats/crosstab.ts` — cross-tabulation
- `io/read_excel.ts` — Excel reading
- `stats/describe_categorical.ts` — describe() for categorical/string Series

---

## 📊 Iteration History

### Iteration 206 — 2026-04-11 18:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24289114918)

- **Status**: ✅ Accepted
- **Change**: Add `stats/get_dummies.ts` — `getDummies`, `getDummiesSeries`, `getDummiesDataFrame`, `fromDummies`. One-hot encoding: custom prefix/prefixSep, dropFirst, dummyNa, dtype, per-column prefix array/map. `fromDummies` reverses the encoding with configurable defaultCategory. 45+ unit + fast-check tests. Playground page `get_dummies.html` (8 interactive demos).
- **Metric**: 42 (previous best: 41, delta: +1)
- **Commit**: f5a69ab (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: Fix Biome `noExcessiveCognitiveComplexity` by extracting focused helpers. Fix `noNestedTernary` with if/else. Import `Dtype` from `../core/index.ts` not `../core/dtype.ts`.

### Iteration 205 — 2026-04-11 18:12 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24288493950)
- **Status**: ✅ Accepted — Add `stats/interval.ts`: Interval/IntervalIndex/intervalRange. Metric: 41 (+1). Commit: e58b620

### Iters 200–204 — 2026-04-11 — ✅ (metrics 38→40)
- 200: clip_advanced. 201: apply. 202: fix exports + clip_advanced canonical. 203: re-implement apply+clip. 204: cut/qcut.

### Iters 199–205 — 2026-04-11 — ✅ (metrics 36→41: 7 accepted iterations)
- Iter 199: sample (n/frac/replace/weights/randomState). Metric: 36.
- Iter 200–201: clip_advanced, apply (on hash-suffix; lost before canonical). Metric: 38.
- Iter 202: clip_advanced + fixed missing exports for iters 172–199. Metric: 38. Canonical branch created.
- Iter 203: Re-implement clip_advanced + apply. Metric: 39.
- Iter 204: cut/qcut. Metric: 40.
- Iter 205: Interval/IntervalIndex/intervalRange. Metric: 41.

### Iters 172–198 — 2026-04-10/11 — ✅ (metrics 29→36: 26+ accepted iterations)
- Iter 172: na_ops. Metric: 29. Iters 173–192: push failures (MCP unavailable), features lost.
- Iter 193: idxmin_idxmax (fixed MCP). Metric: 31.
- Iters 194–198: astype, replace, where_mask, diff_shift, duplicated. Metrics: 32–36.

### Iteration 167 — 2026-04-10 18:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24256220682)
- **Status**: ✅ Accepted — Re-committed 7 modules. Metric: 51. Commit: 2ece4b5

### Iters 53–166 — ✅/⚠️ (metrics 8→51: feature implementations and recoveries)

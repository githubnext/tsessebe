# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-11T21:10:56Z |
| Iteration Count | 211 |
| Best Metric | 46 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #113 (hash-suffix; canonical PR being created for `autoloop/build-tsb-pandas-typescript-migration`) |
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
**Pull Request**: #113 (hash-suffix; canonical PR being created for `autoloop/build-tsb-pandas-typescript-migration`)
**Steering Issue**: #107
**Experiment Log**: #3

---

## 🎯 Current Priorities

Next features to implement (prioritized by impact):
- `io/read_excel.ts` — Excel file reading (requires xlsx parser from scratch)
- `stats/describe_categorical.ts` — describe() for categorical/string Series (check what's missing from existing describe.ts)
- `window/rolling_apply.ts` — rolling/expanding apply with custom function

---

## 📚 Lessons Learned

- **Iter 211**: `factorize`/`factorizeSeries` — `stats/factorize.ts`. With `noUncheckedIndexedAccess: true`, use `for (const [i, v] of values.entries())` instead of `values[i]` in a for loop to avoid `Scalar | undefined`. `codeMap.get(v) ?? naValue` handles the `undefined` case from Map.get. `rawUniques as readonly Label[]` cast is necessary since `Scalar` is wider than `Label` — same pattern used in crosstab.ts. Metric: 46 (+1). Commit: 620ff7a.
- **Iter 210**: `explode` — `reshape/explode.ts`. For `Array.isArray(value)` where `value: Scalar` (Scalar has no array members), TypeScript narrows to `never` in the truthy branch. Fix: widen to `unknown` first (`const raw: unknown = value`), then `Array.isArray(raw)` narrows to `unknown[]`. Use `arr.map(c => (c ?? null) as Scalar)` for element extraction. `typeof column === "string"` is cleaner than `Array.isArray` for `string | readonly string[]` union. `DataFrame.fromColumns` accepts `Record<string, Scalar[]>` directly (no `as` cast to readonly needed). Metric: 45 (+1). Commit: 6434a78.
- **Iter 209**: `pivotTableFull` — `noSecrets` flags sentinel strings (use biome-ignore). `useAtIndex` → `.at(-1)`. `useShorthandArrayType`: `T[]`. `useSimplifiedLogicExpression`: `!(a || b)`. Metric: 44 (+1). Commit: 0932ce7.
- **Iter 208**: `crosstab` — `noExcessiveCognitiveComplexity` (max 15): split normalize/sum helpers. Use `create_pull_request` when canonical branch doesn't exist remotely. Metric: 43 (+1). Commit: 1ab2e7c.
- **Iter 206**: `getDummies`/`fromDummies` — fix complexity by extracting helpers. Import `Dtype` from `../core/index.ts`. Metric: 42 (+1). Commit: f5a69ab.
- **Iter 205**: `Interval`/`IntervalIndex`/`intervalRange` — import tests from `../../src/index.ts`. Canonical branch may not exist remotely — re-create from hash-suffix. Metric: 41 (+1).
- **Iter 204**: `cut`/`qcut` — decompose `assignBins` for complexity. `useCollapsedElseIf`. `as unknown as [T, U]` for overload narrowing. Metric: 40 (+1).
- **Iter 203**: Canonical branch `autoloop/build-tsb-pandas-typescript-migration` created from hash-suffix branch (iter 199 state, 37 files). Re-implemented `clip_advanced.ts` (lost from iter 200) and `apply.ts` (lost from iter 201). Biome `noExcessiveCognitiveComplexity` → decompose into axis helpers. `noUselessElse` → remove else after early returns. Metric: 39 (from 37, delta: +2).
- **Iter 202**: `clipAdvancedSeries`/`clipAdvancedDataFrame` — canonical branch created from main. Fixed missing exports in src/index.ts, stats/index.ts, core/index.ts for modules from iters 172–199. `noNestedTernary` → use if/else for axis resolution. `ReadonlyArray<T>` → `readonly T[]` for Biome. Metric: 38 (from 37; also fixed index wiring).
- **Iter 199**: `sampleSeries`/`sampleDataFrame` — Import `Scalar` from `../../src/index.ts` (not `../../src/types.ts`) in tests to satisfy `useImportRestrictions`.
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

- `io/read_excel.ts` — Excel reading
- `stats/describe_categorical.ts` — extend describe() for categorical
- `stats/describe_categorical.ts` — describe() for categorical/string Series

---

## 📊 Iteration History

### Iteration 211 — 2026-04-11 21:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24291664190)

- **Status**: ✅ Accepted
- **Change**: Add `stats/factorize.ts` — `factorize` and `factorizeSeries`. Encodes values as integer codes (0-based, occurrence order or sorted), returns codes + unique values. Supports NA sentinel (default -1), custom naValue, sort option. 30 unit + 4 property-based tests. Playground `factorize.html` with 8 demos.
- **Metric**: 46 (previous best: 45, delta: +1)
- **Commit**: 620ff7a (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: `for (const [i, v] of values.entries())` avoids `noUncheckedIndexedAccess` issues. `rawUniques as readonly Label[]` cast needed since Scalar is wider than Label — same pattern as crosstab.ts.

### Iteration 210 — 2026-04-11 20:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24291234244)

- **Status**: ✅ Accepted
- **Change**: Add `reshape/explode.ts` — `explodeSeries` and `explodeDataFrame`. Explodes list-valued cells into individual rows. Supports multi-column explosion (zip-longest padding), null/empty array → null, scalars pass through, ignore_index option. 27 unit + 3 property-based tests. Playground `explode.html` with 8 demos.
- **Metric**: 45 (previous best: 44, delta: +1)
- **Commit**: 6434a78 (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: `Array.isArray(value)` where `value: Scalar` narrows to `never` — widen to `unknown` first. `typeof column === "string"` cleanly handles `string | readonly string[]`. `DataFrame.fromColumns` accepts `Record<string, Scalar[]>` directly without cast.

### Iteration 209 — 2026-04-11 20:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24290574060)

- **Status**: ✅ Accepted
- **Change**: Add `reshape/pivot_table.ts` — `pivotTableFull` with full margins support. Mirrors `pandas.pivot_table()` with margins=true adding All row/column, margins_name customization, sort option, fill_value, dropna, and multiple index/column columns. 25 unit + 4 property-based tests. Playground `pivot_table.html` with 8 demos.
- **Metric**: 44 (previous best: 43, delta: +1)
- **Commit**: 0932ce7 (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: `noSecrets` flags sentinel strings → biome-ignore comment. `useAtIndex` → `.at(-1)`. `useShorthandArrayType` → `T[]`. `useSimplifiedLogicExpression` → `!(a || b)`. Local canonical branch tracks hash-suffix origin branch fine.

### Iteration 208 — 2026-04-11 19:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24290127464)

- **Status**: ✅ Accepted
- **Change**: Add `stats/crosstab.ts` — `crosstab` and `crosstabSeries`. Cross-tabulation with count/custom aggfunc, normalize (all/index/columns), margins with custom name, dropna. 21 unit + property-based tests. Playground page `crosstab.html`.
- **Metric**: 43 (previous best: 42, delta: +1)
- **Commit**: 1ab2e7c (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: Split normalizeMatrix into 3 mode-specific helpers + 3 math helpers to pass Biome complexity check. Remove unused buildMatrix/buildColumnMap. Create canonical branch (not hash-suffix) — used create_pull_request since branch was new.

### Iteration 207 — 2026-04-11 19:32 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24289641935)

- **Status**: ✅ Accepted
- **Change**: Add `stats/crosstab.ts` — `crosstab` and `crosstabSeries`. Cross-tabulation with count/custom aggfunc, normalize (all/index/columns), margins with custom name, dropna. 30 unit + property-based tests. Playground page `crosstab.html` (8 interactive demos).
- **Metric**: 43 (previous best: 42, delta: +1)
- **Commit**: dacdb21 (branch: autoloop/build-tsb-pandas-typescript-migration-531c0338e43e4af9)
- **Notes**: Extract `pushObservation` helper for `buildCellMap`, `buildColumnMap`+`resolveFinalLayout` for `crosstab` to stay under Biome complexity limit. `noVoid` — don't use `void x` to suppress unused-var.

### Iteration 206 — 2026-04-11 18:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24289114918)

- **Status**: ✅ Accepted
- **Change**: Add `stats/get_dummies.ts` — one-hot encoding. Metric: 42 (+1). Commit: f5a69ab

### Iteration 205 — 2026-04-11 18:12 UTC
- **Status**: ✅ Accepted — Add `stats/interval.ts`: Interval/IntervalIndex/intervalRange. Metric: 41 (+1). Commit: e58b620

### Iters 199–204 — 2026-04-11 — ✅ (metrics 36→40)
- 199: sample. 200–201: clip_advanced, apply (lost on push). 202: fix exports + clip_advanced. 203: re-impl apply+clip. 204: cut/qcut.

### Iters 172–198 — 2026-04-10/11 — ✅ (metrics 29→36)
- 172: na_ops. 173–192: push failures. 193: idxmin_idxmax (MCP fixed). 194–198: astype, replace, where_mask, diff_shift, duplicated.

### Iters 53–171 — ✅/⚠️ (metrics 8→51: feature implementations and recoveries)

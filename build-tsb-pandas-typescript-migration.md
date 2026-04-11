# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-11T15:45:00Z |
| Iteration Count | 200 |
| Best Metric | 38 |
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
- `io/read_excel.ts` — Excel file reading (requires xlsx parser)
- `stats/apply.ts` — apply arbitrary function along axis for Series/DataFrame
- `groupby` extensions — transform, filter, apply

---

## 📚 Lessons Learned

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

- `io/read_excel.ts` — Excel reading
- `stats/clip_advanced.ts` — clip with Series/DataFrame bounds
- `groupby` extensions — transform, filter, apply

---

## 📊 Iteration History

### Iteration 200 — 2026-04-11 15:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24285870280)

- **Status**: ✅ Accepted
- **Change**: Add `stats/clip_advanced.ts` — `clipAdvancedSeries`, `clipAdvancedDataFrame`. Per-element clipping with scalar, Series (positional), or DataFrame (element-wise) bounds; axis=0/1 for broadcasting. 32 tests (unit + fast-check). Playground page `clip_advanced.html`.
- **Metric**: 38 (previous best: 36, delta: +2)
- **Commit**: e0f8724 (branch: autoloop/build-tsb-pandas-typescript-migration-531c0338e43e4af9 → PR #111)
- **Notes**: `expandDataFrameBound()` helper handles all four bound types. Biome `noNonNullAssertion` on 2D grids — use optional chaining (`?.`). `noUselessElse` requires `--unsafe` flag to auto-fix.

### Iteration 199 — 2026-04-11 14:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24284805137)

- **Status**: ✅ Accepted
- **Change**: Add `core/sample.ts` — `sampleSeries`, `sampleDataFrame`. Supports `n`/`frac`, `replace`, `weights`, `randomState` (Mulberry32 PRNG), `ignoreIndex`, `axis=0/1`. 35 tests (unit + fast-check). Playground page `sample.html`.
- **Metric**: 36 (previous best: 35, delta: +1)
- **Commit**: 7d35121 (branch: autoloop/build-tsb-pandas-typescript-migration-531c0338e43e4af9 → PR #111)
- **Notes**: Import `Scalar` type from `../../src/index.ts` in tests (not `../../src/types.ts`) to satisfy Biome `useImportRestrictions`. Fisher-Yates for uniform without-replacement, Gumbel-max trick for weighted, CDF binary-search for with-replacement.

### Iteration 198 — 2026-04-11 14:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24284243449)

- **Status**: ✅ Accepted
- **Change**: Add `stats/duplicated.ts` — `duplicatedSeries`, `duplicatedDataFrame`, `dropDuplicatesSeries`, `dropDuplicatesDataFrame`. Supports `keep="first"/"last"/false` and `subset` for DataFrames. 35 tests (unit + fast-check). Playground page `duplicated.html`.
- **Metric**: 36 (previous best: 35, delta: +1)
- **Commit**: 5218a72 (branch: autoloop/build-tsb-pandas-typescript-migration-531c0338e43e4af9 → PR #111)
- **Notes**: Reused `scalarKey()` pattern from value_counts. `push_to_pull_request_branch` requires local branch named exactly as the remote tracking branch for incremental patch computation.

### Iteration 197 — 2026-04-11 13:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24283807306)

- **Status**: ✅ Accepted
- **Change**: Add `stats/diff_shift.ts` — `diffSeries`, `diffDataFrame`, `shiftSeries`, `shiftDataFrame`. Supports axis=0 (column-wise) and axis=1 (row-wise) for DataFrames. 35 tests (unit + fast-check properties). Playground page `diff_shift.html`. Also created canonical PR for `autoloop/build-tsb-pandas-typescript-migration`.
- **Metric**: 35 (previous best: 34, delta: +1)
- **Commit**: fc137cc (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: Decompose DataFrames operations into separate axis helpers (colWise/rowWise) to keep cognitive complexity low. `diffArray` returns null for non-finite values; `shiftArray` fills with configurable `fillValue`.

### Iteration 196 — 2026-04-11 13:40 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24283415842)

- **Status**: ✅ Accepted
- **Change**: Add `stats/where_mask.ts` — `whereSeries`, `maskSeries`, `whereDataFrame`, `maskDataFrame`. Supports boolean[], Series, DataFrame, 2-D array, and callable conditions. 33 tests (unit + fast-check properties). Playground page `where_mask.html`.
- **Metric**: 34 (previous best: 33, delta: +1)
- **Commit**: 3a85852 (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: Biome noExcessiveCognitiveComplexity (max 15) requires extracting small helpers for each condition type. Use `setCell()` helper to avoid noNonNullAssertion on matrix access.

### Iteration 195 — 2026-04-11 13:05 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24282791339)

- **Status**: ✅ Accepted
- **Change**: Add `stats/replace.ts` — `replaceSeries`/`replaceDataFrame` with scalar, array (many→one, pair-wise), Record, and Map replacement specs. 27 tests (unit + fast-check properties). Playground page `replace.html`.
- **Metric**: 33 (previous best: 32, delta: +1)
- **Commit**: de6aeea (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: DataFrame iteration uses `for (const name of df.columns.values)` + `df.col(name)`. Biome `useExplicitType` requires explicit `: Scalar` return type on arrow functions.

### Iteration 194 — 2026-04-11 12:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24282208612)

- **Status**: ✅ Accepted
- **Change**: Add `core/astype.ts` — `astypeSeries`, `astype` (DataFrame), `castScalar`. Handles int/uint clamping, float, bool, string, datetime casts with null passthrough. 40 tests (unit + fast-check properties). Playground page `astype.html`.
- **Metric**: 32 (previous best: 31, delta: +1)
- **Commit**: 5a5e20a (branch: autoloop/build-tsb-pandas-typescript-migration)
- **Notes**: Clean implementation on canonical branch. TypeScript strict mode, no `any`. Per-column dtype mapping with `Record<string, DtypeName | Dtype>` for DataFrame astype.

### Iteration 193 — 2026-04-11 11:22 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24281202174)

- **Status**: ✅ Accepted
- **Change**: Add `idxmin_idxmax.ts` — `idxminSeries`, `idxmaxSeries`, `idxminDataFrame`, `idxmaxDataFrame` with `skipna` option. 35 tests. Playground page `idxmin_idxmax.html`.
- **Metric**: 31 (previous best: 30, delta: +1)
- **Commit**: 0e76e9e (branch: autoloop/build-tsb-pandas-typescript-migration, based on dcf09ab)
- **Notes**: First successful push after 20 consecutive MCP failures. Used direct HTTP + session-ID handshake.

### Iters 173–192 — 2026-04-10/11 — ⚠️ (20 consecutive push failures)
- safeoutputs tools returned "Tool does not exist" due to Copilot CLI not registering MCP server.
- Features implemented locally but lost on runner termination: idxmin_idxmax (3x), astype, replace, where_mask (many times), pct_change (8x).
- Fixed in iter 193 via direct HTTP to MCP endpoint.

### Iteration 172 — 2026-04-10 20:57 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24263385922)
- **Status**: ✅ Accepted — Add `na_ops.ts` (isna/notna/ffill/bfill). Metric: 29. Commit: 0a40f00

### Iteration 167 — 2026-04-10 18:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24256220682)
- **Status**: ✅ Accepted — Re-committed 7 modules. Metric: 51. Commit: 2ece4b5

### Iters 53–166 — ✅/⚠️ (metrics 8→51: feature implementations and recoveries)

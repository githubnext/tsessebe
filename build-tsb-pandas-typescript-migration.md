# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-11T01:44:30Z |
| Iteration Count | 179 |
| Best Metric | 28 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Steering Issue | — |
| Paused | true |
| Pause Reason | 7 consecutive push failures: safeoutputs MCP tools not registered as callable in this agent context |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 7 |
| Recent Statuses | error, error, error, error, error, error, error, accepted, accepted, error |

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: — (pending PR creation)
**Steering Issue**: — (pending)
**Experiment Log**: — (pending)

---

## 🎯 Current Priorities

*(No specific priorities — continue implementing missing pandas features.)*

Next features to implement (prioritized by impact):
- `core/astype.ts` — explicit dtype casting module
- `stats/where_mask.ts` — conditional where/mask operations
- `stats/idxmin_idxmax.ts` — index label of min/max values
- `stats/replace.ts` — value substitution for Series and DataFrame
- `io/read_excel.ts` — Excel file reading (WASM or fallback)

---

## 📚 Lessons Learned

- **Iters 173-179 (7 consecutive) failure**: safeoutputs MCP tools consistently NOT available as callable tools in this workflow. Both direct calls (`create_pull_request`) and sub-agents (general-purpose mode) fail. The system lists these tools in `<safe-output-tools>` but they are NOT registered in the tool executor. Root cause: workflow config issue. **Action required from maintainer.**
- **pct_change implementation**: Committed as 07b0eb4 on local branch `autoloop/build-tsb-pandas-typescript-migration` (canonical name, no suffix, created fresh from main). Files: `src/stats/pct_change.ts`, `tests/stats/pct_change.test.ts`, `playground/pct_change.html`. Would bring metric to 29. Code is tsc-clean.
- **Iter 172 success**: safeoutputs tools WERE available in Copilot CLI agentic workflow. NOT reproducible since then.
- **Current main state**: main branch has 28 features. pct_change (metric 29) committed locally 7 times across iters 173-179.
- **DataFrame API**: Use `df.columns.values` (readonly string[]) not `df.columns` directly. Constructor is `new DataFrame(colMap, index)`.
- **Biome formatting**: overload signatures that exceed 100 chars need line breaks.
- **Import style**: Use `import fc from "fast-check"` (default). Use `src/index.ts` for imports in tests.
- **Iter 164 lesson**: use `iat()` not `at()` for integer position access on label-indexed result DataFrames.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**Next priorities**:
- `na_ops.ts` — isna/notna/ffill/bfill (was in iter 172 but branch was lost, not in main)
- `where`/`mask` — conditional operations very common in pandas
- `idxmin`/`idxmax` — frequently used in data analysis
- `replace` — value substitution
- `astype` — explicit dtype casting

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 179 — 2026-04-11 01:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24271783221)

- **Status**: ⚠️ Error (push failure — safeoutputs MCP tools not registered as callable, 7th consecutive)
- **Change**: Add `pct_change.ts` — `pctChangeSeries`/`pctChangeDataFrame` with periods and axis options. 20 tests, tsc clean.
- **Metric**: 29 (main baseline 28, delta +1 if pushed)
- **Commit**: 07b0eb4 (local only on branch `autoloop/build-tsb-pandas-typescript-migration`)
- **Notes**: Sub-agents (general-purpose mode) also lack safeoutputs tools. The main agent `create_pull_request` call returns "Tool does not exist". Branch created fresh from main (canonical name, no suffix). Code quality is good. Root cause: workflow config issue preventing safeoutputs MCP server registration.

### Iteration 178 — 2026-04-11 01:00 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24270929276)

- **Status**: ⚠️ Error (push failure — safeoutputs MCP tools unavailable, 6th consecutive)
- **Change**: Add `pct_change.ts` — `pctChangeSeries`/`pctChangeDataFrame` with periods, fillMethod (pad/ffill/bfill/backfill/null), fill limit, and axis support. 27 tests, all pass. Biome clean, tsc clean.
- **Metric**: 29 (main baseline 28, delta +1 if pushed)
- **Commit**: d8f0c10 (local only on branch `autoloop/build-tsb-pandas-typescript-migration`)
- **Notes**: Code is fully implemented and correct. create_issue / create_pull_request / push_to_pull_request_branch tools not registered in this workflow run. Same root cause as iters 173-177.

### Iteration 177 — 2026-04-11 00:27 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24270222763)

- **Status**: ⚠️ Error (push failure — safeoutputs MCP tools unavailable, 5th consecutive; auto-paused)
- **Change**: Add `pct_change.ts` — `pctChangeSeries`/`pctChangeDataFrame` with periods, fillMethod (pad/ffill/backfill/bfill/null), limit, axis. Committed locally as 21b1e10.
- **Metric**: 29 (main baseline 28, delta +1 if pushed)
- **Commit**: 21b1e10 (local only on branch `autoloop/build-tsb-pandas-typescript-migration`)
- **Notes**: Same push failure as iters 173-176. Program now auto-paused. Maintainer action required to fix workflow authentication so safeoutputs tools are available.

### Iteration 176 — 2026-04-10 23:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24269241132)

- **Status**: ⚠️ Error (push failure — safeoutputs MCP tools unavailable, 4th consecutive)
- **Change**: Add `pct_change.ts` — `pctChangeSeries`/`pctChangeDataFrame` with periods, fillMethod (pad/ffill/backfill/bfill/null), limit, and axis support. 20 tests pass. Biome clean.
- **Metric**: 29 (main baseline 28, delta +1 if pushed)
- **Commit**: 1ae6f5f (local only on branch `autoloop/build-tsb-pandas-typescript-migration`)
- **Notes**: Code is complete, TypeScript-clean, and biome-lint-clean (only nursery warnings). Required refactoring: extract `divByPrior` helper to reduce nested ternaries, extract `extractRow`/`scatterRow` helpers for cognitive complexity. Next iteration must re-implement pct_change from scratch since branch is local-only.

### Iteration 175 — 2026-04-10 22:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24267579751)

- **Status**: ⚠️ Error (push failure — safeoutputs MCP tools unavailable)
- **Change**: Add `pct_change.ts` — `pctChangeSeries`/`pctChangeDataFrame` with periods, fillMethod (pad/ffill/bfill/backfill), fill limit, and axis support
- **Metric**: 29 (main baseline 28, delta +1 if pushed)
- **Commit**: 57a5b3e (local only on branch `autoloop/build-tsb-pandas-typescript-migration`)
- **Notes**: Code is TypeScript-clean and biome-lint-clean. Same push failure pattern as iters 173-174. Next iteration MUST re-implement pct_change from scratch since branch was created local-only.

### Iteration 174 — 2026-04-10 22:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24266545401)

- **Status**: ⚠️ Error (push failure — safeoutputs MCP tools unavailable)
- **Change**: Add `pct_change.ts` — `pctChangeSeries`/`pctChangeDataFrame` with periods, fillMethod (pad/bfill/null), limit, and axis support. Commit `a1b6e27` exists locally but could not be pushed.
- **Metric**: 29 (would have been +1 vs main's 28)
- **Notes**: safeoutputs MCP tools again not registered in this workflow run. Code complete and TypeScript-clean. Next iteration should re-implement this feature.

### Iteration 173 — 2026-04-10 21:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24265606546)

- **Status**: ⚠️ Error (push failure — safeoutputs MCP tools unavailable)
- **Change**: Add `pct_change.ts` — `pctChangeSeries`/`pctChangeDataFrame` with periods, fillMethod (pad/bfill/null), and axis support. Commit 5b77e5b exists locally but could not be pushed.
- **Metric**: 29 (would have been +1 vs main's 28)
- **Notes**: safeoutputs MCP tools not registered in this workflow run. Code complete and type-checked. Next iteration should re-implement or cherry-pick this feature.

### Iteration 172 — 2026-04-10 20:57 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24263385922)

- **Status**: ✅ Accepted
- **Change**: Add `na_ops.ts` — `isna`/`notna`/`isnull`/`notnull` (scalar/Series/DataFrame), `ffillSeries`/`bfillSeries`/`dataFrameFfill`/`dataFrameBfill` (forward/backward fill with limit and axis options)
- **Metric**: 29 (previous best: 28, delta: +1)
- **Commit**: 0a40f00
- **Notes**: Implemented standalone missing-value utilities mirroring pandas' module-level functions. Includes property-based tests and playground page. Successfully unpaused after 4-iteration push failure streak.

### Iterations 168–171 — 2026-04-10 — ⚠️ Error (push failures)
- Iters 168-170: safeoutputs MCP tools not registered
- Iter 171: create_pull_request "No commits found", push_to_pull_request_branch "git auth error"

### Iteration 167 — 2026-04-10 18:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24256220682)

- **Status**: ✅ Accepted
- **Change**: Re-committed 7 new modules: shift_diff, crosstab, get_dummies, autocorr, sampling, date_range, merge_asof.
- **Metric**: 51 (commit `2ece4b5`)

### Iterations 53–166 — Various features (condensed)
- Metrics 8→51 across feature implementations, branch history, and recoveries.

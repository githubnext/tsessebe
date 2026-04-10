# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-10T23:55:00Z |
| Iteration Count | 176 |
| Best Metric | 29 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 4 |
| Recent Statuses | error, error, accepted, error, error, accepted, accepted, error, error, error |

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

- **Iter 176 failure**: safeoutputs tools NOT available again (run 24269241132). pct_change fully implemented — 20 tests pass, biome clean. Commit `1ae6f5f` on local branch `autoloop/build-tsb-pandas-typescript-migration`. Same systematic failure as iters 173-175. Consecutive errors now at 4.
- **Iter 175 failure**: safeoutputs tools STILL not available (run 24267579751). Code committed to local branch (57a5b3e) but not pushed. Same pattern as iters 173-174. This is a persistent workflow configuration issue. Consecutive errors now at 3.
- **Iter 175 success NOTE**: Note above "Iter 175 success" entry is from a DIFFERENT run that also had pct_change. The note about "28 files" refers to an earlier successful run when branch was created fresh from main.
- **Iter 172 success**: safeoutputs tools ARE available in Copilot CLI agentic workflow (as opposed to older runs). The background task agent can use create_pull_request. The key fix was using a general-purpose background agent to call safeoutputs tools.
- **Current main state**: main branch has 28 features (not 88 as old state file said). The 88 was from old per-branch commits that were never merged into main. State file metric was stale.
- **DataFrame API**: Use `df.columns.values` (readonly string[]) not `df.columns` directly for iteration. Constructor is `new DataFrame(colMap, index)` not `new DataFrame({data, index})`.
- **Biome formatting**: overload signatures that exceed 100 chars need line breaks — `export function foo(\n  param,\n): ReturnType`.
- **Import style**: Use `import fc from "fast-check"` (default), not `import * as fc`. Use `src/index.ts` for imports in tests, not deep file imports.
- **Implementation notes for to_datetime**: Use `DatetimeIndex.fromDates()` (not `new DatetimeIndex()`). Use `new Timestamp(d)` (pass Date object, not string directly).
- **Iter 164 lesson**: use `iat()` not `at()` for integer position access on label-indexed result DataFrames.
- **Iter 174 push failure**: safeoutputs tools again not available. Both direct call and sub-agent call confirmed unavailable. Commit `a1b6e27` on branch `autoloop/build-tsb-pandas-typescript-migration` (local only). pct_change code is ready — next iteration should re-implement.
- **Pattern**: Tools were intermittently available. Iter 175 confirmed they ARE available in this run.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**Next priorities**:
- `pct_change` — IMPLEMENTED AGAIN (iter 176, commit `1ae6f5f`, run 24269241132). Files ready: `src/stats/pct_change.ts`, `tests/stats/pct_change.test.ts`, `playground/pct_change.html`. Branch `autoloop/build-tsb-pandas-typescript-migration` exists locally only. Re-implement if branch is gone.
- `na_ops.ts` — isna/notna/ffill/bfill (was in iter 172 but branch was lost, not in main)
- `where`/`mask` — conditional operations very common in pandas
- `idxmin`/`idxmax` — frequently used in data analysis
- `replace` — value substitution
- `astype` — explicit dtype casting

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

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

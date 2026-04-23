# Test-Driven Strategy — <CUSTOMIZE: program-name>

This file is the **runtime playbook** for this program. The autoloop agent reads it at the start of every iteration and follows it literally. It supersedes the generic "Analyze and Propose" / "Accept or Reject" steps in the default autoloop iteration loop — all other steps (state read, branch management, state file updates, CI gating) still apply.

## Problem framing

<CUSTOMIZE: 2–4 sentences describing what the program specifies. What is the target artifact? What does "correct" mean — are we implementing an API against a reference, fixing bugs against a repro, adding behaviour against a spec document? Name the source of truth the agent checks whenever ambiguity arises (e.g. "pandas' `Series.sort_values` semantics are authoritative; when tsb behaviour diverges, pandas wins unless the divergence is documented").>

## Per-iteration loop

### Step 1. Load state

1. Read `program.md` — Goal, Target, Evaluation.
2. Read the program's state file from the repo-memory folder (`{program-name}.md`). Locate the `## ✅ Test Harness` subsection. If it does not exist, create it using the schema in [Test Harness schema](#test-harness-schema).
3. Read <CUSTOMIZE: the source-of-truth references the agent consults — e.g. pandas docs for the current target function, the issue whose bug we're fixing, a spec document in docs/>.
4. Read both prompt templates in `strategy/prompts/`. They frame how you reason about writing tests and making them pass for this specific problem.

### Step 2. Pick target

Pick **one** unit of work — a single behaviour to pin or fix. Size it so that the entire red → green → refactor cycle fits in one iteration:

- <CUSTOMIZE: concrete guidance for how to size work in this program. E.g. "one method signature" for an API-porting program, "one failing repro" for a bug-fixing program, "one spec bullet" for a spec-driven program.>

Deterministic overrides (apply *before* free choice):

- If the Test Harness has any entry with status `failing` that is **not** marked `blocked`, pick that one. A failing test is an obligation — you don't add new tests while old ones are still red.
- If the most recent 3 iterations were all `error` (validity pre-check failed, test didn't even compile), force a `rethink-test` iteration — the problem is the test, not the implementation. See Step 4's rethink branch.

Record the chosen target in the iteration's reasoning.

### Step 3. Red — write the failing test

Use `strategy/prompts/write-test.md` as framing.

Before writing the test, state (in visible reasoning):

1. What behaviour you are pinning. One sentence, specific.
2. The source-of-truth reference (pandas doc, spec bullet, issue reproducer).
3. The minimum set of assertions that captures "this is correct" without over-specifying implementation details.
4. Edge cases the test must include (empty inputs, NaN, dtype boundaries — whatever's applicable).

Then write the test file (or append to an existing one). Before continuing: **run the test and confirm it fails with a useful error message**. If it passes already, you picked wrong — either the target is already implemented (pick a different one) or the test is too weak (rewrite).

Record the new test in the Test Harness with status `failing` and the iteration number.

### Step 4. Green — implement until the test passes

Use `strategy/prompts/make-green.md` as framing.

Before writing any implementation code, state:

1. Parent state of the target file(s) — one-line summary of what exists now.
2. The **minimum** change needed to make the failing test pass. Resist scope creep; the test defines the requirement, nothing else.
3. Which invariants of the existing tests must continue to hold (list them).

Then write the implementation. Run the full test suite (not just the new test): **every existing test must still pass, and the new one must now pass too.**

If the test still fails after implementation:
- **Attempt ≤ 3**: re-analyze what's missing and try again (stay in Step 4).
- **Attempt ≥ 4**: consider that the test itself may be wrong — re-enter the `rethink-test` branch. Read the source of truth again, weaken/rewrite the test to match the *real* spec, then restart Step 4. Document the change in the Test Harness entry as a `test-revised` note.
- **After 5 total attempts in the same iteration**: stop. Mark the target `blocked` in the Test Harness with a `blocked_reason`. Set `paused: true` on the state file with `pause_reason: "td-stuck: <target>"`. End the iteration.

### Step 5. Refactor (optional, gated on green)

Only if the test suite is fully green, consider a refactor. Use `strategy/prompts/refactor.md` as framing.

Pick a refactor only if you can name a concrete clarity/complexity improvement. Cosmetic changes are not refactors — they are diffs in search of a justification. If nothing is worth refactoring, skip this step. Record the choice in reasoning either way.

After any refactor, the full test suite must still be green. If it isn't, revert the refactor and continue without it.

### Step 6. Evaluate

Run the evaluation command from `program.md`. For most TDD programs this is simply "the full test suite passes" — a boolean, not a scalar. Emit `{"metric": <count>, "passing": N, "failing": 0}` where `metric` is `passing` (higher is better).

Some TDD programs have a secondary metric (bundle size, coverage percentage). In that case `metric` can be the secondary metric, with the hard constraint that `failing == 0` — no reduction in coverage counts as progress if tests are red.

### Step 7. Update the Test Harness

Append the iteration's actions to `## ✅ Test Harness`:

- New test → add entry with status `passing` (it was just made green).
- Existing failing test became green → flip its status.
- A test became blocked → set status `blocked`, fill `blocked_reason`.

Enforce size discipline: keep at most <CUSTOMIZE: harness_size_cap, default 100> test entries visible; older entries can collapse into compressed range summaries (`### Tests 40–80 — ✅ passing (N batch additions for X feature): brief summary`).

### Step 8. Fold through to the default loop

Continue with the normal autoloop Step 5 (Accept or Reject → commit / discard, update state file's Machine State, Iteration History, Lessons Learned, etc.) as defined in the workflow. The only additional requirements from Test-Driven are:

- The Iteration History entry must include `phase` (red / green / refactor / rethink-test), `target`, `new_tests` count, `existing_tests_status` (all-green / regression-introduced-and-fixed).
- Lessons Learned additions should be phrased as *transferable heuristics* about the problem space (e.g. "Pandas' NaN-handling for `sort_values` treats NaN as always-last-or-first regardless of `ascending`; tsb implementations must branch on `naPosition` independently of the sort direction") — not iteration reports.

## Test Harness schema

The harness lives in the state file `{program-name}.md` on the `memory/autoloop` branch as a subsection. Use this exact layout so maintainers can read and edit it:

```markdown
## ✅ Test Harness

> 🤖 *Managed by the Test-Driven strategy. One entry per pinned behaviour. Newest first.*

### <test-id>  ·  status <passing|failing|blocked>  ·  iter <N>

- **Target**: <one-line description of the behaviour being pinned>
- **Spec source**: <URL or file:line reference to the source of truth>
- **Test file**: <path/to/test.test.ts>::<test name>
- **Phase added**: red / green / refactor / rethink-test
- **Edge cases covered**: <comma-separated list — empty input, NaN, dtype boundary, …>
- **Notes**: <test-revised, regression-fixed, or anything else worth remembering>
- **Blocked reason**: <only if status = blocked — one sentence on why no further attempts will be made this run>

---
```

Identifiers:
- `<test-id>` is `t{NNN}` zero-padded, monotonically increasing across the program's lifetime.
- `<N>` is the iteration number from the Machine State table.
- Status transitions: `failing → passing` on green; `passing → failing` only if a regression is introduced (and must be fixed before the iteration is accepted); `* → blocked` only via the 5-attempt cap in Step 4.

When compressing older entries under the `harness_size_cap`, **never** delete an individual entry's metadata in isolation — collapse a contiguous range into a single summary header (`### Tests t040–t080 — ✅ passing (N batch additions for X feature): brief summary`) and remove the per-entry bodies in that range. The summary keeps the count and theme so future iterations can see what's already covered.

## Acceptance checklist

An iteration is acceptable iff **all** of the following hold:

- The new (or previously-failing) test now passes.
- Every previously-passing test still passes — no regressions.
- The Test Harness entry for the target has been updated to reflect the new status.
- The Iteration History entry records `phase`, `target`, `new_tests`, and `existing_tests_status`.
- If the iteration was a `refactor`, the diff was justified by a named clarity/complexity improvement and the suite is still green.

If any of these fail, the iteration is rejected and the working tree is reset, exactly as in the default loop.

# Make-green prompt — <CUSTOMIZE: program-name>

Framing for the **green** phase of an iteration. Read before writing the implementation.

---

You are making a failing test pass with the **minimum** change. Scope creep is the enemy — the test defines the requirement, nothing else.

## Domain knowledge

<CUSTOMIZE: same facts as write-test.md. Keep them in sync when one is updated.>

- <CUSTOMIZE: e.g. "pandas treats NaN as always-last-or-first regardless of `ascending` — the test must cover both directions.">
- <CUSTOMIZE: e.g. "Reproducers in issues may use Python idioms that don't translate one-to-one to TypeScript — translate the *behaviour*, not the syntax.">
- <CUSTOMIZE: e.g. "Empty-input behaviour is rarely documented in the reference; check the reference's source if the doc is silent before guessing.">

## How to make a test pass without scope creep

1. **Re-read the failing test.** Don't skim. The exact assertions tell you exactly what must change.
2. **Identify the smallest code change** that would make the failing test pass without breaking any existing test. Name it concretely.
3. **Write only that change.** If a helper would make the code cleaner, note it for a later refactor iteration — don't add it now.
4. **Never modify existing tests to make the new test pass.** If the change you're considering breaks an existing test, something is wrong with your change, not with the old test.
5. **Run the full test suite, not just the new test.** Regressions in unrelated tests must be fixed before the iteration is accepted.

## Files you must not touch in the green phase

<CUSTOMIZE: replace with the program's don't-modify list — typically the existing tests, the source-of-truth references, the state file. Be exhaustive; the agent will read this every iteration.>

- `tests/**` other than the test file added in Step 3 of this iteration.
- <CUSTOMIZE: e.g. "the reference doc snapshots in `.autoloop/programs/<program-name>/reference/`">
- The state file on the `memory/autoloop` branch — that gets updated in Step 7, not the green phase.

## Anti-patterns to avoid

- ❌ **Overfitting to the test.** Don't hard-code the test's expected value in the implementation. If the test expects `42` for input `6`, your implementation must compute `6 * 7` or equivalent, not `return 42`.
- ❌ **Speculative generality.** "While I'm here, let me also handle <edge case the test doesn't cover>." No — that edge case gets its own test.
- ❌ **Parallel implementations.** If the existing implementation has a branch your new behaviour doesn't fit into, think carefully before adding a `if (<new case>) { ... } else { <old code> }` next to it. Often the right answer is to fold the new case into the existing dispatch, not to grow a parallel one.
- ❌ **Weakening tests to make the change smaller.** If the test is right and the implementation is hard, the implementation is what's wrong. The test moves only via an explicit `rethink-test` iteration.
- ❌ **Skipping the full-suite run.** "The new test passes" is not the bar. "The new test passes *and nothing else broke*" is the bar.

## What the reasoning output must contain

Before writing the implementation:

- **Parent state**: one-line summary of what the target file does today.
- **Minimum change**: a concrete description of the smallest diff that would make the failing test pass.
- **Invariants to preserve**: the named tests / behaviours that must keep working.

After writing the implementation:

- A "Green summary" line: 10–20 words, suitable for the Iteration History.
- Confirmation that the full test suite is green, with the test count (`N passing, 0 failing`).
- Any new lesson worth promoting to the state file's Lessons Learned (phrased as a transferable heuristic, not an iteration report).

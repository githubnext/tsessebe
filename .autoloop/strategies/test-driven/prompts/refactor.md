# Refactor prompt — <CUSTOMIZE: program-name>

Framing for the optional **refactor** phase of an iteration. Read only after the suite is fully green.

---

Refactoring is a *gated* step. You earn the right to refactor by getting to green with no regressions; you don't earn the right to refactor every iteration. If nothing is worth refactoring, skip this step and say so explicitly in the iteration's reasoning.

A refactor in Test-Driven has one rule that overrides everything else: **the test suite must remain green, with the same set of tests, before and after the refactor**. If the diff requires changing a test to stay green, it isn't a refactor — it's a behaviour change, and behaviour changes go through Step 3 (red), not Step 5.

## What counts as a refactor (vocabulary)

These are the moves available for this problem (<CUSTOMIZE: rewrite this list with 5–10 problem-specific refactors>):

- <CUSTOMIZE: e.g. "Extract a duplicated dtype-dispatch block into a single helper called from both call sites.">
- <CUSTOMIZE: e.g. "Replace a chained `if/else if` over dtype with a lookup table keyed on dtype.">
- <CUSTOMIZE: e.g. "Collapse two near-identical loop bodies (forward and reverse) into a single loop parameterised by direction.">
- <CUSTOMIZE: e.g. "Inline a one-call-site helper whose name no longer adds clarity.">
- <CUSTOMIZE: e.g. "Replace a hand-rolled `for` loop with the existing `iterRows` helper that already handles the edge case correctly.">
- <CUSTOMIZE: e.g. "Hoist a repeated property access out of a hot path into a local — only when there's a measured reason, otherwise it's noise.">

## What is *not* a refactor

These changes look like refactors but are not. The agent must reject them in this phase:

- ❌ **Renaming for taste.** `userID` → `userId` with no other change is a diff in search of a justification. Skip.
- ❌ **Reformatting.** Biome runs in CI; manual whitespace edits are noise.
- ❌ **Comment polish.** Improving a comment is fine, but it doesn't justify a refactor iteration on its own.
- ❌ **Reordering functions in a file** without changing call relationships.
- ❌ **Adding speculative abstractions.** "What if we needed three implementations of this someday?" → no, you don't, until you do.
- ❌ **Anything that changes behaviour.** If a test's assertion would change, this is a red-phase iteration, not a refactor.

## When to skip the refactor step entirely

Refactoring this iteration is the wrong call when:

- The previous iteration was also a refactor (give the codebase a beat).
- The file you'd touch was substantially rewritten *this* iteration in the green phase (it hasn't earned a refactor yet — let it sit through one or two more behavioural iterations first).
- The refactor would touch files outside the green-phase target, expanding the iteration's blast radius.
- You can't name a concrete clarity or complexity improvement in one sentence.

If any of these is true, write "skipping refactor: <reason>" in the reasoning and proceed to Step 6.

## Reasoning template

Before writing any refactor diff, fill in (in your visible reasoning):

1. **Move**: which refactor from the vocabulary above (or a novel one — describe it).
2. **Files touched**: the exact list. Refactor diffs that grow beyond the green-phase target need a strong reason.
3. **Improvement claimed**: one concrete sentence. "Removes the only remaining duplicated dispatch block, so a future dtype only needs to be added in one place." A vague "cleaner" or "more idiomatic" is not enough.
4. **Suite-stability claim**: which tests run, and the prediction that all of them stay green with no test edits.

After applying the refactor:

- Run the full test suite. **Same set of tests, same results — all green.**
- If anything went red, **revert the refactor** and continue without it. Don't try to "fix" a refactor by editing tests; that's the line that separates refactor from behaviour change.
- A "Refactor summary" line: 10–20 words, suitable for the Iteration History.

## Anti-patterns to avoid

- ❌ **Refactor + behaviour change in one diff.** If you change behaviour during a refactor, you can no longer tell which part broke a test. Split into separate iterations.
- ❌ **Editing a test to keep a refactor green.** Hard stop. Revert.
- ❌ **Sweeping cosmetic passes** dressed up as refactors. They are noise; CI lint catches the things that matter.
- ❌ **Refactors that touch unrelated modules.** A refactor whose blast radius exceeds the green-phase target needs its own justification — usually it should be its own iteration with no green-phase work.

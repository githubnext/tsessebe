# Adopting the Test-Driven strategy for a new program

This file is a **creator-time guide** — it is read by the maintainer (or a "create program" agent) **once**, when authoring a new program that wants to use Test-Driven. It is **not** copied into the program's `strategy/` directory and is **not** read by the iteration agent at runtime.

If you are an iteration agent and have somehow ended up here: stop, go back to `strategy/test-driven.md` in the program directory, and follow that.

## When to pick Test-Driven

Test-Driven is the right strategy when **all** of the following are true:

- The program is about **specifying behaviour**, not optimizing a metric. The question is "is this correct?", not "is this faster?".
- "Correct" can be expressed as **executable assertions** — unit tests, property tests, integration tests, repros — that run as part of CI.
- Iterations **accumulate**: each iteration pins one more behaviour (or fixes one more bug), and the work product grows monotonically. You're not searching for a single best artifact; you're building up a body of pinned behaviour.
- There exists a **source of truth** the agent can consult when ambiguity arises (a reference implementation, a spec document, an issue with a reproducer, etc.).

If the program is "make this faster" or "minimize this scalar", **do not use Test-Driven**. Use AlphaEvolve (`.autoloop/strategies/alphaevolve/`).

If the program is genuinely "do whatever the agent thinks is best", neither strategy fits — use the default loop.

### Canonical use cases

- **API porting** (e.g., the pandas → tsb migration): each iteration pins one method's behaviour from the reference and implements it. The Test Harness becomes the coverage map.
- **Bug fixing** (e.g., a future `tsb-bugfix` program): each iteration picks a bug from a label, writes the failing repro as a test, makes it green.
- **Spec-driven development**: each iteration pins one bullet from a spec document as a test, then implements it.

## Steps to adopt

1. Create `.autoloop/programs/<program-name>/` with the usual layout: a `program.md`, and any source-of-truth references the program needs (a `docs/` directory, a pinned spec, etc.).
2. Copy the strategy template into the program:

   ```bash
   mkdir -p .autoloop/programs/<program-name>/strategy/prompts
   cp .autoloop/strategies/test-driven/strategy.md \
      .autoloop/programs/<program-name>/strategy/test-driven.md
   cp .autoloop/strategies/test-driven/prompts/write-test.md \
      .autoloop/programs/<program-name>/strategy/prompts/write-test.md
   cp .autoloop/strategies/test-driven/prompts/make-green.md \
      .autoloop/programs/<program-name>/strategy/prompts/make-green.md
   cp .autoloop/strategies/test-driven/prompts/refactor.md \
      .autoloop/programs/<program-name>/strategy/prompts/refactor.md
   ```

3. Resolve every `<CUSTOMIZE: …>` marker in `strategy/test-driven.md` and the three prompt files. See the marker-by-marker guidance below.
4. Add the `## Evolution Strategy` pointer block to `program.md` (template below).
5. Sanity-check: `grep -R "<CUSTOMIZE" .autoloop/programs/<program-name>/strategy/` should return **nothing**.

## The pointer block for `program.md`

Replace (or add) `program.md`'s `## Evolution Strategy` section with exactly this:

```markdown
## Evolution Strategy

This program uses the **Test-Driven** strategy. On every iteration, read `strategy/test-driven.md` and follow it literally — it supersedes the generic analyze/accept/reject steps in the default autoloop loop.

Support files:
- `strategy/test-driven.md` — the runtime playbook (red → green → refactor loop, Test Harness rules).
- `strategy/prompts/write-test.md` — framing for the **red** phase: what makes a good failing test for this problem.
- `strategy/prompts/make-green.md` — framing for the **green** phase: minimum-change discipline.
- `strategy/prompts/refactor.md` — framing for the optional **refactor** phase, gated on a green suite.

Test Harness state lives in the state file on the `memory/autoloop` branch under the `## ✅ Test Harness` subsection (see the playbook for the schema).
```

## Marker-by-marker guidance

### `strategy.md` markers

- **`# Test-Driven Strategy — <CUSTOMIZE: program-name>`** — the program name as it appears in the file path.
- **`## Problem framing`** — 2–4 sentences. State the artifact under test, what "correct" means, and the source of truth. The agent reads this every iteration; make it dense and unambiguous about which reference wins on conflict.
- **Step 1 source-of-truth list** — name the *specific* references the agent should consult. Be concrete: not "pandas docs", but "pandas docs for the function currently in scope, plus the corresponding numpy doc when behaviour is delegated to numpy". Vague references mean the agent will skip them.
- **Step 2 sizing guidance** — the most important customization. Make it impossible to pick work too big to finish in one iteration. Examples:
  - API porting: "one method signature, with all overloads listed in the reference doc, but no more than one method per iteration."
  - Bug fixing: "one bug per iteration, identified by issue number; if the bug decomposes into sub-bugs, file new issues for the sub-bugs and pick one."
  - Spec-driven: "one MUST-bullet from the spec; SHOULD-bullets get separate iterations once all MUSTs are green."
- **`harness_size_cap`** — default 100 is fine for most programs. Lower it if your tests are large and the state file balloons; raise it only if you have a reason older entries should stay individually visible.

### `prompts/write-test.md` markers

This prompt frames the **red** phase. Customize:

- **Test framework setup** — the exact command to run a single test, the file naming convention, the import paths. The agent reads this every iteration; don't make it guess.
- **Domain knowledge** — anything about the source of truth that's easy to get wrong. (E.g. "pandas treats NaN as always-last-or-first regardless of `ascending`; the test must include both `ascending=True` and `ascending=False` with NaN to pin this." or "the issue's repro is in Python — translate carefully, NaN ≠ undefined.")
- **Anti-patterns** — failure modes you've seen the agent hit before in this program (over-specifying implementation details, asserting on internal data structures, snapshot tests of huge outputs).

### `prompts/make-green.md` markers

This prompt frames the **green** phase. Customize:

- **Minimum-change examples** — 2–3 worked examples of "this is the minimum change to make this test pass". Counter-examples are also helpful: "the agent was tempted to also handle <X>; that gets its own test."
- **Don't-modify list** — the files / tests / fixtures that the green phase must never touch in pursuit of a passing test (typically: existing tests, the source of truth, the state file).
- **Domain knowledge** — same facts as `write-test.md`. Keep the two files in sync when one is updated; the agent reads both every iteration.

### `prompts/refactor.md` markers

This prompt frames the optional **refactor** phase. Customize:

- **Refactor vocabulary** — 5–10 concrete refactoring moves that make sense for this program (extract helper, collapse duplicate dispatch, replace `switch` with table). Acts as a menu the agent samples from.
- **What's not a refactor** — explicit list of cosmetic-only changes the agent must reject as "not a refactor" (renaming for taste, formatting, comment polish).
- **Stop conditions** — when the agent should *not* attempt a refactor this iteration (suite is green but only just; the previous iteration was also a refactor; the file was rewritten substantially this iteration).

## A tiny worked example

Suppose you are creating `tsb-bugfix` to chew through bugs filed against tsb.

- Source of truth per iteration: the issue body and any reproducer in it.
- Sizing: one issue per iteration. If an issue has multiple unrelated repros, the agent files sub-issues and picks one.
- Test-writing convention: each repro becomes a `tests/regressions/issue-<NNN>.test.ts` file, named after the issue number, with the issue link in a top-of-file comment.
- Acceptance: the new regression test passes; the full suite is still green; the issue can be closed by referencing the merged commit.

That's the kind of fill-in to aim for — the agent should never have to guess the convention, the source of truth, or the size of the work.

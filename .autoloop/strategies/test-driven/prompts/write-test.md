# Write-test prompt — <CUSTOMIZE: program-name>

Framing for the **red** phase of an iteration. Read before writing the failing test.

---

You are pinning one behaviour as an executable assertion. The test you write will outlive this iteration and is the contract every future implementation must satisfy. Treat it as a spec, not as scratch work.

## Domain knowledge

Things you, the agent, should keep in mind about this specific problem space (<CUSTOMIZE: replace with 5–20 short bullets — semantics of the source-of-truth that are easy to miss, common pitfalls when translating reference behaviour into tests, dtype/encoding gotchas, etc.>):

- <CUSTOMIZE: e.g. "pandas treats NaN as always-last-or-first regardless of `ascending` — the test must cover both directions.">
- <CUSTOMIZE: e.g. "Reproducers in issues may use Python idioms that don't translate one-to-one to TypeScript — translate the *behaviour*, not the syntax.">
- <CUSTOMIZE: e.g. "Empty-input behaviour is rarely documented in the reference; check the reference's source if the doc is silent before guessing.">
- <CUSTOMIZE: e.g. "Floating-point comparisons in tests must use a tolerance, not `===`. Pick the tolerance from the reference's documented precision when available.">

## Test framework setup

<CUSTOMIZE: spell out the exact test framework and conventions for this program — the import line for the runner, the file naming convention, the path to put new tests under, the command to run a single test. A concrete fenced code block here is more useful than prose. Example shape:>

```
<CUSTOMIZE: a fenced code block in the program's language showing the imports,
the describe/it (or equivalent) skeleton, and a one-line comment pointing to
the exact public-API entry point the test should import from.>
```

Run a single test with: <CUSTOMIZE: e.g. `bun test tests/path/to/file.test.ts`>.

## What makes a good failing test for this problem

- **One behaviour per test.** If you find yourself writing more than one assertion that exercises a different code path, split into multiple `it(...)` blocks.
- **Sourced from the reference, not from intuition.** The expected values in the test must be traceable to the source of truth — quote the reference (URL, line number, example output) in a comment above the test if it isn't obvious.
- **Cover the named edge cases.** The playbook listed the edge cases you decided this test must include — none of them are optional. If you cut one, justify it in the Test Harness `Notes` field.
- **Doesn't couple to implementation details.** Assert on the observable result, not on the data structure used internally. A test that breaks when the implementation switches from `Map` to `Object` is testing the wrong thing.
- **Fails for the right reason on first run.** Run the test before writing any implementation. The failure must read as "this behaviour is missing" or "this behaviour is wrong in *this specific way*", not "Cannot read property X of undefined" or "module not found". A confusing first-failure message will mislead future you.
- **Would still pass under a reasonable refactor.** If renaming an internal helper would break the test, the test is too coupled. Refactor the test before going to green.

## Validity checklist

Before declaring the test done and moving to Step 4 (green), confirm:

- The test is in the right file (per the framework setup above).
- The test imports from the public API surface (`tsb`, not deep `src/...` paths) unless the program explicitly says otherwise.
- Running the test produces **one clear failure message** — not a parse error, not a compile error, not a stack trace from uninitialized state. The failure should read to a human as "this behaviour is missing" or "this behaviour is wrong in this specific way."
- The failure message names the expected vs. actual value in a form a future contributor can act on.
- The test would *still pass* under a reasonable future refactor of the implementation (no implementation-detail coupling).

## What the reasoning output must contain

Before writing the test:

- **Target**: what behaviour are you pinning?
- **Spec source**: where does the desired behaviour come from? URL / reference.
- **Edge cases included**: list the specific cases this test covers.
- **Edge cases intentionally excluded**: list what this test *doesn't* cover and why (separate tests, out of scope, etc.).

After writing the test:

- A "Red summary" line: 10–20 words, suitable for the Test Harness and Iteration History.
- The concrete failure message observed when the test runs.

## Anti-patterns to avoid

- ❌ **Testing the implementation, not the behaviour.** "Calls `_sortInternal` with these args" is not a behavioural test.
- ❌ **Snapshot tests of huge outputs.** A snapshot of a 10k-row table makes regression triage impossible. Snapshot a *summary* (length, dtype, first/last N rows) instead.
- ❌ **Asserting on error message strings verbatim.** Error wording changes; the *type* of error and the *fact* that it was thrown rarely do.
- ❌ **Tests that depend on each other.** Each `it(...)` must run in isolation. No shared mutable fixtures.
- ❌ **Skipping the run-and-confirm-it-fails step.** A test that has never been seen to fail is not yet a test.

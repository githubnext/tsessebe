---
description: |
  An iterative optimization loop inspired by Karpathy's Autoresearch and Claude Code's /loop.
  Runs on a configurable schedule to autonomously improve a target artifact toward a measurable goal.
  Each iteration: reads the program definition, proposes a change, evaluates against a metric,
  and accepts or rejects the change. Tracks all iterations in a rolling GitHub issue.
  - User defines the optimization goal and evaluation criteria in a program.md file
  - Accepts changes only when they improve the metric (ratchet pattern)
  - Persists all state via repo-memory (human-readable, human-editable)
  - Commits accepted improvements to a long-running branch per program
  - Maintains a single draft PR per program that accumulates all accepted iterations
  - Maintains a single GitHub issue per program where all status, iteration logs, and human steering live

on:
  schedule: every 30m
  workflow_dispatch:
    inputs:
      program:
        description: "Run a specific program by name (bypasses scheduling)"
        required: false
        type: string
  slash_command:
    name: autoloop

permissions: read-all

timeout-minutes: 360

network:
  allowed:
  - defaults
  - node
  - python
  - rust
  - java
  - dotnet

safe-outputs:
  add-comment:
    max: 7
    target: "*"
    hide-older-comments: false
  create-pull-request:
    draft: true
    title-prefix: "[Autoloop] "
    labels: [automation, autoloop]
    protected-files: fallback-to-issue
    preserve-branch-name: true
    max: 1
  push-to-pull-request-branch:
    target: "*"
    title-prefix: "[Autoloop] "
    max: 1
  create-issue:
    title-prefix: "[Autoloop] "
    labels: [automation, autoloop]
    max: 2
  update-issue:
    target: "*"
    title-prefix: "[Autoloop] "
    max: 3
  add-labels:
    target: "*"
    max: 2
  remove-labels:
    target: "*"
    max: 2

checkout:
  fetch: ["*"]
  fetch-depth: 0

tools:
  web-fetch:
  github:
    toolsets: [all]
  bash: true
  repo-memory:
    branch-name: memory/autoloop
    file-glob: ["*.md"]
    max-file-size: 30720

imports:
  - shared/reporting.md

steps:
  - name: Clone repo-memory for scheduler
    # The "Check which programs are due" step below reads program state from
    # /tmp/gh-aw/repo-memory/autoloop/, but gh-aw's built-in repo-memory clone
    # runs *after* this pre-step (and clones to a different directory). Without
    # this step, every program looks like a "first run" and the tiebreaker
    # starves programs that lose the original-insertion-order tiebreak.
    # See issue: "Autoloop pre-step can't read state files".
    env:
      GITHUB_TOKEN: ${{ github.token }}
      GITHUB_REPOSITORY: ${{ github.repository }}
    run: |
      mkdir -p /tmp/gh-aw/repo-memory
      if [ -d /tmp/gh-aw/repo-memory/autoloop/.git ]; then
        echo "repo-memory/autoloop already cloned; skipping"
      else
        # Pass the token via an http.extraHeader rather than embedding it in the
        # URL — keeps it out of process listings and any logged remote URLs.
        AUTH_HEADER="Authorization: Basic $(printf 'x-access-token:%s' "${GITHUB_TOKEN}" | base64 -w0)"
        git -c "http.extraHeader=${AUTH_HEADER}" clone --depth=1 --branch memory/autoloop \
          "https://github.com/${GITHUB_REPOSITORY}.git" \
          /tmp/gh-aw/repo-memory/autoloop \
          || {
            echo "memory/autoloop branch not found (first run); creating empty dir"
            mkdir -p /tmp/gh-aw/repo-memory/autoloop
          }
      fi

  - name: Check which programs are due
    env:
      GITHUB_TOKEN: ${{ github.token }}
      GITHUB_REPOSITORY: ${{ github.repository }}
      AUTOLOOP_PROGRAM: ${{ github.event.inputs.program }}
    run: |
      python3 .github/workflows/scripts/autoloop_scheduler.py

source: githubnext/autoloop
engine: copilot

features:
  copilot-requests: true
---

# Autoloop

An iterative optimization agent that proposes changes, evaluates them against a metric, and keeps only improvements — running autonomously on a schedule.

## Command Mode

Take heed of **instructions**: "${{ steps.sanitized.outputs.text }}"

If these are non-empty (not ""), then you have been triggered via `/autoloop <instructions>`. The instructions may be:
- **A one-off directive targeting a specific program**: e.g., `/autoloop training: try a different approach to the loss function`. The text before the colon is the program name (matching a directory in `.autoloop/programs/` or an issue with the `autoloop-program` label). Execute it as a single iteration for that program, then report results.
- **A general directive**: e.g., `/autoloop try cosine annealing`. If no program name prefix is given and only one program exists, use that one. If multiple exist, ask which program to target.
- **A configuration change**: e.g., `/autoloop training: set metric to accuracy instead of loss`. Update the relevant program file and confirm.

Then exit — do not run the normal loop after completing the instructions.

## Program Locations

Autoloop supports three program layouts:

### Directory-based programs (preferred)

Each program is a directory under `.autoloop/programs/` containing a `program.md` and all related code:

```
.autoloop/programs/
├── function_minimization/
│   ├── program.md         ← program definition (goal, target, evaluation)
│   └── code/              ← code files the agent optimizes
│       ├── initial_program.py
│       ├── evaluator.py
│       ├── config.yaml
│       └── requirements.txt
├── signal_processing/
│   ├── program.md
│   └── code/
│       ├── initial_program.py
│       ├── evaluator.py
│       ├── config.yaml
│       └── requirements.txt
```

The **program name** is the directory name (e.g., `function_minimization`).

### Bare markdown programs (simple/legacy)

For simpler programs that don't need their own code directory:

```
.autoloop/programs/
├── coverage.md
└── build-perf.md
```

The **program name** is the filename without `.md`.

### Issue-based programs

Programs can also be defined as GitHub issues with the `autoloop-program` label. The issue body uses the same format as a `program.md` file (with Goal, Target, and Evaluation sections). The **program name** is derived from the issue title (slugified to lowercase with hyphens).

The pre-step fetches open issues with the `autoloop-program` label via the GitHub API and writes each issue body to a temporary file for scheduling. Issue-based programs participate in the same scheduling and selection logic as file-based programs.

When a program is issue-based, `/tmp/gh-aw/autoloop.json` includes:
- **`selected_issue`**: The issue number (e.g., `42`) if the selected program came from an issue, or `null` if it came from a file.
- **`issue_programs`**: A mapping of program name → issue number for all issue-based programs found.

### Reading Programs

The pre-step has already determined which program to run. Read `/tmp/gh-aw/autoloop.json` at the start of your run to get:

- **`selected`**: The single program name to run this iteration, or `null` if none are due.
- **`selected_file`**: The full path to the program's markdown file (either `.autoloop/programs/<name>/program.md`, `.autoloop/programs/<name>.md`, or `/tmp/gh-aw/issue-programs/<name>.md` for issue-based programs).
- **`selected_issue`**: The GitHub issue number if the selected program came from an issue, or `null` if it came from a file.
- **`selected_target_metric`**: The `target-metric` value from the program's frontmatter (a number), or `null` if the program is open-ended. Used to check the [halting condition](#halting-condition) after each accepted iteration.
- **`existing_pr`**: The PR number (e.g., `42`) of an already-open PR for this program's branch, or `null` if no open PR exists. **If this is not null, you MUST use `push-to-pull-request-branch` to push to this PR — do NOT call `create-pull-request`.**
- **`head_branch`**: The canonical branch name for this program (e.g., `autoloop/coverage`). Always use this exact branch name — never append suffixes.
- **`issue_programs`**: A mapping of program name → issue number for all discovered issue-based programs.
- **`deferred`**: Other programs that were due but will be handled in future runs.
- **`unconfigured`**: Programs that still have the sentinel or placeholder content.
- **`skipped`**: Programs not due yet based on their per-program schedule.
- **`no_programs`**: If `true`, no program files exist at all.

If `selected` is not null:
1. Read the program file from the `selected_file` path.
2. Parse the three sections: Goal, Target, Evaluation.
3. Read the current state of all target files.
4. Read the state file `{selected}.md` from the repo-memory folder for all state: the ⚙️ Machine State table (scheduling fields) plus the research sections (priorities, lessons, foreclosed avenues, iteration history).
5. `selected_issue` is the program issue number (auto-created for file-based programs, or the source issue for issue-based programs). Read its comments for any human steering input.
6. **Check `existing_pr`**: if it is not null, a PR already exists — use `push-to-pull-request-branch` to push commits to it. Only call `create-pull-request` when `existing_pr` is null.

## Multiple Programs

Autoloop supports **multiple independent optimization loops** in the same repository. Each loop is defined by a directory in `.autoloop/programs/`, a markdown file in `.autoloop/programs/`, or a GitHub issue with the `autoloop-program` label. For example:

```
.autoloop/programs/
├── function_minimization/    ← optimize search algorithm
│   ├── program.md
│   └── code/
├── signal_processing/        ← optimize signal filter
│   ├── program.md
│   └── code/
├── coverage.md               ← maximize test coverage
└── build-perf.md             ← minimize build time

GitHub Issues (labeled 'autoloop-program'):
├── Issue #5: "Reduce Latency" ← optimize API response time
└── Issue #8: "Improve Accuracy" ← optimize model accuracy
```

Each program runs independently with its own:
- Goal, target files, and evaluation command
- Metric tracking and best-metric history
- Program issue: `[Autoloop: {program-name}]` — single GitHub issue (labeled `autoloop-program`) where status, iteration log, and human steering all live
- Long-running branch: `autoloop/{program-name}` (persists across iterations)
- Single draft PR per program: `[Autoloop: {program-name}]` (accumulates all accepted iterations)
- State file: `{program-name}.md` in repo-memory (all state: scheduling, research context, iteration history)

**One program per run**: On each scheduled trigger, a lightweight pre-step checks which programs are due and selects the **single most-overdue program** (oldest `last_run`, with never-run programs first). The agent runs one iteration for that program only.

### Per-Program Schedule

Programs can optionally specify their own schedule in a YAML frontmatter block:

```markdown
---
schedule: every 1h
---

# Autoloop Program
...
```

### Target Metric (Halting Condition)

Programs can optionally specify a `target-metric` in the frontmatter to define a halting condition. When the metric reaches or surpasses the target, the program is automatically **completed**: the `autoloop-program` label is removed and an `autoloop-completed` label is added (for issue-based programs), and the state file is marked `Completed: true`.

Programs without a `target-metric` are **open-ended** and run indefinitely until manually stopped.

```markdown
---
schedule: every 6h
target-metric: 0.95
---

# Autoloop Program
...
```

## Program Definition

Each program file defines three things:

1. **Goal**: What the agent is trying to optimize (natural language description)
2. **Target**: Which files the agent is allowed to modify
3. **Evaluation**: How to measure whether a change is an improvement

### Setup Guard

A template program file is installed at `.autoloop/programs/example.md`. **Programs will not run until the user has edited them.** Each template contains a sentinel line:

```
<!-- AUTOLOOP:UNCONFIGURED -->
```

At the start of every run, check each program file for this sentinel. For any program where it is present:

1. **Skip that program — do not run any iterations for it.**
2. If no setup issue exists for that program, create one titled `[Autoloop: {program-name}] Action required: configure your program`.

## Branching Model

Each program uses a **single long-running branch** named `autoloop/{program-name}`. This branch persists across iterations — every accepted improvement is committed to it, building up a history of successful changes.

### Branch Naming Convention

```
autoloop/{program-name}
```

Examples:
- `autoloop/function_minimization`
- `autoloop/signal_processing`
- `autoloop/coverage`

> ⚠️ **CRITICAL — Branch Name Must Be Exact**
>
> The branch name is ALWAYS exactly `autoloop/{program-name}` — **no suffixes, no hashes, no run IDs, no iteration numbers, no random tokens**. Never create branches like:
> - ❌ `autoloop/coverage-abc123`
> - ❌ `autoloop/coverage-iter42-deadbeef`
> - ❌ `autoloop/coverage-1234567890`
>
> Always use the exact canonical name, for example `autoloop/coverage`. If you are implementing a program named `build-tsb-pandas-typescript-migration`, the branch is always `autoloop/build-tsb-pandas-typescript-migration` — nothing more.
>
> **Never let the gh-aw framework auto-generate a branch name.** You must explicitly name the branch when creating it.

### How It Works

1. On the **first accepted iteration**, the branch is created from the default branch using `git checkout -b autoloop/{program-name}`.
2. On **subsequent iterations**, the agent checks out the existing branch and ensures it is up to date with the default branch (by merging the default branch into it).
3. **Accepted iterations** are committed and pushed to the branch. Each commit message references the GitHub Actions run URL.
4. **Rejected or errored iterations** do not commit — changes are discarded.
5. A **single draft PR** is created for the branch on the first accepted iteration. Future accepted iterations push additional commits to the same PR — **never create a new PR if one already exists**.
6. The branch may be **merged into the default branch** at any time (by a maintainer or CI). After merging, the branch continues to be used for future iterations — it is never deleted while the program is active.
7. A **sync workflow** automatically merges the default branch into all active `autoloop/*` branches whenever the default branch changes, keeping them up to date.

### Cross-Linking

Each program has three coordinated resources:
- **Branch + PR**: `autoloop/{program-name}` with a single draft PR
- **Program Issue**: `[Autoloop: {program-name}]` — single GitHub issue (labeled `autoloop-program`) that hosts the status comment, every per-iteration comment, and human steering comments
- **State File**: `{program-name}.md` in repo-memory — all state, history, and research context

All three reference each other. For file-based programs, the program issue is auto-created on the first run if it does not already exist. For issue-based programs, the source issue itself is the program issue.

## Iteration Loop

Each run executes **one iteration for the single selected program**:

### Step 1: Read State

1. Read the program file to understand the goal, targets, and evaluation method.
2. Read the **state file** `{program-name}.md` from the repo-memory folder. This is the **single source of truth** for all program state. The file contains:
   - **⚙️ Machine State** table: `last_run`, `best_metric`, `target_metric`, `iteration_count`, `paused`, `pause_reason`, `completed`, `completed_reason`, `consecutive_errors`, `recent_statuses`. These are machine-readable scheduling and control fields visible to both humans and the pre-step.
   - **🎯 Current Priorities**: Human-set guidance for the next iterations (editable by maintainers).
   - **📚 Lessons Learned**: Key findings from past iterations.
   - **🚧 Foreclosed Avenues**: Approaches definitively ruled out, with reasons.
   - **🔭 Future Directions**: Promising ideas not yet tried.
   - **📊 Iteration History**: Reverse-chronological log of all past iterations.
   
   If the state file does not yet exist, create it in the repo-memory folder using the template defined in the [Repo Memory](#repo-memory) section.

3. Note the `existing_pr` field from `/tmp/gh-aw/autoloop.json`. If it is not null, that is the **existing draft PR** for this program — you must push to it using `push-to-pull-request-branch`, not create a new one. Also check the `PR` field from the Machine State table as a fallback.

### Step 2: Analyze and Propose

1. Read the target files and understand the current state.
2. Review the state file's **Lessons Learned**, **Foreclosed Avenues**, and **Current Priorities** — what worked, what didn't, and what the maintainer wants.
3. **Think carefully** about what change is most likely to improve the metric. Consider:
   - What has been tried before and ruled out (Foreclosed Avenues — don't repeat failures).
   - What the Current Priorities section asks for.
   - What the evaluation criteria reward.
   - Small, targeted changes are more likely to succeed than large rewrites.
   - If many small optimizations have been exhausted, consider a larger architectural change.
4. Describe the proposed change in your reasoning before implementing it.

### Step 3: Implement

1. Check out the program's long-running branch. The branch name is **exactly** `autoloop/{program-name}` — never with a suffix. For example:
   - Program `coverage` → branch `autoloop/coverage`
   - Program `build-tsb-pandas-typescript-migration` → branch `autoloop/build-tsb-pandas-typescript-migration`

   ```bash
   git fetch origin
   if git ls-remote --exit-code origin autoloop/{program-name}; then
     # Branch exists — check it out and merge the default branch
     git checkout -b autoloop/{program-name} origin/autoloop/{program-name}
     git merge origin/main --no-edit -m "Merge main into autoloop/{program-name}"
   else
     # Branch does not exist — create it from the default branch
     git checkout -b autoloop/{program-name} origin/main
   fi
   ```

2. Make the proposed changes to the target files only.
3. **Respect the program constraints**: do not modify files outside the target list.

### Step 4: Evaluate

1. Run the evaluation command specified in the program file.
2. Parse the metric from the output.
3. Compare against `best_metric` from the state file.

### Step 5: Accept or Reject

**If the metric improved** (or this is the first run establishing a baseline):
1. Commit the changes to the long-running branch `autoloop/{program-name}` with a commit message referencing the actions run:
   - Commit message subject line: `[Autoloop: {program-name}] Iteration <N>: <short description>`
   - Commit message body (after a blank line): `Run: {run_url}` referencing the GitHub Actions run URL.
2. Push the commit to the long-running branch `autoloop/{program-name}`.
3. **Find the existing PR or create one** — follow these steps in order:
   a. **First, check `existing_pr` from `/tmp/gh-aw/autoloop.json`.** The pre-step has already looked up the open PR for this program. If `existing_pr` is not null, that is the existing draft PR — skip to step (c).
   b. If `existing_pr` is null, also check the `PR` field in the state file's **⚙️ Machine State** table as a fallback. If it contains a PR number (e.g., `#42`), verify it is still open via the GitHub API.
   c. **If an existing PR is found** (from step a or b): use `push-to-pull-request-branch` to push additional commits to the existing PR. Update the PR body with the latest metric and a summary of the most recent accepted iteration. Add a comment to the PR summarizing the iteration: what changed, old metric, new metric, improvement delta, and a link to the actions run. **Do NOT call `create-pull-request`.**
   d. **If NO PR exists** for `autoloop/{program-name}` (both `existing_pr` is null AND the state file has no PR): create one using `create-pull-request`:
      - Branch: `autoloop/{program-name}` (the branch you already created in Step 3 — do NOT let the framework auto-generate a branch name)
      - Title: `[Autoloop: {program-name}]`
      - Body includes: a summary of the program goal, link to the program issue (#{selected_issue}), the current best metric, and AI disclosure: `🤖 *This PR is maintained by Autoloop. Each accepted iteration adds a commit to this branch.*`

   > ⚠️ **Never create a new PR if one already exists for `autoloop/{program-name}`.** Each program must have exactly one draft PR at any time. The pre-step provides `existing_pr` in autoloop.json — always check it first. Only call `create-pull-request` when `existing_pr` is null AND the state file has no PR number.
4. **Update the program issue** (see [Program Issue](#program-issue) below): edit the status comment in place and post a new per-iteration comment summarizing what changed, the metric delta, and links to the commit / actions run / PR.
5. Update the state file `{program-name}.md` in the repo-memory folder:
   - Update the **⚙️ Machine State** table: reset `consecutive_errors` to 0, set `best_metric`, increment `iteration_count`, set `last_run` to current UTC timestamp, append `"accepted"` to `recent_statuses` (keep last 10), set `paused` to false.
   - Prepend an entry to **📊 Iteration History** (newest first) with status ✅, metric, PR link, and a one-line summary of what changed and why it worked.
   - Update **📚 Lessons Learned** if this iteration revealed something new about the problem or what works.
   - Update **🔭 Future Directions** if this iteration opened new promising paths.
6. **Check halting condition** (see [Halting Condition](#halting-condition)): If the program has a `target-metric` in its frontmatter and the new `best_metric` meets or surpasses the target, mark the program as completed.

**If the metric did not improve**:
1. Discard the code changes (do not commit them to the long-running branch).
2. **Update the program issue**: edit the status comment in place and post a new per-iteration comment with status ❌, the metric, and a one-line summary of what was tried.
3. Update the state file `{program-name}.md` in the repo-memory folder:
   - Update the **⚙️ Machine State** table: increment `iteration_count`, set `last_run`, append `"rejected"` to `recent_statuses` (keep last 10).
   - Prepend an entry to **📊 Iteration History** with status ❌, metric, and a one-line summary of what was tried.
   - If this approach is conclusively ruled out (e.g., tried multiple variations and all fail), add it to **🚧 Foreclosed Avenues** with a clear explanation.
   - Update **🔭 Future Directions** if this rejection clarified what to try next.

**If evaluation could not run** (build failure, missing dependencies, etc.):
1. Discard the code changes (do not commit them to the long-running branch).
2. **Update the program issue**: edit the status comment in place and post a new per-iteration comment with status ⚠️ and a brief description of the error.
3. Update the state file `{program-name}.md` in the repo-memory folder:
   - Update the **⚙️ Machine State** table: increment `consecutive_errors`, increment `iteration_count`, set `last_run`, append `"error"` to `recent_statuses` (keep last 10).
   - If `consecutive_errors` reaches 3+, set `paused` to `true` and set `pause_reason` in the Machine State table, and create an issue describing the problem.
   - Prepend an entry to **📊 Iteration History** with status ⚠️ and a brief error description.

## Program Issue

Each program has **exactly one** open GitHub issue (labeled `autoloop-program`) titled `[Autoloop: {program-name}]`. This single issue is the source of truth for the program — it hosts:

- The **status comment** (the earliest bot comment, edited in place each iteration) — a dashboard of current state.
- A **per-iteration comment** for every iteration (accepted, rejected, or error) — the rolling log.
- **Human steering comments** — plain-prose comments from maintainers, treated by the agent as directives.

There are no separate "steering" or "experiment log" issues — they have all been collapsed into this one issue.

### Auto-creation for File-Based Programs

If `selected_issue` is `null` in `/tmp/gh-aw/autoloop.json`, the program is file-based **and** has no program issue yet. On the first run, create one with `create-issue`:

- **Title**: `[Autoloop: {program-name}]`
- **Labels**: `autoloop-program`, `automation`, `autoloop`
- **Body**: the contents of the program file (so humans can read the goal/target/evaluation directly on the issue), prefixed with `🤖 *Autoloop program issue for `{program-name}`. The program definition below is mirrored from [`{selected_file}`]({link-to-file}). Edit the file to update the definition; comment on this issue to steer the agent.*`

After creation, record the issue number in the state file's **⚙️ Machine State** table (`Issue` field) and use it for all subsequent comments and updates this run. On subsequent runs, the pre-step will discover the issue by title and supply it as `selected_issue`.

For **issue-based programs**, the source issue **is** the program issue — do not create a new one. The source issue body is the program definition; do not modify it (the user owns it).

### Status Comment

On the **first run** that has access to the program issue, post a status comment. On **every subsequent iteration**, edit that same comment in place — never post a new one. The status comment is always the earliest bot comment containing the sentinel `<!-- AUTOLOOP:STATUS -->`. If multiple comments contain this sentinel, use the earliest one (lowest comment ID) and ignore the others.

**Status comment format:**

```markdown
<!-- AUTOLOOP:STATUS -->
🤖 **Autoloop Status**

| | |
|---|---|
| **Status** | 🟢 Active / ⏸️ Paused / ⚠️ Error / ✅ Completed |
| **Best Metric** | {best_metric} |
| **Target Metric** | {target_metric or "— (open-ended)"} |
| **Iterations** | {iteration_count} |
| **Last Run** | [{YYYY-MM-DD HH:MM UTC}]({run_url}) |
| **Branch** | [`autoloop/{program-name}`](https://github.com/{owner}/{repo}/tree/autoloop/{program-name}) |
| **Pull Request** | #{pr_number} |
| **State File** | [`{program-name}.md`](https://github.com/{owner}/{repo}/blob/memory/autoloop/{program-name}.md) |

### Summary

{2-3 sentence summary of current state: what has been accomplished so far, what the current best approach is, and what direction the next iteration will likely take.}
```

### Per-Iteration Comment

After **every iteration** (accepted, rejected, or error), post a **new comment** on the program issue:

```markdown
🤖 **Iteration {N}** — [{status_emoji} {status}]({run_url})

- **Change**: {one-line description of what was tried}
- **Metric**: {value} (best: {best_metric}, delta: {+/-delta})
- **Commit**: {short_sha} *(if accepted)*
- **PR**: #{pr_number} *(if accepted)*
- **Result**: {one-sentence summary of what this iteration revealed}
```

This is the rolling iteration log — there is no separate experiment-log issue, no monthly rollover, and no continuation issue. A single rolling issue can comfortably hold thousands of comments; if it grows uncomfortably large, collapse older iteration comments into a pinned summary comment rather than splitting issues.

### Steering via Issue Comments

**Human comments on the program issue act as steering input** (in addition to the state file's Current Priorities section). Before proposing a change, read all human (non-bot) comments on the program issue and treat them as directives — similar to how the Current Priorities section works in the state file.

### Program Issue Rules

- Exactly **one open program issue per program**, labeled `autoloop-program`.
- For issue-based programs, the source issue body IS the program definition — do not modify it (the user owns it).
- For file-based programs, the auto-created issue body mirrors the program file at creation time; the program file remains the source of truth for the definition.
- The `autoloop-program` label must remain on the issue for the program to be discovered. When a program completes (target metric reached), the label is removed automatically and replaced with `autoloop-completed`.
- Closing the issue stops the program from being discovered (equivalent to deleting a program.md file).
- Do **not** create separate "Steering" or "Experiment Log" issues — they have been deprecated. All status, iteration logs, and steering live on the single program issue.
- Do NOT close the program issue when the PR is merged — the branch continues to accumulate future iterations.

## Halting Condition

Programs can be **open-ended** (run indefinitely until manually stopped) or **goal-oriented** (run until a target metric is reached). This is controlled by the optional `target-metric` frontmatter field.

### How It Works

1. Parse the `target-metric` value from the program's YAML frontmatter (if present).
2. After each **accepted** iteration, compare the new `best_metric` against the `target-metric`.
3. Determine whether the target is met based on the metric direction:
   - If the program says "**higher is better**": the target is met when `best_metric >= target-metric`.
   - If the program says "**lower is better**": the target is met when `best_metric <= target-metric`.
4. When the target is met, **complete** the program:
   - Set `Completed` to `true` in the state file's **⚙️ Machine State** table.
   - Set `Completed Reason` to a human-readable message (e.g., `target metric 0.95 reached with value 0.97`).
   - **On the program issue** (`selected_issue`):
     - Remove the `autoloop-program` label.
     - Add the `autoloop-completed` label.
     - Update the status comment to show ✅ Completed status.
     - Post a per-iteration comment celebrating the achievement: `🎉 **Target metric reached!** The program has achieved its goal.`
   - The program will not be selected for future runs (the pre-step skips completed programs).

### Example

```markdown
---
schedule: every 6h
target-metric: 0.95
---

# Improve Test Coverage

## Goal

Increase test coverage to at least 95%. **Higher is better.**

## Target

Only modify these files:
- `src/tests/**`

## Evaluation

```bash
npm run coverage -- --json
```

The metric is `coverage_pct`. **Higher is better.**
```

In this example, once `coverage_pct` reaches or exceeds `0.95`, the program completes automatically.

### Programs Without a Target Metric

Programs that omit `target-metric` are **open-ended** — they run indefinitely, always seeking further improvement. They can only be stopped by:
- Closing the issue (issue-based programs)
- Deleting or removing the program file
- Setting `Paused: true` in the state file
- Auto-pause from plateau (5 consecutive rejections) or errors (3 consecutive failures)

## State and Memory

Autoloop uses the gh-aw **repo-memory** tool for persistent state storage. Each program's state is stored as a markdown file (`{program-name}.md`) on the `memory/autoloop` branch, automatically managed by the repo-memory infrastructure.

This means:
- Maintainers can see **everything** in the state file on the `memory/autoloop` branch: current best metric, last run, iteration history, lessons, priorities — all in one place.
- Maintainers can **edit any section** of the state file to set priorities, give feedback, or flag foreclosed approaches.
- The pre-step reads state files from the repo-memory directory to determine scheduling.
- The agent reads and writes state files in the repo-memory folder; changes are automatically committed and pushed after the workflow completes.

### Per-Program State File

Each program has a state file at `{program-name}.md` in the repo-memory folder. This file is divided into two logical areas:

1. **⚙️ Machine State** — a structured table at the top of the file that the pre-step can parse and the agent must keep updated after every iteration.
2. **Research sections** — human-editable sections: 🎯 Current Priorities, 📚 Lessons Learned, 🚧 Foreclosed Avenues, 🔭 Future Directions, 📊 Iteration History.

**After every iteration** (accepted, rejected, or error), update the state file — both the Machine State table and the relevant research sections.

See the [Repo Memory](#repo-memory) section for the full file structure, templates, and update rules.

## Repo Memory

Autoloop uses the gh-aw `repo-memory` tool with branch `memory/autoloop` and file glob `*.md`. Each program's state is stored as `{program-name}.md` in the repo-memory folder.

### Per-Program State File

When creating or updating a program's state file in the repo-memory folder, use this structure:

```markdown
# Autoloop: {program-name}

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | — |
| Iteration Count | 0 |
| Best Metric | — |
| Target Metric | — |
| Branch | `autoloop/{program-name}` |
| PR | — |
| Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | — |

---

## 📋 Program Info

**Goal**: {one-line summary from program.md}
**Metric**: {metric-name} ({higher/lower} is better)
**Branch**: [`autoloop/{program-name}`](../../tree/autoloop/{program-name})
**Pull Request**: #{pr_number}
**Issue**: #{program_issue_number}

---

## 🎯 Current Priorities

<!-- Maintainers: edit this section to guide the next iterations. The agent will read and follow these priorities. -->

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

Key findings and insights accumulated over iterations. Updated by the agent when an iteration reveals something useful.

- *(none yet)*

---

## 🚧 Foreclosed Avenues

Approaches that have been tried and definitively ruled out. The agent will not repeat these.

- *(none yet)*

---

## 🔭 Future Directions

Promising ideas yet to be explored. Maintainers and the agent both contribute here.

- *(none yet)*

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

<!-- Agent prepends entries here after each iteration -->

*(No iterations yet.)*
```

### Machine State Field Reference

| Field | Type | Description |
|-------|------|-------------|
| Last Run | ISO timestamp (e.g. `2025-01-15T12:00:00Z`) | UTC timestamp of the last iteration |
| Iteration Count | integer | Total iterations completed |
| Best Metric | number | Best metric value achieved so far |
| Target Metric | number or `—` | Target metric from program frontmatter (halting condition). `—` if open-ended |
| Branch | branch name | Long-running branch: `autoloop/{program-name}` |
| PR | `#number` or `—` | Draft PR number for this program |
| Issue | `#number` or `—` | Program issue number (single source of truth for status, iteration log, and human steering) |
| Paused | `true` or `false` | Whether the program is paused |
| Pause Reason | text or `—` | Why it is paused (if applicable) |
| Completed | `true` or `false` | Whether the program has reached its target metric |
| Completed Reason | text or `—` | Why it completed (e.g., `target metric 0.95 reached with value 0.97`) |
| Consecutive Errors | integer | Count of consecutive evaluation failures |
| Recent Statuses | comma-separated words | Last 10 outcomes: `accepted`, `rejected`, or `error` |

### Iteration History Entry Format

After each iteration, prepend an entry to the **📊 Iteration History** section. Use `${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}` for the run URL.

```markdown
### Iteration {N} — {YYYY-MM-DD HH:MM UTC} — [Run](https://github.com/{owner}/{repo}/actions/runs/{run_id})

- **Status**: ✅ Accepted / ❌ Rejected / ⚠️ Error
- **Change**: {one-line description of what was tried}
- **Metric**: {value} (previous best: {previous_best}, delta: {+/-delta})
- **Commit**: {short_sha} *(if accepted)*
- **Notes**: {one or two sentences on what this iteration revealed}
```

### Update Rules

- **Always** read the state file before proposing a change. It contains human guidance you must follow.
- **Always** update the state file after each iteration, regardless of outcome.
- **Update the Machine State table first** — the scheduling pre-step depends on it.
- **Prepend** iteration history entries (newest first).
- **Keep the state file compact.** The state file must stay under 30 KB. When prepending a new iteration entry, collapse older iteration entries (beyond the most recent 10) into compressed summary lines (e.g. `### Iters 50–100 — ✅ (metrics 20→55): brief summary`). Also prune Lessons Learned to only the most recent and relevant entries.
- **Accumulate** Lessons Learned — add new insights, don't overwrite existing ones.
- **Add to Foreclosed Avenues** only when an approach is conclusively ruled out (not just rejected once).
- **Respect Current Priorities** — if a maintainer has written priorities, follow them in your next proposal.
- **Write the state file** to the repo-memory folder. Changes are automatically committed and pushed to the `memory/autoloop` branch after the workflow completes.

## Guidelines

- **One change per iteration.** Keep changes small and targeted.
- **No breaking changes.** Target files must remain functional even if the iteration is rejected.
- **Respect the evaluation budget.** If the evaluation command has a time constraint, respect it.
- **Repo-memory state file is the single source of truth.** All state lives in `{program-name}.md` in the repo-memory folder — scheduling fields, history, lessons, priorities. Keep it up to date.
- **Learn from the state file.** The Foreclosed Avenues and Lessons Learned sections exist to prevent repeating failures. Read them before every proposal.
- **Respect human input.** The Current Priorities section is set by maintainers — follow it.
- **Diminishing returns.** If the last 5 consecutive iterations were rejected, post a comment suggesting the user review the program definition or update the state file's Current Priorities.
- **Transparency.** Every PR and comment must include AI disclosure with 🤖.
- **Safety.** Never modify files outside the target list. Never modify the evaluation script. Never modify the program definition (except via `/autoloop` command mode).
- **Read AGENTS.md first**: before starting work, read the repository's `AGENTS.md` file (if present) to understand project-specific conventions.
- **Build and test**: run any build/test commands before creating PRs.

## Common Mistakes to Avoid

> ❌ **Do NOT create a new branch with a suffix for each iteration.**
> Correct: `autoloop/coverage`
> Wrong: `autoloop/coverage-abc123`, `autoloop/coverage-iter42`, `autoloop/coverage-deadbeef1234`
> Use the `head_branch` field from `autoloop.json` — it is always the canonical name.

> ❌ **Do NOT create a new PR if one already exists for `autoloop/{program-name}`.**
> The pre-step provides `existing_pr` in `autoloop.json`. If it is not null, **always** use `push-to-pull-request-branch` — never call `create-pull-request`. Only create a PR when `existing_pr` is null AND the state file has no PR number.

> ❌ **Do NOT let the gh-aw framework auto-generate a branch name when creating a PR.**
> Always specify the branch explicitly as `autoloop/{program-name}` when calling `create-pull-request`.

> ❌ **Do NOT push to the default branch (e.g., `main`).**
> All accepted changes go to `autoloop/{program-name}` only.

> ✅ **One program = one long-running branch = one draft PR.** This is the invariant that must hold at all times.

---
description: |
  Evergreen — keeps pull requests healthy by automatically fixing merge conflicts
  and failing CI checks. Runs on a short schedule, deterministically selects one
  PR per run, and gives up after 5 attempts that don't improve the same repo state.

on:
  schedule: every 5m
  workflow_dispatch:
    inputs:
      pr_number:
        description: "Fix a specific PR by number (bypasses scheduling)"
        required: false
        type: string

permissions: read-all

timeout-minutes: 30

network:
  allowed:
  - defaults
  - node

safe-outputs:
  push-to-pull-request-branch:
    target: "*"
    max: 3
    protected-files: allowed
  add-comment:
    max: 3
    target: "*"

checkout:
  fetch: ["*"]
  fetch-depth: 0

tools:
  github:
    toolsets: [repos, pull_requests, issues, actions]
  bash: true
  repo-memory:
    branch-name: memory/evergreen
    file-glob: ["*.md"]

imports:
  - shared/reporting.md

steps:
  - name: Find a PR that needs attention
    env:
      GITHUB_TOKEN: ${{ github.token }}
      GITHUB_REPOSITORY: ${{ github.repository }}
      FORCED_PR: ${{ github.event.inputs.pr_number }}
    run: |
      python3 - << 'PYEOF'
      import os, json, re, subprocess, sys
      import urllib.request, urllib.error

      token = os.environ.get("GITHUB_TOKEN", "")
      repo = os.environ.get("GITHUB_REPOSITORY", "")
      forced_pr = os.environ.get("FORCED_PR", "").strip()

      repo_memory_dir = "/tmp/gh-aw/repo-memory/evergreen"
      output_file = "/tmp/gh-aw/evergreen.json"
      os.makedirs("/tmp/gh-aw", exist_ok=True)

      MAX_ATTEMPTS = 5

      def api_get(url):
          """Make an authenticated GET request to the GitHub API."""
          req = urllib.request.Request(url, headers={
              "Authorization": f"token {token}",
              "Accept": "application/vnd.github.v3+json",
          })
          with urllib.request.urlopen(req, timeout=30) as resp:
              return json.loads(resp.read().decode())

      def get_all_open_prs():
          """Fetch all open PRs, paginated."""
          prs = []
          page = 1
          while True:
              url = f"https://api.github.com/repos/{repo}/pulls?state=open&per_page=100&page={page}&sort=number&direction=asc"
              batch = api_get(url)
              if not batch:
                  break
              prs.extend(batch)
              if len(batch) < 100:
                  break
              page += 1
          return prs

      def get_check_status(pr):
          """Get combined CI check status for a PR's head commit."""
          head_sha = pr["head"]["sha"]
          url = f"https://api.github.com/repos/{repo}/commits/{head_sha}/status"
          try:
              status = api_get(url)
              return status.get("state", "unknown")
          except Exception as e:
              print(f"  Warning: could not fetch status for PR #{pr['number']}: {e}")
              return "unknown"

      def get_check_runs(pr):
          """Get check runs for a PR's head commit."""
          head_sha = pr["head"]["sha"]
          url = f"https://api.github.com/repos/{repo}/commits/{head_sha}/check-runs"
          try:
              data = api_get(url)
              return data.get("check_runs", [])
          except Exception as e:
              print(f"  Warning: could not fetch check runs for PR #{pr['number']}: {e}")
              return []

      def read_attempt_state(pr_number):
          """Read attempt tracking state from repo-memory."""
          state_file = os.path.join(repo_memory_dir, f"pr-{pr_number}.md")
          if not os.path.isfile(state_file):
              return {"attempts": 0, "head_sha": None}
          with open(state_file, encoding="utf-8") as f:
              content = f.read()
          state = {"attempts": 0, "head_sha": None}
          m = re.search(r'\|\s*head_sha\s*\|\s*(\S+)\s*\|', content)
          if m:
              state["head_sha"] = m.group(1)
          m = re.search(r'\|\s*attempts\s*\|\s*(\d+)\s*\|', content)
          if m:
              state["attempts"] = int(m.group(1))
          return state

      def pr_needs_attention(pr):
          """Check if a PR has merge conflicts or failing CI. Returns a list of issues."""
          issues = []

          # Check mergeable state
          # Need to fetch full PR details for mergeable info
          pr_url = f"https://api.github.com/repos/{repo}/pulls/{pr['number']}"
          try:
              full_pr = api_get(pr_url)
              mergeable = full_pr.get("mergeable")
              mergeable_state = full_pr.get("mergeable_state", "unknown")
              if mergeable is False:
                  issues.append("merge_conflict")
              elif mergeable_state == "dirty":
                  issues.append("merge_conflict")
          except Exception as e:
              print(f"  Warning: could not fetch mergeable state for PR #{pr['number']}: {e}")

          # Check CI status via check runs
          check_runs = get_check_runs(pr)
          failed_checks = []
          for cr in check_runs:
              conclusion = cr.get("conclusion")
              status = cr.get("status")
              name = cr.get("name", "unknown")
              if conclusion in ("failure", "timed_out", "action_required"):
                  failed_checks.append(name)
              elif status == "completed" and conclusion not in ("success", "neutral", "skipped"):
                  if conclusion is not None:
                      failed_checks.append(name)
          if failed_checks:
              issues.append(f"failing_checks: {', '.join(failed_checks)}")

          # Also check commit status API (some checks use the older status API)
          combined_status = get_check_status(pr)
          if combined_status == "failure":
              if not failed_checks:
                  issues.append("failing_status")

          return issues

      # --- Main logic ---

      print("=== Evergreen PR Health Check ===")
      print(f"Repository: {repo}")

      prs = get_all_open_prs()
      print(f"Found {len(prs)} open PR(s)")

      if not prs:
          print("No open PRs. Exiting.")
          with open(output_file, "w") as f:
              json.dump({"selected": None, "reason": "no_open_prs"}, f)
          sys.exit(1)

      # Evaluate each PR deterministically (sorted by PR number ascending)
      candidates = []
      skipped = []

      # If a specific PR is forced, only check that one
      if forced_pr:
          prs = [pr for pr in prs if str(pr["number"]) == forced_pr]
          if not prs:
              print(f"ERROR: PR #{forced_pr} not found among open PRs.")
              sys.exit(1)
          print(f"FORCED: checking only PR #{forced_pr}")

      for pr in sorted(prs, key=lambda p: p["number"]):
          pr_num = pr["number"]
          head_sha = pr["head"]["sha"]
          print(f"\nChecking PR #{pr_num}: {pr['title'][:60]}...")
          print(f"  Head SHA: {head_sha[:12]}")

          issues = pr_needs_attention(pr)
          if not issues:
              print(f"  Status: healthy (no issues)")
              continue

          print(f"  Issues: {issues}")

          # Check attempt tracking
          attempt_state = read_attempt_state(pr_num)
          if attempt_state["head_sha"] == head_sha:
              attempts = attempt_state["attempts"]
              print(f"  Attempts on this SHA: {attempts}/{MAX_ATTEMPTS}")
              if attempts >= MAX_ATTEMPTS:
                  skipped.append({
                      "pr": pr_num,
                      "reason": f"max attempts ({MAX_ATTEMPTS}) reached on SHA {head_sha[:12]}",
                  })
                  print(f"  SKIPPED: max attempts reached")
                  continue
          else:
              attempts = 0
              print(f"  New SHA detected — resetting attempt counter")

          candidates.append({
              "pr_number": pr_num,
              "title": pr["title"],
              "head_sha": head_sha,
              "base_branch": pr["base"]["ref"],
              "head_branch": pr["head"]["ref"],
              "issues": issues,
              "attempts": attempts,
          })

      # Select the first candidate (lowest PR number — deterministic)
      selected = candidates[0] if candidates else None

      result = {
          "selected": selected,
          "skipped": skipped,
          "total_open_prs": len(prs),
          "candidates_found": len(candidates),
      }

      with open(output_file, "w") as f:
          json.dump(result, f, indent=2)

      if selected:
          branch = selected["head_branch"]
          print(f"Checking out PR branch before agent run: {branch}")
          subprocess.check_call(["git", "checkout", "-B", branch, f"origin/{branch}"])
          subprocess.check_call(["git", "branch", "--set-upstream-to", f"origin/{branch}", branch])
          print(f"\n>>> Selected PR #{selected['pr_number']}: {selected['title']}")
          print(f"    Issues: {selected['issues']}")
          print(f"    Attempt: {selected['attempts'] + 1}/{MAX_ATTEMPTS}")
      else:
          print("\nNo PRs need attention. Exiting.")
          sys.exit(1)
      PYEOF

features:
  copilot-requests: true
---

# Evergreen — PR Health Keeper

You are the Evergreen agent. Your job is to fix pull requests that have merge conflicts or failing CI checks.

## Context

A pre-flight step has already identified a PR that needs attention. Read the selection data from `/tmp/gh-aw/evergreen.json` to understand which PR to fix and what issues it has.

## Workflow

1. **Read the selection file** at `/tmp/gh-aw/evergreen.json`. It contains:
   - `selected.pr_number` — the PR to fix
   - `selected.issues` — list of problems (e.g., `"merge_conflict"`, `"failing_checks: Test & Lint"`)
   - `selected.head_sha` — current HEAD of the PR branch
   - `selected.head_branch` — the PR's branch name
   - `selected.base_branch` — the target branch (usually `main`)
   - `selected.attempts` — how many times we've already tried on this SHA

2. The pre-flight step already checks out `selected.head_branch` as a named local tracking branch before you start. Keep working on that branch (do not switch back to `main` or use detached HEAD).

3. **Fix the issues**:

   ### Merge Conflicts
   - Merge the base branch (`main`) into the PR branch
   - Resolve any conflicts intelligently by understanding the intent of both sides
   - If the PR is from an autoloop branch, prefer the PR's changes for feature code and main's changes for infrastructure/config
   - Run tests after resolving to make sure the merge is clean

   ### Failing CI Checks
   - Read the failing check logs using GitHub tools
   - Identify the root cause (test failures, lint errors, type errors, build failures)
   - Fix the code on the PR branch
   - Run the relevant checks locally to verify the fix before pushing

4. **Push the fix** to the PR branch using the `push-to-pull-request-branch` safe output.

5. **Update attempt tracking** by writing to repo-memory. Write a file to the repo-memory directory at `/tmp/gh-aw/repo-memory/evergreen/pr-{number}.md` with this format:

   ```markdown
   # Evergreen: PR #{number}

   ## State

   | Field | Value |
   |:---|:---|
   | head_sha | {sha_after_push} |
   | attempts | {new_attempt_count} |
   | last_run | {ISO 8601 timestamp} |
   | last_result | {success or failure} |
   ```

   - If you **pushed a fix**, set `head_sha` to the new SHA (post-push), reset `attempts` to `0`, and set `last_result` to `success`.
   - If you **could not fix** the issue, keep the original `head_sha`, increment `attempts` by 1, and set `last_result` to `failure`.

6. **Add a comment** on the PR summarizing what you did (or why you couldn't fix it).

## Rules

- **Be surgical**: make the minimum changes needed to fix the issue. Do not refactor, improve, or add features.
- **Don't break things**: always run tests/lint/typecheck locally before pushing.
- **Give up gracefully**: if you cannot fix the issue after investigating, update the attempt counter and leave a comment explaining what went wrong. Do not force-push or make destructive changes.
- **One PR per run**: only fix the selected PR. Do not touch other PRs.
- **Respect the 5-attempt limit**: the pre-flight step will stop selecting this PR once attempts reach 5 on the same HEAD SHA. If the SHA changes (someone else pushes), the counter resets.

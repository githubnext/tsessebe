---
description: |
  Keeps Autoloop program branches up to date with the default branch.
  Runs whenever the default branch changes and merges it into all active
  autoloop/* branches so that program iterations always build on the latest code.

on:
  push:
    branches: [main]  # ← update this if your default branch is not 'main'
  workflow_dispatch:

permissions: read-all

timeout-minutes: 10

tools:
  github:
    toolsets: [repos]
  bash: true

steps:
  - name: Merge default branch into all autoloop program branches
    env:
      GITHUB_REPOSITORY: ${{ github.repository }}
      DEFAULT_BRANCH: ${{ github.event.repository.default_branch }}
    run: |
      python3 - << 'PYEOF'
      import os, re, subprocess, sys

      token = os.environ.get("GITHUB_TOKEN", "")
      repo = os.environ.get("GITHUB_REPOSITORY", "")
      default_branch = os.environ.get("DEFAULT_BRANCH", "main")

      # List all remote branches matching the autoloop/* pattern
      result = subprocess.run(
          ["git", "branch", "-r", "--list", "origin/autoloop/*"],
          capture_output=True, text=True
      )
      if result.returncode != 0:
          print(f"Failed to list remote branches: {result.stderr}")
          sys.exit(0)

      all_branches = [b.strip().replace("origin/", "") for b in result.stdout.strip().split("\n") if b.strip()]

      # Filter to canonical branches only: autoloop/{name} without hash suffixes.
      # Stale branches created by the framework (e.g. autoloop/name-a1b2c3d4e5f6g7h8)
      # are skipped — they are not the long-running program branches.
      _hash_suffix = re.compile(r'-[0-9a-f]{16}$')
      branches = [b for b in all_branches if not _hash_suffix.search(b)]
      skipped_branches = [b for b in all_branches if _hash_suffix.search(b)]

      if skipped_branches:
          print(f"Skipping {len(skipped_branches)} stale branch(es) with hash suffixes: {skipped_branches}")

      if not branches:
          print("No canonical autoloop/* branches found. Nothing to sync.")
          sys.exit(0)

      print(f"Found {len(branches)} canonical autoloop branch(es) to sync: {branches}")

      failed = []
      for branch in branches:
          print(f"\n--- Syncing {branch} with {default_branch} ---")

          # Fetch both branches
          subprocess.run(["git", "fetch", "origin", branch], capture_output=True)
          subprocess.run(["git", "fetch", "origin", default_branch], capture_output=True)

          # Check out the program branch
          checkout = subprocess.run(
              ["git", "checkout", branch],
              capture_output=True, text=True
          )
          if checkout.returncode != 0:
              # Try creating a local tracking branch
              checkout = subprocess.run(
                  ["git", "checkout", "-b", branch, f"origin/{branch}"],
                  capture_output=True, text=True
              )
          if checkout.returncode != 0:
              print(f"  Failed to checkout {branch}: {checkout.stderr}")
              failed.append(branch)
              continue

          # Determine whether the branch can be fast-forwarded to the default
          # branch (ahead=0) or has truly diverged and needs a merge.
          ahead_proc = subprocess.run(
              ["git", "rev-list", "--count", f"origin/{default_branch}..origin/{branch}"],
              capture_output=True, text=True,
          )
          behind_proc = subprocess.run(
              ["git", "rev-list", "--count", f"origin/{branch}..origin/{default_branch}"],
              capture_output=True, text=True,
          )
          if ahead_proc.returncode != 0 or behind_proc.returncode != 0:
              # Don't guess — a failed rev-list with empty stdout would
              # otherwise be parsed as 0 below and could trigger an
              # incorrect fast-forward that loses commits.
              print(f"  Failed to compute ahead/behind for {branch}: "
                    f"ahead.rc={ahead_proc.returncode} stderr={ahead_proc.stderr.strip()!r} "
                    f"behind.rc={behind_proc.returncode} stderr={behind_proc.stderr.strip()!r}")
              failed.append(branch)
              continue
          try:
              ahead = int(ahead_proc.stdout.strip())
              behind = int(behind_proc.stdout.strip())
          except ValueError:
              print(f"  Failed to parse ahead/behind counts for {branch}: "
                    f"ahead={ahead_proc.stdout!r} behind={behind_proc.stdout!r}")
              failed.append(branch)
              continue

          if behind == 0:
              # Branch already contains every commit on the default branch.
              print(f"  {branch} is already up to date with {default_branch} (ahead={ahead}, behind=0)")
              continue

          if ahead == 0:
              # Lossless fast-forward: every commit on the branch is already
              # reachable from the default branch (typical case once the
              # previous iteration's PR has been merged). A real merge here
              # would create a "Merge default into branch" commit that re-
              # exposes every historical file as a patch touch — the noise
              # that trips gh-aw's MAX_FILES limit when the next iteration
              # opens a new PR. Reset the branch to the default branch's HEAD
              # and force-push (with lease) instead.
              reset = subprocess.run(
                  ["git", "reset", "--hard", f"origin/{default_branch}"],
                  capture_output=True, text=True,
              )
              if reset.returncode != 0:
                  print(f"  Failed to fast-forward {branch}: {reset.stderr}")
                  failed.append(branch)
                  continue
              push = subprocess.run(
                  ["git", "push", "--force-with-lease", "origin", branch],
                  capture_output=True, text=True,
              )
              if push.returncode != 0:
                  print(f"  Failed to push fast-forward of {branch}: {push.stderr}")
                  failed.append(branch)
                  continue
              print(f"  Fast-forwarded {branch} to {default_branch} (was behind by {behind})")
              continue

          # True divergence (ahead>0 and behind>0): merge the default branch in.
          merge = subprocess.run(
              ["git", "merge", f"origin/{default_branch}", "--no-edit",
               "-m", f"Merge {default_branch} into {branch}"],
              capture_output=True, text=True
          )
          if merge.returncode != 0:
              print(f"  Merge conflict or failure for {branch}: {merge.stderr}")
              # Abort the merge to leave a clean state
              subprocess.run(["git", "merge", "--abort"], capture_output=True)
              failed.append(branch)
              continue

          # Push the updated branch
          push = subprocess.run(
              ["git", "push", "origin", branch],
              capture_output=True, text=True
          )
          if push.returncode != 0:
              print(f"  Failed to push {branch}: {push.stderr}")
              failed.append(branch)
              continue

          print(f"  Successfully synced {branch}")

      # Return to default branch
      subprocess.run(["git", "checkout", default_branch], capture_output=True)

      if failed:
          print(f"\n⚠️ Failed to sync {len(failed)} branch(es): {failed}")
          print("These branches may need manual conflict resolution.")
          # Don't fail the workflow — log the issue but continue
      else:
          print(f"\n✅ All {len(branches)} branch(es) synced successfully.")
      PYEOF

features:
  copilot-requests: true
---

Sync all autoloop/* branches with the default branch.

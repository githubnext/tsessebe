#!/usr/bin/env python3
"""Autoloop scheduler pre-step.

Picks the next program to run (or detects unconfigured programs) and writes
`/tmp/gh-aw/autoloop.json` for the agent step. Extracted from `autoloop.md`'s
inline heredoc because the compiled `run:` expression exceeded GitHub
Actions' 20.5 KB per-expression limit.
"""
import os, json, re, glob, sys
import urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

programs_dir = ".autoloop/programs"
autoloop_dir = ".autoloop/programs"
template_file = os.path.join(autoloop_dir, "example.md")

# Read program state from repo-memory (persistent git-backed storage)
github_token = os.environ.get("GITHUB_TOKEN", "")
repo = os.environ.get("GITHUB_REPOSITORY", "")
forced_program = os.environ.get("AUTOLOOP_PROGRAM", "").strip()

# Repo-memory files are cloned to /tmp/gh-aw/repo-memory/{id}/ where {id}
# is derived from the branch-name configured in the tools section (memory/autoloop → autoloop)
repo_memory_dir = "/tmp/gh-aw/repo-memory/autoloop"

def parse_machine_state(content):
    """Parse the ⚙️ Machine State table from a state file. Returns a dict."""
    state = {}
    m = re.search(r'## ⚙️ Machine State.*?\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
    if not m:
        return state
    section = m.group(0)
    for row in re.finditer(r'\|\s*(.+?)\s*\|\s*(.+?)\s*\|', section):
        raw_key = row.group(1).strip()
        raw_val = row.group(2).strip()
        if raw_key.lower() in ("field", "---", ":---", ":---:", "---:"):
            continue
        key = raw_key.lower().replace(" ", "_")
        val = None if raw_val in ("—", "-", "") else raw_val
        state[key] = val
    # Coerce types
    for int_field in ("iteration_count", "consecutive_errors"):
        if int_field in state:
            try:
                state[int_field] = int(state[int_field])
            except (ValueError, TypeError):
                state[int_field] = 0
    if "paused" in state:
        state["paused"] = str(state.get("paused", "")).lower() == "true"
    if "completed" in state:
        state["completed"] = str(state.get("completed", "")).lower() == "true"
    # recent_statuses: stored as comma-separated words (e.g. "accepted, rejected, error")
    rs_raw = state.get("recent_statuses") or ""
    if rs_raw:
        state["recent_statuses"] = [s.strip().lower() for s in rs_raw.split(",") if s.strip()]
    else:
        state["recent_statuses"] = []
    return state

def read_program_state(program_name):
    """Read scheduling state from the repo-memory state file."""
    state_file = os.path.join(repo_memory_dir, f"{program_name}.md")
    if not os.path.isfile(state_file):
        print(f"  {program_name}: no state file found (first run)")
        return {}
    with open(state_file, encoding="utf-8") as f:
        content = f.read()
    return parse_machine_state(content)

# Bootstrap: create autoloop programs directory and template if missing
if not os.path.isdir(autoloop_dir):
    os.makedirs(autoloop_dir, exist_ok=True)
    bt = chr(96)  # backtick — avoid literal backticks that break gh-aw compiler
    template = "\n".join([
        "<!-- AUTOLOOP:UNCONFIGURED -->",
        "<!-- Remove the line above once you have filled in your program. -->",
        "<!-- Autoloop will NOT run until you do. -->",
        "",
        "# Autoloop Program",
        "",
        "<!-- Rename this file to something meaningful (e.g. training.md, coverage.md).",
        "     The filename (minus .md) becomes the program name used in issues, PRs,",
        "     and slash commands. Want multiple loops? Add more .md files here. -->",
        "",
        "## Goal",
        "",
        "<!-- Describe what you want to optimize. Be specific about what 'better' means. -->",
        "",
        "REPLACE THIS with your optimization goal.",
        "",
        "## Target",
        "",
        "<!-- List files Autoloop may modify. Everything else is off-limits. -->",
        "",
        "Only modify these files:",
        f"- {bt}REPLACE_WITH_FILE{bt} -- (describe what this file does)",
        "",
        "Do NOT modify:",
        "- (list files that must not be touched)",
        "",
        "## Evaluation",
        "",
        "<!-- Provide a command and the metric to extract. -->",
        "",
        f"{bt}{bt}{bt}bash",
        "REPLACE_WITH_YOUR_EVALUATION_COMMAND",
        f"{bt}{bt}{bt}",
        "",
        f"The metric is {bt}REPLACE_WITH_METRIC_NAME{bt}. **Lower/Higher is better.** (pick one)",
        "",
    ])
    with open(template_file, "w") as f:
        f.write(template)
    # Leave the template unstaged — the agent will create a draft PR with it
    print(f"BOOTSTRAPPED: created {template_file} locally (agent will create a draft PR)")

# Find all program files from all locations:
# 1. Directory-based programs: .autoloop/programs/<name>/program.md (preferred)
# 2. Bare markdown programs: .autoloop/programs/<name>.md (simple)
# 3. Issue-based programs: GitHub issues with the 'autoloop-program' label
program_files = []
issue_programs = {}  # name -> {issue_number, file}

# Scan .autoloop/programs/ for directory-based programs
if os.path.isdir(programs_dir):
    for entry in sorted(os.listdir(programs_dir)):
        prog_dir = os.path.join(programs_dir, entry)
        if os.path.isdir(prog_dir):
            # Look for program.md inside the directory
            prog_file = os.path.join(prog_dir, "program.md")
            if os.path.isfile(prog_file):
                program_files.append(prog_file)

# Scan .autoloop/programs/ for bare markdown programs
bare_programs = sorted(glob.glob(os.path.join(autoloop_dir, "*.md")))
for pf in bare_programs:
    program_files.append(pf)

# Scan GitHub issues with the 'autoloop-program' label.
# Each program (file-based or issue-based) has exactly one such issue —
# it serves as the single source of truth for status, iteration log, and
# human steering. For file-based programs the issue is auto-created by
# the agent on first run with title "[Autoloop: {program-name}]".
issue_programs_dir = "/tmp/gh-aw/issue-programs"
os.makedirs(issue_programs_dir, exist_ok=True)
# file_program_issues: name -> issue_number for file-based program issues
# (auto-created by the agent, recognized here by title "[Autoloop: {name}]").
file_program_issues = {}
file_program_titles = set()  # known file-based program names (to skip when slugifying)
try:
    api_url = f"https://api.github.com/repos/{repo}/issues?labels=autoloop-program&state=open&per_page=100"
    req = urllib.request.Request(api_url, headers={
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        issues = json.loads(resp.read().decode())
    # First pass: identify file-based program issues by their conventional title.
    # We compute the set of known file-based program names from program_files first.
    known_file_program_names = set()
    for pf in program_files:
        # inline get_program_name (it's defined later in this script)
        if pf.endswith("/program.md"):
            known_file_program_names.add(os.path.basename(os.path.dirname(pf)))
        else:
            known_file_program_names.add(os.path.splitext(os.path.basename(pf))[0])
    file_program_issue_pattern = re.compile(r'^\s*\[Autoloop:\s*([^\]]+?)\s*\]\s*$')
    consumed_issue_numbers = set()
    for issue in issues:
        if issue.get("pull_request"):
            continue
        title = issue.get("title") or ""
        m = file_program_issue_pattern.match(title)
        if m and m.group(1) in known_file_program_names:
            file_program_issues[m.group(1)] = issue["number"]
            consumed_issue_numbers.add(issue["number"])
            print(f"  Found program issue for file-based program '{m.group(1)}': #{issue['number']}")

    # Second pass: any remaining autoloop-program issue is an issue-based program.
    for issue in issues:
        if issue.get("pull_request"):
            continue  # skip PRs
        if issue["number"] in consumed_issue_numbers:
            continue  # already claimed as a file-based program's issue
        body = issue.get("body") or ""
        title = issue.get("title") or ""
        number = issue["number"]
        # Derive program name from issue title: slugify to lowercase with hyphens
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        slug = re.sub(r'-+', '-', slug)  # collapse consecutive hyphens
        if not slug:
            slug = f"issue-{number}"
        # Avoid slug collisions: if another issue already claimed this slug, append issue number
        if slug in issue_programs:
            print(f"  Warning: slug '{slug}' (issue #{number}) collides with issue #{issue_programs[slug]['issue_number']}, appending issue number")
            slug = f"{slug}-{number}"
        # Write issue body to a temp file so the scheduling loop can process it
        issue_file = os.path.join(issue_programs_dir, f"{slug}.md")
        with open(issue_file, "w") as f:
            f.write(body)
        program_files.append(issue_file)
        issue_programs[slug] = {"issue_number": number, "file": issue_file, "title": title}
        print(f"  Found issue-based program: '{slug}' (issue #{number})")
except Exception as e:
    print(f"  Warning: could not fetch issue-based programs: {e}")

if not program_files:
    # Fallback to single-file locations
    for path in [".autoloop/program.md", "program.md"]:
        if os.path.isfile(path):
            program_files = [path]
            break

if not program_files:
    print("NO_PROGRAMS_FOUND")
    os.makedirs("/tmp/gh-aw", exist_ok=True)
    with open("/tmp/gh-aw/autoloop.json", "w") as f:
        json.dump({"due": [], "skipped": [], "unconfigured": [], "no_programs": True}, f)
    sys.exit(0)

os.makedirs("/tmp/gh-aw", exist_ok=True)
now = datetime.now(timezone.utc)
due = []
skipped = []
unconfigured = []
all_programs = {}  # name -> file path (populated during scanning)

# Schedule string to timedelta
def parse_schedule(s):
    s = s.strip().lower()
    m = re.match(r"every\s+(\d+)\s*h", s)
    if m:
        return timedelta(hours=int(m.group(1)))
    m = re.match(r"every\s+(\d+)\s*m", s)
    if m:
        return timedelta(minutes=int(m.group(1)))
    if s == "daily":
        return timedelta(hours=24)
    if s == "weekly":
        return timedelta(days=7)
    return None  # No per-program schedule — always due

def get_program_name(pf):
    """Extract program name from file path.
    Directory-based: .autoloop/programs/<name>/program.md -> <name>
    Bare markdown: .autoloop/programs/<name>.md -> <name>
    Issue-based: /tmp/gh-aw/issue-programs/<name>.md -> <name>
    """
    if pf.endswith("/program.md"):
        # Directory-based program: name is the parent directory
        return os.path.basename(os.path.dirname(pf))
    else:
        # Bare markdown or issue-based program: name is the filename without .md
        return os.path.splitext(os.path.basename(pf))[0]

for pf in program_files:
    name = get_program_name(pf)
    all_programs[name] = pf
    with open(pf) as f:
        content = f.read()

    # Check sentinel (skip for issue-based programs which use AUTOLOOP:ISSUE-PROGRAM)
    if "<!-- AUTOLOOP:UNCONFIGURED -->" in content:
        unconfigured.append(name)
        continue

    # Check for TODO/REPLACE placeholders
    if re.search(r'\bTODO\b|\bREPLACE', content):
        unconfigured.append(name)
        continue

    # Parse optional YAML frontmatter for schedule and target-metric
    # Strip leading HTML comments before checking (issue-based programs may have them)
    content_stripped = re.sub(r'^(\s*<!--.*?-->\s*\n)*', '', content, flags=re.DOTALL)
    schedule_delta = None
    target_metric = None
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content_stripped, re.DOTALL)
    if fm_match:
        for line in fm_match.group(1).split("\n"):
            if line.strip().startswith("schedule:"):
                schedule_str = line.split(":", 1)[1].strip()
                schedule_delta = parse_schedule(schedule_str)
            if line.strip().startswith("target-metric:"):
                try:
                    target_metric = float(line.split(":", 1)[1].strip())
                except (ValueError, TypeError):
                    print(f"  Warning: {name} has invalid target-metric value: {line.split(':', 1)[1].strip()}")

    # Read state from repo-memory
    state = read_program_state(name)
    if state:
        print(f"  {name}: last_run={state.get('last_run')}, iteration_count={state.get('iteration_count')}")
    else:
        print(f"  {name}: no state found (first run)")

    last_run = None
    lr = state.get("last_run")
    if lr:
        try:
            last_run = datetime.fromisoformat(lr.replace("Z", "+00:00"))
        except ValueError:
            pass

    # Check if completed (target metric was reached)
    if str(state.get("completed", "")).lower() == "true":
        skipped.append({"name": name, "reason": f"completed: target metric reached"})
        continue

    # Check if paused (e.g., plateau or recurring errors)
    if state.get("paused"):
        skipped.append({"name": name, "reason": f"paused: {state.get('pause_reason', 'unknown')}"})
        continue

    # Auto-pause on plateau: 5+ consecutive rejections
    recent = state.get("recent_statuses", [])[-5:]
    if len(recent) >= 5 and all(s == "rejected" for s in recent):
        skipped.append({"name": name, "reason": "plateau: 5 consecutive rejections"})
        continue

    # Check if due based on per-program schedule
    if schedule_delta and last_run:
        if now - last_run < schedule_delta:
            skipped.append({"name": name, "reason": "not due yet",
                            "next_due": (last_run + schedule_delta).isoformat()})
            continue

    due.append({"name": name, "last_run": lr, "file": pf, "target_metric": target_metric,
                "schedule_seconds": schedule_delta.total_seconds() if schedule_delta else None})

# Pick the program to run
selected = None
selected_file = None
selected_issue = None
selected_target_metric = None
deferred = []

if forced_program:
    # Manual dispatch requested a specific program — bypass scheduling
    # (paused, not-due, and plateau programs can still be forced)
    if forced_program not in all_programs:
        print(f"ERROR: requested program '{forced_program}' not found.")
        print(f"  Available programs: {list(all_programs.keys())}")
        sys.exit(1)
    if forced_program in unconfigured:
        print(f"ERROR: requested program '{forced_program}' is unconfigured (has placeholders).")
        sys.exit(1)
    selected = forced_program
    selected_file = all_programs[forced_program]
    deferred = [p["name"] for p in due if p["name"] != forced_program]
    if selected in issue_programs:
        selected_issue = issue_programs[selected]["issue_number"]
    elif selected in file_program_issues:
        # File-based program with an auto-created program issue.
        selected_issue = file_program_issues[selected]
    # Find target_metric: check the due list first, then parse from the program file
    for p in due:
        if p["name"] == forced_program:
            selected_target_metric = p.get("target_metric")
            break
    if selected_target_metric is None:
        # Program may have been skipped (completed/paused/plateau) — parse directly
        try:
            with open(selected_file) as _f:
                _content = _f.read()
            _content_stripped = re.sub(r'^(\s*<!--.*?-->\s*\n)*', '', _content, flags=re.DOTALL)
            _fm = re.match(r"^---\s*\n(.*?)\n---\s*\n", _content_stripped, re.DOTALL)
            if _fm:
                for _line in _fm.group(1).split("\n"):
                    if _line.strip().startswith("target-metric:"):
                        selected_target_metric = float(_line.split(":", 1)[1].strip())
                        break
        except (OSError, ValueError, TypeError):
            pass
    print(f"FORCED: running program '{forced_program}' (manual dispatch)")
elif due:
    # Normal scheduling: pick the single most-overdue program.
    # Tiebreaker rationale: programs that have never run (no last_run) take
    # priority over ever-run programs; among never-run programs, prefer the
    # shortest schedule (so "every 30m" beats "every 6h"), then alphabetical
    # by name. Programs with no parseable schedule sort last among never-run
    # programs (float('inf')). This avoids permanent starvation when state
    # is missing — see issue: "Autoloop pre-step can't read state files".
    def _due_sort_key(p):
        if p["last_run"]:
            return (1, p["last_run"], p["name"])
        sched = p.get("schedule_seconds")
        return (0, sched if sched is not None else float("inf"), p["name"])
    due.sort(key=_due_sort_key)
    selected = due[0]["name"]
    selected_file = due[0]["file"]
    selected_target_metric = due[0].get("target_metric")
    deferred = [p["name"] for p in due[1:]]
    # Check if the selected program is issue-based, or a file-based program
    # with an auto-created program issue.
    if selected in issue_programs:
        selected_issue = issue_programs[selected]["issue_number"]
    elif selected in file_program_issues:
        selected_issue = file_program_issues[selected]

# Look up existing PR for the selected program's canonical branch
existing_pr = None
head_branch = None

def verify_pr_is_open(pr_number):
    """Check if a PR is still open via the GitHub API. Returns True if open."""
    try:
        verify_url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"
        verify_req = urllib.request.Request(verify_url, headers={
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json",
        })
        with urllib.request.urlopen(verify_req, timeout=30) as verify_resp:
            pr_data = json.loads(verify_resp.read().decode())
        return pr_data.get("state") == "open"
    except Exception:
        return True  # If we can't verify, assume it's open (best effort)

if selected:
    head_branch = f"autoloop/{selected}"
    owner = repo.split("/")[0] if "/" in repo else ""
    if owner:
        # Strategy 1: exact branch match (works when branch has no framework suffix)
        try:
            pr_api_url = (
                f"https://api.github.com/repos/{repo}/pulls"
                f"?state=open&head={owner}:{head_branch}&per_page=5"
            )
            pr_req = urllib.request.Request(pr_api_url, headers={
                "Authorization": f"token {github_token}",
                "Accept": "application/vnd.github.v3+json",
            })
            with urllib.request.urlopen(pr_req, timeout=30) as pr_resp:
                open_prs = json.loads(pr_resp.read().decode())
            if open_prs:
                existing_pr = open_prs[0]["number"]
                print(f"  Found existing PR #{existing_pr} for exact branch {head_branch}")
        except Exception as e:
            print(f"  Warning: could not check for existing PRs by exact branch: {e}")

        # Strategy 2: search by title and branch prefix (catches framework-generated
        # hash suffixes like autoloop/name-a1b2c3d4e5f6g7h8 created by create-pull-request)
        if existing_pr is None:
            try:
                title_marker = f"[Autoloop: {selected}]"
                branch_prefix = head_branch  # e.g. autoloop/perf-comparison
                list_url = (
                    f"https://api.github.com/repos/{repo}/pulls"
                    f"?state=open&per_page=100&sort=created&direction=desc"
                )
                list_req = urllib.request.Request(list_url, headers={
                    "Authorization": f"token {github_token}",
                    "Accept": "application/vnd.github.v3+json",
                })
                with urllib.request.urlopen(list_req, timeout=30) as list_resp:
                    all_open_prs = json.loads(list_resp.read().decode())
                # Match branch names: exact canonical name or canonical + framework hash suffix
                branch_pattern = re.compile(r'^' + re.escape(branch_prefix) + r'(-[0-9a-f]{16})?$')
                for pr in all_open_prs:
                    pr_title = pr.get("title", "")
                    pr_head_ref = pr.get("head", {}).get("ref", "")
                    if title_marker in pr_title or branch_pattern.match(pr_head_ref):
                        existing_pr = pr["number"]
                        print(f"  Found existing PR #{existing_pr} by title/branch-prefix (branch: {pr_head_ref})")
                        break
                if existing_pr is None:
                    print(f"  No existing PR found for program {selected}")
            except Exception as e:
                print(f"  Warning: could not search for existing PRs by title/prefix: {e}")
    else:
        print(f"  Warning: could not parse owner from GITHUB_REPOSITORY='{repo}'")

    # Strategy 3: check the state file for a recorded PR number as fallback
    if existing_pr is None:
        state = read_program_state(selected)
        pr_field = state.get("pr") or ""
        pr_match = re.match(r'^#?(\d+)$', pr_field.strip())
        if pr_match:
            pr_num = int(pr_match.group(1))
            if verify_pr_is_open(pr_num):
                existing_pr = pr_num
                print(f"  Found open PR #{existing_pr} from state file for {selected}")
            else:
                print(f"  PR #{pr_num} from state file is no longer open — ignoring")

result = {
    "selected": selected,
    "selected_file": selected_file,
    "selected_issue": selected_issue,
    "selected_target_metric": selected_target_metric,
    "existing_pr": existing_pr,
    "head_branch": head_branch,
    "issue_programs": {name: info["issue_number"] for name, info in issue_programs.items()},
    "deferred": deferred,
    "skipped": skipped,
    "unconfigured": unconfigured,
    "no_programs": False,
}

os.makedirs("/tmp/gh-aw", exist_ok=True)
with open("/tmp/gh-aw/autoloop.json", "w") as f:
    json.dump(result, f, indent=2)

print("=== Autoloop Program Check ===")
print(f"Selected program:      {selected or '(none)'} ({selected_file or 'n/a'})")
if existing_pr:
    print(f"Existing PR:           #{existing_pr} (branch: {head_branch})")
else:
    print(f"Existing PR:           (none — will create on first accepted iteration)")
print(f"Deferred (next run):   {deferred or '(none)'}")
print(f"Programs skipped:      {[s['name'] for s in skipped] or '(none)'}")
print(f"Programs unconfigured: {unconfigured or '(none)'}")

if not selected and not unconfigured:
    print("\nNo programs due this run. Exiting early.")
    sys.exit(1)  # Non-zero exit skips the agent step

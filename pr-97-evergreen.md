# Evergreen: PR #97

## State

| Field | Value |
|:---|:---|
| head_sha | c3c63273e424daf7dccae90ce768818ddbab2b54 |
| attempts | 3 |
| last_run | 2026-04-16T01:03:37Z |
| last_result | failure |

## Notes

Merge conflicts resolved locally at commit 8d974988018183695e3ceb3e6c3234cd5f9f0014.
Cannot push: `push_to_pull_request_branch` fails with "Branch does not exist locally".
Root cause: safeoutputs MCP server blocked by policy (registry fetch returns 401).

Conflicts resolved (all 3 files correct):
- src/index.ts: kept pctChangeSeries/pctChangeDataFrame exports
- src/stats/index.ts: kept pct_change.ts re-exports
- playground/index.html: kept pct_change card + restored insert_pop h3

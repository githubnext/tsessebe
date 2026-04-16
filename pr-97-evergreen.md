# Evergreen: PR #97

## State

| Field | Value |
|:---|:---|
| head_sha | c3c63273e424daf7dccae90ce768818ddbab2b54 |
| attempts | 2 |
| last_run | 2026-04-16T00:30:11.495Z |
| last_result | failure |

## Notes

Merge conflicts were resolved locally at commit 9cf2d08.
However, the commit could not be pushed because the `push_to_pull_request_branch`
safeoutputs tool is unavailable — MCP registry returned 401 error, blocking non-default MCP servers.

Conflicts resolved:
- src/index.ts: kept PR's pct_change exports + main's new additions
- src/stats/index.ts: kept PR's pct_change exports + main's new additions
- playground/index.html: kept both pct_change card (from PR) and insert_pop card (from main)

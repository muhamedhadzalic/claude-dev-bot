---
name: repo-context
description: This skill should be used when implementing or modifying src/github/client.js — including fetching PR diffs, fetching repo documentation from .claude/docs/, handling missing files gracefully, or building the data structure passed to the Claude prompt. Also activates when the user asks about GitHub API usage, Octokit setup, what data the bot fetches, or how repo context is assembled.
version: 1.0.0
---

# Repo Context Skill

Guides implementation of `src/github/client.js` — all GitHub data fetching for claude-dev-bot.

## Responsibility

This file owns two fetches per PR review:
1. **PR data** — diff and metadata from the PR itself
2. **Repo docs** — project documentation from the target repo's `.claude/docs/` folder

It must never fetch raw source code files. Docs are always sufficient context for Claude.

## Setup

```js
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = process.env.GITHUB_REPO.split('/');
```

## Fetch 1 — PR Metadata + Diff

Two separate Octokit calls:

```js
// PR metadata
const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });

// Raw unified diff — requires the diff Accept header
const { data: diff } = await octokit.request(
  'GET /repos/{owner}/{repo}/pulls/{pull_number}',
  {
    owner,
    repo,
    pull_number: prNumber,
    headers: { accept: 'application/vnd.github.v3.diff' },
  }
);
```

Cap the diff at **500 lines**. If larger, truncate and keep the files with the most changes:

```js
const lines = diff.split('\n');
const truncatedDiff = lines.length > 500 ? lines.slice(0, 500).join('\n') + '\n[diff truncated]' : diff;
```

## Fetch 2 — Repo Docs from `.claude/docs/`

Fetch these four files from the target repo. Each fetch is independent — missing files must be caught silently and returned as `null`.

| File path | Return key | Priority |
|---|---|---|
| `.claude/docs/coding-standards.md` | `codingStandards` | Always fetch |
| `.claude/docs/project-overview.md` | `projectOverview` | Always fetch |
| `.claude/docs/project-structure.md` | `projectStructure` | Always fetch |
| `.claude/docs/todo.md` | `todo` | Fetch if exists |

```js
async function fetchDoc(path) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch (err) {
    if (err.status === 404) return null;
    throw err; // re-throw unexpected errors
  }
}

const [codingStandards, projectOverview, projectStructure, todo] = await Promise.all([
  fetchDoc('.claude/docs/coding-standards.md'),
  fetchDoc('.claude/docs/project-overview.md'),
  fetchDoc('.claude/docs/project-structure.md'),
  fetchDoc('.claude/docs/todo.md'),
]);
```

**Rules:**
- A missing file → `null` in the returned object, no crash
- If ALL docs are `null` → still return the object; the prompt layer handles this case
- Never fetch `current-feature.md` — it is local only and never on the remote
- Never fetch raw source code files

## Return Shape

`fetchPRData(prNumber)` must return exactly:

```js
{
  metadata: {
    title,       // string
    author,      // string (GitHub login)
    baseBranch,  // string
    headBranch,  // string
    url,         // string (HTML URL)
  },
  diff,          // string (raw unified diff, capped at 500 lines)
  docs: {
    codingStandards,   // string | null
    projectOverview,   // string | null
    projectStructure,  // string | null
    todo,              // string | null
  },
}
```

## Error Handling

- 404 on the PR itself → let it throw (handler will catch and reply to Slack)
- 404 on a doc file → return `null` for that key, never throw
- Any unexpected Octokit error → rethrow with `[GitHub]` prefix logged: `console.error('[GitHub] fetchPRData failed', err)`
- Rate limit (403/429) → rethrow; the handler surfaces a user-friendly Slack message

## Logging

Use `[GitHub]` prefix on all console output from this file:

```js
console.log(`[GitHub] Fetching PR #${prNumber}`);
console.log(`[GitHub] Diff lines: ${lines.length}`);
console.error('[GitHub] fetchPRData failed', err);
```

---
name: pr-review
description: This skill should be used when implementing, modifying, or debugging the PR review flow — including src/handlers/prReview.js, the Claude API call that performs the review, or the prompt that instructs Claude how to review code. Also activates when the user asks about "@bot review PR", changing review output format, or the orchestration between GitHub fetch and Claude response.
version: 1.0.0
---

# PR Review Skill

Guides implementation of the end-to-end PR review flow for claude-dev-bot.

## Flow Overview

```
Slack: "@bot review PR #42"
  → src/bot/events.js          (catches app_mention, extracts PR number)
  → src/handlers/prReview.js   (orchestrates the full review)
  → src/github/client.js       (fetch 1: PR diff + metadata; fetch 2: repo docs)
  → src/claude/prompts.js      (builds system prompt with docs + diff)
  → src/claude/client.js       (calls Anthropic API)
  → Slack                      (posts review as a thread reply)
```

## src/handlers/prReview.js — Orchestration

Accepts `{ prNumber, channelId, threadTs, say }` from the event handler.

Steps:
1. Post an immediate acknowledgement: `"Reviewing PR #${prNumber}…"` (with `thread_ts`)
2. Call `fetchPRData(prNumber)` from `src/github/client.js` — returns `{ metadata, diff, docs }`
3. Call `buildReviewPrompt(metadata, diff, docs)` from `src/claude/prompts.js` — returns `{ system, user }`
4. Call `callClaude(system, user)` from `src/claude/client.js` — returns the review text
5. Post the review text back to the thread
6. Catch all errors, log with `[PR Review]` prefix, and post a user-facing message — never crash silently

```js
async function reviewPR({ prNumber, threadTs, say }) {
  await say({ text: `Reviewing PR #${prNumber}…`, thread_ts: threadTs });
  const { metadata, diff, docs } = await fetchPRData(prNumber);
  const { system, user } = buildReviewPrompt(metadata, diff, docs);
  const review = await callClaude(system, user);
  await say({ text: review, thread_ts: threadTs });
}
```

## src/claude/prompts.js — Building the Review Prompt

`buildReviewPrompt(metadata, diff, docs)` returns `{ system, user }`.

**System prompt must instruct Claude to:**
- Act as a senior engineer reviewing code for the team
- Use any provided project docs to flag violations of the team's own standards
- Focus on: bugs, security issues, logic errors, missing error handling, naming clarity
- Note what is done well — not only problems
- Keep output scannable in Slack: `*bold*` for section headers, `-` for bullets
- Be specific to the diff — no generic advice

**User message structure:**
```
PR #<number>: <title>
Author: <author>
Branch: <head> → <base>
URL: <url>

--- Project Context ---
<include each doc that is non-null, with a label>

--- Diff ---
<diff>
```

If all docs are null, omit the Project Context block and note in the prompt that no project docs were found — Claude should do a best-effort review on general best practices.

## src/claude/client.js — API Call

Model selection: `claude-sonnet-4-20250514` in production, `claude-haiku-4-5-20251001` in development.

```js
async function callClaude(system, userMessage) {
  const model = process.env.NODE_ENV === 'production'
    ? 'claude-sonnet-4-20250514'
    : 'claude-haiku-4-5-20251001';

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });
  return response.content[0].text;
}
```

## Error Handling

| Scenario | User-facing reply |
|---|---|
| PR number not found on GitHub | `"PR #X not found. Check the number and try again."` |
| GitHub API rate limit | `"GitHub API rate limit hit. Try again in a few minutes."` |
| Anthropic API failure | `"Claude couldn't complete the review. Please try again."` |

All errors: `console.error('[PR Review] <description>', err)`

## Slack Output Format

Post in the thread that triggered the review:

```
*PR Review: #42 — Add rate limiting middleware*

*What looks good*
- Error handling in middleware is thorough
- Tests cover the happy path

*Issues*
- `rateLimiter.js:34` — magic number `100` should be a named constant
- Missing test for when Redis is unavailable

*Suggestions*
- Consider extracting the config to `.env` for per-environment limits
```

# CLAUDE.md — claude-dev-bot

This file provides Claude and Claude Code with full context about this project.
Update this file whenever a significant architectural or structural change is made.

---

## What This Project Is

**claude-dev-bot** is a Slack bot that acts as an AI-powered development assistant for a dev team.

It integrates with GitHub to:
- Notify the team in Slack when pull requests are opened, updated, or merged
- Review pull requests on demand via `@bot review PR #42`
- Answer technical questions in Slack with awareness of the actual codebase

Powered by the Anthropic API (Claude) and the GitHub MCP server.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 20 | Team already knows it |
| Slack framework | Bolt.js | Official Slack framework, simplest setup |
| AI | Anthropic API — Claude Sonnet | Best code review quality |
| GitHub integration | GitHub MCP Server + Octokit | Structured repo access without local clone |
| Hosting | Railway | Simple deployment, auto-deploys from GitHub |

---

## Project Structure

```
claude-dev-bot/
├── index.js                  # Entry point — initializes Slack Bolt app
├── package.json
├── .env                      # Local secrets (never committed)
├── .env.example              # Template listing all required variables
├── CLAUDE.md                 # This file — project context for Claude
├── README.md                 # Human-readable project overview
└── src/
    ├── bot/
    │   ├── commands.js       # @bot command handlers (review, opinion, help)
    │   └── events.js         # Slack event listeners (app_mention)
    ├── github/
    │   ├── webhook.js        # Incoming GitHub webhook handler (PR events)
    │   └── client.js         # GitHub API calls via Octokit (diffs, file trees)
    ├── claude/
    │   ├── client.js         # Anthropic API client + GitHub MCP setup
    │   └── prompts.js        # System prompts and context builders
    └── handlers/
        ├── prReview.js       # Orchestrates PR review flow end to end
        └── discussion.js     # Handles free-form Q&A with repo context
```

---

## Environment Variables

All variables must be present in `.env` locally and in Railway for production.
Never commit `.env` — use `.env.example` as the reference.

```env
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...        # Required for Socket Mode

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# GitHub
GITHUB_TOKEN=ghp_...
GITHUB_REPO=owner/repo-name     # e.g. amar/my-app

# App
PORT=3000
NODE_ENV=development
```

---

## Key Design Decisions

**Stateless per request**
Claude receives fresh repo context on every call via GitHub MCP. There is no database and no conversation history stored between requests. Each interaction is fully self-contained.

**GitHub MCP over REST polling**
The GitHub MCP server gives Claude structured, on-demand access to repo contents. This avoids managing a local clone and keeps the bot lightweight.

**Socket Mode for Slack**
Using Slack Socket Mode instead of HTTP webhooks — no need to expose a public URL during development. Easier local testing.

**Separation of concerns**
- `src/bot/` — only handles Slack events and commands
- `src/github/` — only handles GitHub data fetching
- `src/claude/` — only handles AI calls and prompt building
- `src/handlers/` — orchestrates the above layers together

This makes each layer independently testable.

**Model: Claude Sonnet**
Use `claude-sonnet-4-20250514` in production. Use `claude-haiku-4-5-20251001` during development and testing to save API costs.

---

## How It Works — Key Flows

### PR Review Flow
```
Team member: "@bot review PR #42"
    ↓
src/bot/events.js        — catches the app_mention event
    ↓
src/handlers/prReview.js — extracts PR number, orchestrates the flow
    ↓
src/github/client.js     — fetches the PR diff and metadata via Octokit
    ↓
src/claude/client.js     — sends diff + repo context to Claude API
    ↓
src/claude/prompts.js    — builds the system prompt with codebase conventions
    ↓
Slack                    — bot posts Claude's review as a reply
```

### Discussion Flow
```
Team member: "@bot should we use middleware or controller for rate limiting?"
    ↓
src/bot/events.js        — catches the app_mention event
    ↓
src/handlers/discussion.js — identifies it as a free-form question
    ↓
src/claude/client.js     — sends question + repo context to Claude API
    ↓
Slack                    — bot posts a repo-aware answer
```

### PR Notification Flow
```
GitHub                   — PR opened/updated/merged
    ↓
src/github/webhook.js    — receives the webhook event
    ↓
src/bot/events.js        — formats and posts notification to Slack channel
```

---

## Coding Conventions

- Use `async/await` — no raw Promise chains
- Use `const` by default, `let` only when reassignment is needed
- Each file has one clear responsibility — do not mix Slack logic with GitHub logic
- Environment variables are always accessed via `process.env` — never hardcoded
- Errors are always caught and logged — never let the bot crash silently
- Console logs use prefixes for clarity: `[Slack]`, `[GitHub]`, `[Claude]`

---

## Out of Scope (v1)

- Web dashboard or admin UI
- Automatic PR approval or merge actions
- Multi-repo support
- Persistent conversation history across sessions
- Per-user rate limiting (add in v2 if needed)
- Support for other chat platforms (Teams, Discord)

---

## Build Order

The project was built in this sequence — follow this order when making changes:

1. Project scaffold (structure, CLAUDE.md, .env.example)
2. Slack bot (Bolt.js, Socket Mode, basic @bot response)
3. GitHub webhook (PR event → Slack notification)
4. Claude API (PR review + discussion with repo context)
5. Deploy to Railway

---

## Current Status

- [x] Project scaffolded
- [ ] Slack bot responding to mentions
- [ ] GitHub webhook receiving PR events
- [ ] Claude API integrated
- [ ] Deployed to Railway
# claude-dev-bot

A Slack bot that acts as an AI-powered development assistant for your team. It monitors your GitHub repository, reviews pull requests on demand, and answers technical questions with full context of your codebase.

Powered by Claude (Anthropic API) and the GitHub MCP server.

---

## What It Does

- **PR Notifications** — posts to Slack when a PR is opened, updated, or merged
- **Code Review** — `@bot review PR #42` triggers a Claude-powered review of the diff
- **Repo-aware Q&A** — `@bot opinion?` answers technical questions with knowledge of your actual codebase

---

## Prerequisites

- Node.js 20+
- A Slack workspace where you can create apps
- A GitHub repository
- An Anthropic API account

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/claude-dev-bot.git
cd claude-dev-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in all values in `.env` — see the comments in `.env.example` for where to get each one.

### 4. Create a Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From scratch
2. Name it `claude-dev-bot`, select your workspace
3. Go to **Socket Mode** → Enable Socket Mode → generate an App Token (scope: `connections:write`) → copy to `SLACK_APP_TOKEN`
4. Go to **OAuth & Permissions** → add Bot Token Scopes:
   - `chat:write`
   - `app_mentions:read`
   - `channels:read`
5. Go to **Event Subscriptions** → Enable Events → Subscribe to bot events:
   - `app_mention`
6. Install app to workspace → copy **Bot Token** to `SLACK_BOT_TOKEN`
7. Go to **Basic Information** → copy **Signing Secret** to `SLACK_SIGNING_SECRET`

### 5. Create a GitHub token

1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens
2. Select your repository
3. Grant read access to: Contents, Pull Requests, Metadata
4. Copy token to `GITHUB_TOKEN`

### 6. Run locally

```bash
npm run dev
```

---

## Usage

Once the bot is running and installed in your Slack workspace:

**Review a PR:**
```
@bot review PR #42
```

**Ask a question with repo context:**
```
@bot should we handle this in middleware or the controller?
```

**Get help:**
```
@bot help
```

---

## Project Structure

```
claude-dev-bot/
├── index.js                  # Entry point
├── src/
│   ├── bot/
│   │   ├── commands.js       # @bot command handlers
│   │   └── events.js         # Slack event listeners
│   ├── github/
│   │   ├── webhook.js        # GitHub webhook handler
│   │   └── client.js         # GitHub API calls
│   ├── claude/
│   │   ├── client.js         # Anthropic API client
│   │   └── prompts.js        # Prompt builders
│   └── handlers/
│       ├── prReview.js       # PR review orchestration
│       └── discussion.js     # Q&A orchestration
```

---

## Deployment

This project is designed to deploy on [Railway](https://railway.app):

1. Push the repo to GitHub
2. Create a new project on Railway → Deploy from GitHub repo
3. Add all environment variables from `.env.example` in the Railway dashboard
4. Railway auto-deploys on every push to `main`

---

## Cost

Using Claude Sonnet, each bot interaction costs roughly $0.01–0.02. For a small dev team this typically comes to under $5/month.

---

## Stack

- [Bolt.js](https://slack.dev/bolt-js) — Slack bot framework
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-node) — Claude API
- [Octokit](https://github.com/octokit/rest.js) — GitHub API
- [Railway](https://railway.app) — Hosting
---
name: slack-response
description: This skill should be used when implementing or modifying Slack event handling, message formatting, or bot response logic — including src/bot/events.js, src/bot/commands.js, Bolt.js app_mention listeners, Socket Mode setup, PR notification posting, or how the bot formats and sends replies. Also activates when the user asks about Bolt.js patterns, threading, Slack message blocks, or error replies.
version: 1.0.0
---

# Slack Response Skill

Guides implementation of all Slack interaction logic for claude-dev-bot, using Bolt.js with Socket Mode.

## Setup — index.js

Initialize the Bolt app with Socket Mode. All three tokens are required:

```js
const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

(async () => {
  await app.start();
  console.log('[Slack] Bot is running');
})();
```

## src/bot/events.js — Listening for Mentions

The bot responds to `app_mention` events. This is the single entry point for all user commands.

```js
app.event('app_mention', async ({ event, say }) => {
  const text = event.text.toLowerCase();
  const threadTs = event.thread_ts || event.ts;

  if (text.includes('review pr')) {
    const match = text.match(/pr\s*#?(\d+)/);
    if (!match) {
      await say({ text: 'Please include a PR number. Example: `@bot review PR #42`', thread_ts: threadTs });
      return;
    }
    const prNumber = parseInt(match[1], 10);
    await reviewPR({ prNumber, channelId: event.channel, threadTs, say });
  } else {
    await handleDiscussion({ question: event.text, channelId: event.channel, threadTs, say });
  }
});
```

**Rules:**
- Always reply in the thread (`thread_ts`) — never as a new top-level message
- Extract `thread_ts` from `event.thread_ts || event.ts` so threaded mentions also work
- Strip the bot mention from the text before passing to the discussion handler: `event.text.replace(/<@[^>]+>/, '').trim()`

## src/github/webhook.js — PR Notifications

Receives incoming GitHub webhook events and posts a formatted notification to Slack.

```js
// Supported actions: opened, synchronize (updated), closed (check merged)
async function handlePRWebhook(payload, app) {
  const { action, pull_request: pr, repository } = payload;
  let message;

  if (action === 'opened') {
    message = `*New PR opened by ${pr.user.login}*\n*${pr.title}*\n${pr.html_url}`;
  } else if (action === 'synchronize') {
    message = `*PR updated by ${pr.user.login}*\n*${pr.title}*\n${pr.html_url}`;
  } else if (action === 'closed' && pr.merged) {
    message = `*PR merged by ${pr.merged_by.login}*\n*${pr.title}*\n${pr.html_url}`;
  } else {
    return; // ignore other actions
  }

  await app.client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    channel: process.env.SLACK_CHANNEL_ID,
    text: message,
  });
}
```

## Message Formatting Rules

Slack renders a subset of markdown. Use these conventions consistently:

| Format | Usage |
|---|---|
| `*text*` | Bold — section headers, PR titles, author names |
| `` `code` `` | Inline code — file paths, variable names, commands |
| `-` | Bullet list items |
| `\n` | Line breaks within a message |
| `thread_ts` | Always reply in thread, never new top-level message |

Do not use `**text**` (not supported), `#` headers, or HTML.

## Error Reply Pattern

Every handler that calls external APIs must catch and reply with a user-facing message:

```js
try {
  // ... handler logic
} catch (err) {
  console.error('[Slack] Handler failed', err);
  await say({
    text: 'Something went wrong. Please try again.',
    thread_ts: threadTs,
  });
}
```

Never let an unhandled error silently drop a user request.

## Command Parsing — src/bot/commands.js

Extract command intent from the mention text. Supported commands in v1:

| Trigger phrase | Action |
|---|---|
| `review pr #<n>` | Calls `reviewPR()` from `src/handlers/prReview.js` |
| Any other text | Calls `handleDiscussion()` from `src/handlers/discussion.js` |

The `help` response (fallback for unrecognised input):

```
I can help with:
- `@bot review PR #42` — review a pull request
- `@bot <any question>` — answer questions about the codebase
```

## Logging

Use `[Slack]` prefix on all console output from `src/bot/`:

```js
console.log('[Slack] app_mention received', { user: event.user, text: event.text });
console.error('[Slack] Failed to post message', err);
```

const { reviewPR } = require('../handlers/prReview');
const { handleDiscussion } = require('../handlers/discussion');

const HELP_TEXT =
  'I can help with:\n' +
  '- `@bot review PR #42` — review a pull request\n' +
  '- `@bot <any question>` — answer questions about the codebase';

async function routeCommand({ text, event, say, threadTs }) {
  const lower = text.toLowerCase();

  if (lower === '' || lower === 'help') {
    await say({ text: HELP_TEXT, thread_ts: threadTs });
    return;
  }

  if (lower.includes('review pr')) {
    const match = lower.match(/pr\s*#?(\d+)/);
    if (!match) {
      await say({
        text: 'Please include a PR number. Example: `@bot review PR #42`',
        thread_ts: threadTs,
      });
      return;
    }
    const prNumber = parseInt(match[1], 10);
    await reviewPR({ prNumber, channelId: event.channel, threadTs, say });
    return;
  }

  await handleDiscussion({ question: text, channelId: event.channel, threadTs, say });
}

module.exports = { routeCommand };

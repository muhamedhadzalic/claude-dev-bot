const { routeCommand } = require('./commands');

function registerEvents(app) {
  app.event('app_mention', async ({ event, say }) => {
    console.log('[Slack] app_mention received', { user: event.user, text: event.text });

    const threadTs = event.thread_ts || event.ts;
    const text = event.text.replace(/<@[^>]+>/g, '').trim();

    try {
      await routeCommand({ text, event, say, threadTs });
    } catch (err) {
      console.error('[Slack] Handler failed', err);
      await say({
        text: 'Something went wrong. Please try again.',
        thread_ts: threadTs,
      });
    }
  });
}

module.exports = { registerEvents };

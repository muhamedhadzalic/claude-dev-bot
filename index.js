require('dotenv').config();

const { App } = require('@slack/bolt');
const { registerEvents } = require('./src/bot/events');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

registerEvents(app);

(async () => {
  await app.start();
  console.log('[Slack] Bot is running');
})();

require('dotenv').config();

const express = require('express');
const { App } = require('@slack/bolt');
const { registerEvents } = require('./src/bot/events');
const { createWebhookRouter } = require('./src/github/webhook');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

registerEvents(app);

const server = express();

// Raw body required for HMAC signature verification
server.use('/github/webhooks', express.raw({ type: 'application/json' }));
server.use('/github/webhooks', createWebhookRouter(app));

server.get('/health', (_req, res) => res.send('OK'));

(async () => {
  await app.start();
  console.log('[Slack] Bot is running');

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`[GitHub] Webhook server listening on port ${port}`);
  });
})();

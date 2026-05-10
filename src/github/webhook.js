const crypto = require('crypto');
const { Router } = require('express');

function verifySignature(rawBody, signature) {
  if (!signature) return false;
  const digest = `sha256=${crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

function formatPRMessage(action, pr) {
  const base = `*${pr.title}*\n${pr.html_url}`;

  if (action === 'opened') {
    return `*New PR opened by ${pr.user.login}*\n${base}`;
  }
  if (action === 'synchronize') {
    return `*PR updated by ${pr.user.login}*\n${base}`;
  }
  if (action === 'closed' && pr.merged) {
    return `*PR merged by ${pr.merged_by.login}*\n${base}`;
  }
  return null;
}

function createWebhookRouter(slackApp) {
  const router = Router();

  router.post('/', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];

    if (!verifySignature(req.body, signature)) {
      console.error('[GitHub] Invalid webhook signature');
      return res.status(401).send('Unauthorized');
    }

    const event = req.headers['x-github-event'];
    const payload = JSON.parse(req.body.toString());

    res.status(200).send('OK');

    if (event !== 'pull_request') return;

    const message = formatPRMessage(payload.action, payload.pull_request);
    if (!message) return;

    slackApp.client.chat
      .postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL_ID,
        text: message,
      })
      .then(() => console.log(`[GitHub] Posted PR notification for action: ${payload.action}`))
      .catch((err) => console.error('[GitHub] Failed to post PR notification', err));
  });

  return router;
}

module.exports = { createWebhookRouter };

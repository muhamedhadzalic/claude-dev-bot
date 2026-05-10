const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaude(system, userMessage) {
  const model =
    process.env.NODE_ENV === 'production'
      ? 'claude-sonnet-4-6'
      : 'claude-haiku-4-5';

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: system,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  console.log(
    `[Claude] model=${model} in=${response.usage.input_tokens} out=${response.usage.output_tokens}` +
    ` cache_read=${response.usage.cache_read_input_tokens ?? 0}` +
    ` cache_write=${response.usage.cache_creation_input_tokens ?? 0}`
  );

  return response.content[0].text;
}

module.exports = { callClaude };

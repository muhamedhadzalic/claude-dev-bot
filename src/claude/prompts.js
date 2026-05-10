function buildReviewPrompt(metadata, diff, docs) {
  const system = `You are a senior software engineer reviewing a pull request for your team.

Your job:
- Review the diff carefully and give specific, actionable feedback
- Use any provided project documentation to flag violations of the team's own standards
- Focus on: bugs, security issues, logic errors, missing error handling, naming clarity
- Note what is done well — not only problems
- Be specific to the diff — no generic advice

Format your response for Slack:
- Use *bold* for section headers
- Use - for bullet list items
- Reference file paths and line numbers inline like \`file.js:34\`
- Keep it scannable — avoid long paragraphs`;

  const docSections = [];

  if (docs.codingStandards) {
    docSections.push(`*Coding Standards*\n${docs.codingStandards}`);
  }
  if (docs.projectOverview) {
    docSections.push(`*Project Overview*\n${docs.projectOverview}`);
  }
  if (docs.projectStructure) {
    docSections.push(`*Project Structure*\n${docs.projectStructure}`);
  }
  if (docs.todo) {
    docSections.push(`*TODO / Roadmap*\n${docs.todo}`);
  }

  const contextBlock =
    docSections.length > 0
      ? `--- Project Context ---\n${docSections.join('\n\n')}\n\n`
      : 'No project documentation was found. Do a best-effort review using general best practices.\n\n';

  const user =
    `PR #${metadata.title.match(/\d+/) || ''}` +
    `${metadata.title}\n` +
    `Author: ${metadata.author}\n` +
    `Branch: ${metadata.headBranch} → ${metadata.baseBranch}\n` +
    `URL: ${metadata.url}\n\n` +
    contextBlock +
    `--- Diff ---\n${diff}`;

  return { system, user };
}

module.exports = { buildReviewPrompt };

const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = (process.env.GITHUB_REPO || '/').split('/');

async function fetchDoc(path) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function fetchPRData(prNumber) {
  console.log(`[GitHub] Fetching PR #${prNumber}`);

  const [{ data: pr }, diffResponse, codingStandards, projectOverview, projectStructure, todo] =
    await Promise.all([
      octokit.pulls.get({ owner, repo, pull_number: prNumber }),
      octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
        owner,
        repo,
        pull_number: prNumber,
        headers: { accept: 'application/vnd.github.v3.diff' },
      }),
      fetchDoc('.claude/docs/coding-standards.md'),
      fetchDoc('.claude/docs/project-overview.md'),
      fetchDoc('.claude/docs/project-structure.md'),
      fetchDoc('.claude/docs/todo.md'),
    ]);

  const lines = diffResponse.data.split('\n');
  console.log(`[GitHub] Diff lines: ${lines.length}`);
  const diff =
    lines.length > 500 ? lines.slice(0, 500).join('\n') + '\n[diff truncated]' : diffResponse.data;

  return {
    metadata: {
      title: pr.title,
      author: pr.user.login,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      url: pr.html_url,
    },
    diff,
    docs: { codingStandards, projectOverview, projectStructure, todo },
  };
}

module.exports = { fetchPRData };

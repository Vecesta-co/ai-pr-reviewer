import * as core from '@actions/core';
import * as github from '@actions/github';
import { analyzeDiff } from './core/analyzer';
import { GitHubReviewClient } from './github/client';
import { parseMinSeverity, parseSeverityList } from './config';
import { ReviewOptions } from './core/types';

export async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('Missing GITHUB_TOKEN. Ensure "github-token" input or GITHUB_TOKEN env var is set.');
    }

    const payload = github.context.payload;
    const pullNumber =
      parseInt(core.getInput('pull-request-number'), 10) ||
      payload.pull_request?.number ||
      payload.issue?.number;

    if (!pullNumber) {
      core.info('ai-pr-reviewer action was triggered outside a pull_request event. Skipping review.');
      return;
    }

    const { owner, repo } = github.context.repo;
    const client = new GitHubReviewClient({
      token,
      owner,
      repo,
      pullNumber,
    });

    core.info(`Fetching unified diff for PR #${pullNumber} in ${owner}/${repo}...`);
    const rawDiff = await client.getPullRequestDiff();

    if (!rawDiff || rawDiff.trim().length === 0) {
      core.info('No code changes detected in PR diff. Review finished.');
      return;
    }

    const options: ReviewOptions = {
      provider: (core.getInput('provider') || process.env.AI_PROVIDER || 'mock').toLowerCase() as any,
      model: core.getInput('model') || process.env.AI_MODEL,
      apiKey: core.getInput('api-key') || process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
      apiEndpoint: core.getInput('api-endpoint') || process.env.AI_ENDPOINT,
      minSeverity: parseMinSeverity(core.getInput('min-severity')),
      failOnSeverity: parseSeverityList(core.getInput('fail-on-severity')),
      verbose: core.isDebug(),
    };

    core.info(`Auditing diff changes with [${options.provider.toUpperCase()}] provider...`);
    const result = await analyzeDiff(rawDiff, options);

    core.info(
      `Analysis completed in ${(result.durationMs / 1000).toFixed(2)}s. Findings: ${result.filteredFindings.length}. Gate Passed: ${result.passedGate}`
    );

    core.info('Publishing review comments to GitHub Pull Request...');
    await client.publishReview(result);

    // Set GitHub Action output variables
    core.setOutput('summary', result.summary);
    core.setOutput('findings-count', result.filteredFindings.length);
    core.setOutput('passed', result.passedGate);

    if (!result.passedGate) {
      core.setFailed(
        `AI Code Review Quality Gate Failed: PR contains blocking issues matching [${options.failOnSeverity?.join(', ')}].`
      );
    }
  } catch (err: any) {
    core.setFailed(`ai-pr-reviewer action failed: ${err.message}`);
  }
}

if (process.env.GITHUB_ACTIONS === 'true') {
  run();
}

import { Octokit } from '@octokit/rest';
import { formatGitHubComments } from './comment-builder';
import { ReviewResult } from '../core/types';
import { generateMarkdownReport } from '../core/reporter';

export interface GitHubClientOptions {
  token: string;
  owner: string;
  repo: string;
  pullNumber: number;
}

export class GitHubReviewClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private pullNumber: number;

  constructor(options: GitHubClientOptions) {
    this.octokit = new Octokit({ auth: options.token });
    this.owner = options.owner;
    this.repo = options.repo;
    this.pullNumber = options.pullNumber;
  }

  public async getPullRequestDiff(): Promise<string> {
    const response = await this.octokit.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.pullNumber,
      headers: {
        accept: 'application/vnd.github.v3.diff',
      },
    });

    return response.data as unknown as string;
  }

  public async publishReview(result: ReviewResult): Promise<void> {
    const reportMarkdown = generateMarkdownReport(result);
    const inlineComments = formatGitHubComments(result.filteredFindings);

    const event = result.passedGate ? 'COMMENT' : 'REQUEST_CHANGES';

    try {
      // Post full review with inline comments
      await this.octokit.rest.pulls.createReview({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.pullNumber,
        body: reportMarkdown,
        event,
        comments: inlineComments.map((c) => ({
          path: c.path,
          line: c.line,
          body: c.body,
        })),
      });
    } catch (err: any) {
      // Fallback: If inline comments fail (e.g. 422 line mismatch on GitHub's side), publish top-level issue comment
      console.warn(
        `[ai-pr-reviewer] createReview with comments failed: ${err.message}. Retrying as top-level review comment.`
      );

      await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: this.pullNumber,
        body: reportMarkdown,
      });
    }
  }
}

import { ReviewFinding } from '../core/types';

export interface GitHubReviewComment {
  path: string;
  line: number;
  body: string;
}

export function buildGitHubCommentBody(finding: ReviewFinding): string {
  let body = `### ${finding.severity === 'SECURITY' ? '🔴' : finding.severity === 'CRITICAL' ? '🛑' : '⚠️'} **[${finding.severity}] ${finding.title}**\n\n`;
  body += `${finding.message}\n`;

  if (finding.suggestion) {
    body += `\n\`\`\`suggestion\n${finding.suggestion.trim()}\n\`\`\`\n`;
  }

  body += `\n*Reviewed autonomously by [ai-pr-reviewer](https://github.com/Vecesta-co/ai-pr-reviewer) by Vecesta.co*`;
  return body;
}

export function formatGitHubComments(findings: ReviewFinding[]): GitHubReviewComment[] {
  return findings.map((f) => ({
    path: f.filePath,
    line: f.line,
    body: buildGitHubCommentBody(f),
  }));
}

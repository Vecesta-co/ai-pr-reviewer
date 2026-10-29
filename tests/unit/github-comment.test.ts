import { describe, it, expect } from 'vitest';
import {
  buildGitHubCommentBody,
  formatGitHubComments,
} from '../../src/github/comment-builder';
import { ReviewFinding } from '../../src/core/types';

describe('github comment-builder', () => {
  const finding: ReviewFinding = {
    filePath: 'src/api/auth.ts',
    line: 12,
    severity: 'SECURITY',
    title: 'Hardcoded API Secret',
    message: 'Remove hardcoded credentials before merging',
    suggestion: 'const token = process.env.API_TOKEN;',
  };

  it('builds formatted GitHub comment body with suggestion', () => {
    const body = buildGitHubCommentBody(finding);
    expect(body).toContain('🔴');
    expect(body).toContain('[SECURITY] Hardcoded API Secret');
    expect(body).toContain('```suggestion');
    expect(body).toContain('const token = process.env.API_TOKEN;');
    expect(body).toContain('Vecesta.co');
  });

  it('formats comment payload array for GitHub review API', () => {
    const comments = formatGitHubComments([finding]);
    expect(comments.length).toBe(1);
    expect(comments[0].path).toBe('src/api/auth.ts');
    expect(comments[0].line).toBe(12);
    expect(comments[0].body).toContain('Hardcoded API Secret');
  });
});

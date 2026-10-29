import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeDiff } from '../../src/core/analyzer';
import { MockProvider } from '../../src/providers/mock';

describe('analyzer integration', () => {
  const fixturePath = path.join(__dirname, '../fixtures/sample.diff');
  const sampleDiff = fs.readFileSync(fixturePath, 'utf-8');

  it('runs complete analysis pipeline on sample diff with mock provider', async () => {
    const result = await analyzeDiff(
      sampleDiff,
      {
        provider: 'mock',
        minSeverity: 'NIT',
        failOnSeverity: ['SECURITY', 'CRITICAL'],
      },
      new MockProvider()
    );

    expect(result.totalFiles).toBe(3);
    expect(result.filesReviewed).toContain('src/auth/service.ts');
    expect(result.filesReviewed).toContain('src/utils/clean.ts');
    expect(result.filesIgnored).toContain('pnpm-lock.yaml');

    expect(result.findings.length).toBeGreaterThanOrEqual(3);
    expect(result.severityCounts.SECURITY).toBeGreaterThanOrEqual(2);
    expect(result.severityCounts.CRITICAL).toBeGreaterThanOrEqual(1);

    // Because failOnSeverity includes SECURITY & CRITICAL, quality gate must fail
    expect(result.passedGate).toBe(false);
  });

  it('passes quality gate when failOnSeverity is not triggered', async () => {
    const result = await analyzeDiff(
      sampleDiff,
      {
        provider: 'mock',
        minSeverity: 'NIT',
        failOnSeverity: [], // No blocking severities
      },
      new MockProvider()
    );

    expect(result.passedGate).toBe(true);
  });

  it('handles empty diff gracefully', async () => {
    const result = await analyzeDiff(
      '',
      {
        provider: 'mock',
      },
      new MockProvider()
    );

    expect(result.passedGate).toBe(true);
    expect(result.findings.length).toBe(0);
    expect(result.filesReviewed.length).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { generateMarkdownReport, generateTerminalReport } from '../../src/core/reporter';
import { ReviewResult } from '../../src/core/types';

describe('reporter', () => {
  const sampleResult: ReviewResult = {
    summary: 'PR looks generally good with minor advisories.',
    findings: [],
    filteredFindings: [
      {
        filePath: 'src/auth/service.ts',
        line: 7,
        severity: 'SECURITY',
        title: 'SQL Injection',
        message: 'Avoid string concatenation in queries',
        suggestion: 'await db.query("SELECT * FROM users WHERE id = $1", [id]);',
      },
      {
        filePath: 'src/utils/clean.ts',
        line: 5,
        severity: 'NIT',
        title: 'Minor formatting',
        message: 'Consider arrow function syntax',
      },
    ],
    totalFiles: 3,
    filesReviewed: ['src/auth/service.ts', 'src/utils/clean.ts'],
    filesIgnored: ['pnpm-lock.yaml'],
    severityCounts: {
      SECURITY: 1,
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      NIT: 1,
    },
    passedGate: false,
    durationMs: 1450,
  };

  it('generates rich markdown report for GitHub PR', () => {
    const md = generateMarkdownReport(sampleResult);
    expect(md).toContain('AI Pull Request Review by [Vecesta.co]');
    expect(md).toContain('BLOCKED');
    expect(md).toContain('🔴 Security');
    expect(md).toContain('`src/auth/service.ts`');
    expect(md).toContain('```suggestion');
    expect(md).toContain('Ignored Non-Code / Noise Files (1)');
  });

  it('generates terminal report with ANSI formatting', () => {
    const term = generateTerminalReport(sampleResult);
    expect(term).toContain('V E C E S T A . C O');
    expect(term).toContain('QUALITY GATE FAILED');
    expect(term).toContain('src/auth/service.ts:7');
    expect(term).toContain('SQL Injection');
  });

  it('handles clean result without findings in markdown', () => {
    const cleanResult: ReviewResult = {
      ...sampleResult,
      filteredFindings: [],
      passedGate: true,
      severityCounts: { SECURITY: 0, CRITICAL: 0, MAJOR: 0, MINOR: 0, NIT: 0 },
    };
    const md = generateMarkdownReport(cleanResult);
    expect(md).toContain('PASSED');
    expect(md).toContain('Zero defects identified');
  });
});

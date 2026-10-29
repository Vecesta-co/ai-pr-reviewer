import { describe, it, expect } from 'vitest';
import {
  evaluateQualityGate,
  filterFindingsByMinSeverity,
} from '../../src/core/quality-gate';
import { ReviewFinding } from '../../src/core/types';

describe('quality-gate', () => {
  const findings: ReviewFinding[] = [
    {
      filePath: 'src/app.ts',
      line: 10,
      severity: 'SECURITY',
      title: 'SQL Injection',
      message: 'Unescaped user input in query',
    },
    {
      filePath: 'src/app.ts',
      line: 20,
      severity: 'CRITICAL',
      title: 'Remote Code Exec',
      message: 'eval used on untrusted string',
    },
    {
      filePath: 'src/app.ts',
      line: 30,
      severity: 'MAJOR',
      title: 'Swallowed error',
      message: 'Empty catch block',
    },
    {
      filePath: 'src/app.ts',
      line: 40,
      severity: 'MINOR',
      title: 'Debug log',
      message: 'Console.log in prod',
    },
    {
      filePath: 'src/app.ts',
      line: 50,
      severity: 'NIT',
      title: 'Loose equality',
      message: 'Use === instead of ==',
    },
  ];

  it('filters findings by minSeverity threshold properly', () => {
    const nitFiltered = filterFindingsByMinSeverity(findings, 'NIT');
    expect(nitFiltered.length).toBe(5);

    const minorFiltered = filterFindingsByMinSeverity(findings, 'MINOR');
    expect(minorFiltered.length).toBe(4);
    expect(minorFiltered.some((f) => f.severity === 'NIT')).toBe(false);

    const criticalFiltered = filterFindingsByMinSeverity(findings, 'CRITICAL');
    expect(criticalFiltered.length).toBe(2);
    expect(criticalFiltered.map((f) => f.severity)).toEqual(['SECURITY', 'CRITICAL']);
  });

  it('passes quality gate when no blocking severities match', () => {
    const minorFindings = findings.filter((f) => f.severity === 'MINOR' || f.severity === 'NIT');
    const res = evaluateQualityGate(minorFindings, ['CRITICAL', 'SECURITY']);
    expect(res.passed).toBe(true);
    expect(res.violations.length).toBe(0);
  });

  it('fails quality gate when security or critical violations exist', () => {
    const res = evaluateQualityGate(findings, ['CRITICAL', 'SECURITY']);
    expect(res.passed).toBe(false);
    expect(res.violations.length).toBe(2);
    expect(res.reason).toContain('Quality gate failed');
  });

  it('passes by default when failOnSeverity is empty or undefined', () => {
    const res = evaluateQualityGate(findings, []);
    expect(res.passed).toBe(true);
  });
});

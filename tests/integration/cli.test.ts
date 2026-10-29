import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

describe('cli execution', () => {
  const cliPath = path.join(__dirname, '../../dist/cli.js');
  const fixturePath = path.join(__dirname, '../fixtures/sample.diff');

  it('prints version number cleanly', () => {
    const stdout = execSync(`node "${cliPath}" --version`, { encoding: 'utf-8' });
    expect(stdout.trim()).toBe('1.0.0');
  });

  it('reviews fixture diff file and outputs json with --json flag', () => {
    // When failOnSeverity is not set, exit code should be 0
    const cmd = `node "${cliPath}" review --file "${fixturePath}" --provider mock --json`;
    const stdout = execSync(cmd, { encoding: 'utf-8' });
    const parsed = JSON.parse(stdout);

    expect(parsed.totalFiles).toBe(3);
    expect(parsed.filesReviewed).toContain('src/auth/service.ts');
    expect(parsed.findings.length).toBeGreaterThanOrEqual(3);
  });

  it('exits with code 1 when quality gate fails on severity', () => {
    const cmd = `node "${cliPath}" review --file "${fixturePath}" --provider mock --fail-on-severity CRITICAL,SECURITY`;
    expect(() => {
      execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    }).toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseUnifiedDiff, shouldIgnoreFile } from '../../src/core/diff-parser';

describe('diff-parser', () => {
  it('handles empty diff input safely', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
    expect(parseUnifiedDiff('   \n  ')).toEqual([]);
  });

  it('correctly parses multi-file unified diff', () => {
    const fixturePath = path.join(__dirname, '../fixtures/sample.diff');
    const rawDiff = fs.readFileSync(fixturePath, 'utf-8');

    const files = parseUnifiedDiff(rawDiff);
    expect(files.length).toBe(3);

    const authFile = files.find((f) => f.to === 'src/auth/service.ts');
    expect(authFile).toBeDefined();
    expect(authFile?.isNew).toBe(true);
    expect(authFile?.hunks.length).toBe(1);
    expect(authFile?.validLines.has(4)).toBe(true);
    expect(authFile?.validLines.has(7)).toBe(true);
    expect(authFile?.validLines.has(12)).toBe(true);
  });

  it('identifies ignored files accurately', () => {
    expect(shouldIgnoreFile('pnpm-lock.yaml')).toBe(true);
    expect(shouldIgnoreFile('package-lock.json')).toBe(true);
    expect(shouldIgnoreFile('yarn.lock')).toBe(true);
    expect(shouldIgnoreFile('bun.lockb')).toBe(true);
    expect(shouldIgnoreFile('assets/logo.png')).toBe(true);
    expect(shouldIgnoreFile('dist/bundle.min.js')).toBe(true);
    expect(shouldIgnoreFile('node_modules/express/index.js')).toBe(true);

    // Legitimate code files must NOT be ignored
    expect(shouldIgnoreFile('src/auth/service.ts')).toBe(false);
    expect(shouldIgnoreFile('lib/utils.py')).toBe(false);
    expect(shouldIgnoreFile('main.go')).toBe(false);
  });
});

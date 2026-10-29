import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseUnifiedDiff } from '../../src/core/diff-parser';
import { LineMapper } from '../../src/core/line-mapper';

describe('line-mapper', () => {
  const fixturePath = path.join(__dirname, '../fixtures/sample.diff');
  const rawDiff = fs.readFileSync(fixturePath, 'utf-8');
  const parsedFiles = parseUnifiedDiff(rawDiff);
  const lineMapper = new LineMapper(parsedFiles);

  it('validates exact modified lines successfully', () => {
    const res = lineMapper.validateLine('src/auth/service.ts', 7);
    expect(res.isValid).toBe(true);
    expect(res.targetLine).toBe(7);
    expect(res.snapped).toBe(false);
  });

  it('snaps nearby out-of-line coordinates within margin', () => {
    // Line 15 is 1 line past line 14 in a 1-14 hunk
    const res = lineMapper.validateLine('src/auth/service.ts', 15);
    expect(res.isValid).toBe(true);
    expect(res.targetLine).toBe(14);
    expect(res.snapped).toBe(true);
  });

  it('rejects coordinates completely out of hunk boundaries', () => {
    const res = lineMapper.validateLine('src/auth/service.ts', 999);
    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('not part of the modified hunk');
  });

  it('rejects non-existent file path gracefully', () => {
    const res = lineMapper.validateLine('non/existent/file.ts', 10);
    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('not found in parsed diff');
  });
});

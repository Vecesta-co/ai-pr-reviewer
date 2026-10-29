import { describe, it, expect } from 'vitest';
import {
  parseSeverityList,
  parseMinSeverity,
  loadDefaultConfig,
} from '../../src/config';

describe('config parser', () => {
  it('parses comma-separated severity list safely', () => {
    expect(parseSeverityList('CRITICAL,SECURITY')).toEqual(['CRITICAL', 'SECURITY']);
    expect(parseSeverityList('major, minor , nit')).toEqual(['MAJOR', 'MINOR', 'NIT']);
    expect(parseSeverityList('INVALID,CRITICAL')).toEqual(['CRITICAL']);
    expect(parseSeverityList('')).toBeUndefined();
    expect(parseSeverityList(undefined)).toBeUndefined();
  });

  it('parses minimum severity option safely', () => {
    expect(parseMinSeverity('major')).toBe('MAJOR');
    expect(parseMinSeverity('SECURITY')).toBe('SECURITY');
    expect(parseMinSeverity('invalid')).toBeUndefined();
    expect(parseMinSeverity(undefined)).toBeUndefined();
  });

  it('loads default configuration structure', () => {
    const config = loadDefaultConfig();
    expect(config).toBeDefined();
    expect(typeof config.provider).toBe('string');
  });
});

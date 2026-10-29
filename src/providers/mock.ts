import { BaseLLMProvider } from './base';
import { LLMReviewResponse, ReviewFinding } from '../core/types';

export class MockProvider extends BaseLLMProvider {
  public readonly name = 'mock';

  public async generateReview(prompt: string): Promise<LLMReviewResponse> {
    const findings: ReviewFinding[] = [];

    // Parse files from prompt blocks
    const fileBlocks = prompt.split('--- File: ');

    for (let i = 1; i < fileBlocks.length; i++) {
      const block = fileBlocks[i];
      const newlineIdx = block.indexOf(' ---\n');
      if (newlineIdx === -1) continue;

      const filePath = block.slice(0, newlineIdx).trim();
      const diffContent = block.slice(newlineIdx + 5);

      const lines = diffContent.split('\n');
      let currentLine = 1;

      for (const rawLine of lines) {
        // Track line numbers from unified diff hunk header
        const hunkMatch = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (hunkMatch) {
          currentLine = parseInt(hunkMatch[1], 10);
          continue;
        }

        if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
          const content = rawLine.slice(1);

          // Rule 1: Hardcoded Secrets
          if (
            /(?:api[_-]?key|secret|password|token|bearer)\s*[:=]\s*["'][A-Za-z0-9_\-]{8,}["']/i.test(
              content
            ) ||
            /AKIA[0-9A-Z]{16}/.test(content) ||
            /-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(content)
          ) {
            findings.push({
              filePath,
              line: currentLine,
              severity: 'SECURITY',
              title: 'Hardcoded Credential Detected',
              message:
                'Detected potential hardcoded API key, token, or secret. Hardcoded credentials pose severe exposure risks and should be loaded dynamically via environment variables or secret vaults.',
              suggestion: 'const apiKey = process.env.API_KEY;',
            });
          }

          // Rule 2: SQL Injection
          if (
            /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+.*(?:\+|`.*\${)/i.test(content) ||
            /(?:query|execute|sql)\s*\(.*(?:\+|`.*\${)/i.test(content)
          ) {
            findings.push({
              filePath,
              line: currentLine,
              severity: 'SECURITY',
              title: 'Potential SQL Injection Vulnerability',
              message:
                'Dynamic string concatenation or interpolation inside a raw SQL query can expose the application to SQL injection attacks. Use parameterized queries or prepared statements.',
              suggestion: 'await db.query("SELECT * FROM users WHERE id = $1", [userId]);',
            });
          }

          // Rule 3: Dangerous eval
          if (/\beval\s*\(/.test(content)) {
            findings.push({
              filePath,
              line: currentLine,
              severity: 'CRITICAL',
              title: 'Dangerous Use of eval()',
              message:
                'The eval() function executes arbitrary strings as code, presenting catastrophic remote code execution (RCE) vectors and performance penalties.',
              suggestion: '// Refactor to eliminate eval() and use a safe parser or lookup table',
            });
          }

          // Rule 4: Empty Catch Block
          if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) {
            findings.push({
              filePath,
              line: currentLine,
              severity: 'MAJOR',
              title: 'Empty Catch Block Swallowing Errors',
              message:
                'Swallowing errors silently without logging or rethrowing obscures system failures, making runtime debugging virtually impossible in production.',
              suggestion: 'catch (err) { logger.error("Operation failed", { err }); throw err; }',
            });
          }

          // Rule 5: Unsafe equality
          if (/[^!=]==[^=]/.test(content) || /[^!]!=[^=]/.test(content)) {
            findings.push({
              filePath,
              line: currentLine,
              severity: 'NIT',
              title: 'Loose Equality Operator',
              message:
                'Use strict equality (=== or !==) instead of loose equality (== or !=) to prevent unintended JavaScript type coercion edge cases.',
              suggestion: content.replace(/==/g, '===').replace(/!=/g, '!=='),
            });
          }

          // Rule 6: Console statement in production
          if (/console\.(log|debug|info)\(/.test(content)) {
            findings.push({
              filePath,
              line: currentLine,
              severity: 'MINOR',
              title: 'Console Logging in Production Code',
              message:
                'Avoid using raw console.log statements in production code. Use a structured logger with proper log levels (pino, winston) or remove debug statements.',
              suggestion: '// logger.debug(...);',
            });
          }

          currentLine++;
        } else if (!rawLine.startsWith('-')) {
          currentLine++;
        }
      }
    }

    const summary =
      findings.length === 0
        ? 'Clean diff review: No security vulnerabilities or critical defects identified.'
        : `Identified ${findings.length} issue(s) across the reviewed hunks, including ${findings.filter((f) => f.severity === 'SECURITY').length} security concern(s).`;

    return {
      summary,
      findings,
    };
  }
}

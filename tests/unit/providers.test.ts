import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../src/providers/mock';
import { GeminiProvider } from '../../src/providers/gemini';
import { OpenAIProvider } from '../../src/providers/openai';

describe('providers', () => {
  describe('MockProvider', () => {
    const mock = new MockProvider();

    it('identifies security vulnerabilities deterministically from prompt diff', async () => {
      const prompt = mock.buildPrompt([
        {
          filePath: 'src/api/auth.ts',
          diffContent: `@@ -0,0 +1,10 @@
+const token = "AKIA1234567890ABCDEF";
+const sql = "SELECT * FROM secrets WHERE id = " + userId;
+db.query(sql);
+eval(payload);`,
        },
      ]);

      const review = await mock.generateReview(prompt);
      expect(review.findings.length).toBeGreaterThanOrEqual(3);

      const securityFindings = review.findings.filter((f) => f.severity === 'SECURITY');
      expect(securityFindings.length).toBeGreaterThanOrEqual(2);

      const evalFinding = review.findings.find((f) => f.severity === 'CRITICAL');
      expect(evalFinding).toBeDefined();
      expect(evalFinding?.title).toContain('Dangerous Use of eval()');
    });

    it('returns clean response for safe code', async () => {
      const prompt = mock.buildPrompt([
        {
          filePath: 'src/math.ts',
          diffContent: `@@ -0,0 +1,5 @@
+export function add(a: number, b: number): number {
+  return a + b;
+}`,
        },
      ]);

      const review = await mock.generateReview(prompt);
      expect(review.findings.length).toBe(0);
      expect(review.summary).toContain('Clean diff review');
    });
  });

  describe('GeminiProvider configuration', () => {
    it('throws descriptive error if API key is omitted', () => {
      expect(() => new GeminiProvider({ apiKey: '' })).toThrow(/requires an API key/i);
    });
  });

  describe('OpenAIProvider configuration', () => {
    it('throws descriptive error if API key is omitted', () => {
      expect(() => new OpenAIProvider({ apiKey: '' })).toThrow(/requires an API key/i);
    });
  });

  describe('BaseLLMProvider JSON parsing', () => {
    class ConcreteProvider extends MockProvider {
      public testParse(raw: string) {
        return this.parseAndValidateJSON(raw);
      }
    }
    const provider = new ConcreteProvider();

    it('parses valid json wrapped in markdown codeblock', () => {
      const raw = '```json\n{"summary":"Good","findings":[]}\n```';
      const parsed = provider.testParse(raw);
      expect(parsed.summary).toBe('Good');
      expect(parsed.findings).toEqual([]);
    });

    it('throws when JSON schema does not conform', () => {
      const bad = '{"summary": 123}';
      expect(() => provider.testParse(bad)).toThrow(/Failed to parse LLM JSON response/);
    });
  });
});
